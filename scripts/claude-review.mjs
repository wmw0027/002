import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PR_NUMBER = process.env.PR_NUMBER;
const GH_TOKEN = process.env.GH_TOKEN;

const diff = readFileSync('diff.txt', 'utf8');

async function callAI(prompt, maxTokens = 2048) {
  if (!ANTHROPIC_API_KEY) throw new Error('API key not set');
  const isDeepSeek = ANTHROPIC_API_KEY.startsWith('sk-') && !ANTHROPIC_API_KEY.startsWith('sk-ant-');

  if (isDeepSeek) {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANTHROPIC_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
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

function staticChecks(diffLines) {
  const issues = [];
  const addedLines = diffLines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  if (addedLines.length > 500) issues.push(`- **大量新增**: ${addedLines.length} 行，建议拆分。`);
  const consoleCount = addedLines.filter(l => /console\.(log|warn|error)/.test(l)).length;
  if (consoleCount > 0) issues.push(`- **console 残留**: ${consoleCount} 处。`);
  const innerCount = addedLines.filter(l => /innerHTML|dangerouslySetInnerHTML/.test(l)).length;
  if (innerCount > 0) issues.push(`- **XSS 风险**: 使用了 innerHTML。`);
  return issues;
}

async function run() {
  const lines = diff.split('\n');
  let review;

  try {
    review = await callAI(`审查以下 diff，直接输出具体的修改建议（重点逻辑、安全、性能），不要额外解释。\n\n${diff}`);
  } catch {
    const checks = staticChecks(lines);
    review = '## 自动审查\n\n' + (checks.length > 0 ? checks.join('\n') : '未发现明显问题。');
  }

  writeFileSync('review.md', review, 'utf8');
  execSync(`gh pr review ${PR_NUMBER} --comment --body-file review.md`, {
    env: { ...process.env, GH_TOKEN },
  });
}

run().catch(e => { console.error(e); process.exit(1); });
