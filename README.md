# STEREOWOOD Color Management System

## 🎯 Purpose
Simple, reliable color management system for STEREOWOOD factory production (3-5 users).

## 📋 System Overview

STEREOWOOD Color System is a simplified web application designed for managing color formulas and artwork schemes in a small factory setting. Built for ease of maintenance by a 2-person team.

### Core Features
- **自配色管理** - Custom color formula management with duplicate detection
- **作品配色管理** - Artwork layer-to-color mapping
- **颜色原料管理** - Mont-Marte raw material management  
- **配方计算器** - Quick formula ratio calculations
- **查重功能** - Automatic duplicate formula detection

## 🚀 Quick Start

### Windows Users
1. Double-click `start.bat`
2. Open browser: http://localhost:3000

### Mac/Linux Users
```bash
npm install  # First time only
npm start    # Start the system
npm start

# 4. 访问应用
# 浏览器打开: http://localhost:9099
```

### Docker 快速部署

```bash
# 构建镜像
docker build -t stereowood-color-system .

# 运行容器
docker run -d \
  --name stereowood \
  -p 9099:9099 \
  -v $(pwd)/data:/data \
  -v $(pwd)/uploads:/app/backend/uploads \
  stereowood-color-system
```

**详细部署指南**: 📖 [部署文档](docs/deployment/DEPLOYMENT.md)

---

## ✨ 功能特性

### 🎨 自配颜色管理
- **科学分类**：按色系（蓝、黄、红、绿、紫、色精）管理颜色
- **配方管理**：详细记录颜料配方和适用画层信息
- **图片管理**：支持颜色样本图片上传、预览和缩略图生成
- **历史追踪**：完整的修改历史记录和版本回溯功能
- **智能查重**：基于配方比例的精确重复检测和合并功能
- **配方计算器**：实时用量计算，支持比例换算和超配重平衡

### 🖼️ 作品配色管理  
- **多视图模式**：层号优先视图 / 自配色优先视图自由切换
- **配色方案**：每个作品支持多套配色方案管理
- **直观展示**：层号-颜色对应关系清晰可见
- **缩略图支持**：配色方案缩略图上传和管理
- **批量操作**：支持配色方案的批量编辑和管理

### 🎭 原料管理（蒙马特颜色库）
- **基础颜料**：管理朱红、桔黄、橘红等基础颜料信息
- **供应商管理**：颜料供应商信息和采购链接管理
- **参考价值**：为自配颜色提供原料参考和成本核算

### 🔍 全局搜索
- **智能搜索**：支持颜色编号、名称、作品名等多维度搜索
- **快速定位**：搜索结果直接跳转到对应条目
- **搜索历史**：记住常用搜索词，提高工作效率
- **实时过滤**：支持实时搜索结果过滤和排序

### 🧮 配方计算器
- **精确计算**：根据配方自动计算各颜料用量
- **比例换算**：支持不同总量下的配方比例换算
- **超配重平衡**：智能处理超量投放，计算补充用量
- **浮层界面**：紧凑的浮层式计算器，不影响主界面操作
- **状态持久化**：计算状态自动保存，页面刷新后恢复

---

## 🏗️ 技术架构

### 前端技术栈
- **Vue 3** - 现代化响应式前端框架，支持组合式API
- **Element Plus** - 企业级UI组件库，提供丰富的界面组件
- **Axios** - HTTP客户端库，处理API请求
- **原生CSS** - 自定义样式系统，轻量高效

### 后端技术栈  
- **Node.js** - 服务端JavaScript运行环境
- **Express** - 轻量级Web应用框架
- **SQLite** - 嵌入式文件数据库，零配置部署
- **Multer** - 文件上传中间件，处理图片上传

### 部署技术
- **Docker** - 容器化部署，跨平台兼容
- **Alpine Linux** - 轻量级基础镜像
- **健康检查** - 内置容器健康监控机制

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Vue 3)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 自配颜色管理  │ │ 作品配色管理  │ │ 原料库管理   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 全局搜索    │ │ 配方计算器   │ │ 图片管理     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                     后端层 (Node.js + Express)              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   API路由   │ │  文件上传    │ │  数据验证    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 业务服务层   │ │  查重算法    │ │  配方解析    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                        数据层 (SQLite)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 颜色数据表   │ │ 作品数据表   │ │ 原料数据表   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 历史记录表   │ │ 配色方案表   │ │ 文件存储     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 文档索引

