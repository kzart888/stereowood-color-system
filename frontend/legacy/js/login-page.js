(function () {
  const api = window.axios.create({
    baseURL: window.location.origin,
    timeout: 10000,
  });

  const loginError = document.getElementById('login-error');
  const loginSuccess = document.getElementById('login-success');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('login-btn');
  const applyButton = document.getElementById('apply-btn');

  const changeSection = document.getElementById('change-password-section');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const changePasswordButton = document.getElementById('change-password-btn');
  const changePasswordError = document.getElementById('change-password-error');
  const changePasswordSuccess = document.getElementById('change-password-success');

  function setText(node, text) {
    if (node) {
      node.textContent = text || '';
    }
  }

  function clearLoginMessages() {
    setText(loginError, '');
    setText(loginSuccess, '');
  }

  function clearChangeMessages() {
    setText(changePasswordError, '');
    setText(changePasswordSuccess, '');
  }

  function setAuthButtonsDisabled(disabled) {
    loginButton.disabled = Boolean(disabled);
    applyButton.disabled = Boolean(disabled);
  }

  function showForcedChangeMode(username, currentPassword) {
    changeSection.classList.remove('hidden');
    clearChangeMessages();
    if (username) {
      usernameInput.value = username;
    }
    if (currentPassword) {
      currentPasswordInput.value = currentPassword;
    }
  }

  function redirectToApp() {
    window.location.href = '/app';
  }

  function normalizeError(error) {
    const data = error && error.response && error.response.data ? error.response.data : null;
    return {
      code: data && data.code ? String(data.code) : '',
      message: data && data.error ? String(data.error) : '',
    };
  }

  function mapLoginError(error) {
    const { code, message } = normalizeError(error);
    if (code === 'AUTH_PASSWORD_INCORRECT') {
      return '密码错误，请重试。';
    }
    if (code === 'AUTH_ACCOUNT_NOT_FOUND') {
      return '账号不存在，可申请账号。';
    }
    if (code === 'AUTH_NOT_APPROVED') {
      return '账号待审批或已禁用，请联系管理员。';
    }
    if (message) {
      return message;
    }
    return '登录失败，请重试。';
  }

  function mapApplyError(error) {
    const { code, message } = normalizeError(error);
    if (code === 'AUTH_DUPLICATE_ACCOUNT') {
      return '账号已存在，可直接登录。';
    }
    if (message) {
      return message;
    }
    return '申请失败，请重试。';
  }

  async function bootstrapSession() {
    const force = new URLSearchParams(window.location.search).get('force') === '1';
    try {
      const response = await api.get('/api/auth/me');
      const user = response && response.data ? response.data.user : null;
      if (!user) return;
      if (user.must_change_password || force) {
        showForcedChangeMode(user.username || '', '');
        setText(loginSuccess, `账号 ${user.username || ''} 需要先修改密码。`);
        return;
      }
      redirectToApp();
    } catch (error) {
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

    setAuthButtonsDisabled(true);
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const user = response && response.data ? response.data.user : null;
      if (user && user.must_change_password) {
        showForcedChangeMode(username, password);
        setText(loginSuccess, '首次登录请先修改密码。');
        return;
      }
      setText(loginSuccess, '登录成功，正在进入系统...');
      setTimeout(redirectToApp, 200);
    } catch (error) {
      setText(loginError, mapLoginError(error));
    } finally {
      setAuthButtonsDisabled(false);
    }
  }

  async function onApplyAccount() {
    clearLoginMessages();
    const username = String(usernameInput.value || '').trim();
    const password = String(passwordInput.value || '');
    if (!username || !password) {
      setText(loginError, '请输入用户名和密码后再申请账号。');
      return;
    }
    if (password.length < 8) {
      setText(loginError, '申请账号时，密码至少8位。');
      return;
    }

    setAuthButtonsDisabled(true);
    try {
      await api.post('/api/auth/register-request', { username, password });
      setText(loginSuccess, '账号申请已提交，请等待管理员审批。');
    } catch (error) {
      setText(loginError, mapApplyError(error));
    } finally {
      setAuthButtonsDisabled(false);
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
      const { message } = normalizeError(error);
      setText(changePasswordError, message || '密码修改失败，请重试。');
    } finally {
      changePasswordButton.disabled = false;
    }
  }

  loginButton.addEventListener('click', onLogin);
  applyButton.addEventListener('click', onApplyAccount);
  changePasswordButton.addEventListener('click', onChangePassword);

  usernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onLogin();
  });
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onLogin();
  });
  confirmPasswordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onChangePassword();
  });

  bootstrapSession();
})();
