// Mock 用户数据
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

// 模拟登录接口
function mockLogin(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        resolve({ code: 200, data: { token: "mock_token_" + Date.now(), name: user.name } });
      } else {
        reject({ code: 401, message: "邮箱或密码错误" });
      }
    }, 500); // 模拟网络延迟
  });
}

// DOM 元素
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const generalError = document.getElementById('generalError');
const loginBtn = document.getElementById('loginBtn');

// 状态管理
let isSubmitting = false;

// 校验邮箱
function validateEmail(email) {
  if (!email) {
    return "请输入邮箱地址";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "邮箱格式不正确";
  }
  return "";
}

// 校验密码
function validatePassword(password) {
  if (!password) {
    return "请输入密码";
  }
  if (password.length < 6 || password.length > 20) {
    return "密码长度6-20位";
  }
  return "";
}

// 实时校验
emailInput.addEventListener('input', function() {
  const error = validateEmail(this.value);
  emailError.textContent = error;
  this.classList.toggle('error', !!error);
});

passwordInput.addEventListener('input', function() {
  const error = validatePassword(this.value);
  passwordError.textContent = error;
  this.classList.toggle('error', !!error);
});

// 表单提交
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  if (isSubmitting) return;

  // 二次校验
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const emailErr = validateEmail(email);
  const passwordErr = validatePassword(password);

  emailError.textContent = emailErr;
  passwordError.textContent = passwordErr;
  emailInput.classList.toggle('error', !!emailErr);
  passwordInput.classList.toggle('error', !!passwordErr);

  if (emailErr || passwordErr) {
    return;
  }

  // 提交状态
  isSubmitting = true;
  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';
  generalError.textContent = '';

  try {
    const result = await mockLogin(email, password);
    // 登录成功
    alert(`登录成功！欢迎回来，${result.data.name}`);
    // 这里可以跳转到其他页面，例如：window.location.href = '/dashboard';
  } catch (error) {
    // 登录失败
    generalError.textContent = error.message;
  } finally {
    // 恢复状态
    isSubmitting = false;
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
});