### 🚀 部署相关
- **[部署指南](docs/deployment/DEPLOYMENT.md)** - 完整的本地和生产环境部署说明
- **[Docker部署](docs/deployment/DEPLOYMENT.md#docker部署)** - 容器化部署详细步骤
- **[云服务器部署](docs/deployment/DEPLOYMENT.md#云服务器部署vultr-ubuntu)** - 云平台部署指南

### 🛠️ 开发相关
- **[设计系统](docs/development/DESIGN_SYSTEM.md)** - 完整的UI设计规范和组件库
- **[重构总结](docs/development/REFACTORING_SUMMARY.md)** - 项目重构历史和最佳实践
- **[Artworks重构计划](docs/development/ARTWORKS_REFACTORING_PLAN.md)** - 大型组件重构规划

### ⚡ 功能特性
- **[配方计算器](docs/features/FORMULA-CALCULATOR.md)** - 计算器功能详细设计文档
- **[查重检测系统](docs/features/duplicate-detection.md)** - 智能查重算法设计和实现

### 🗂️ 项目结构

```
stereowood-color-system/
├── README.md                   # 项目总览（当前文件）
├── docs/                       # 项目文档集
│   ├── deployment/            # 部署相关文档
│   ├── development/           # 开发相关文档
│   ├── features/              # 功能特性文档
│   └── architecture/          # 架构设计文档
├── frontend/                   # 前端源码
│   ├── index.html            # 主页面入口
│   ├── css/                  # 样式文件
│   └── js/                   # JavaScript源码
│       ├── components/       # Vue组件
│       ├── modules/          # 功能模块
│       ├── utils/            # 工具函数
│       └── api/              # API调用层
├── backend/                    # 后端源码
│   ├── server.js             # 服务器主文件
│   ├── routes/               # API路由定义
│   ├── services/             # 业务逻辑层
│   ├── db/                   # 数据库相关
│   └── uploads/              # 文件上传存储
├── Dockerfile                 # Docker镜像构建
├── docker-compose.yml         # Docker编排配置
└── package.json               # 项目依赖配置
```

---

## 🔧 部署指南

### 支持的部署环境

| 环境类型 | 支持状态 | 说明文档 |
|---------|---------|----------|
| 🖥️ **本地开发** | ✅ 完全支持 | Windows/macOS/Linux |
| ☁️ **云服务器** | ✅ 完全支持 | Ubuntu/CentOS/Debian |
| 🏠 **群辉NAS** | ✅ 完全支持 | DSM 7.0+ Container Manager |
| 🐳 **Docker** | ✅ 推荐方式 | 跨平台容器化部署 |

### 快速部署命令

```bash
# 生产环境一键部署（推荐）
docker run -d \
  --name stereowood-production \
  -p 9099:9099 \
  -e NODE_ENV=production \
  -e DB_FILE=/data/color_management.db \
  -v ~/stereowood-data:/data \
  -v ~/stereowood-uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:latest
```

**详细部署步骤**: 📖 [完整部署指南](docs/deployment/DEPLOYMENT.md)

---

## 🔄 版本更新记录

### v0.7.2 (2025-08-26) - 当前版本
- ✅ **新增超配重平衡功能**：配方计算器支持超量投放智能处理
- ✅ **文档体系重构**：建立标准化文档结构和索引
- ✅ **并发冲突处理**：实现乐观锁机制，避免数据冲突
- 🔧 优化查重算法性能，提升大数据量处理速度

### v0.7.1 (2025-08-25)  
- 🎨 **UI统一优化**：完善设计系统，统一组件样式
- ⚡ 性能优化：优化大列表渲染和搜索响应速度
- 🔍 增强全局搜索功能，支持模糊匹配

### v0.7.0 (2025-08-24)
- 🏗️ **架构完整重构**：组件模块化，提升可维护性
- 🎯 新增颜色调色板查看器，支持打印功能
- 📱 响应式设计改进，提升移动端体验

**完整更新历史**: 📖 [查看所有版本](docs/development/REFACTORING_SUMMARY.md)

---

## 🤝 开发和维护

### 面向AI和程序员的维护指南

本项目专门设计为易于AI辅助维护和人工维护，遵循以下原则：

- **📝 完整文档化**：每个模块都有详细的设计文档和使用说明
- **🏗️ 模块化架构**：单一职责原则，便于独立维护和测试
- **💬 丰富注释**：关键业务逻辑都有详细的代码注释
- **🧪 标准化测试**：提供完整的测试用例和验证方法
- **📋 变更追踪**：详细的变更记录和决策原因说明

### 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目到你的GitHub账户
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 遵循ESLint配置的JavaScript标准
- Vue组件使用组合式API风格
- 函数和组件需要完整的JSDoc注释
- 提交信息使用约定式提交格式

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 查看许可证文件了解详情。

---

## 🙏 支持与反馈

如果这个项目对您有帮助，请考虑给它一个 ⭐！

### 获取帮助

- 📧 **技术问题**: [提交Issue](https://github.com/kzart888/stereowood-color-system/issues)
- 📖 **功能文档**: [查看Wiki](https://github.com/kzart888/stereowood-color-system/wiki)
- 💬 **讨论交流**: [GitHub Discussions](https://github.com/kzart888/stereowood-color-system/discussions)

### 系统信息

- **当前版本**: v0.7.2
- **最后更新**: 2025-08-26
- **维护状态**: 🟢 积极维护中

---

<div align="center">

**[⬆ 返回顶部](#stereowood-color-system)**

Made with ❤️ by STEREOWOOD Team

</div>