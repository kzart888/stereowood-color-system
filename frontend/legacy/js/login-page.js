(function () {
  const api = window.axios.create({
    baseURL: window.location.origin,
    timeout: 10000,
  });

  const loginSection = document.getElementById('login-section');
  const loginError = document.getElementById('login-error');
  const loginSuccess = document.getElementById('login-success');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('login-btn');
  const toggleRegisterButton = document.getElementById('toggle-register-btn');

  const changeSection = document.getElementById('change-password-section');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const changePasswordButton = document.getElementById('change-password-btn');
  const changePasswordError = document.getElementById('change-password-error');
  const changePasswordSuccess = document.getElementById('change-password-success');

  const registerSection = document.getElementById('register-section');
  const registerUsernameInput = document.getElementById('register-username');
  const registerPasswordInput = document.getElementById('register-password');
  const registerButton = document.getElementById('register-btn');
  const registerError = document.getElementById('register-error');
  const registerSuccess = document.getElementById('register-success');

  function setText(node, text) {
    if (!node) return;
    node.textContent = text || '';
  }

  function clearLoginMessages() {
    setText(loginError, '');
    setText(loginSuccess, '');
  }

  function clearChangeMessages() {
    setText(changePasswordError, '');
    setText(changePasswordSuccess, '');
  }

  function clearRegisterMessages() {
    setText(registerError, '');
    setText(registerSuccess, '');
  }

  function showForcedChangeMode() {
    changeSection.classList.remove('hidden');
    registerSection.classList.add('hidden');
    clearChangeMessages();
  }

  function redirectToApp() {
    window.location.href = '/app';
  }

  async function bootstrapSession() {
    const force = new URLSearchParams(window.location.search).get('force') === '1';
    try {
      const response = await api.get('/api/auth/me');
      const user = response && response.data ? response.data.user : null;
      if (!user) return;
      if (user.must_change_password || force) {
        showForcedChangeMode();
        setText(loginSuccess, `账号 ${user.username} 需先修改密码。`);
        usernameInput.value = user.username || '';
        return;
      }
      redirectToApp();
    } catch {
      if (force) {
        setText(loginError, '请先登录，再完成首次密码修改。');
      }
    }
  }

  async function onLogin() {
    clearLoginMessages();
    clearChangeMessages();
    const username = String(usernameInput.value || '').trim();
    const password = String(passwordInput.value || '');
    if (!username || !password) {
      setText(loginError, '请输入用户名和密码。');
      return;
    }

    loginButton.disabled = true;
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const user = response && response.data ? response.data.user : null;
      if (user && user.must_change_password) {
        showForcedChangeMode();
        currentPasswordInput.value = password;
        setText(loginSuccess, '首次登录请先修改密码。');
        return;
      }

      setText(loginSuccess, '登录成功，正在进入系统...');
      setTimeout(redirectToApp, 250);
    } catch (error) {
      const message =
        error && error.response && error.response.data && error.response.data.error
          ? error.response.data.error
          : '登录失败，请重试。';
      setText(loginError, message);
    } finally {
      loginButton.disabled = false;
    }
  }

  async function onChangePassword() {
    clearChangeMessages();
    const oldPassword = String(currentPasswordInput.value || '');
    const newPassword = String(newPasswordInput.value || '');
    const confirmPassword = String(confirmPasswordInput.value || '');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setText(changePasswordError, '请完整填写密码项。');
      return;
    }
    if (newPassword.length < 8) {
      setText(changePasswordError, '新密码至少8位。');
      return;
    }
    if (newPassword !== confirmPassword) {
      setText(changePasswordError, '两次输入的新密码不一致。');
      return;
    }

    changePasswordButton.disabled = true;
    try {
      await api.post('/api/auth/change-password', { oldPassword, newPassword });
      setText(changePasswordSuccess, '密码修改成功，正在进入系统...');
      setTimeout(redirectToApp, 250);
    } catch (error) {
      const message =
        error && error.response && error.response.data && error.response.data.error
          ? error.response.data.error
          : '密码修改失败，请重试。';
      setText(changePasswordError, message);
    } finally {
      changePasswordButton.disabled = false;
    }
  }

  function onToggleRegister() {
    clearRegisterMessages();
    const hidden = registerSection.classList.contains('hidden');
    if (hidden) {
      registerSection.classList.remove('hidden');
    } else {
      registerSection.classList.add('hidden');
    }
  }

  async function onRegisterRequest() {
    clearRegisterMessages();
    const username = String(registerUsernameInput.value || '').trim();
    const password = String(registerPasswordInput.value || '');
    if (!username || !password) {
      setText(registerError, '请输入申请用户名和密码。');
      return;
    }
    if (password.length < 8) {
      setText(registerError, '申请密码至少8位。');
      return;
    }

    registerButton.disabled = true;
    try {
      await api.post('/api/auth/register-request', { username, password });
      setText(registerSuccess, '申请已提交，请等待管理员审批。');
      registerPasswordInput.value = '';
    } catch (error) {
      const message =
        error && error.response && error.response.data && error.response.data.error
          ? error.response.data.error
          : '申请失败，请重试。';
      setText(registerError, message);
    } finally {
      registerButton.disabled = false;
    }
  }

  loginButton.addEventListener('click', onLogin);
  changePasswordButton.addEventListener('click', onChangePassword);
  toggleRegisterButton.addEventListener('click', onToggleRegister);
  registerButton.addEventListener('click', onRegisterRequest);
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onLogin();
  });
  confirmPasswordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onChangePassword();
  });

  bootstrapSession();
})();
