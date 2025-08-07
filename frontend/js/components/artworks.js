// 作品配色管理组件
// 文件路径: frontend/js/components/artworks.js
// 定义全局变量 ArtworksComponent，被 app.js 引用并注册

const ArtworksComponent = {
    template: `
        <div class="tab-content">
            <!-- 顶部操作栏 -->
            <div style="margin-bottom: 20px;">
                <el-button type="primary" @click="showAddDialog = true">
                    <el-icon><Plus /></el-icon> 添加新作品
                </el-button>
            </div>
            
            <!-- 作品列表 -->
            <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                加载中...
            </div>
            
            <div v-else>
                <div v-for="artwork in artworks" :key="artwork.id" class="artwork-bar">
                    <div class="artwork-header">
                        <div class="artwork-title">{{ artwork.code }} - {{ artwork.name }}</div>
                        <div>
                            <el-button type="primary" size="small" @click="addScheme(artwork)">添加配色</el-button>
                            <el-button type="danger" size="small" @click="deleteArtwork(artwork)">删除作品</el-button>
                        </div>
                    </div>
                    
                    <div v-if="artwork.schemes && artwork.schemes.length > 0">
                        <div v-for="scheme in artwork.schemes" :key="scheme.id" class="scheme-bar">
                            <div class="scheme-header">
                                <div class="scheme-thumbnail" 
                                     :style="{ backgroundImage: scheme.thumbnail_path ? 'url(' + baseURL + '/' + scheme.thumbnail_path + ')' : 'none' }">
                                </div>
                                <div class="scheme-name">{{ scheme.scheme_name }}</div>
                                <div style="margin-left: auto;">
                                    <el-button type="primary" size="small" @click="editScheme(scheme)">修改</el-button>
                                    <el-button type="info" size="small" @click="viewHistory(scheme)">历史</el-button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="scheme-bar">
                        <div style="text-align: center; color: #999;">暂无配色方案</div>
                    </div>
                </div>
                
                <div v-if="artworks.length === 0" class="loading">
                    暂无作品数据
                </div>
            </div>
            
            <!-- 添加作品对话框 -->
            <el-dialog v-model="showAddDialog" title="添加新作品" width="500px">
                <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
                    <el-form-item label="作品编号" prop="code">
                        <el-input v-model="form.code" placeholder="例如: 001"></el-input>
                    </el-form-item>
                    <el-form-item label="作品名称" prop="name">
                        <el-input v-model="form.name" placeholder="例如: 蝶恋花"></el-input>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showAddDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveArtwork">保存</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    
    // 注入全局数据
    inject: ['globalData'],
    
    data() {
        return {
            loading: false,
            showAddDialog: false,
            form: {
                code: '',
                name: ''
            },
            rules: {
                code: [{ required: true, message: '请输入作品编号', trigger: 'blur' }],
                name: [{ required: true, message: '请输入作品名称', trigger: 'blur' }]
            }
        };
    },
    
    computed: {
        // 从注入的全局数据获取基础URL
        baseURL() {
            return this.globalData.baseURL;
        },
        // 从注入的全局数据获取作品列表
        artworks() {
            return this.globalData.artworks.value || [];
        }
    },
    
    methods: {
        // 保存新作品
        async saveArtwork() {
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            
            try {
                await api.artworks.create(this.form);
                ElementPlus.ElMessage.success('作品添加成功');
                this.showAddDialog = false;
                this.form = { code: '', name: '' };
                await this.globalData.loadArtworks();
            } catch (error) {
                ElementPlus.ElMessage.error('添加失败');
            }
        },
        
        // 删除作品
        async deleteArtwork(artwork) {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `确定删除作品 ${artwork.name} 吗？`,
                    '提示',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                await api.artworks.delete(artwork.id);
                ElementPlus.ElMessage.success('删除成功');
                await this.globalData.loadArtworks();
            } catch (error) {
                if (error !== 'cancel') {
                    ElementPlus.ElMessage.error('删除失败');
                }
            }
        },
        
        // 添加配色方案（待实现）
        addScheme(artwork) {
            ElementPlus.ElMessage.info('添加配色功能待实现');
        },
        
        // 编辑配色方案（待实现）
        editScheme(scheme) {
            ElementPlus.ElMessage.info('修改配色功能待实现');
        },
        
        // 查看历史记录（待实现）
        viewHistory(scheme) {
            ElementPlus.ElMessage.info('历史功能待实现');
        }
    }
};