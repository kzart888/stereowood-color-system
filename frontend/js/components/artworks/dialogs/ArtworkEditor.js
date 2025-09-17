(function (global) {
  const ArtworkEditor = {
    name: 'ArtworksArtworkEditor',
    props: {
      visible: { type: Boolean, default: false },
      artworks: { type: Array, default: () => [] }
    },
    emits: ['update:visible', 'created'],
    data() {
      return {
        form: { title: '' },
        artworkRules: {
          title: [
            { required: true, message: '请输入“编号-名称”', trigger: 'blur' },
            { validator: (rule, value, callback) => callback(), trigger: ['blur', 'change'] }
          ]
        },
        artworkTitleStatus: '',
        saving: false,
        _originalSnapshot: null,
        _escHandler: null
      };
    },
    computed: {
      dialogVisible: {
        get() {
          return this.visible;
        },
        set(val) {
          this.$emit('update:visible', val);
        }
      }
    },
    watch: {
      visible(val) {
        if (val) {
          this.bindEsc();
          this.resetForm();
          this._originalSnapshot = JSON.stringify(this.form);
        } else {
          this.unbindEsc();
          this._originalSnapshot = null;
        }
      }
    },
    methods: {
      resetForm() {
        this.form = { title: '' };
        this.artworkTitleStatus = '';
        if (this.$refs.artworkFormRef) {
          this.$refs.artworkFormRef.clearValidate();
        }
      },
      bindEsc() {
        if (this._escHandler) {
          return;
        }
        this._escHandler = (event) => {
          if (event.key === 'Escape' && this.dialogVisible) {
            this.attemptClose();
          }
        };
        document.addEventListener('keydown', this._escHandler);
      },
      unbindEsc() {
        if (this._escHandler) {
          document.removeEventListener('keydown', this._escHandler);
          this._escHandler = null;
        }
      },
      isDirty() {
        if (!this._originalSnapshot) {
          return false;
        }
        return JSON.stringify(this.form) !== this._originalSnapshot;
      },
      async attemptClose() {
        if (this.isDirty()) {
          try {
            await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
              confirmButtonText: '丢弃修改',
              cancelButtonText: '继续编辑',
              type: 'warning'
            });
          } catch (error) {
            return;
          }
        }
        this.dialogVisible = false;
      },
      parseArtworkTitle(str) {
        const value = String(str || '').trim();
        const idx = value.indexOf('-');
        if (idx <= 0 || idx === value.length - 1) {
          return null;
        }
        const code = value.slice(0, idx).trim();
        const name = value.slice(idx + 1).trim();
        return { code, name };
      },
      validateArtworkTitle(rule, value, callback) {
        const raw = String(value || '').trim();
        if (!raw) {
          callback(new Error('请输入“编号-名称”'));
          return;
        }
        const parsed = this.parseArtworkTitle(raw);
        if (!parsed) {
          callback(new Error('格式应为：编号-名称'));
          return;
        }
        const codeRe = /^[A-Z0-9]{3,5}$/;
        const nameRe = /^[A-Za-z0-9\u4e00-\u9fa5 ]+$/;
        if (!codeRe.test(parsed.code)) {
          callback(new Error('编号须为3-5位字母或数字'));
          return;
        }
        if (!nameRe.test(parsed.name) || parsed.name.includes('-')) {
          callback(new Error('名称仅允许中英文/数字/空格，且不能包含 -'));
          return;
        }
        const norm = (input) => String(input || '').replace(/\s+/g, '').toLowerCase();
        const targetCode = norm(parsed.code);
        const targetName = norm(parsed.name);
        const exists = (this.artworks || []).some((art) => {
          const artCode = norm(art.code || art.no || '');
          const artName = norm(art.name || art.title || '');
          return artCode === targetCode && artName === targetName;
        });
        if (exists) {
          callback(new Error('该作品已存在'));
          return;
        }
        callback();
      },
      onArtworkTitleInput() {
        const current = this.form.title || '';
        const idx = current.indexOf('-');
        if (idx > 0) {
          const left = current.slice(0, idx).toUpperCase();
          const right = current.slice(idx + 1);
          const combined = `${left}-${right}`;
          if (combined !== current) {
            this.form.title = combined;
          }
        }
        const parsed = this.parseArtworkTitle(this.form.title);
        if (!parsed) {
          this.artworkTitleStatus = '';
          return;
        }
        const codeRe = /^[A-Z0-9]{3,5}$/;
        const nameRe = /^[A-Za-z0-9\u4e00-\u9fa5 ]+$/;
        if (!codeRe.test(parsed.code) || !nameRe.test(parsed.name) || parsed.name.includes('-')) {
          this.artworkTitleStatus = '';
          return;
        }
        const norm = (input) => String(input || '').replace(/\s+/g, '').toLowerCase();
        const targetCode = norm(parsed.code);
        const targetName = norm(parsed.name);
        const exists = (this.artworks || []).some((art) => {
          const artCode = norm(art.code || art.no || '');
          const artName = norm(art.name || art.title || '');
          return artCode === targetCode && artName === targetName;
        });
        this.artworkTitleStatus = exists ? '' : 'ok';
      },
      async saveArtwork() {
        const valid = await this.$refs.artworkFormRef.validate().catch(() => false);
        if (!valid) {
          return;
        }
        const parsed = this.parseArtworkTitle(this.form.title);
        if (!parsed) {
          return;
        }
        this.saving = true;
        try {
          await axios.post(`${window.location.origin}/api/artworks`, {
            code: parsed.code,
            name: parsed.name
          });
          msg.success('已创建新作品');
          this.$emit('created');
          this.dialogVisible = false;
        } catch (error) {
          (global.logger || console).error && (global.logger || console).error('创建作品失败', error);
          msg.error('创建失败');
        } finally {
          this.saving = false;
        }
      },
      handleOpen() {
        this._originalSnapshot = JSON.stringify(this.form);
      },
      handleClose() {
        this._originalSnapshot = null;
      }
    },
    mounted() {
      if (this.artworkRules && this.artworkRules.title && this.artworkRules.title.length > 1) {
        this.artworkRules.title[1].validator = (rule, value, callback) => this.validateArtworkTitle(rule, value, callback);
      }
    },
    template: `
      <el-dialog
        class="scheme-dialog"
        v-model="dialogVisible"
        title="新作品"
        width="480px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @open="handleOpen"
        @close="handleClose"
      >
        <el-form ref="artworkFormRef" :model="form" :rules="artworkRules" label-width="80px" @keydown.enter.stop.prevent="saveArtwork">
          <el-form-item label="作品" prop="title" required>
            <el-input v-model.trim="form.title" placeholder="示例：C02-中国结02" @input="onArtworkTitleInput"></el-input>
            <div class="form-hint">格式：作品编号-作品名称<br>作品编号=3~5位字母/数字（自动转大写）<br>作品名称=中英文或数字，不含特殊符号（- * / 等）</div>
            <div v-if="artworkTitleStatus==='ok'" class="form-hint success-hint">可添加此新作品</div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="attemptClose"><el-icon><Close /></el-icon> 取消</el-button>
          <el-button type="primary" :disabled="saving" @click="saveArtwork"><el-icon><Check /></el-icon> 创建</el-button>
        </template>
      </el-dialog>
    `
  };

  global.ArtworksArtworkEditor = ArtworkEditor;
})(typeof window !== 'undefined' ? window : globalThis);
