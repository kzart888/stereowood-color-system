# 自配色配方查重（顺序 + 倍数不敏感）设计说明

状态: 已完成基础比例查重 + 普通删除/保留；现新增“强制合并（更新引用后删除重复）”设计，准备实施。

---
## 1. 目标与范围
| 项目 | 内容 |
|------|------|
| 主要目标 | 发现不同自配色记录中配方**内容等比相同**（忽略顺序 + 忽略整体倍数）的重复组 |
| 触发方式 | (1) 保存成功后自动检测 (2) 头部“查重”按钮手动检测 |
| 用户操作 | 每个重复组：A) 仅保留一条删除其它  B) 全部保留（不做忽略标记，下次仍出现） C) 强制合并（更新所有引用后删除其它）|
| 作用字段 | 仅“配方”字段（忽略名称、分类、图片等）|
| 不包含 | 相似度模糊匹配、单位换算、名称模糊（同义词）、忽略组记忆、后端批量接口 |
| 数据规模假设 | 记录数几百级，前端全量扫描可接受 |

---
## 2. 重复判定定义
两条配方 A、B 视为重复，当且仅当：
1. 均含 ≥1 个有效原料项（否则跳过）。
2. 原料集合（名称 + 单位）完全一致。
3. 存在一个全局正缩放因子 k，使得对任一原料 i：`amountA_i * k == amountB_i`（允许极小浮点误差）。
   * 实现上通过“最简比例向量”比较：将两个配方各自归一为最简整比或统一浮点比，再比较序列是否一致。

示例：
| 配方1 | 配方2 | 判定 | 说明 |
|-------|-------|------|------|
| 朱红10g 紫红20g | 紫红20g 朱红10g | 重复 | 顺序被忽略 |
| 朱红10g 紫红20g | 朱红5g 紫红10g | 重复 | 整体缩放 0.5 |
| 朱红6g 紫红10g | 朱红10g 紫红20g | 否 | 比例 3:5 ≠ 1:2 |
| 朱红10g 紫红20g | 朱红10g | 否 | 原料集合不同 |
| (空) | 朱红5g | 不参与 | 空配方跳过 |

---
## 3. 配方解析与数据来源
复用现有 `FormulaParser.parse(formula)` → `[{ name, base, unit, invalid }, ...]`
- `invalid === true` 过滤。
- 过滤 `!name`、`!isFinite(base)`、`base <= 0`。
- 名称、单位统一：`trim().toLowerCase()`（虽然需求说单位不同且不混淆，但统一大小写保证稳健）。

---
## 4. 规范化与签名算法
步骤：
1. 过滤无效 / 空 / 非正数。
2. 生成条目：`{ name, unit, amt }`。
3. 排序：`name ASC, unit ASC`（确保顺序稳定）。
4. 收集原始数值数组 `amts`。
5. 将所有 `amt` 放大为整数：乘以 `10^(maxDecimalPlaces)` 后四舍五入。
6. 计算整数数组的 `gcd`，并将每个值除以该 gcd → 得到最简整型比例数组 `ratios`。
7. 构造比例签名：`name#unit#ratio | ...` 连接（按排序后的顺序）。
8. 若放大或 gcd 流程由于精度导致全部变 0 / 异常，则回退：
   - 以首项为基准：`ratio_i = amt_i / amt_0`；四舍五入到 6 位；用 `name#unit#(rounded)` 生成。
9. 结果为空集合 → 返回空串（不参与分组）。

为什么优先整型 + gcd：避免纯浮点除法带来的 0.30000000004 形式误差；多数输入期望是有限小数或整数。

---
## 5. 浮点误差策略
- Epsilon：固定 `1e-6`（已确认不需要动态配置）。
- 在回退浮点路径中：计算比值后 `Math.round(r * 1e6)/1e6`，构造字符串。
- 比例向量比较依赖字符串完全一致（由于已统一精度）。

