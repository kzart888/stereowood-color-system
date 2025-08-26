# 配方用量快速计算模块设计

> 状态：步骤1–6 已完成；步骤7（QA & 文档最终化）进行中。

## 1. 目标
为“自配色 / 作品配色方案层映射”提供一个随点即开的紧凑浮层计算器，基于自配色当前配方（原料名称 + 原始用量/单位）进行倍算、已投放记录与剩余量即时计算，并在页面刷新后仍能恢复每个自配色的独立计算状态。

## 2. 使用场景与入口
| 页面 | 位置 | 触发元素 | 备注 |
| ---- | ---- | -------- | ---- |
| 自配色管理 | 每个自配色卡片右上角操作区 | 按钮 “计算” | 与现有“修改 / 历史 / 删除”并列 |
| 作品配色管理（层号优先视图） | 方案配方行（第三行）每个“自配色单元格”右上角 | 超小按钮 “算” | 绝对定位在单元格右上角 |
| 作品配色管理（自配色优先视图） | 配方行（第二行）每个自配色单元格右上角 | 按钮 “算” | 同上 |

点击任一入口 → 打开该自配色（通过 color_code 或 id 唯一识别）的计算浮层。

## 3. 浮层行为与交互
1. 单实例显示：任意时刻仅显示一个浮层。打开 A 后再打开 B：A 被隐藏，A 的状态缓存保留；关闭后再次打开仍恢复。
2. 关闭方式：
   - “关闭”按钮
   - ESC
   - 点击浮层外（mousedown 判定）
3. 关闭后不清空数据，除非用户点击“清空”。
4. 浮层定位：absolute（基于页面滚动坐标）；根据触发点 `triggerRect.left < viewportWidth/2` 决定左右展开方向；自动防止溢出（必要时向内收缩、垂直微调），页面滚动后保持相对于文档的原始锚定位置。
5. Z-index 高于常规对话框，但低于全局可能的遮罩（若有）。不使用遮罩以便继续观察背景内容。
6. 宽度约 360~380px，高度自适应；超高时内部表格 scroll。

## 4. 数据结构
### 4.1 基础（解析自配色公式）
原始配方字符串示例：`钛白 15g 天蓝 3g 深绿 1g`

解析后（顺序保持，不合并同名）：
```json
[
  { "name": "钛白", "base": 15, "unit": "g" },
  { "name": "天蓝", "base": 3,  "unit": "g" },
  { "name": "深绿", "base": 1,  "unit": "g" }
]
```
规则：
- token 序列：名称 token 后紧跟一个“数值+单位” token 视为一组。
- 若出现名称后未跟合法用量 token → 该行标记为 `invalid:true`，在表中显示但不参与倍算（倍算列/剩余列置空）。
- 不合并重复名称（未来数据会分化）。

### 4.2 计算状态（按自配色隔离）
```ts
interface CalcState {
  code: string;                // 自配色编号（主键）
  versionHash: string;         // 基于原料序列 + (name,base,unit) 拼接的哈希，用于检测变更
  ingredients: Ingredient[];   // 解析缓存，含 invalid 标记
  scaleFactor: number|null;    // 最近一次倍算系数 (k)
  anchorIndex: number|null;    // 用户最近一次直接输入的行索引（基准行）
  targets: (number|null)[];    // 目标用量（与 ingredients 对齐；invalid 行为 null）
  delivered: (number|null)[];  // 已投放（可为 >target）
  updatedAt: number;           // 状态更新时间戳
}
```

全局存储：`Map<string, CalcState>`（color_code → state）。

### 4.3 持久化
- localStorage key 命名：`sw_calc_state_v1`。
- 持久化结构：`{ [color_code]: { scaleFactor, anchorIndex, targets, delivered, versionHash, updatedAt } }`。
- 恢复时重新解析配方：
  - 若 `versionHash` 与当前解析 hash 不同：
    - 尝试基于“同名 + 同 unit + base 不变”行迁移旧 delivered/targets；
    - 未匹配行 delivered/targets 置 null。
    - 重新计算 scaleFactor：
      - 若 anchorIndex 行仍有效：`scaleFactor = targets[anchor]/base[anchor]`
      - 否则重置 `scaleFactor=null`。

