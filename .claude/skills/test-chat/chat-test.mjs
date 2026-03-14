#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Chat agent test script
// Usage: node chat-test.mjs "message1" "message2" "message3"
// Each argument is a user message sent sequentially, maintaining context.
// ---------------------------------------------------------------------------

const BASE = 'http://localhost:3000/api/chat';
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node chat-test.mjs "message1" "message2" ...');
  process.exit(1);
}

async function chat(messages) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { content: `[ERROR ${res.status}]: ${text}`, tools: [] };
  }

  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.startsWith('data: '));

  let content = '';
  const toolsMap = new Map();

  for (const line of lines) {
    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') continue;
    try {
      const d = JSON.parse(raw);
      const delta = d.choices?.[0]?.delta || {};
      if (delta.content) content += delta.content;
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolsMap.has(idx)) toolsMap.set(idx, { name: '', args: '' });
          const entry = toolsMap.get(idx);
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
        }
      }
    } catch {}
  }

  const tools = [...toolsMap.values()].filter((t) => t.name);
  return { content, tools };
}

const conversation = [];

for (const msg of args) {
  conversation.push({ role: 'user', content: msg });
  console.log(`\n${'='.repeat(70)}`);
  console.log(`USER: ${msg.length > 200 ? msg.slice(0, 200) + '...' : msg}`);
  console.log('='.repeat(70));

  const { content, tools } = await chat(conversation);

  if (tools.length) {
    console.log('TOOLS:');
    tools.forEach((t) => {
      try {
        const parsed = JSON.parse(t.args);
        console.log(`  ${t.name}(${JSON.stringify(parsed)})`);
      } catch {
        console.log(`  ${t.name}(${t.args})`);
      }
    });
  }
  console.log('TEXT:', content || '(empty)');

  // Build assistant message with tool_calls for proper conversation context
  const assistantMsg = { role: 'assistant', content: content || null };
  if (tools.length) {
    assistantMsg.tool_calls = tools.map((t, i) => ({
      id: `call_${Date.now()}_${i}`,
      type: 'function',
      function: { name: t.name, arguments: t.args },
    }));
  }
  conversation.push(assistantMsg);

  // Add tool results so the model doesn't get confused
  if (tools.length) {
    for (const tc of assistantMsg.tool_calls) {
      conversation.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify({ success: true }),
      });
    }
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`DONE — ${args.length} messages sent, conversation complete.`);