---
## 6. 数据结构
重复组内部描述：
```ts
interface DuplicateGroup {
  signature: string;          // 比例签名（用作 key）
  structureKey: string;       // 仅 name#unit|... 可选（预留扩展）
  ratios: number[];           // 最简整数比例向量（或浮点备选）
  records: CustomColorRecord[]; // 自配色记录数组
  sampleFormula: string;      // 展示用，通常取第一条 formula
}
```

---
## 7. 模块 API 设计
文件：`frontend/js/modules/duplicate-detector.js`
```js
window.duplicateDetector = {
  buildRatioSignature(formulaString),     // 返回比例签名或''
  groupByRatioSignature(records),         // { signature: [records...] } 仅含重复(>=2)
  detectOnSave(record, allRecords),       // 返回 { signature, records } 或 null
  parseRatio(signature),                  // 解析签名返回 { items:[{name,unit,ratio}], ratios:[] }
  explainGroup(signature, records)        // 聚合展示辅助结构
};
```
> `buildStructureKey`/`structureKey` 目前非必需；如后续要支持“同集合不同比例”可再引入。

---
## 8. UI / 交互方案
与旧需求一致，新增“最简比例”概念：
1. 自动触发：保存成功后若所在组 size ≥ 2 → 打开对话框并预选“刚保存的记录”或“更新时间最新”。
2. 手动触发：“查重”按钮 → 全量检测 → 无结果 Toast“未发现重复配方”。
3. 对话框：
   - 顶部：`发现 X 组重复（比例等价）`。
   - 每组：
     - 比例摘要：`朱红 1  | 紫红 2`（使用最简整数比）。
     - 记录列表：编号 / 更新时间 / 引用标记。
     - 单选：选中要保留的记录（引用记录仍可选，引用记录永不删除）。
   - 组操作合并为全局底部按钮：
     - `保留所选并删除其它`
     - `全部保留`
     - `关闭`
4. 删除：串行 DELETE；失败即停止并提示（已删成功的不回滚）。
5. “全部保留”：关闭对话框；不做忽略标记 → 下次仍出现。
6. 被引用记录：
  - UI：浅绿色背景 + “被引用”标签。
  - 普通删除逻辑：永远跳过（即便未选为保留项）。
  - 强制合并：允许更新引用后删除（安全收敛为一条）。
7. 不显示/不支持：原始量与最简比例双列切换（已确认不需要）。

---
## 9. 性能分析
| 步骤 | 复杂度 | 备注 |
|------|--------|------|
| 解析 & 过滤 | O(N·L) | N=记录数, L=平均原料数 |
| 排序 | O(N·L log L) | L 很小（通常 <15） |
| 签名哈希 | O(N) | Map 收集 |
| UI 渲染 | 仅重复子集 | 可忽略 |

N<1000 下性能充裕。必要时可增加 formula→signature 缓存（阶段 B）。

---
## 10. 边界与异常处理
| 情况 | 策略 |
|------|------|
| 空配方 / 全无效 | 跳过，不进入重复逻辑 |
| base<=0 | 过滤该项；若过滤后为空则整条跳过 |
| 小数深度不一 | 统一放大到最大位数再 gcd |
| gcd=1 且仍存在 scale 放大后大整数 | 直接使用整数数组（说明已最简）|
| 放大后溢出/异常 | 回退到浮点除法路径 |
| 删除时部分失败 | 停止，提示“部分删除失败”，刷新列表重算 |
| 被引用且未选中 | 保留（提示）|
| 仅 1 条记录 | 不算组，不显示 |

---
## 11. 安全 / 回退策略
- 删除逐条串行；失败不继续，避免误删过多。
- 没有本地状态写入（忽略组功能未实现），刷新后重新可靠计算。
- 仅前端计算，不改动后端 DB 结构。