## 5. 表格列定义
| 列 | 含义 | 可编辑 | 初始 | 计算逻辑 |
| -- | ---- | ------ | ---- | -------- |
| 原料 | 原始解析名称 | 否 | 解析结果 | — |
| 原始配比 | base+unit | 否 | 解析结果 | — |
| 倍算值 | 目标用量（含单位） | 是 (valid 行) | 空 | 用户输入行 i → k = 输入/base[i]; 对所有 valid 行：target[j]=base[j]*k |
| 已投放 | 实际已加入 | 是 (valid 行) | 0 | 用户逐行输入（允许超） |
| 剩余 | target-delivered | 否 | 空 | 若 target!=null： remainder = target - delivered；允许负数（超投放），负数高亮 |

总计行：
- 针对每种单位分别汇总（单位分桶）。
- 显示格式：`10g 10滴 5ml`（单位桶顺序按第一次出现顺序）。
- 汇总逻辑：对每个单位 u：
  - base 合计：Σ base[i] (unit=u)
  - target 合计：Σ target[i] (unit=u)
  - delivered 合计：Σ delivered[i] (unit=u)
  - remainder 合计：Σ (target[i]-delivered[i])
- 若某列没有任何 target（尚未倍算）则显示 `—`。

## 6. 交互细节
1. 倍算输入：
   - 输入过滤：只保留数字与单个小数点；空串暂不触发计算。
   - base[i]=0 时不允许作为倍算基准（提示“该行基数为 0，不能倍算”）。
2. 多次输入：最近一次有效输入覆盖之前的 scaleFactor；整表重算。
3. 已投放输入：影响剩余列与总计剩余；保留用户原值（不四舍五入）。
4. 超投放：剩余为负数，显示红色（例如 `-2.5g`）。
5. 清空：将当前 state 的 `scaleFactor, anchorIndex, targets, delivered` 置空/0；保留 ingredients。
6. 键盘：
   - Tab / Shift+Tab：循环遍历所有可编辑单元格（先整列“倍算值”由上到下，再整列“已投放”由上到下）。
   - ArrowUp / ArrowDown：列优先垂直移动（与 Tab 列顺序一致）。到达当前列顶部再向上，跳到下一列首；到达底部再向下，同样跳到下一列首（循环）。
   - ArrowLeft / ArrowRight：行优先水平移动。首先在当前输入框内移动光标；当光标已处于文本最左 / 最右端继续按相同方向键，才会跳转到前一个 / 后一个单元格。行首再按左键跳转上一行最后一个单元格；行末再按右键跳转下一行第一个单元格（循环）。
   - Enter：保持输入框默认行为，不拦截提交；如需换行逻辑未来可扩展。
   - ESC：关闭浮层。
7. Outside click：document mousedown 捕获。
8. 悬浮标题：`自配色编号（当前倍数：2.50x）`（倍数存在时显示括号信息）。
9. 输入限制：
   - 单元格手动输入最大值 9999；超过立即回退/钳制为 9999。
   - 允许输入最多两位小数；第三位小数及之后忽略（不变）。
   - 处理中间态：允许暂存 `.` 与 `123.` 直至继续输入数字或切换焦点。
   - 计算得到的目标值若 >9999，同样被钳制为 9999（逐单元格）。

## 7. 版本/哈希计算
`versionHash = sha1(JSON.stringify(ingredients.map(i => [i.name,i.base,i.unit])))`
（可用简单自实现哈希：累加 charCode 后转 16 进制，避免引入大库。）

## 8. 样式与结构
```text
<div class="sw-calc-layer" data-direction="left|right">
  <div class="sw-calc-header">
    <span class="title">BU001 （当前倍数：2.5x）</span>
    <div class="actions">
      <el-button size="small" text @click="onClear">清空</el-button>
      <el-button size="small" text @click="onClose">关闭</el-button>
    </div>
  </div>
  <table class="sw-calc-table"> ... </table>
</div>
```
关键样式：
```
position:fixed; z-index:240; min-width:360px; background:#fff; box-shadow:0 4px 16px rgba(0,0,0,.14); border:1px solid #e5e7eb; border-radius:6px;
```
负剩余：`.neg { color:#d93025; font-weight:600; }`。

## 9. 变更同步规则（配方或名称变动）
触发条件：
1. 自配色的 `formula` 字段变更（名称/顺序/数量变化）。
2. 自配色编号变化（若允许重命名 code，需要迁移 state key）。

