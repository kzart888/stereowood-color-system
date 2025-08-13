# 自配色配方查重（顺序 + 倍数不敏感）设计说明

状态: 设计确认（仅文档，尚未开始编码）。适配 0.5.4 基线版本，在不修改后端的情况下，通过前端算法发现“配方结构相同且成分量呈等比缩放”的自配色重复组，支持用户合并删除或全部保留。

---
## 1. 目标与范围
| 项目 | 内容 |
|------|------|
| 主要目标 | 发现不同自配色记录中配方**内容等比相同**（忽略顺序 + 忽略整体倍数）的重复组 |
| 触发方式 | (1) 保存成功后自动检测 (2) 头部“查重”按钮手动检测 |
| 用户操作 | 每个重复组：A) 仅保留一条删除其它  B) 全部保留（不做忽略标记，下次仍出现）|
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
   - 删除逻辑：永远跳过（即便未选为保留项）。
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
| 引用记录 | 永不删除，UI 标记 |
| “全部保留” | 不记忽略状态，后续仍提示 |
| base<=0 | 过滤掉 |

---
## 16. 后续需要你再确认/反馈的点
- 对话框显示是否需同时展示“原始 formula 文本”一行（当前未列入阶段 A）。
- 是否需要在组头展示“最简比例向量”形如 `1 : 2 : 3`（计划展示，若不需要请说明）。

> 若无进一步调整，进入阶段 A 实现。

---
（完）
