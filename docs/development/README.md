# 开发文档

本目录包含 STEREOWOOD Color System 的开发相关文档，面向开发者、维护者和贡献者。

## 📋 文档索引

### 🎨 设计系统
- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** - 完整的设计系统指南
  - 设计变量系统（颜色、间距、字体）
  - 组件库规范（按钮、卡片、表单）
  - 响应式设计指南
  - UI 一致性规范

### 🏗️ 重构和架构
- **[REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** - 项目重构总结
  - 已完成的重构工作
  - 组件拆分策略
  - 性能优化记录
  - 技术债务清理

- **[ARTWORKS_REFACTORING_PLAN.md](ARTWORKS_REFACTORING_PLAN.md)** - Artworks 组件重构规划
  - 大型组件拆分计划
  - 组件职责划分
  - 实施步骤和时间规划
  - 技术难点和解决方案

## 🛠️ 开发指南

### 环境搭建

```bash
# 1. 克隆项目
git clone https://github.com/kzart888/stereowood-color-system.git
cd stereowood-color-system

# 2. 安装依赖
cd backend && npm install

# 3. 启动开发服务器
npm start

# 4. 开始开发
# 前端代码在 frontend/ 目录
# 后端代码在 backend/ 目录
```

### 代码规范

#### JavaScript/Vue.js 规范
```javascript
/**
 * @fileoverview 文件功能描述
 * @description 详细说明文件的作用和重要信息
 * @module ModuleName
 * @requires dependency1
 * @requires dependency2
 * @author AI Assistant
 * @since 2025-08-26
 */

/**
 * 函数功能描述
 * @description 详细的函数说明，包括算法思路
 * @param {Type} paramName - 参数说明
 * @returns {Type} 返回值说明
 * @throws {ErrorType} 异常说明
 * @example
 * const result = functionName(param);
 * console.log(result);
 */
function functionName(paramName) {
  // 实现细节
}
```

#### CSS 规范
```css
/* 使用 BEM 命名规范 */
.sw-component-name { } /* 组件根元素 */
.sw-component-name__element { } /* 组件内部元素 */
.sw-component-name--modifier { } /* 组件修饰符 */

/* 使用 CSS 自定义属性 */
:root {
  --sw-primary-color: #6f42c1;
  --sw-spacing-md: 8px;
}
```

### 组件开发规范

#### Vue 组件结构
```vue
<!-- MyComponent.vue -->
<template>
  <!-- 模板内容 -->
</template>

<script>
/**
 * @fileoverview 组件功能描述
 * @description 组件的详细说明
 */
export default {
  name: 'MyComponent',
  props: {
    // Props 定义，包含类型和默认值
  },
  emits: [
    // 事件定义
  ],
  data() {
    return {
      // 响应式数据
    };
  },
  computed: {
    // 计算属性
  },
  methods: {
    // 方法定义
  }
};
</script>

<style scoped>
/* 组件样式 */
</style>
```

## 🔧 技术栈详解

### 前端技术
| 技术 | 版本 | 用途 | 文档链接 |
|------|------|------|----------|
| **Vue 3** | 3.3.4 | 前端框架 | [Vue.js 官方文档](https://vuejs.org/) |
| **Element Plus** | 最新版 | UI组件库 | [Element Plus 文档](https://element-plus.org/) |
| **Axios** | 最新版 | HTTP客户端 | [Axios 文档](https://axios-http.com/) |

### 后端技术
| 技术 | 版本 | 用途 | 文档链接 |
|------|------|------|----------|
| **Node.js** | ≥18.0.0 | 运行环境 | [Node.js 官方文档](https://nodejs.org/) |
| **Express** | 最新版 | Web框架 | [Express 文档](https://expressjs.com/) |
| **SQLite** | 3.x | 数据库 | [SQLite 文档](https://sqlite.org/) |
| **Multer** | 最新版 | 文件上传 | [Multer 文档](https://github.com/expressjs/multer) |

## 📁 项目结构详解

```
frontend/js/
├── components/              # Vue 组件
│   ├── shared/             # 通用组件
│   ├── custom-colors/      # 自配颜色相关组件
│   ├── artworks/           # 作品管理相关组件
│   └── common/             # 基础组件
├── modules/                # 功能模块
│   ├── calc-store.js      # 计算器状态管理
│   ├── duplicate-detector.js # 查重检测
│   └── version-guard.js   # 版本控制
├── utils/                  # 工具函数
│   ├── helpers.js         # 通用工具
│   ├── validators.js      # 验证函数
│   └── formula-parser.js  # 配方解析
└── api/                    # API 调用层
    └── api.js             # API 接口定义
```

## 🧪 测试指南

### 手动测试
1. **功能测试**: 验证所有主要功能正常工作
2. **兼容性测试**: 测试不同浏览器和设备
3. **性能测试**: 检查大数据量下的性能表现

### 测试用例
参考各功能文档中的测试用例部分：
- [配方计算器测试](../features/FORMULA-CALCULATOR.md#qa-测试用例与初步结果步骤7)
- [查重功能测试](../features/duplicate-detection.md#todo实施计划)

## 📋 开发工作流

### 功能开发流程
1. **需求分析**: 明确功能需求和技术方案
2. **设计文档**: 编写详细的设计文档
3. **编码实现**: 按照规范进行开发
4. **测试验证**: 完整的功能测试
5. **代码审查**: 确保代码质量
6. **文档更新**: 更新相关文档

### Git 工作流
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发和提交
git add .
git commit -m "feat: add new feature description"

# 3. 推送和创建PR
git push origin feature/new-feature
# 在GitHub创建Pull Request
```

## 🚨 常见问题

### 开发环境问题
- **端口占用**: 确保 9099 端口未被占用
- **依赖安装失败**: 检查 Node.js 版本和网络连接
- **数据库锁定**: 停止所有进程后重新启动

### 代码问题
- **组件不更新**: 检查响应式数据的正确使用
- **样式冲突**: 确保使用 scoped 样式或正确的命名空间
- **API 调用失败**: 检查后端服务状态和网络连接

## 📝 贡献指南

1. **阅读文档**: 仔细阅读相关设计文档
2. **遵循规范**: 按照代码规范和组件规范开发
3. **编写注释**: 为关键代码添加详细注释
4. **更新文档**: 功能完成后更新相关文档
5. **测试验证**: 确保功能完整性和稳定性

---

**返回**: [📚 主文档](../../README.md) | **上一步**: [🚀 部署文档](../deployment/) | **下一步**: [⚡ 功能文档](../features/)