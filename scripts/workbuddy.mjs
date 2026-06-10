import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { request } from '@octokit/request';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const ASSIGNEE = "wmw0027";

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
    const tasks = parseTasksFromBody(specBody);
    const specMd = generateSpec(specTitle, specBody, tasks);
    writeFileSync(specFilePath, specMd, 'utf8');

    execSync('git config user.name "WorkBuddy Bot"');
    execSync('git config user.email "bot@workbuddy"');
    execSync(`git add ${specFilePath}`);
    execSync(`git commit -m "Auto-generate SPEC for #${issueNumber}"`);
    execSync('git push');
  }

  const specContent = readFileSync(specFilePath, 'utf8');
  const tasks = parseTasksFromSpec(specContent);

  for (const task of tasks) {
    const { data: newIssue } = await octokit('POST /repos/{owner}/{repo}/issues', {
      owner, repo,
      title: `[任务] ${task.title}`,
      body: `关联需求: #${issueNumber}\n\n${task.description}`,
      labels: ['task'],
    });
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

function parseTasksFromBody(body) {
  const match = body.match(/##\s*功能点\s*\n([\s\S]*?)(?=##|$)/i);
  if (!match) return [];
  const lines = match[1].trim().split('\n');
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*[:：]?\s*(.*)/);
    if (m) {
      tasks.push({ title: m[1].trim(), description: m[2].trim() || m[1].trim() });
    }
  }
  return tasks;
}

function parseTasksFromSpec(spec) {
  const match = spec.match(/##\s*任务\s*\n([\s\S]*?)(?=##|$)/i);
  if (!match) return [];
  const lines = match[1].split('\n');
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
    if (m) tasks.push({ title: m[1].trim(), description: m[2].trim() });
  }
  return tasks;
}

function generateSpec(title, body, tasks) {
  const taskList = tasks.map(t => `- **${t.title}**: ${t.description}`).join('\n');
  return `# ${title}

## 需求概述

${body}

## 任务

${taskList}

## 技术方案

根据需求分析，按以上任务顺序依次实现。每个任务完成后提交一个 PR，审查通过后合并。
`;
}

run().catch(e => { console.error(e); process.exit(1); });
