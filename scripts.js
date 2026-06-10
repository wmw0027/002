// Mock 数据
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
        resolve({ code: 200, data: { token: "mock_token", name: user.name } });
      } else {
        reject({ code: 401, message: "邮箱或密码错误" });
      }
    }, 500);
  });
}

// 校验邮箱格式
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return "请输入邮箱地址";
  }
  if (!emailRegex.test(email)) {
    return "邮箱格式不正确";
  }
  return "";
}

// 校验密码长度
function validatePassword(password) {
  if (!password) {
    return "请输入密码";
  }
  if (password.length < 6 || password.length > 20) {
    return "密码长度6-20位";
  }
  return "";
}

// 实时校验邮箱
function validateEmailField() {
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const error = validateEmail(emailInput.value);
  
  if (error) {
    emailError.textContent = error;
    emailError.classList.add('visible');
    emailInput.classList.add('error');
    emailInput.classList.remove('success');
  } else {
    emailError.textContent = '';
    emailError.classList.remove('visible');
    emailInput.classList.remove('error');
    emailInput.classList.add('success');
  }
  return !error;
}

// 实时校验密码
function validatePasswordField() {
  const passwordInput = document.getElementById('password');
  const passwordError = document.getElementById('passwordError');
  const error = validatePassword(passwordInput.value);
  
  if (error) {
    passwordError.textContent = error;
    passwordError.classList.add('visible');
    passwordInput.classList.add('error');
    passwordInput.classList.remove('success');
  } else {
    passwordError.textContent = '';
    passwordError.classList.remove('visible');
    passwordInput.classList.remove('error');
    passwordInput.classList.add('success');
  }
  return !error;
}

// 表单提交处理
async function handleSubmit(event) {
  event.preventDefault();
  
  const isEmailValid = validateEmailField();
  const isPasswordValid = validatePasswordField();
  
  if (!isEmailValid || !isPasswordValid) {
    return;
  }
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '登录中...';
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const result = await mockLogin(email, password);
    alert(`登录成功！欢迎回来，${result.data.name}`);
    // 这里可以添加跳转逻辑
    // window.location.href = '/dashboard';
  } catch (error) {
    alert(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '登录';
  }
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginForm = document.getElementById('loginForm');
  
  emailInput.addEventListener('input', validateEmailField);
  passwordInput.addEventListener('input', validatePasswordField);
  loginForm.addEventListener('submit', handleSubmit);
});