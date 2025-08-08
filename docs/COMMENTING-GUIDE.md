# 注释与文档规范（Commenting & Documentation Guide)

面向本项目所有后端与前端代码（Node/Express/SQLite + Vue/Element Plus），用于保证重构、协作与长期维护的可读性与可追踪性。

- 目标：任何人打开任何文件，能在 1 分钟内理解它是什么、来自哪里、被谁用、如何修改不出错。
- 原则：先注释后编码；注释包含“来源与去向”的具体信息；对外契约（URL/返回结构）必须标注是否有破坏性变更；迁移需幂等。

---

## 1. 文件级 Roadmap 注释（必填）
在每个“入口/路由/服务/数据库/脚本”文件顶部加入 Roadmap 样式注释，模板如下：

```js
/* =========================================================
   模块：<相对路径/文件名>
   职责：<这个文件解决的核心问题、对外暴露什么能力>
   引用：<谁会 require/import 它；它又依赖哪些模块>
   来源：<该文件/片段来自哪个旧文件/函数；何时迁出；若替换了旧实现写明被替换者>
   契约：<对外 URL/导出函数/返回结构；是否有破坏性变更；兼容策略>
   注意：<并发/事务/迁移顺序/错误处理/性能要点/安全要点>
   关联：<与之强相关的文件清单，便于跳转>
   ========================================================= */
```

示例（routes/artworks.js 顶部）：
```js
/* =========================================================
   模块：routes/artworks.js
   职责：作品/方案/层映射的 REST API（/api/artworks*）
   引用：server.js -> app.use('/api', router)，依赖 services/*, db/*
   来源：server.js 中的 /api/artworks* 路由迁出（2025-08-08），合并重复定义
   契约：URL 不变；返回 JSON 结构与旧版兼容；文件上传仍用 multer
   注意：多步写入使用事务；方案缩略图替换会删除旧文件
   关联：services/formula.js, db/migrations.js, routes/index.js
   ========================================================= */
```

---

## 2. 函数/方法注释（JSDoc，必填）
对所有导出函数、路由处理器、服务层公共函数添加 JSDoc。内部辅助函数建议简化版 JSDoc。

模板：
```js
/**
 * <一句话说明>（功能与动机）
 *
 * 输入/参数：
 * @param {Type} arg1 解释（单位/边界/取值范围）
 * @param {Type} options 选项（可选项的默认值与作用）
 *
 * 输出：
 * @returns {Type} 返回结构（字段含义、空值语义）
 *
 * 副作用：
 * - 读/写数据库表（表名/列名）
 * - 文件系统（路径/何时删除）
 *
 * 错误：
 * - 抛出/返回 { error } 的条件与 HTTP 状态码（如 400/404/409/500）
 *
 * 并发/事务：
 * - 是否在事务中；是否需要 busy_timeout；是否可能引发写冲突
 */
```

示例（服务层）：
```js
/**
 * 将 custom_colors.formula 中的旧颜色名按 token 精确替换为新名称。
 * @param {import('sqlite3').Database} db SQLite 连接
 * @param {string} oldName 旧名（完全匹配）
 * @param {string} newName 新名
 * @returns {Promise<number>} 实际更新的条数
 * 副作用：更新 custom_colors 表；包裹在事务内
 * 错误：数据库错误时 reject
 */
async function cascadeRenameInFormulas(db, oldName, newName) { /* ... */ }
```

---

## 3. 路由处理器注释（HTTP 语义）
每个路由处理器上方补充：资源、动词、输入、输出、状态码、幂等性。

```js
// PUT /api/mont-marte-colors/:id
// 目的：修改原料名称/图片/字典引用；如名称变更则级联替换自配色配方中的旧名
// 请求：FormData { name, supplier_id?, purchase_link_id?, image?, existingImagePath? }
// 响应：200 { ...row, updatedReferences } | 400/404/500 { error }
// 幂等：否（重复提交会覆盖）；副作用：可能删除旧图片文件
```

---

## 4. 数据库迁移注释（DDL）
迁移脚本必须标注：创建/修改的对象、幂等性、顺序依赖、回滚策略。

```js
// 迁移：添加 suppliers/purchase_links 字典表 + 给 mont_marte_colors 增加可空外键列
// 幂等：CREATE TABLE IF NOT EXISTS；PRAGMA table_info 检查列再 ALTER
// 顺序：先建表再增列；保证引用完整性
// 回滚：SQLite 无原子 DDL 回滚方案；以幂等重复执行为主
```

---

## 5. 交叉引用与命名规范
- 路由与服务：写清“谁调用谁”。示例：routes/mont-marte-colors.js 调 services/formula.cascadeRenameInFormulas。
- 表/字段命名：
  - 表：snake_case 复数（custom_colors）；
  - 主键 id；外键 <ref>_id（supplier_id）；
  - 时间：created_at/updated_at。
- 前端字段对齐：列表页字段（color_code、scheme_name、thumbnail_path）需在路由层做别名兼容。

---

## 6. 注释与实现的同步
- 注释不是小说：必须与实现保持一致，修改功能时同步修改注释。
- 删除/替换旧实现时：在新文件 Roadmap“来源”里写明“替换自 xxx（日期）”，并在旧位置加一行注释“已迁至 xxx”。

---

## 7. 示例片段

路由：
```js
/**
 * 创建新作品
 * @route POST /api/artworks
 * @body {string} code 作品编号
 * @body {string} name 作品名称
 * @returns {object} { id }
 */
app.post('/api/artworks', (req, res) => { /* ... */ });
```

服务：
```js
/**
 * 解析配方字符串为 token 数组
 * @param {string} formula e.g. "钛白 5g 群青 3滴"
 * @returns {{type:'name'|'amount', value:string}[]} tokens
 */
function tokenizeFormula(formula) { /* ... */ }
```

迁移：
```js
// 增列：mont_marte_colors.supplier_id
if (!(await columnExists('mont_marte_colors', 'supplier_id'))) {
  await runSafe('ALTER TABLE mont_marte_colors ADD COLUMN supplier_id INTEGER NULL');
}
```

---

## 8. 提交前检查清单（Checklist）
- [ ] 文件顶部 Roadmap 注释已补充（职责/来源/引用/契约/注意/关联）
- [ ] 所有导出函数/路由处理器均有 JSDoc
- [ ] 迁移脚本幂等（IF NOT EXISTS / PRAGMA table_info）
- [ ] 对外 URL/响应结构未破坏（或已在注释中声明兼容策略）
- [ ] 事务与文件删除等副作用已在注释中提示
- [ ] 大改动已在 server.js Roadmap 更新阶段状态（A/B/C...）

---

## 9. 风格建议
- 注释用简洁短句，先结论后细节；重要词加粗或用列表。
- 避免“废话型注释”（重复代码语义）；多写“为什么/边界/陷阱”。
- 保持中英文混排友好（术语保留英文）。

---

> 本规范文件用于指导当前与未来的所有修改；当出现新模式（如 SSE/WebSocket 推送、OCC 并发）时，请先更新本文件再实施。
