import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { request } from '@octokit/request';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
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

function setupGitAuth(owner, repo) {
  execSync(`git remote set-url origin https://x-access-token:${GITHUB_TOKEN}@github.com/${owner}/${repo}.git`);
  try { execSync('git config --local --unset-all http.https://github.com/.extraheader'); } catch (_) {}
  execSync('git config user.name "WorkBuddy Bot"');
  execSync('git config user.email "bot@workbuddy"');
}

function callClaude(prompt) {
  writeFileSync('/tmp/prompt.txt', prompt, 'utf8');
  // 使用 stdin 管道方式，兼容新版 Claude CLI
  execSync('claude --print < /tmp/prompt.txt > /tmp/claude_output.txt', {
    env: { ...process.env, ANTHROPIC_API_KEY },
    shell: '/bin/bash',
  });
  return readFileSync('/tmp/claude_output.txt', 'utf8');
}

async function run() {
  const [owner, repo] = REPO.split('/');
  setupGitAuth(owner, repo);

  const { data: issue } = await octokit('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner, repo, issue_number: issueNumber,
  });

  const specTitle = issue.title;
  const specBody = issue.body || '';
  const specFilePath = `specs/${issueNumber}-spec.md`;

  // 1. 生成 SPEC（若不存在）
  if (!existsSync(specFilePath)) {
    mkdirSync('specs', { recursive: true });
    const prompt = `你是资深架构师。根据以下需求生成技术方案文档（Markdown）。必须包含一个"## 任务"章节，用列表项列出开发任务（格式：- **任务标题**: 任务描述）。\n\n需求：\n${specTitle}\n${specBody}`;
    const specContent = callClaude(prompt);
    writeFileSync(specFilePath, specContent, 'utf8');

    execSync(`git add ${specFilePath}`);
    execSync(`git commit -m "SPEC for #${issueNumber}"`);
    execSync('git push origin main');
  }

  const specContent = readFileSync(specFilePath, 'utf8');
  const tasks = parseTasks(specContent);

  console.log(`解析到 ${tasks.length} 个任务`);

  // 2. 为每个任务生成代码并提交 PR
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`处理任务 ${i + 1}/${tasks.length}: ${task.title}`);

    // 创建子任务 Issue
    const { data: newIssue } = await octokit('POST /repos/{owner}/{repo}/issues', {
      owner, repo,
      title: `[任务] ${task.title}`,
      body: `关联 SPEC: #${issueNumber}\n${task.description}`,
      labels: ['task'],
    });
    await octokit('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
      owner, repo,
      issue_number: newIssue.number,
      assignees: [ASSIGNEE],
    });
    console.log(`  创建 Issue #${newIssue.number}`);

    // 3. 调用 Claude 生成代码
    const branchName = `task/${newIssue.number}-${task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50)}`;
    execSync(`git checkout main`);
    execSync(`git pull origin main`);
    execSync(`git checkout -b ${branchName}`);

    const projectTree = getProjectTree();
    const codePrompt = `你是全栈工程师。项目根目录内容如下：\n${projectTree}\n\n根据以下需求和项目结构，编写完整的代码变更。直接输出所有需要新增或修改的文件路径和内容，用以下格式：\n\n--- FILE: path/to/file ---\n文件内容\n--- END FILE ---\n\n需求：\n${task.title}\n${task.description}\n\n技术方案参考：\n${specContent.substring(0, 2000)}`;
    const codeOutput = callClaude(codePrompt);

    // 4. 解析输出并写入文件
    const fileBlocks = codeOutput.match(/--- FILE: (.+?) ---\n([\s\S]*?)--- END FILE ---/g);
    if (fileBlocks) {
      for (const block of fileBlocks) {
        const m = block.match(/--- FILE: (.+?) ---\n([\s\S]*?)--- END FILE ---/);
        if (m) {
          const filepath = m[1].trim();
          const content = m[2].trim();
          const dir = filepath.includes('/') ? filepath.substring(0, filepath.lastIndexOf('/')) : '.';
          if (dir !== '.') mkdirSync(dir, { recursive: true });
          writeFileSync(filepath, content, 'utf8');
          console.log(`  写入文件: ${filepath}`);
        }
      }
      console.log(`  共生成 ${fileBlocks.length} 个文件`);
    } else {
      console.log('  警告: Claude 未按预期格式输出文件，跳过代码生成');
    }

    // 5. 提交并推送分支
    execSync('git add .');
    try {
      execSync(`git commit -m "实现 #${newIssue.number} ${task.title}"`);
      execSync(`git push -u origin ${branchName}`);
    } catch (e) {
      console.log('  无变更或推送失败，跳过');
      execSync(`git checkout main`);
      continue;
    }

    // 6. 创建 PR
    try {
      await octokit('POST /repos/{owner}/{repo}/pulls', {
        owner, repo,
        title: `完成 #${newIssue.number} ${task.title}`,
        head: branchName,
        base: 'main',
        body: `Closes #${newIssue.number}`,
      });
      console.log(`  创建 PR 成功`);
    } catch (e) {
      console.log(`  创建 PR 失败: ${e.message}`);
    }

    // 切回 main，准备下一个任务
    execSync('git checkout main');
  }

  // 关闭需求 Issue
  await octokit('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner, repo,
    issue_number: issueNumber,
    state: 'closed',
  });
  console.log(`需求 Issue #${issueNumber} 已关闭`);
}

function getProjectTree() {
  try {
    return execSync('find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./specs/*" | head -100').toString();
  } catch {
    return '（空项目）';
  }
}

function parseTasks(spec) {
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

run().catch(e => { console.error(e); process.exit(1); });