处理（设计理想方案）：
- 重新解析 ingredients → newHash 与旧 hash 比较。
- 行迁移：尝试按 `name+unit+base` 全等匹配；匹配成功复制 `targets[i]`, `delivered[i]`；否则置 null。
- 若 anchorIndex 行失效：`scaleFactor=null` 并清空所有 targets（保留 delivered? delivered 无目标时无意义 → 置 0）。
- 若仍有有效 scaleFactor & 匹配 anchor：重算所有 targets。

当前实现（步骤6 实际落地差异）：为降低复杂度与未知旧结构（未持久化旧 ingredients keys），当配方哈希变化时直接重置：`scaleFactor=null; targets[]=null; delivered[]=0; anchorIndex=null`。已在 14.1 差异说明列出，后续若需要更智能迁移再引入 `ingredientsKeys`。

## 10. 错误/边界处理
| 场景 | 处理 |
| ---- | ---- |
| 配方为空 | 表体显示占位“该自配色无配方”，除“清空/关闭”外禁用其它输入 |
| 全部行 invalid | 与配方为空同等处理 |
| 用户输入超大数(> 1e6) | 弹出警告 + 拒绝或截断为 1e6 |
| localStorage 不可用 | 回退为内存缓存（打印一次警告） |

## 11. 事件 & API（内部）
| 名称 | 参数 | 描述 |
| ---- | ---- | ---- |
| openCalculator | colorCode, triggerEl | 打开指定自配色计算浮层 |
| closeCalculator | (reason) | 关闭当前浮层 |
| applyScale | rowIndex, value | 用户修改倍算行触发重算 |
| updateDelivered | rowIndex, value | 用户更新已投放数值 |
| clearState | colorCode | 清空当前自配色状态 |
| syncFormulaChange | colorCode, newFormula | 外部检测到配方变更时调用 |

## 12. 实现步骤（编码前任务分解）
1. 解析层（已完成）：
   - 公共 parser: `frontend/js/utils/formula-parser.js` 输出 {name, base, unit, invalid}。
   - 已含轻量哈希 `hash()` 与单位桶 `unitBuckets()`。
2. 状态模块：
   - (已完成) 新文件 `frontend/js/modules/calc-store.js` 管理 Map、localStorage 读写、迁移逻辑。
3. UI 组件：
   - 新建 `frontend/js/components/formula-calculator.js`（可注册为 `<formula-calculator-overlay />` 单实例）。
   - props：none；通过全局事件/总线或 root 提供 `open(colorCode, triggerEl)`。
4. 集成：
   - 在 root app 加入 `$calc` service（包装 open/close/sync）。
   - 自配色卡与方案映射单元格添加按钮并调用 `$calc.open(code, event.currentTarget)`。
5. 定位逻辑：
   - 计算触发点矩形决定方向；设置 data-direction class；更新 style(left/right/top)。
6. 交互：
   - Outside click：document mousedown 捕获。
   - ESC：keydown listener（仅在浮层显示时）。
7. 计算逻辑：
   - `applyScale(rowIndex,val)` 内：校验 base>0；factor=val/base；targets 重算；保存 state；持久化。
   - `updateDelivered`：更新 + 持久化。
8. 总计行渲染：
   - 聚合单位桶（首次出现顺序）；拼接字符串。
9. 负剩余渲染：
   - remainder < 0 添加 `.neg`。
10. 配方 / 编号变更钩子：
   - 监听 globalData.customColors 或 artworks.schemes 中某个自配色 formula 改变事件（已有加载函数后执行 diff）。
11. 清空逻辑：
   - state.targets=null[]; delivered=Array(len).fill(0); scaleFactor=null; anchorIndex=null。
12. 性能与防抖：
   - 输入事件 300ms 防抖持久化（即时 UI，延迟写 localStorage）。
13. QA / 测试用例（示例）：
   - A：单行倍算输入 → 其他行同步
   - B：修改第二行倍算覆盖第一次
   - C：已投放超出目标显示负剩余
   - D：刷新页面后状态恢复
   - E：配方增加/删除原料后迁移 & 重新倍算
   - F：不同单位混合总计拼接正确
   - G：清空后再次打开干净

