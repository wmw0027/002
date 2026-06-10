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

// 状态管理
const State = {
    IDLE: 'idle',
    VALIDATING: 'validating',
    SUBMITTING: 'submitting',
    SUCCESS: 'success',
    ERROR: 'error'
};

let currentState = State.IDLE;

// DOM 元素
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const loginBtn = document.getElementById('loginBtn');

// 校验函数
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { valid: false, message: '请输入邮箱地址' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: '邮箱格式不正确' };
    }
    return { valid: true, message: '' };
}

function validatePassword(password) {
    if (!password || password.trim() === '') {
        return { valid: false, message: '请输入密码' };
    }
    if (password.length < 6 || password.length > 20) {
        return { valid: false, message: '密码长度6-20位' };
    }
    return { valid: true, message: '' };
}

// 显示错误
function showError(element, message) {
    element.textContent = message;
    element.classList.add('visible');
    const input = element.previousElementSibling;
    if (input && input.tagName === 'INPUT') {
        input.classList.add('error');
    }
}

// 清除错误
function clearError(element) {
    element.textContent = '';
    element.classList.remove('visible');
    const input = element.previousElementSibling;
    if (input && input.tagName === 'INPUT') {
        input.classList.remove('error');
    }
}

// 实时校验
function validateField(input, errorElement, validator) {
    const result = validator(input.value);
    if (!result.valid) {
        showError(errorElement, result.message);
        return false;
    } else {
        clearError(errorElement);
        return true;
    }
}

// 表单整体校验
function validateForm() {
    const isEmailValid = validateField(emailInput, emailError, validateEmail);
    const isPasswordValid = validateField(passwordInput, passwordError, validatePassword);
    return isEmailValid && isPasswordValid;
}

// 设置按钮状态
function setButtonState(state) {
    switch (state) {
        case State.IDLE:
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginBtn.textContent = '登录';
            break;
        case State.SUBMITTING:
            loginBtn.disabled = true;
            loginBtn.classList.add('loading');
            loginBtn.textContent = '登录中...';
            break;
        case State.SUCCESS:
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginBtn.textContent = '登录成功';
            break;
        case State.ERROR:
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginBtn.textContent = '登录';
            break;
        default:
            break;
    }
}

// 显示全局错误提示
function showGlobalError(message) {
    // 清除之前的全局错误
    const existingError = document.querySelector('.global-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'global-error';
    errorDiv.style.cssText = `
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        text-align: center;
        margin-bottom: 16px;
        animation: slideIn 0.3s ease;
    `;
    errorDiv.textContent = message;

    const form = document.getElementById('loginForm');
    form.insertBefore(errorDiv, form.firstChild);

    // 3秒后自动消失
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// 处理登录成功
function handleLoginSuccess(response) {
    currentState = State.SUCCESS;
    setButtonState(State.SUCCESS);

    // 存储 token 和用户信息
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('user_name', response.data.name);

    // 显示成功提示
    showGlobalError('登录成功，正在跳转...');

    // 延迟跳转到首页
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// 处理登录失败
function handleLoginError(error) {
    currentState = State.ERROR;
    setButtonState(State.ERROR);
    showGlobalError(error.message || '登录失败，请重试');
}

// 重置状态到 IDLE
function resetToIdle() {
    currentState = State.IDLE;
    setButtonState(State.IDLE);
}

// 表单提交处理
async function handleSubmit(event) {
    event.preventDefault();

    // 防止重复提交
    if (currentState === State.SUBMITTING) {
        return;
    }

    // 二次校验
    currentState = State.VALIDATING;
    if (!validateForm()) {
        currentState = State.IDLE;
        return;
    }

    // 开始提交
    currentState = State.SUBMITTING;
    setButtonState(State.SUBMITTING);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        const response = await mockLogin(email, password);
        handleLoginSuccess(response);
    } catch (error) {
        handleLoginError(error);
        // 3秒后重置状态
        setTimeout(resetToIdle, 3000);
    }
}

// 绑定事件
form.addEventListener('submit', handleSubmit);

// 实时校验事件
emailInput.addEventListener('blur', () => {
    if (currentState === State.IDLE || currentState === State.ERROR) {
        validateField(emailInput, emailError, validateEmail);
    }
});

emailInput.addEventListener('input', () => {
    if (emailError.classList.contains('visible')) {
        validateField(emailInput, emailError, validateEmail);
    }
});

passwordInput.addEventListener('blur', () => {
    if (currentState === State.IDLE || currentState === State.ERROR) {
        validateField(passwordInput, passwordError, validatePassword);
    }
});

passwordInput.addEventListener('input', () => {
    if (passwordError.classList.contains('visible')) {
        validateField(passwordInput, passwordError, validatePassword);
    }
});

// 初始化
resetToIdle();

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// 导出供测试使用
export { validateEmail, validatePassword, mockLogin, MOCK_USERS };