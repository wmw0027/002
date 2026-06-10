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

  // 从 Issue body 的结构化语法中解析任务
  // 支持两种格式：
  //   1. ## 任务 / - **标题**: 描述
  //   2. ## 功能点 / 1. 标题: 描述
  const tasks = parseTasks(issueBody);

  if (tasks.length === 0) {
    console.log('未找到结构化任务。请在 Issue body 中使用以下格式之一：');
    console.log('  ## 任务');
    console.log('  - **标题**: 描述');
    console.log('  或');
    console.log('  ## 功能点');
    console.log('  1. 标题: 描述');
    process.exit(0);
  }

  console.log(`解析到 ${tasks.length} 个任务，开始创建子 Issue...`);

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
    console.log(`  已创建 #${newIssue.number}: ${task.title}`);
  }

  // 关闭需求 Issue
  await octokit('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner, repo,
    issue_number: issueNumber,
    state: 'closed',
  });
  console.log(`需求 Issue #${issueNumber} 已关闭`);
}

function parseTasks(body) {
  // 优先匹配 ## 任务 格式
  const taskMatch = body.match(/##\s*任务\s*\n([\s\S]*?)(?=##|$)/i);
  if (taskMatch) {
    return parseTaskList(taskMatch[1]);
  }

  // 其次匹配 ## 功能点 格式
  const pointMatch = body.match(/##\s*功能点\s*\n([\s\S]*?)(?=##|$)/i);
  if (pointMatch) {
    return parseNumberedList(pointMatch[1]);
  }

  return [];
}

function parseTaskList(text) {
  // - **标题**: 描述
  const tasks = [];
  for (const line of text.split('\n')) {
    const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
    if (m) tasks.push({ title: m[1].trim(), description: m[2].trim() });
  }
  return tasks;
}

function parseNumberedList(text) {
  // 1. 标题: 描述
  const tasks = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*[:：]?\s*(.*)/);
    if (m) {
      const title = m[1].trim();
      const desc = m[2].trim() || title;
      tasks.push({ title, description: desc });
    }
  }
  return tasks;
}

run().catch(e => { console.error(e); process.exit(1); });
