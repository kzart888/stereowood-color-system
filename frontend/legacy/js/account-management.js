(function () {
  const { createApp } = Vue;

  function createClient() {
    return window.axios.create({
      baseURL: window.location.origin,
      timeout: 10000,
    });
  }

  function defaultPermissions() {
    return {
      can_reset: false,
      can_revoke: false,
      can_disable: false,
      can_enable: false,
      can_delete: false,
      can_promote: false,
      can_demote: false,
    };
  }

  function mergePermissions(source) {
    return { ...defaultPermissions(), ...(source || {}) };
  }

  const app = createApp({
    data() {
      return {
        client: createClient(),
        me: {
          id: null,
          username: '',
          role: 'user',
        },
        pending: [],
        accounts: [],
        selectedRows: [],
        search: '',
        status: 'all',
        newUser: {
          username: '',
        },
      };
    },
    computed: {
      canCreateUser() {
        const username = String(this.newUser.username || '').trim();
        return username.length >= 3;
      },
      selectedRowsForBatchReset() {
        return this.selectedRows.filter((row) => this.allow(row, 'can_reset'));
      },
    },
    async mounted() {
      await this.bootstrap();
    },
    methods: {
      roleLabel(role) {
        if (role === 'super_admin') return '超级管理员';
        if (role === 'admin') return '管理员';
        return '普通用户';
      },
      roleTagType(role) {
        if (role === 'super_admin') return 'danger';
        if (role === 'admin') return 'warning';
        return 'info';
      },
      statusTagType(status) {
        if (status === 'approved') return 'success';
        if (status === 'pending') return 'warning';
        if (status === 'disabled') return 'danger';
        return 'info';
      },
      notify(type, message) {
        window.ElementPlus.ElMessage({ type, message });
      },
      getErrorMessage(error, fallback) {
        return (
          (error && error.response && error.response.data && error.response.data.error) ||
          (error && error.message) ||
          fallback
        );
      },
      allow(row, permissionKey) {
        const permissions = row && row.permissions ? row.permissions : defaultPermissions();
        return Boolean(permissions[permissionKey]);
      },
      isRowSelectable(row) {
        return this.allow(row, 'can_reset');
      },
      actionBlockedReason(row, permissionKey) {
        if (this.allow(row, permissionKey)) return '';
        if (!row) return '';

        if (String(row.id) === String(this.me.id)) {
          return '不能对当前登录账号执行此操作';
        }
        if (row.role === 'super_admin') {
          return '不能对超级管理员执行此操作';
        }
        if (this.me.role === 'admin' && row.role === 'admin') {
          return '管理员不能操作管理员账号';
        }
        return '当前角色无此操作权限';
      },
      sanitizeAccountRow(row) {
        return {
          ...row,
          permissions: mergePermissions(row && row.permissions),
        };
      },
      async bootstrap() {
        try {
          const meResp = await this.client.get('/api/auth/me');
          this.me = meResp.data.user || this.me;
        } catch {
          window.location.href = '/login';
          return;
        }

        if (!['super_admin', 'admin'].includes(this.me.role)) {
          this.notify('error', '无账号管理权限');
          window.location.href = '/app';
          return;
        }

        await this.refreshAll();
      },
      async refreshAll() {
        await Promise.all([this.loadPending(), this.loadAccounts()]);
      },
      async loadPending() {
        try {
          const response = await this.client.get('/api/auth/admin/pending');
          this.pending = response.data.pending || [];
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '加载待审批列表失败。'));
        }
      },
      async loadAccounts() {
        try {
          const response = await this.client.get('/api/auth/admin/accounts', {
            params: {
              status: this.status,
              search: this.search,
              page: 1,
              pageSize: 200,
            },
          });
          const rawItems = (response.data && response.data.items) || [];
          this.accounts = rawItems.map((row) => this.sanitizeAccountRow(row));
          this.selectedRows = [];
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '加载账号列表失败。'));
        }
      },
      onSelectionChange(rows) {
        this.selectedRows = (rows || []).filter((row) => this.allow(row, 'can_reset'));
      },
      async createUser() {
        const username = String(this.newUser.username || '').trim();
        if (!username) {
          this.notify('error', '请输入用户名。');
          return;
        }
        try {
          await this.client.post('/api/auth/admin/accounts', {
            username,
            role: 'user',
            status: 'approved',
          });
          this.notify('success', '账号创建成功，默认密码为 123456。');
          this.newUser.username = '';
          await this.loadAccounts();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '创建账号失败。'));
        }
      },
      async approve(id) {
        try {
          await this.client.post(`/api/auth/admin/requests/${id}/approve`, {});
          this.notify('success', '审批通过。');
          await this.refreshAll();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '审批失败。'));
        }
      },
      async reject(id) {
        try {
          const input = await window.ElementPlus.ElMessageBox.prompt('请输入拒绝原因（可选）', '拒绝申请', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            inputPlaceholder: '可留空',
            type: 'warning',
          }).catch(() => null);
          if (!input) return;
          await this.client.post(`/api/auth/admin/requests/${id}/reject`, {
            reason: input.value || null,
          });
          this.notify('success', '已拒绝申请。');
          await this.refreshAll();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '拒绝失败。'));
        }
      },
      async resetOne(row) {
        if (!this.allow(row, 'can_reset')) return;
        try {
          await window.ElementPlus.ElMessageBox.confirm(
            `确认将账号 ${row.username} 的密码重置为 123456 吗？`,
            '重置密码确认',
            { type: 'warning' }
          );
          await this.client.post(`/api/auth/admin/accounts/${row.id}/reset-password`, {});
          this.notify('success', '密码已重置为 123456。');
          await this.loadAccounts();
        } catch (error) {
          if (error === 'cancel' || error === 'close') return;
          this.notify('error', this.getErrorMessage(error, '重置失败。'));
        }
      },
      async batchReset() {
        if (!this.selectedRowsForBatchReset.length) {
          this.notify('warning', '请先勾选可重置密码的账号。');
          return;
        }

        const selectedIds = this.selectedRowsForBatchReset.map((row) => row.id);
        try {
          await window.ElementPlus.ElMessageBox.confirm(
            `将重置 ${selectedIds.length} 个账号密码为 123456，继续吗？`,
            '第一步确认',
            { type: 'warning' }
          );
          const promptResult = await window.ElementPlus.ElMessageBox.prompt(
            '请输入 RESET 完成二次确认',
            '二次确认',
            {
              inputPlaceholder: 'RESET',
              confirmButtonText: '确认重置',
              cancelButtonText: '取消',
              type: 'warning',
            }
          );
          if (String(promptResult.value || '').trim().toUpperCase() !== 'RESET') {
            this.notify('error', '二次确认失败，未执行重置。');
            return;
          }
          await this.client.post('/api/auth/admin/accounts/reset-password-batch', {
            ids: selectedIds,
            confirm: 'RESET',
          });
          this.notify('success', `已重置 ${selectedIds.length} 个账号密码。`);
          await this.loadAccounts();
        } catch (error) {
          if (error === 'cancel' || error === 'close') return;
          this.notify('error', this.getErrorMessage(error, '批量重置失败。'));
        }
      },
      async revoke(row) {
        if (!this.allow(row, 'can_revoke')) return;
        try {
          await this.client.post(`/api/auth/admin/accounts/${row.id}/revoke-sessions`, {});
          this.notify('success', '已踢下线。');
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '操作失败。'));
        }
      },
      async disable(row) {
        if (!this.allow(row, 'can_disable')) return;
        try {
          await this.client.post(`/api/auth/admin/accounts/${row.id}/disable`, {});
          this.notify('success', '账号已禁用。');
          await this.loadAccounts();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '禁用失败。'));
        }
      },
      async enable(row) {
        if (!this.allow(row, 'can_enable')) return;
        try {
          await this.client.post(`/api/auth/admin/accounts/${row.id}/enable`, {});
          this.notify('success', '账号已启用。');
          await this.loadAccounts();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '启用失败。'));
        }
      },
      async remove(row) {
        if (!this.allow(row, 'can_delete')) return;
        try {
          await window.ElementPlus.ElMessageBox.confirm(
            `确认删除账号 ${row.username} 吗？此操作不可恢复。`,
            '删除确认',
            { type: 'warning' }
          );
          await this.client.delete(`/api/auth/admin/accounts/${row.id}`);
          this.notify('success', '账号已删除。');
          await this.loadAccounts();
        } catch (error) {
          if (error === 'cancel' || error === 'close') return;
          this.notify('error', this.getErrorMessage(error, '删除失败。'));
        }
      },
      async promote(row) {
        if (!this.allow(row, 'can_promote')) return;
        try {
          await this.client.post(`/api/auth/admin/accounts/${row.id}/promote-admin`, {});
          this.notify('success', '已指派为管理员。');
          await this.loadAccounts();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '指派失败。'));
        }
      },
      async demote(row) {
        if (!this.allow(row, 'can_demote')) return;
        try {
          await this.client.post(`/api/auth/admin/accounts/${row.id}/demote-admin`, {});
          this.notify('success', '已撤销管理员身份。');
          await this.loadAccounts();
        } catch (error) {
          this.notify('error', this.getErrorMessage(error, '撤销失败。'));
        }
      },
      async logout() {
        try {
          await this.client.post('/api/auth/logout', {});
        } catch {
          // ignore
        }
        window.location.href = '/login';
      },
      goApp() {
        window.location.href = '/app';
      },
    },
  });

  app.use(window.ElementPlus);
  app.mount('#account-app');
})();