## 13. 后续扩展（非本期）
- 多浮层并行
- 拖动定位 / 固定面板模式
- 快捷倍数按钮（×2 / ×3 / 半量）
- 导出 / 复制结果
- 单位换算表（g ↔ ml 假设密度）

---
## 14. 实现进度记录
| 步骤 | 内容 | 状态 | 备注 |
| ---- | ---- | ---- | ---- |
| 1 | 解析层 (`formula-parser.js`) | 完成 | 提供 parse/hash/unitBuckets |
| 2 | 状态模块 (`calc-store.js`) | 完成 | 已含持久化、防抖、基本迁移（当前迁移策略精简：版本变化时重置 targets/delivered） |
| 3 | UI 组件 | 完成 | `formula-calculator.js` 浮层 + 样式 + 全局服务 $formulaCalc |
| 4 | 集成入口按钮 | 完成 | 自配色“计算”按钮 & 方案表格内“算”微按钮 + 调用 $calc.open |
| 5 | 总计/负剩余渲染 | 完成 | 单位分桶总计行（可在“倍算值”列直接输入以整体缩放）：基/目/已/剩 + 负值高亮 |
| 6 | 变更同步 | 完成 | 自配色列表 diff formula 触发 $formulaCalc.syncFormulaChange |
| 7 | QA & 文档 finalize | 进行中 | 执行用例 & 修正文档 |

### 14.1 状态模块当前实现差异说明
1. 迁移简化：当前 localStorage 未保存旧 ingredients 结构，仅保存 `targets/delivered/versionHash`。当配方哈希变化时，为避免不可靠匹配，直接重置 `scaleFactor/targets/delivered`。后续若需要更智能迁移，可在持久化结构中加入 `ingredientsKeys: string[]`（`name||base||unit`）再实现逐行映射。
2. 数值上限：`safeNumber` 判定超过 1e6 返回 null（忽略写入，保持旧值或置 0）。UI 层可在未来补充提示。
3. 精度：倍算后目标值统一 `toFixed(2)` 转 Number（最多两位小数）以控制浮点扩散与显示噪声。
4. delivered 初始化：在首次 applyScale 时对尚未初始化的非 invalid 行填 0，保证 remainder 计算稳定。
5. 解析增强（步骤7）：支持 `名称 数值 单位` 三段式（例如 `钛白 15 g 天蓝 3 g`）以及原有 `名称 数值+单位` 一体式；文档最初示例使用一体式，现兼容两种格式。

### 14.2 下一步计划 / QA 启动
进入步骤7：QA 与最终文档整理（进行中）。已完成步骤6（配方变更同步）：
1. 总计改为插入表格 body：每个单位追加一条“总计(单位)”行，列与普通行一致。
2. 总计行“倍算值”列可输入：按该单位的目标总量触发整体缩放 (factor = 输入/该单位基数合计)。
3. 未倍算：目标/已/剩列显示 — ，基列显示合计。
4. 剩余为负数行内 `.neg` 高亮。
5. 精度显示使用最多两位小数（toFixed(2) 去尾零）。
入口按钮已接入 `$calc.open()`：
1. 自配色管理：新增主操作按钮“计算”放在 修改/历史/删除 前。
2. 作品配色：
   - 层号优先视图：每个层对应自配色单元格右上角绝对定位 `.calc-mini-btn`。
   - 自配色优先视图：每个自配色分组单元格右上角同样添加按钮。
后续：执行 QA 场景验证并补充迁移策略改进建议（步骤7）。

