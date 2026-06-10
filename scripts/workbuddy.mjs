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

  const issueBody = issue.body || '';

  // 直接从 Issue body 的结构化语法中解析任务
  // 期望格式：
  //   ## 任务
  //   - **标题**: 描述
  const tasks = parseTasks(issueBody);

  if (tasks.length === 0) {
    console.log('未找到结构化任务，请确保 Issue body 包含 ## 任务 区域');
    process.exit(0);
  }

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

function parseTasks(body) {
  // 匹配 ## 任务 区域
  const match = body.match(/##\s*任务\s*\n([\s\S]*?)(?=##|$)/i);
  if (!match) return [];
  const lines = match[1].split('\n');
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
    if (m) tasks.push({ title: m[1].trim(), description: m[2].trim() });
  }
  return tasks;
}

run().catch(e => { console.error(e); process.exit(1); });
