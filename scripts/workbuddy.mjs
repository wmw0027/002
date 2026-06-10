import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { request } from '@octokit/request';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ASSIGNEE = "wmw0027";  // 你的 GitHub 用户名

const octokit = request.defaults({
  headers: {
    authorization: `token ${GITHUB_TOKEN}`,
    accept: 'application/vnd.github.v3+json',
  },
});

const issueNumber = process.env.ISSUE_NUMBER;
if (!issueNumber) {
  console.error('No issue number');
  process.exit(1);
}

async function run() {
  const [owner, repo] = REPO.split('/');
  const { data: issue } = await octokit('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner, repo, issue_number: issueNumber,
  });

  const specTitle = issue.title;
  const specBody = issue.body || '';
  const specFilePath = `specs/${issueNumber}-spec.md`;

  if (!existsSync(specFilePath)) {
    mkdirSync('specs', { recursive: true });
    const prompt = `你是资深架构师。根据以下需求生成技术方案文档（Markdown）。必须包含一个"## 任务"章节，用列表项列出开发任务（格式：- **任务标题**: 任务描述）。\n\n需求：\n${specTitle}\n${specBody}`;
    writeFileSync('/tmp/prompt.txt', prompt);
    execSync(`claude --print < /tmp/prompt.txt > ${specFilePath}`, {
      env: { ...process.env, ANTHROPIC_API_KEY },
    });

    execSync('git config user.name "WorkBuddy Bot"');
    execSync('git config user.email "bot@workbuddy"');
    execSync(`git add ${specFilePath}`);
    execSync(`git commit -m "Auto-generate SPEC for #${issueNumber}"`);
    execSync('git push');
  }

  const specContent = readFileSync(specFilePath, 'utf8');
  const tasks = parseTasks(specContent);

  for (const task of tasks) {
    const { data: newIssue } = await octokit('POST /repos/{owner}/{repo}/issues', {
      owner, repo,
      title: `[任务] ${task.title}`,
      body: `关联 SPEC: #${issueNumber}\n${task.description}`,
      labels: ['task'],
    });
    // 自动分配给你
    await octokit('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
      owner, repo,
      issue_number: newIssue.number,
      assignees: [ASSIGNEE],
    });
  }

  // 关闭需求 Issue
  await octokit('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner, repo,
    issue_number: issueNumber,
    state: 'closed',
  });
}

function parseTasks(spec) {
  const match = spec.match(/##\s*任务\s*\n([\s\S]*?)(?=##|$)/i);
  if (!match) return [];
  const lines = match[1].split('\n');
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
    if (m) tasks.push({ title: m[1], description: m[2] });
  }
  return tasks;
}

run().catch(e => { console.error(e); process.exit(1); });