## 15. QA 测试用例与初步结果（步骤7）
| 编号 | 场景 | 操作步骤（概要） | 预期结果 | 状态 |
| ---- | ---- | ---------------- | -------- | ---- |
| A | 单行倍算输入 | 打开配色 → 第1行倍算值输入 30 (原 base=15) | 该行目标30；其他行按比例放大；显示当前倍数 2x | 待测 |
| B | 第二行再次倍算覆盖 | 在 A 基础上对第2行输入 6 (base=3) | 倍数仍 2x；所有 targets 保持一致；anchorIndex 更新为第2行 | 待测 |
| C | 已投放超出 | 任意行目标 10，输入已投放 12 | 剩余显示 -2 且红色高亮 | 待测 |
| D | 刷新恢复 | 设置倍算与部分已投放 → 刷新页面 → 再次打开 | 状态（targets/delivered/倍数）恢复 | 待测 |
| E | 配方增删行同步 | 打开配方 → 在后台修改增加/删除原料并保存（触发数据刷新） | 若变更：当前浮层刷新，新结构显示；目标值被重置（当前实现策略） | 待测 |
| F | 多单位汇总 | 使用含 g / ml / 滴 的配方倍算 | 总计区按单位多行列出，并分别显示基/目/已/剩 | 待测 |
| G | 清空逻辑 | 已有倍算 → 点击清空 | 倍数消失、targets 置空、delivered=0 | 待测 |
| H | Outside Click 关闭 | 打开浮层后点击页面空白处 | 浮层关闭，状态仍保留 | 待测 |
| I | ESC 关闭 | 打开浮层按 ESC | 浮层关闭 | 待测 |
| J | 数值上限 | 倍算输入 2000000 | 输入被忽略 (不更新倍数) 或被截断 <= 1e6 | 待测 |
| K | 无配方/全 invalid | 打开空 formula 自配色 | 显示“该自配色无配方或全部无效” | 待测 |
| L | 重新打开保持 | 打开→倍算→关闭→再次打开 | 保持先前状态 | 待测 |
| M | 触发点定位 | 分别从左侧与右侧靠近边缘按钮打开 | 浮层方向根据位置左右切换且不溢出 | 待测 |
| N | 输入防抖持久化 | 快速连续修改已投放 | localStorage 仅最终值写入（无过多写入卡顿） | 待测 |

执行后将填充“状态”为 通过 / 发现缺陷(#编号)；若缺陷存在，将在此处添加“修复记录”小节并更新实现章节引用。

### 15.1 修复记录（步骤7进行中）
| 日期 | 问题 | 原因 | 修复 | 影响文档节 |
| ---- | ---- | ---- | ---- | -------- |
| 2025-08-11 | 倍算值 / 已投放列无法输入；清空按钮在未倍算时被禁用且无效 | 使用 Element Plus `@input` 监听而非受控的 `@update:modelValue` 导致值不更新；清空按钮加了 `:disabled` 条件 | 改为 `@update:modelValue`，去除清空禁用条件，保持可随时清空（重置已投放与倍算） | 6, 11, 14.1 |
| 2025-08-11 | 精度需改为最多两位小数 | 初始按设计保留至四位 | 计算与显示改为 toFixed(2)+去尾零 | 14.1, 14.2 |
| 2025-08-11 | 配方存在以三 token 形式(名称 15 g)录入导致全部行 invalid | 初版解析仅支持数值+单位粘连格式 | 解析器新增对 (数值 单位) 分离模式的识别 | 4.1, 14.1 |
| 2025-08-11 | 输入后需关闭再打开浮层才显示最新值 | 直接引用 store 内部对象数组，内部突变未触发 Vue 更新 | 为 overlay 增加 _wrapState 克隆返回对象与数组，输入/清空后重包裹赋值 | 6, 15 |
| 2025-08-11 | 总计独立块不直观 | Footer 块形式与列脱节 | 将总计按单位行直接追加到表格末尾 (total-row) | 5, 14.2 |
| 2025-08-11 | 需要在总计行直接输入总目标量进行整体倍算 | 原只能行内倍算，无法按单位总量一键设置 | 总计行“倍算值”列可编辑，计算 factor=输入/该单位基数合计 后全表重算 | 5, 14.2 |
| 2025-08-11 | 总计行输入背景需统一 | 淡黄色与其他单元格不一致 | 去除背景色，统一白底 | 5 |
| 2025-08-11 | 浮层随滚动离开视野 | fixed 相对视口定位 | 改为 absolute 锚定页面坐标，滚动后位置保持 | 3 |
| 2025-08-11 | 左/右方向键与上下逻辑相同，不符合期望的行优先遍历 | 初版未区分方向导航策略 | 实现水平（行优先）导航：光标优先移动，边界继续按才切换单元格；循环换行 | 6 |
| 2025-08-12 | 输入框无法限制最大值及小数位 | 初始未加统一约束 | 增加过滤：最大 9999，最多两位小数；中间态保持；计算结果超限亦钳制 | 6, 14.1 |

（本文档会在完成每一步后继续更新。）
