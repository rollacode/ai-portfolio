---
name: test-chat
description: Test the portfolio chat agent by sending messages and analyzing responses
disable-model-invocation: true
allowed-tools: Bash(node *), Bash(curl *), Bash(cd *), Bash(taskkill *), Bash(npx *), Bash(rm *), Read, Write, Edit
---

# Test Chat Agent

Send messages to the portfolio chat agent running on localhost and analyze the responses.

## How to use

Invoke with `/test-chat` followed by a conversation scenario or specific messages to test.

Examples:
- `/test-chat casual russian conversation`
- `/test-chat recruiter looking for fullstack dev`
- `/test-chat paste this job link: https://example.com/job`

## Setup

1. Make sure the dev server is running. If not, start it:
```bash
cd C:/Developer/ai-portfolio && taskkill //f //im node.exe 2>/dev/null; rm -rf .next && npx next dev --turbopack > /dev/null 2>&1 &
```
Wait ~12 seconds, then verify with `curl -s http://localhost:3000 -o /dev/null -w "%{http_code}"` (expect 200).

2. Use `C:/Developer/ai-portfolio/.claude/skills/test-chat/chat-test.mjs` to send messages.

## Chat test script usage

The script sends a multi-turn conversation and prints tool calls + text for each response.

```bash
node C:/Developer/ai-portfolio/.claude/skills/test-chat/chat-test.mjs "message1" "message2" "message3"
```

Each argument is a separate user message. The script maintains conversation context between messages (including tool_calls and tool results).

## What to analyze

After each test run, evaluate:

1. **Tool usage** — Did the agent use appropriate tools? Did it show relevant panels?
2. **Tone** — Is the agent natural and not too salesy? Not pushing easter eggs?
3. **URL handling** — If a URL was shared, did the agent receive and use the page content?
4. **Visitor engagement** — Does it ask name max 2 times? Does it not repeat questions?
5. **Language** — Does it respond in the same language as the user?
6. **Content quality** — Are answers substantive and relevant?

## Iterative testing

If issues are found:
1. Identify the root cause (prompt? code? tool definition?)
2. Fix it
3. Restart the dev server (kill node, rm .next, restart)
4. Re-test to verify the fix
5. Repeat until the agent behaves well
