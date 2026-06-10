import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PR_NUMBER = process.env.PR_NUMBER;
const GH_TOKEN = process.env.GH_TOKEN;

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function run() {
  const diff = readFileSync('diff.txt', 'utf8');
  const review = await callClaude(
    `审查以下 diff，直接输出具体的修改建议（重点逻辑、安全、性能），不要额外解释。\n\n${diff}`
  );

  writeFileSync('review.md', review, 'utf8');
  execSync(`gh pr review ${PR_NUMBER} --comment --body-file review.md`, {
    env: { ...process.env, GH_TOKEN },
  });
}

run().catch(e => { console.error(e); process.exit(1); });
