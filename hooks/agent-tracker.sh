#!/usr/bin/env bash
# =============================================================================
# agent-tracker.sh — Claude Code Hook → Agent Office bridge
#
# Claude Code passes hook event JSON on stdin.
# This script inspects the event and forwards relevant activity to the
# Agent Office server at http://localhost:3334/event.
#
# Hook events handled:
#   PreToolUse  — detect Agent tool calls, MCP tool calls
#   PostToolUse — detect Agent/MCP completion
#
# Usage (configured in ~/.claude/settings.json hooks section):
#   { "type": "command", "command": "/path/to/agent-tracker.sh" }
# =============================================================================

SERVER_URL="http://localhost:3334/event"

# Read the hook payload from stdin
PAYLOAD=$(cat)


# Auth token (optional — read from file if present)
AUTH_HEADER=""
TOKEN_FILE="$HOME/.agent-office/auth-token"
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE" 2>/dev/null)
    if [ -n "$TOKEN" ]; then
        AUTH_HEADER="Authorization: Bearer $TOKEN"
    fi
fi

# Extract common fields and build event JSON in a single Python invocation.
# The payload is piped via stdin (not an environment variable) so large agent
# results do not hit environment size limits (notably on Windows), and no shell
# variables are interpolated into Python source code.
PYSCRIPT=$(cat <<'PYEOF'
import json, sys, os, re

try:
    d = json.loads(sys.stdin.buffer.read().decode('utf-8', 'replace') or '{}')
except Exception:
    sys.exit(0)

hook_event = d.get('hook_event_name', '')
tool_name  = d.get('tool_name', '')

if not tool_name:
    sys.exit(0)

# ── MCP tool calls  (tool names match pattern: mcp__<server>__<tool>) ──────
if tool_name.startswith('mcp__'):
    stripped   = tool_name[len('mcp__'):]
    # Split on first '__' to get server and tool
    parts      = stripped.split('__', 1)
    mcp_server = parts[0] if len(parts) > 0 else ''
    mcp_tool   = parts[1] if len(parts) > 1 else ''

    if hook_event == 'PreToolUse':
        print(json.dumps({
            'type':   'mcp_call',
            'server': mcp_server,
            'tool':   mcp_tool,
        }))
    elif hook_event == 'PostToolUse':
        print(json.dumps({
            'type':   'mcp_done',
            'server': mcp_server,
        }))
    sys.exit(0)

# ── Agent tool calls  (tool_name == "Agent" or "Task") ─────────────────────
if tool_name in ('Agent', 'Task'):
    if hook_event == 'PreToolUse':
        inp = d.get('tool_input', {})

        # Claude Code Agent tool input has: description, prompt, subagent_type, agent_type
        description   = inp.get('description', '') or inp.get('prompt', '')
        subagent_type = inp.get('subagent_type', '') or inp.get('agent_type', '')

        # Role mapping: normalise subagent_type to office role keys
        role_map = {
            'debugger':             'debugger',
            'code-reviewer':        'code-reviewer',
            'code_reviewer':        'code-reviewer',
            'frontend-developer':   'frontend-developer',
            'frontend_developer':   'frontend-developer',
            'fullstack-developer':  'fullstack-developer',
            'fullstack_developer':  'fullstack-developer',
            'test-engineer':        'test-engineer',
            'test_engineer':        'test-engineer',
            'security-auditor':     'security-auditor',
            'security_auditor':     'security-auditor',
            'architect-reviewer':   'architect-reviewer',
            'architect_reviewer':   'architect-reviewer',
            'performance-engineer': 'performance-engineer',
            'performance_engineer': 'performance-engineer',
            'devops-engineer':      'devops-engineer',
            'devops_engineer':      'devops-engineer',
            'database-architect':   'database-architect',
            'database_architect':   'database-architect',
            'typescript-pro':       'typescript-pro',
            'typescript_pro':       'typescript-pro',
            'ai-engineer':          'ai-engineer',
            'ai_engineer':          'ai-engineer',
            'prompt-engineer':      'prompt-engineer',
            'prompt_engineer':      'prompt-engineer',
            'general-purpose':      'general-purpose',
            'general_purpose':      'general-purpose',
            'Explore':              'Explore',
            'seo-writer':           'seo-writer',
            'seo_writer':           'seo-writer',
            'docs-writer':          'docs-writer',
            'docs_writer':          'docs-writer',
            'documentation-writer': 'docs-writer',
            'technical-writer':     'docs-writer',
        }
        role = role_map.get(subagent_type, 'general-purpose')

        # Derive a display name from the role
        name_map = {
            'debugger':             'Debugger',
            'code-reviewer':        'Reviewer',
            'frontend-developer':   'Frontend',
            'fullstack-developer':  'Fullstack',
            'test-engineer':        'Tester',
            'security-auditor':     'Security',
            'architect-reviewer':   'Architect',
            'performance-engineer': 'PerfEng',
            'devops-engineer':      'DevOps',
            'database-architect':   'DBA',
            'typescript-pro':       'TS Pro',
            'ai-engineer':          'AI Eng',
            'prompt-engineer':      'Prompts',
            'general-purpose':      'Agent',
            'Explore':              'Explorer',
            'seo-writer':           'SEO Writer',
            'docs-writer':          'Docs Writer',
        }
        name = name_map.get(role, 'Agent')

        # Truncate task description for display
        task = description[:80] if description else 'Sedang mengerjakan tugas'

        # Stable ID based on tool_use_id if available
        tool_use_id = d.get('tool_use_id', '')
        agent_id = f'agent-{tool_use_id}' if tool_use_id else f'agent-{role}-{id(d)}'

        print(json.dumps({
            'type': 'agent_spawned',
            'agent': {
                'id':   agent_id,
                'name': name,
                'role': role,
                'task': task,
            }
        }))

    elif hook_event == 'PostToolUse':
        tool_use_id = d.get('tool_use_id', '')
        agent_id = f'agent-{tool_use_id}' if tool_use_id else ''

        def extract_text(node):
            """Ambil teks dari tool_response (string, list, atau dict berisi output/result/text/content)."""
            if isinstance(node, str):
                return node
            if isinstance(node, list):
                return '\n'.join(t for t in (extract_text(x) for x in node) if t)
            if isinstance(node, dict):
                for key in ('output', 'result', 'text', 'content'):
                    value = node.get(key)
                    if value:
                        text = extract_text(value)
                        if text:
                            return text
            return ''

        full = extract_text(d.get('tool_response', {})).strip()
        summary = ' '.join(full.split())[:120] or 'selesai'

        # 'result' = ringkasan pendek untuk tampilan kantor;
        # 'fullResult' = hasil lengkap (dipakai untuk notifikasi Telegram).
        print(json.dumps({
            'type':       'agent_completed',
            'agentId':    agent_id,
            'result':     summary,
            'fullResult': full[:12000],
        }))

    sys.exit(0)

# ── Common tool uses — broadcast as working status updates ─────────────────
if hook_event == 'PreToolUse' and tool_name in ('Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Skill'):
    inp = d.get('tool_input', {})

    status_map = {
        'Read':  lambda i: f"membaca {i.get('file_path', '').split('/')[-1]}",
        'Write': lambda i: f"menulis {i.get('file_path', '').split('/')[-1]}",
        'Edit':  lambda i: f"mengedit {i.get('file_path', '').split('/')[-1]}",
        'Bash':  lambda i: f"menjalankan: {(i.get('command', '') or i.get('description', ''))[:60]}",
        'Grep':  lambda i: f"mencari '{i.get('pattern', '')[:30]}'",
        'Glob':  lambda i: f"mencari file: {i.get('pattern', '')[:40]}",
        'Skill': lambda i: f"memakai /{i.get('skill', 'skill')}",
    }

    status_fn = status_map.get(tool_name)
    if status_fn:
        status = status_fn(inp)
        print(json.dumps({
            'type': 'agent_working',
            'status': status,
        }))

sys.exit(0)
PYEOF
)
EVENT_JSON=$(printf '%s' "$PAYLOAD" | python3 -c "$PYSCRIPT")

# If Python produced no output, nothing to send
if [ -z "$EVENT_JSON" ]; then
    exit 0
fi

# Send the event, including the auth header if we have a token
# The body goes through stdin (--data-binary @-) so a large result never runs
# into command-line length limits.
if [ -n "$AUTH_HEADER" ]; then
    printf '%s' "$EVENT_JSON" | curl -sf -X POST "$SERVER_URL" \
        -H "Content-Type: application/json" \
        -H "$AUTH_HEADER" \
        --data-binary @- \
        --max-time 3 \
        > /dev/null 2>&1 &
else
    printf '%s' "$EVENT_JSON" | curl -sf -X POST "$SERVER_URL" \
        -H "Content-Type: application/json" \
        --data-binary @- \
        --max-time 3 \
        > /dev/null 2>&1 &
fi

exit 0
