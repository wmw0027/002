import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const PR_NUMBER = process.env.PR_NUMBER;
const GH_TOKEN = process.env.GH_TOKEN;

const diff = readFileSync('diff.txt', 'utf8');
const lines = diff.split('\n');

// 基础静态检查
const issues = [];

// 检查 1: 大文件 (>500 行新增)
const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
if (addedLines > 500) {
  issues.push(`- **大量新增**: 本 PR 新增 ${addedLines} 行代码，建议拆分为多个小 PR。`);
}

// 检查 2: console.log 残留
const consoleLogs = lines.filter(l => l.startsWith('+') && /console\.(log|warn|error)/.test(l));
if (consoleLogs.length > 0) {
  issues.push(`- **console 调用**: 发现 ${consoleLogs.length} 处 console 调用，请确认是否应移除。`);
}

// 检查 3: catch 块为空
let catchBlockEmpty = false;
let inCatch = false;
for (const line of lines) {
  if (line.startsWith('+') && /catch\s*\(/.test(line)) {
    inCatch = true;
    catchBlockEmpty = true;
  }
  if (inCatch && line.startsWith('+') && /\S/.test(line.replace('+', '').trim())) {
    catchBlockEmpty = false;
  }
  if (inCatch && (line.startsWith('+') && /^\+\s*\}\s*$/.test(line) || line.startsWith(' ') && /^\s*\}\s*$/.test(line))) {
    if (catchBlockEmpty) {
      issues.push(`- **空 catch 块**: 发现空的 catch 块，请添加错误处理逻辑。`);
    }
    inCatch = false;
    catchBlockEmpty = false;
  }
}

// 检查 4: innerHTML / dangerouslySetInnerHTML
const innerHtml = lines.filter(l => l.startsWith('+') && /innerHTML|dangerouslySetInnerHTML/.test(l));
if (innerHtml.length > 0) {
  issues.push(`- **安全警告**: 使用了 innerHTML，可能存在 XSS 风险，请改用 textContent 或 DOM API。`);
}

// 检查 5: 硬编码密钥/令牌
const secrets = lines.filter(l => l.startsWith('+') && /(password|secret|token|api_key)\s*[:=]\s*['"][^'"]{10,}['"]/i.test(l));
if (secrets.length > 0) {
  issues.push(`- **密钥泄露风险**: 发现疑似硬编码密钥，请改用环境变量。`);
}

let reviewBody;
if (issues.length === 0) {
  reviewBody = '自动审查通过，未发现明显问题。';
} else {
  reviewBody = `## 自动审查发现以下问题\n\n${issues.join('\n')}`;
}

writeFileSync('review.md', reviewBody, 'utf8');
execSync(`gh pr review ${PR_NUMBER} --comment --body-file review.md`, {
  env: { ...process.env, GH_TOKEN },
});
