# 用户登录模块技术方案文档

## 1. 概述

本文档描述了用户登录模块的技术实现方案。该模块采用纯前端技术栈（HTML + CSS + JavaScript），通过 Mock 数据模拟后端登录接口，实现邮箱+密码登录功能。

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────┐
│                 登录页面                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 登录表单  │  │ 前端校验  │  │ Mock API │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

### 2.2 技术选型

| 技术 | 用途 | 说明 |
|------|------|------|
| HTML5 | 页面结构 | 语义化标签 |
| CSS3 | 样式布局 | Flexbox/Grid |
| JavaScript (ES6+) | 交互逻辑 | 原生实现 |
| Mock 数据 | 模拟后端 | 本地 JSON 数据 |

## 3. 详细设计

### 3.1 页面结构

```
login.html
├── .login-container
│   ├── .login-header (标题/Logo)
│   ├── .login-form
│   │   ├── .form-group (邮箱)
│   │   │   ├── label
│   │   │   └── input[type="email"]
│   │   ├── .form-group (密码)
│   │   │   ├── label
│   │   │   └── input[type="password"]
│   │   ├── .error-message (错误提示)
│   │   └── button[type="submit"]
│   └── .login-footer (其他链接)
```

### 3.2 前端校验规则

| 字段 | 规则 | 错误提示 |
|------|------|----------|
| 邮箱 | 必填、格式校验 | "请输入邮箱地址" / "邮箱格式不正确" |
| 密码 | 必填、长度6-20位 | "请输入密码" / "密码长度6-20位" |

### 3.3 Mock 数据

```javascript
const MOCK_USERS = [
  {
    email: "admin@example.com",
    password: "123456",
    name: "管理员"
  },
  {
    email: "user@example.com",
    password: "654321",
    name: "普通用户"
  }
];
```

### 3.4 接口模拟

```javascript
// 模拟登录接口
function mockLogin(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        resolve({ code: 200, data: { token: "mock_token", name: user.name } });
      } else {
        reject({ code: 401, message: "邮箱或密码错误" });
      }
    }, 500); // 模拟网络延迟
  });
}
```

### 3.5 状态管理

```
登录状态机:
IDLE → VALIDATING → SUBMITTING → SUCCESS / ERROR → IDLE
```

## 4. 交互流程

```
用户输入 → 实时校验 → 点击登录 → 二次校验 → 调用Mock API → 成功跳转/失败提示
```

## 5. 任务

- **创建登录页面结构**: 使用 HTML5 语义化标签构建登录表单，包含邮箱输入框、密码输入框、登录按钮和错误提示区域。
- **实现前端表单校验**: 编写 JavaScript 校验函数，对邮箱格式和密码长度进行实时校验，并在输入框下方显示错误信息。
- **实现 Mock 登录接口**: 创建模拟用户数据数组，封装返回 Promise 的异步登录函数，模拟 500ms 网络延迟。
- **实现登录交互逻辑**: 绑定表单提交事件，调用校验函数和 Mock 接口，处理登录成功（跳转首页）和失败（显示错误提示）两种结果。
- **添加页面样式美化**: 使用 CSS 实现居中布局、输入框样式、按钮样式、错误提示样式，确保页面在不同屏幕尺寸下正常显示。
- **添加加载状态处理**: 在登录请求期间禁用按钮并显示加载动画，防止重复提交。

## 6. 文件结构

```
login-module/
├── index.html          # 登录页面
├── css/
│   └── style.css       # 样式文件
└── js/
    └── login.js        # 登录逻辑（含Mock数据）
```

## 7. 风险与注意事项

1. **Mock 数据安全性**: 生产环境需替换为真实后端接口，并添加 HTTPS 加密传输
2. **密码处理**: 前端仅做格式校验，实际密码传输需加密（如 Base64 或哈希）
3. **用户体验**: 错误提示需清晰友好，避免泄露具体用户信息
4. **浏览器兼容性**: 确保 ES6+ 语法在目标浏览器中兼容，或使用 Babel 转译