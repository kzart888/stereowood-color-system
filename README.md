# 叠雕画颜色管理系统

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Vue](https://img.shields.io/badge/vue-3.3.4-4FC08D.svg)
![Docker](https://img.shields.io/badge/docker-%3E%3D20.0.0-blue.svg)

**专业的叠雕画颜色管理解决方案**

[功能特性](#功能特性) • [快速开始](#快速开始) • [部署指南](#部署指南) • [开发文档](#开发文档) • [更新日志](#更新日志)

</div>

## 项目简介

叠雕画颜色管理系统是一个专为工厂师傅设计的Web应用，用于管理多层激光切割木板的颜色配方和施工信息。系统提供直观的界面，帮助管理复杂的颜色配方、作品配色方案，以及原料信息。

## 功能特性

### 🎨 自配颜色管理
- **分类管理**: 按色系（蓝、黄、红、绿、紫、色精）科学分类
- **配方管理**: 详细记录颜料配方和适用画层信息
- **图片管理**: 支持颜色样本图片上传和预览
- **历史追踪**: 完整的修改历史记录和版本回溯
- **查重检测**: 智能检测重复配方并支持合并操作

### 🖼️ 作品配色管理
- **多视图模式**: 层号优先视图 / 颜色优先视图自由切换
- **配色方案**: 每个作品支持多套配色方案管理
- **直观展示**: 层号-颜色对应关系清晰可见
- **缩略图支持**: 配色方案缩略图上传和管理

### 🎭 原料管理（蒙马特颜色库）
- **基础颜料**: 管理朱红、桔黄、橘红等基础颜料信息
- **供应商管理**: 颜料供应商信息和采购链接
- **参考价值**: 为自配颜色提供原料参考

### 🔍 全局搜索
- **智能搜索**: 支持颜色编号、名称、作品名等多维度搜索
- **快速定位**: 搜索结果直接跳转到对应条目
- **搜索历史**: 记住常用搜索词，提高效率

### 🧮 配方计算器
- **用量计算**: 根据配方自动计算各颜料用量
- **比例换算**: 支持不同总量下的配方比例换算
- **实时预览**: 浮层式计算器，不影响主界面操作

## 技术栈

### 前端技术
- **Vue 3**: 响应式前端框架，支持组合式API
- **Element Plus**: 企业级UI组件库
- **Axios**: HTTP客户端库
- **原生CSS**: 自定义样式，轻量高效

### 后端技术
- **Node.js**: 服务端运行环境
- **Express**: Web应用框架
- **SQLite**: 轻量级文件数据库
- **Multer**: 文件上传中间件

### 部署技术
- **Docker**: 容器化部署
- **Alpine Linux**: 轻量级基础镜像
- **健康检查**: 内置容器健康监控

## 快速开始

### 方式一：本地开发
```bash
# 克隆项目
git clone https://github.com/kzart888/stereowood-color-system.git
cd stereowood-color-system

# 安装依赖
cd backend && npm install

# 启动服务
npm start

# 访问应用
# 浏览器打开 http://localhost:9099
```

### 方式二：Docker部署
```bash
# 克隆项目
git clone https://github.com/kzart888/stereowood-color-system.git
cd stereowood-color-system

# 构建镜像
docker build -t stereowood-color-system .

# 运行容器
docker run -d \
  --name stereowood \
  -p 9099:9099 \
  -v $(pwd)/data:/data \
  -v $(pwd)/uploads:/app/backend/uploads \
  stereowood-color-system

# 访问应用
# 浏览器打开 http://localhost:9099
```

## 部署指南

详细的部署指南请参考：📖 [部署文档](docs/DEPLOYMENT.md)

支持的部署环境：
- 🖥️ **本地开发**: Windows/macOS/Linux
- ☁️ **云服务器**: Ubuntu/CentOS/Debian
- 🏠 **群辉NAS**: DSM 7.0+ Container Manager
- 🐳 **Docker**: 跨平台容器化部署

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 自配颜色管理  │ │ 作品配色管理  │ │ 原料库管理   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 全局搜索    │ │ 配方计算器   │ │ 图片管理     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                     后端 (Node.js + Express)                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   API路由   │ │  文件上传    │ │  数据验证    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                        数据层 (SQLite)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 颜色数据表   │ │ 作品数据表   │ │ 原料数据表   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 开发文档

### 项目结构
```
stereowood-color-system/
├── backend/                 # 后端源码
│   ├── server.js           # 主服务器文件
│   ├── db/                 # 数据库相关
│   ├── routes/             # API路由
│   ├── services/           # 业务逻辑
│   └── uploads/            # 上传文件存储
├── frontend/               # 前端源码
│   ├── index.html          # 主页面
│   ├── js/                 # JavaScript文件
│   │   ├── app.js         # 主应用入口
│   │   ├── api/           # API调用
│   │   ├── components/    # Vue组件
│   │   ├── modules/       # 功能模块
│   │   └── utils/         # 工具函数
│   └── css/               # 样式文件
├── docs/                   # 文档
│   ├── DEPLOYMENT.md      # 部署指南
│   └── *.md               # 其他文档
├── Dockerfile             # Docker镜像构建
├── docker-compose.yml     # Docker编排
└── README.md              # 项目说明
```

### 核心组件说明

#### 后端模块
- **server.js**: Express服务器主文件，统一路由管理
- **db/**: 数据库连接、迁移和工具函数
- **routes/**: RESTful API路由定义
- **services/**: 业务逻辑处理，如配方计算

#### 前端组件
- **app.js**: Vue主应用，全局状态管理
- **components/**: 各功能页面组件
- **modules/**: 独立功能模块（查重检测、计算器等）
- **utils/**: 通用工具函数

### API接口文档

系统提供RESTful API，主要端点包括：

```
GET    /api/categories           # 获取颜色分类
GET    /api/custom-colors        # 获取自配颜色
POST   /api/custom-colors        # 创建自配颜色
PUT    /api/custom-colors/:id    # 更新自配颜色
DELETE /api/custom-colors/:id    # 删除自配颜色

GET    /api/artworks            # 获取作品列表
POST   /api/artworks            # 创建作品
GET    /api/artworks/:id        # 获取作品详情

GET    /api/mont-marte-colors   # 获取原料列表
POST   /api/mont-marte-colors   # 创建原料
```

## 更新日志

### v0.6.4 (2025-08-14)
- ✅ 修复自配颜色编辑对话框缩略图显示问题
- ✅ 统一前端baseURL为动态获取，完全去除硬编码
- ✅ 优化Docker健康检查和端口配置
- ✅ 完善部署文档和故障排除指南

### v0.6.3 (2025-08-13)
- 🎨 优化前端图片URL生成逻辑
- 🔧 更新.gitignore排除Docker镜像文件
- 📝 完善代码注释和文档

### v0.6.2 (2025-08-12)
- 🐛 修复Vue模板中window对象访问问题
- 🔄 使用Vue生产版本，移除开发警告
- 🖼️ 修复图片路径拼接错误

### v0.6.1 (2025-08-11)
- 🚀 实现自配颜色查重合并功能
- 🔍 添加配方签名算法，精确识别重复配方
- ⚡ 优化前端性能和用户体验

### v0.6.0 (2025-08-10)
- 🎭 新增蒙马特颜色库管理
- 🏪 添加供应商和采购链接管理
- 🔧 重构后端架构，模块化路由
- 📊 完善数据库迁移机制

## 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 遵循ESLint配置
- 组件和函数需要完整注释
- 提交信息使用约定式提交格式

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果这个项目对您有帮助，请考虑给它一个 ⭐！

### 联系方式
- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/kzart888/stereowood-color-system/issues)
- 📖 Wiki: [GitHub Wiki](https://github.com/kzart888/stereowood-color-system/wiki)

---

<div align="center">

**[⬆ 返回顶部](#叠雕画颜色管理系统)**

</div>