---
## 12. 阶段划分 & TODO
### 阶段 A：核心功能（比例查重）
- [x] 新建模块 `duplicate-detector.js`（比例签名算法 + 核心 API 初版：buildRatioSignature / groupByRatioSignature / detectOnSave / parseRatio）
- [x] index.html 引入模块（组件之前）
- [x] 头部新增“查重”按钮（事件 `check-duplicates`）
- [x] 保存成功后自动执行 detectOnSave（当前：仅 toast 提示，未弹窗）
- [x] 对话框 UI（组列表 + 比例 chips + 记录 + 单选）
- [x] 默认选中：刚保存记录（若有）否则各组最新更新时间记录
- [x] 删除操作：保留所选，串行删除其它（忽略被引用）
- [x] 全部保留：关闭对话框（无忽略标记）
- [x] 结果刷新 & 可再次运行（仍未分组自动关闭待完善 - 后续可加自动收起）
- [x] Epsilon 常量 1e-6 & 过滤 base<=0（算法已内置）
- [x] 文案 / 提示信息（基础 toast 占位）

### 阶段 B：体验增强
- [ ] 刚保存记录在对话框内高亮
- [ ] 删除执行中按钮 loading / 进度
- [ ] 删除失败重试剩余
- [ ] 签名缓存（formula 未变时复用）
- [ ] Debug 开关（耗时日志）

### 阶段 C：可选扩展
- [ ] 忽略该重复组（会话 / 永久）
- [ ] 近似比例（允许 ±x% 差异）
- [ ] 后端 `/api/custom-colors/duplicates` 接口
- [ ] 软删 / 恢复历史
- [ ] 单位映射（g ↔ 克）

