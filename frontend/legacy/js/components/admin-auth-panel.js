const AdminAuthPanelComponent = {
  name: 'AdminAuthPanelComponent',
  data() {
    return {
      loading: false,
      dialogVisible: false,
      username: '',
      password: '',
      registerUsername: '',
      registerPassword: '',
      user: null,
      token: '',
      adminKey: '',
      pending: [],
      accounts: [],
      accountSearch: '',
      accountStatus: 'all',
      accountPage: 1,
      accountPageSize: 20,
      accountTotal: 0,
      newAccount: {
        username: '',
        password: '',
        status: 'approved',
      },
      runtimeFlags: {
        authEnforceWrites: false,
        readOnlyMode: false,
      },
    };
  },
  computed: {
    isLoggedIn() {
      return !!(this.user && this.token);
    },
  },
  mounted() {
    this.loadStoredState();
  },
  methods: {
    getApi() {
      if (window.api && window.api.auth) return window.api.auth;
      if (window.apiGateway && window.apiGateway.auth) {
        return {
          registerRequest: (payload) => window.apiGateway.auth.registerRequest(window.location.origin, payload),
          login: (payload) => window.apiGateway.auth.login(window.location.origin, payload),
          logout: () => window.apiGateway.auth.logout(window.location.origin),
          me: () => window.apiGateway.auth.me(window.location.origin),
          listPending: (adminKey) => window.apiGateway.auth.listPending(window.location.origin, adminKey),
          listAccounts: (adminKey, params) => window.apiGateway.auth.listAccounts(window.location.origin, adminKey, params),
          createAccount: (adminKey, payload) => window.apiGateway.auth.createAccount(window.location.origin, adminKey, payload),
          approveRequest: (adminKey, accountId) => window.apiGateway.auth.approveRequest(window.location.origin, adminKey, accountId),
          rejectRequest: (adminKey, accountId, reason) =>
            window.apiGateway.auth.rejectRequest(window.location.origin, adminKey, accountId, reason),
          resetPassword: (adminKey, accountId, password) =>
            window.apiGateway.auth.resetPassword(window.location.origin, adminKey, accountId, password),
          disableAccount: (adminKey, accountId, reason) =>
            window.apiGateway.auth.disableAccount(window.location.origin, adminKey, accountId, reason),
          enableAccount: (adminKey, accountId) => window.apiGateway.auth.enableAccount(window.location.origin, adminKey, accountId),
          deleteAccount: (adminKey, accountId) => window.apiGateway.auth.deleteAccount(window.location.origin, adminKey, accountId),
          revokeSessions: (adminKey, accountId) =>
            window.apiGateway.auth.revokeSessions(window.location.origin, adminKey, accountId),
          getRuntimeFlags: (adminKey) => window.apiGateway.auth.getRuntimeFlags(window.location.origin, adminKey),
          setRuntimeFlags: (adminKey, payload) =>
            window.apiGateway.auth.setRuntimeFlags(window.location.origin, adminKey, payload),
        };
      }
      throw new Error('auth api is unavailable');
    },
    notify(type, message) {
      if (window.ElementPlus && window.ElementPlus.ElMessage) {
        window.ElementPlus.ElMessage({ type, message });
        return;
      }
      if (type === 'error') {
        console.error(message);
      } else {
        console.log(message);
      }
    },
    loadStoredState() {
      try {
        this.adminKey = localStorage.getItem('sw-admin-key') || '';
      } catch {
        this.adminKey = '';
      }
      try {
        this.token = localStorage.getItem('sw-auth-token') || '';
      } catch {
        this.token = '';
      }
      if (this.token) {
        window.authSessionToken = this.token;
        this.refreshMe();
      }
    },
    async refreshMe() {
      if (!this.token) return;
      try {
        const response = await this.getApi().me();
        this.user = response.data.user || null;
      } catch {
        this.clearSession(false);
      }
    },
    saveAdminKey() {
      try {
        localStorage.setItem('sw-admin-key', this.adminKey || '');
      } catch {
        // ignore storage failure
      }
      this.notify('success', 'Admin key saved locally.');
    },
    setSession(token, user) {
      this.token = token;
      this.user = user || null;
      window.authSessionToken = token;
      try {
        localStorage.setItem('sw-auth-token', token);
      } catch {
        // ignore storage failure
      }
    },
    clearSession(showToast = true) {
      this.token = '';
      this.user = null;
      window.authSessionToken = '';
      try {
        localStorage.removeItem('sw-auth-token');
      } catch {
        // ignore storage failure
      }
      if (showToast) {
        this.notify('success', 'Logged out.');
      }
    },
    async login() {
      if (!this.username || !this.password) {
        this.notify('error', 'Username and password are required.');
        return;
      }
      this.loading = true;
      try {
        const response = await this.getApi().login({
          username: this.username,
          password: this.password,
        });
        const payload = response.data || {};
        this.setSession(payload.token, payload.user);
        this.password = '';
        this.notify('success', `Login success${payload.revoked_sessions ? ` (${payload.revoked_sessions} old session(s) revoked)` : ''}.`);
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Login failed.');
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      if (!this.token) {
        this.clearSession(false);
        return;
      }
      this.loading = true;
      try {
        await this.getApi().logout();
      } catch {
        // ignore logout API errors
      } finally {
        this.clearSession(true);
        this.loading = false;
      }
    },
    async registerRequest() {
      if (!this.registerUsername || !this.registerPassword) {
        this.notify('error', 'Registration username and password are required.');
        return;
      }
      this.loading = true;
      try {
        await this.getApi().registerRequest({
          username: this.registerUsername,
          password: this.registerPassword,
        });
        this.registerPassword = '';
        this.notify('success', 'Registration request submitted.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Registration failed.');
      } finally {
        this.loading = false;
      }
    },
    async openAdminDialog() {
      if (!this.adminKey) {
        this.notify('error', 'Admin key is required.');
        return;
      }
      this.dialogVisible = true;
      await this.refreshAdminData();
    },
    async refreshAdminData() {
      if (!this.adminKey) return;
      try {
        const [pendingRes, accountsRes, flagsRes] = await Promise.all([
          this.getApi().listPending(this.adminKey),
          this.getApi().listAccounts(this.adminKey, {
            page: this.accountPage,
            pageSize: this.accountPageSize,
            status: this.accountStatus,
            search: this.accountSearch,
          }),
          this.getApi().getRuntimeFlags(this.adminKey),
        ]);
        this.pending = pendingRes.data.pending || [];
        this.accounts = accountsRes.data.items || [];
        this.accountTotal = accountsRes.data.pagination ? accountsRes.data.pagination.total : 0;
        this.runtimeFlags = flagsRes.data.flags || this.runtimeFlags;
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Admin refresh failed.');
      }
    },
    async approve(accountId) {
      try {
        await this.getApi().approveRequest(this.adminKey, accountId);
        await this.refreshAdminData();
        this.notify('success', 'Account approved.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Approve failed.');
      }
    },
    async reject(accountId) {
      const reason = window.prompt('Reject reason (optional):', '') || '';
      try {
        await this.getApi().rejectRequest(this.adminKey, accountId, reason);
        await this.refreshAdminData();
        this.notify('success', 'Request rejected.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Reject failed.');
      }
    },
    async createAccount() {
      if (!this.newAccount.username || !this.newAccount.password) {
        this.notify('error', 'New account username/password are required.');
        return;
      }
      try {
        await this.getApi().createAccount(this.adminKey, this.newAccount);
        this.newAccount.username = '';
        this.newAccount.password = '';
        this.newAccount.status = 'approved';
        await this.refreshAdminData();
        this.notify('success', 'Account created.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Create account failed.');
      }
    },
    async resetPassword(accountId) {
      const nextPassword = window.prompt('New password (8-128 chars):', '');
      if (!nextPassword) return;
      try {
        await this.getApi().resetPassword(this.adminKey, accountId, nextPassword);
        this.notify('success', 'Password reset.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Reset failed.');
      }
    },
    async disable(accountId) {
      const reason = window.prompt('Disable reason (optional):', '') || '';
      try {
        await this.getApi().disableAccount(this.adminKey, accountId, reason);
        await this.refreshAdminData();
        this.notify('success', 'Account disabled.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Disable failed.');
      }
    },
    async enable(accountId) {
      try {
        await this.getApi().enableAccount(this.adminKey, accountId);
        await this.refreshAdminData();
        this.notify('success', 'Account enabled.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Enable failed.');
      }
    },
    async revoke(accountId) {
      try {
        await this.getApi().revokeSessions(this.adminKey, accountId);
        this.notify('success', 'Sessions revoked.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Revoke sessions failed.');
      }
    },
    async remove(accountId) {
      if (!window.confirm('Delete this account? This cannot be undone.')) return;
      try {
        await this.getApi().deleteAccount(this.adminKey, accountId);
        await this.refreshAdminData();
        this.notify('success', 'Account deleted.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Delete failed.');
      }
    },
    async saveRuntimeFlags() {
      try {
        await this.getApi().setRuntimeFlags(this.adminKey, this.runtimeFlags);
        this.notify('success', 'Runtime flags updated.');
      } catch (error) {
        this.notify('error', (error.response && error.response.data && error.response.data.error) || error.message || 'Runtime flags update failed.');
      }
    },
  },
  template: `
    <div class="auth-admin-toolbar">
      <div class="auth-block">
        <template v-if="!isLoggedIn">
          <el-input v-model.trim="username" size="small" placeholder="username" style="width:120px;"></el-input>
          <el-input v-model="password" size="small" type="password" placeholder="password" style="width:140px;"></el-input>
          <el-button size="small" type="primary" :loading="loading" @click="login">Login</el-button>
          <el-input v-model.trim="registerUsername" size="small" placeholder="register username" style="width:150px;"></el-input>
          <el-input v-model="registerPassword" size="small" type="password" placeholder="register password" style="width:160px;"></el-input>
          <el-button size="small" @click="registerRequest">Request Account</el-button>
        </template>
        <template v-else>
          <span class="auth-user-label">User: {{ user.username }}</span>
          <el-button size="small" @click="refreshMe">Refresh</el-button>
          <el-button size="small" @click="logout">Logout</el-button>
        </template>
      </div>
      <div class="admin-block">
        <el-input v-model.trim="adminKey" size="small" type="password" placeholder="admin key" style="width:180px;"></el-input>
        <el-button size="small" @click="saveAdminKey">Save Key</el-button>
        <el-button size="small" type="primary" @click="openAdminDialog">Admin Panel</el-button>
      </div>

      <el-dialog v-model="dialogVisible" title="Internal Auth Admin" width="980px" @open="refreshAdminData">
        <div class="admin-runtime-row">
          <el-switch v-model="runtimeFlags.authEnforceWrites" active-text="Auth Enforce Writes"></el-switch>
          <el-switch v-model="runtimeFlags.readOnlyMode" active-text="Read-Only Mode"></el-switch>
          <el-button size="small" type="primary" @click="saveRuntimeFlags">Save Runtime Flags</el-button>
        </div>

        <div class="admin-create-row">
          <el-input v-model.trim="newAccount.username" size="small" placeholder="new username" style="width:160px;"></el-input>
          <el-input v-model="newAccount.password" size="small" type="password" placeholder="new password" style="width:180px;"></el-input>
          <el-select v-model="newAccount.status" size="small" style="width:120px;">
            <el-option label="approved" value="approved"></el-option>
            <el-option label="disabled" value="disabled"></el-option>
          </el-select>
          <el-button size="small" type="primary" @click="createAccount">Create Account</el-button>
        </div>

        <h4>Pending Requests</h4>
        <div class="admin-pending-list">
          <div v-if="pending.length===0" class="admin-empty">No pending requests.</div>
          <div v-for="item in pending" :key="'pending-'+item.id" class="admin-row">
            <span>#{{item.id}} {{item.username}} ({{item.status}})</span>
            <span>
              <el-button size="small" type="success" @click="approve(item.id)">Approve</el-button>
              <el-button size="small" type="danger" @click="reject(item.id)">Reject</el-button>
            </span>
          </div>
        </div>

        <h4>Accounts</h4>
        <div class="admin-filter-row">
          <el-input v-model.trim="accountSearch" size="small" placeholder="search username" style="width:180px;"></el-input>
          <el-select v-model="accountStatus" size="small" style="width:140px;">
            <el-option label="all" value="all"></el-option>
            <el-option label="approved" value="approved"></el-option>
            <el-option label="pending" value="pending"></el-option>
            <el-option label="disabled" value="disabled"></el-option>
          </el-select>
          <el-button size="small" @click="refreshAdminData">Search</el-button>
          <span class="admin-total">Total: {{ accountTotal }}</span>
        </div>
        <div class="admin-account-list">
          <div v-if="accounts.length===0" class="admin-empty">No accounts.</div>
          <div v-for="item in accounts" :key="'acct-'+item.id" class="admin-row">
            <span>#{{item.id}} {{item.username}} ({{item.status}})</span>
            <span class="admin-actions">
              <el-button size="small" @click="resetPassword(item.id)">Reset PW</el-button>
              <el-button size="small" @click="revoke(item.id)">Revoke Sessions</el-button>
              <el-button size="small" type="warning" v-if="item.status!=='disabled'" @click="disable(item.id)">Disable</el-button>
              <el-button size="small" type="success" v-if="item.status==='disabled'" @click="enable(item.id)">Enable</el-button>
              <el-button size="small" type="danger" @click="remove(item.id)">Delete</el-button>
            </span>
          </div>
        </div>
      </el-dialog>
    </div>
  `,
};

