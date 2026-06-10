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
        }, 500);
    });
}

// DOM 元素
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const generalError = document.getElementById('generalError');
const submitBtn = document.getElementById('submitBtn');

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

// 清除错误提示
function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
    generalError.textContent = "";
    generalError.classList.remove('visible');
    emailInput.style.borderColor = "#e0e0e0";
    passwordInput.style.borderColor = "#e0e0e0";
}

// 显示字段错误
function showFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    input.style.borderColor = message ? "#e74c3c" : "#e0e0e0";
}

// 显示通用错误
function showGeneralError(message) {
    generalError.textContent = message;
    generalError.classList.add('visible');
}

// 实时校验
emailInput.addEventListener('blur', function() {
    const error = validateEmail(this.value);
    showFieldError(this, emailError, error);
});

passwordInput.addEventListener('blur', function() {
    const error = validatePassword(this.value);
    showFieldError(this, passwordError, error);
});

// 输入时清除错误
emailInput.addEventListener('input', function() {
    if (emailError.textContent) {
        emailError.textContent = "";
        this.style.borderColor = "#e0e0e0";
    }
    if (generalError.classList.contains('visible')) {
        generalError.classList.remove('visible');
    }
});

passwordInput.addEventListener('input', function() {
    if (passwordError.textContent) {
        passwordError.textContent = "";
        this.style.borderColor = "#e0e0e0";
    }
    if (generalError.classList.contains('visible')) {
        generalError.classList.remove('visible');
    }
});

// 表单提交
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // 二次校验
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    let hasError = false;
    if (emailErr) {
        showFieldError(emailInput, emailError, emailErr);
        hasError = true;
    }
    if (passwordErr) {
        showFieldError(passwordInput, passwordError, passwordErr);
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // 提交状态
    submitBtn.disabled = true;
    submitBtn.textContent = "登录中...";

    try {
        const result = await mockLogin(email, password);
        // 登录成功
        submitBtn.textContent = "登录成功 ✓";
        submitBtn.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
        // 模拟跳转
        setTimeout(() => {
            alert(`欢迎回来，${result.data.name}！\nToken: ${result.data.token}`);
            // 重置表单（实际项目中会跳转页面）
            form.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = "登录";
            submitBtn.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
        }, 500);
    } catch (error) {
        // 登录失败
        submitBtn.disabled = false;
        submitBtn.textContent = "登录";
        showGeneralError(error.message);
    }
});