---
## 13. 关键算法伪代码
```js
function buildRatioSignature(formula) {
  const list = FormulaParser.parse(formula)
    .filter(i => !i.invalid && i.name && isFinite(i.base) && i.base > 0)
    .map(i => ({
      name: i.name.trim().toLowerCase(),
      unit: (i.unit||'').trim().toLowerCase(),
      amt: Number(i.base)
    }));
  if (!list.length) return '';
  list.sort((a,b)=> a.name.localeCompare(b.name) || a.unit.localeCompare(b.unit));

  // 计算放大倍数
  const decimals = list.map(i => {
    const s = String(i.amt);
    const m = s.split('.')[1];
    return m ? m.length : 0;
  });
  const scale = Math.pow(10, Math.max(...decimals));
  let ints = list.map(i => Math.round(i.amt * scale));
  // gcd
  const g = ints.reduce((acc,v)=> gcd(acc,v), ints[0]);
  if (g > 1) ints = ints.map(v=> v / g);
  // 构造签名
  return list.map((ing, idx)=> `${ing.name}#${ing.unit}#${ints[idx]}`).join('|');
}
```
> 若 scale 导致浮点异常或 ints 全 0，可回退：使用 `ratio = amt/firstAmt` → round 6 位。

---
## 14. 文案草稿
| 场景 | 文案 |
|------|------|
| 无重复 | 未发现重复配方 |
| 自动检测发现 | 发现 1 组重复配方，请处理 |
| 多组 | 发现 X 组重复配方（比例等价）|
| 删除确认 | 将删除其余 N 条记录，确认继续？|
| 删除结果 | 删除完成：成功 N 条，失败 M 条 |
| 全部保留 | 已保留全部重复记录（下次仍会提示） |
| 无可删除 | 没有可删除的记录（可能都被引用） |

---
## 15. 已确认决策
| 项目 | 决策 |
|------|------|
| Epsilon | 固定 1e-6 |
| 原始量显示 | 不显示，仅显示最简比例 |
| 空配方 | 跳过，不入组 |
| 引用记录 | 普通删除模式永不删除；强制合并模式下先更新引用再删除 |
| “全部保留” | 不记忽略状态，后续仍提示 |
| base<=0 | 过滤掉 |

---
## 16. 后续需要你再确认/反馈的点
- 对话框显示是否需同时展示“原始 formula 文本”一行（当前未列入阶段 A）。
- 是否需要在组头展示“最简比例向量”形如 `1 : 2 : 3`（计划展示，若不需要请说明）。

> 若无进一步调整，进入阶段 A 实现。

---
（完）

---
## 17. 新增功能：强制合并（同配方引用更新 + 删除重复）

### 17.1 背景
当前普通“保留所选并删除其它”无法删除被引用的重复记录，导致重复组无法彻底收敛。需要一个受控操作：将所有引用统一指向选定保留项，再删除其余，保证数据整洁。

### 17.2 目标
| 目标 | 描述 |
|------|------|
| 单一保留 | 用户选定保留记录，其余全部移除 |
| 引用完整性 | 所有配色方案层引用自动迁移至保留记录 |
| 原子性 | 采用事务（或模拟）保证更新 & 删除一致；失败回滚 |
| 安全校验 | 可选提供比例签名，服务端复算防止误合并不同配方 |
| 可追溯 | 删除前写入 history 保留旧数据快照 |

### 17.3 术语
| 术语 | 含义 |
|------|------|
| 保留记录 keepId | 合并后最终保留的自配色 ID |
| 移除记录 removeIds | 同组内除 keepId 外所有记录 ID |
| 受影响层 | scheme_layers 中 custom_color_id 在 removeIds 集合的行 |

### 17.4 交互补充
1. 对话框底部新增红色按钮：“强制合并（更新引用）”。
2. 启用条件：当前至少存在一个重复组且该组选择了保留项且组内记录数>1。
3. 点击后弹出确认框：展示删除数量、将更新引用的层数（若提前不可得，可先显示“将更新所有引用层”）。
4. 确认执行 → loading → 完成提示：`强制合并完成：更新引用 X 个，删除 Y 条`。
5. 如果该组合并后不再重复，从对话框移除；若所有组清空，对话框关闭。
6. 错误展示后允许重试，不自动关闭。

### 17.5 后端接口设计（若采用服务端实现）
POST /api/custom-colors/force-merge
Body:
```json
{ "keepId": 12, "removeIds": [15,18,21], "signature": "可选比例签名" }
```
步骤：
1. 校验 keepId、removeIds 基本合法性（非空、去重、remove 不含 keep）。
2. 查询所有涉及记录；若 signature 提供 → 逐条复算比例签名比对；不一致报错。
3. 统计受影响层数（SELECT COUNT(*) FROM scheme_layers ...）。
4. 事务：
   - UPDATE scheme_layers SET custom_color_id=keepId WHERE custom_color_id IN (removeIds)
   - INSERT INTO custom_colors_history (...) for each removeId
   - DELETE FROM custom_colors WHERE id IN (removeIds)
   - UPDATE color_schemes SET updated_at=CURRENT_TIMESTAMP WHERE id IN (SELECT DISTINCT scheme_id FROM scheme_layers WHERE custom_color_id=keepId)
5. COMMIT；失败 ROLLBACK。
6. 返回 `{ success:true, updatedLayers, deleted: removeIds.length }`。

签名复算算法：与前端一致的整比+gcd；可内联轻量实现。

### 17.6 前端流程
1. 组内选择保留记录。
2. 点击强制合并 → 二次确认。
3. 发送 POST 请求（附带当前组签名）。
4. 收到成功响应：刷新自配色列表 + 作品列表；重跑当前重复检测并更新 UI。
5. 发生错误：提示错误信息，按钮恢复。

### 17.7 失败与回退策略
| 场景 | 行为 |
|------|------|
| 校验失败 | 不进入事务，直接返回 4xx |
| 事务中任意 SQL 失败 | ROLLBACK 返回 500 |
| 网络中断 | 前端提示“网络错误”，不假定成功，需手动刷新确认 |
| 并发重复提交 | 后端可返回 409 或直接第二次无影响成功（可后续增强幂等 token）|

### 17.8 安全考虑
| 风险 | 缓解 |
|------|------|
| 误合并不同配方 | 签名复算 + 返回错误 |
| 并发导致引用丢失 | 单事务原子更新 |
| 大批量删除锁表 | 限制 removeIds 长度（如 <=200），当前规模无需特别限制 |

### 17.9 关键伪代码（服务器端）
```js
// 假设使用 sqlite3 Database 实例 db
function forceMerge({ keepId, removeIds, signature }) {
  // 查询 keep + remove 记录 & 签名校验 ...
  db.serialize(()=>{
    db.run('BEGIN');
    db.run(`UPDATE scheme_layers SET custom_color_id=? WHERE custom_color_id IN (${qs})`, [keepId, ...removeIds]);
    // 写 history
    // 删除多余记录
    // 更新时间戳
    db.run('COMMIT', cb);
  });
}
```

### 17.10 与普通删除对比
| 维度 | 普通删除 | 强制合并 |
|------|----------|----------|
| 被引用记录 | 跳过 | 更新引用后删除 |
| 原子性 | 多次独立 DELETE | 单事务批处理 |
| 使用场景 | 快速清理未引用重复 | 完全收敛重复组 |

### 17.11 TODO（实施计划）
#### A. 后端接口
- [x] 新增 POST /api/custom-colors/force-merge
- [x] 参数校验 (keepId, removeIds 不为空且不含 keepId)
- [x] 读取 keep + remove 记录
- [x] 可选签名复算（不一致返回 400）
- [x] 统计受影响层数
- [x] 事务：更新引用 → 写 history → 删除记录 → 更新 color_schemes.updated_at
- [x] 返回结构 { success, updatedLayers, deleted }
- [ ] 错误处理 & 日志（含耗时）（基础错误处理已做，耗时日志待补充）

#### B. 前端改动
- [x] API 封装 api.customColors.forceMerge(payload)
- [x] 重复对话框新增“强制合并”按钮 + tooltip
- [x] 选择逻辑：默认选中最新记录；按钮启用需有 keepId 且组 size>1（沿用原默认选中最新逻辑）
- [x] 确认弹窗（删除数量提示）
- [x] 执行 loading 状态（与删除互斥）
- [x] 成功后刷新自配色 + 作品数据
- [x] 重新查重 & 移除已消失组 / 自动关闭
- [x] 错误提示与重试

#### C. 工具 / 复用
- [ ] 抽取刷新逻辑为 reloadAllData()（可选）
- [ ] 前端发送前本地重算签名（防止缓存错位）

#### D. 测试用例
- [ ] 仅一条被引用 + 一条未引用 合并
- [ ] 所有待删除均被引用
- [ ] keepId 自身被引用
- [ ] removeIds 含不存在 ID → 400
- [ ] 签名不一致 → 400
- [ ] 并发双提交（第二次应安全失败或无副作用）

#### E. 性能
- [ ] 统计典型合并耗时 (记录 <10)
- [ ] 压测 removeIds=50 性能（可模拟）

#### F. 文档
- [ ] README 增加“强制合并”简介
- [ ] 本设计文档勾选进度
- [ ] 记录一个示例请求/响应

#### G. 可选增强
- [ ] 幂等 token (mergeToken)
- [ ] 影响方案预览列表
- [ ] 多组合并批处理
- [ ] 最近一次合并撤销（实验）

### 17.12 已确认决策补充
| 项目 | 决策 |
|------|------|
| 引用迁移策略 | 直接 UPDATE 层引用，不合并层记录 |
| 历史保留 | 每条 removeId 均写 history 便于审计 |
| 时间戳 | 仅更新受影响方案 updated_at |
| 并发控制 | 先不加锁，依赖事务；后续需再评估再加幂等 |

---
（强制合并 Phase A 已实现：后端接口 + 前端执行路径 + UI 操作；后续项待继续）
