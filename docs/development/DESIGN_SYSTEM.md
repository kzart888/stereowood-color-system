# STEREOWOOD Color System 设计系统指南

## 概述

这份文档定义了 STEREOWOOD Color System 的完整设计语言和组件规范。通过统一的设计系统，确保整个应用的视觉一致性和用户体验。

## 🎨 设计变量系统

### 间距系统
```css
--sw-gap-xs: 2px;    /* 最小间距 */
--sw-gap-sm: 4px;    /* 小间距 */
--sw-gap-md: 6px;    /* 中等间距 */
--sw-gap-lg: 8px;    /* 大间距 */
--sw-gap-xl: 12px;   /* 超大间距 */
--sw-actions-gap: 8px; /* 工具按钮间距 */
```

### 圆角系统
```css
--sw-radius-xs: 2px;  /* 最小圆角 */
--sw-radius-sm: 4px;  /* 小圆角 */
--sw-radius-md: 6px;  /* 中等圆角 */
--sw-radius-lg: 8px;  /* 大圆角 */
```

### 颜色系统

#### 主色调
```css
--sw-primary: #6f42c1;              /* 主色调-紫色 */
--sw-primary-hover: #5a34a0;        /* 主色-悬停 */
--sw-primary-active: #4b2c85;       /* 主色-激活 */
--sw-primary-light: rgba(111,66,193,0.12); /* 主色-浅色背景 */
--sw-primary-border: rgba(111,66,193,0.25); /* 主色-边框 */
```

#### 功能色
```css
--sw-success: #2f9e44;              /* 成功色 */
--sw-warning: #f59e0b;              /* 警告色 */
--sw-danger: #d93025;               /* 危险色 */
--sw-info: #409EFF;                 /* 信息色 */
```

#### 文本色彩
```css
--sw-text-primary: #222;            /* 主要文本 */
--sw-text-secondary: #666;          /* 次要文本 */
--sw-text-muted: #909399;           /* 辅助文本 */
--sw-text-disabled: #c0c4cc;        /* 禁用文本 */
```

### 阴影系统
```css
--sw-shadow-light: 0 1px 4px rgba(0,0,0,0.08);   /* 轻阴影 */
--sw-shadow-base: 0 2px 8px rgba(0,0,0,0.1);     /* 基础阴影 */
--sw-shadow-card: 0 1px 4px rgba(0,0,0,0.3);     /* 卡片阴影 */
--sw-shadow-dialog: 0 4px 16px rgba(0,0,0,0.14); /* 对话框阴影 */
--sw-shadow-float: 0 6px 18px rgba(0,0,0,0.18);  /* 浮动阴影 */
```

## 🔘 按钮系统

### 主要按钮
**用途**: 新增、保存等主要操作
```html
<el-button class="add-button">新增</el-button>
<el-button class="sw-btn-primary">主要操作</el-button>
```

### 次要按钮
**用途**: 编辑、查看等常规操作
```html
<el-button class="sw-btn-secondary">编辑</el-button>
```

### 危险按钮
**用途**: 删除等危险操作
```html
<el-button class="sw-btn-danger">删除</el-button>
```

### 成功按钮
**用途**: 确认、保存成功状态
```html
<el-button class="sw-btn-success">确认</el-button>
```

### 按钮尺寸
```html
<el-button class="sw-btn-xs">超小</el-button>
<el-button class="sw-btn-sm">小</el-button>
<el-button class="sw-btn-md">中等</el-button>
<el-button class="sw-btn-lg">大</el-button>
```

## 🎴 卡片系统

### 基础卡片
```html
<div class="sw-card">
  <div class="sw-card-header">
    <h3 class="sw-card-title">标题</h3>
    <div class="color-actions">
      <!-- 操作按钮 -->
    </div>
  </div>
  <div class="sw-card-body">
    <!-- 卡片内容 -->
  </div>
  <div class="sw-card-footer">
    <!-- 卡片底部 -->
  </div>
</div>
```

### 作品条目卡片
```html
<div class="artwork-bar">
  <div class="artwork-header">
    <div class="artwork-title">作品标题</div>
    <div class="color-actions">
      <!-- 工具按钮 -->
    </div>
  </div>
  <!-- 卡片内容 -->
</div>
```

## 🖼️ 缩略图系统

### 标准缩略图 (80x80px)
```html
<div class="scheme-thumbnail" onclick="thumbPreview.show(event, imageUrl)">
  <img src="image.jpg" style="width:100%;height:100%;object-fit:cover;">
</div>
```

### 空状态缩略图
```html
<div class="scheme-thumbnail no-image">
  未上传图片
</div>
```

## 🏷️ 文本和状态系统

### 文本层级
```html
<span class="sw-text-primary">主要文本</span>
<span class="sw-text-secondary">次要文本</span>
<span class="sw-text-muted">辅助文本</span>
<span class="sw-text-disabled">禁用文本</span>
```

### 状态文本
```html
<span class="sw-text-success">成功状态</span>
<span class="sw-text-warning">警告状态</span>
<span class="sw-text-danger">错误状态</span>
<span class="sw-text-info">信息状态</span>
```

### 提示文本
```html
<div class="sw-hint">普通提示</div>
<div class="sw-hint success">成功提示</div>
<div class="sw-hint error">错误提示</div>
<div class="sw-hint warning">警告提示</div>
```

## 🎛️ 切换和选项卡系统

### 自定义Tab组
```html
<div class="sw-tab-group">
  <button class="sw-tab active">选项1</button>
  <button class="sw-tab">选项2</button>
  <button class="sw-tab">选项3</button>
</div>
```

### 分类筛选按钮
```html
<div class="category-switch-group">
  <button class="category-switch active">全部</button>
  <button class="category-switch">蓝色系</button>
  <button class="category-switch">红色系</button>
</div>
```

## 📱 响应式设计规范

### 断点系统
- **桌面**: > 1024px（默认设计基准）
- **平板**: 768px - 1024px
- **移动**: ≤ 768px
- **小屏**: ≤ 480px

### 响应式行为
1. **间距自适应**: 小屏设备使用更小的间距
2. **按钮适配**: 移动设备上按钮更大，便于触摸
3. **卡片布局**: 自动调整边距和内边距
4. **缩略图缩放**: 小屏显示60x60px缩略图

## 🎯 使用指南

### 1. 新建页面/组件时
- 使用统一的设计变量，不要硬编码数值
- 选择合适的按钮类型和尺寸
- 确保响应式适配

### 2. 样式命名规范
- 使用 `sw-` 前缀的设计系统类
- 保持类名语义化，如 `sw-btn-primary`
- 避免覆盖设计系统变量

### 3. 扩展设计系统
- 新增颜色或尺寸时，优先添加到CSS变量
- 创建可复用的组件类
- 更新本文档说明新增功能

## 🔄 版本更新记录

### v2.1 (2025-08-23)
- ✅ 建立完整的设计变量系统
- ✅ 统一按钮、卡片、文本样式
- ✅ 优化响应式布局
- ✅ 整合缩略图和预览系统
- ✅ 完善切换组件样式一致性

---

通过遵循这套设计系统，确保 STEREOWOOD Color System 在功能扩展时保持视觉和交互的一致性。