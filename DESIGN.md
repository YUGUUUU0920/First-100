# DESIGN.md — First 100

品牌调性：**极简 · 编辑化 · 有节制的动感**。
标杆：Linear、Cal.com、Arc Browser、Vercel 首屏。
避免：SaaS 烂梗（3 列 icon-in-circle 网格、紫色渐变、大 hero 配笔记本照片、emoji 装饰）。

视觉源真实（source of truth）：`~/.gstack/projects/YUGUUUU0920-First-100/designs/landing-20260424/variant-B.png`
实现方式：**Next.js + Tailwind 代码手写**，AI mockup 仅作视觉参考。禁止直接当图片用。

---

## 1. Color Tokens

```css
:root {
  /* Neutrals */
  --bg:          #fafaf8;  /* warm off-white, not pure white */
  --fg:          #0a0a0a;  /* near-black, not pure black */
  --fg-muted:    #4a4a48;  /* 60% fg for secondary copy */
  --fg-quiet:    #8b8a86;  /* 40% fg for metadata / tags */
  --rule:        #e7e5e0;  /* hairline divider */

  /* Brand accent (ONE color, sparingly) */
  --accent:      #1d5a3a;  /* deep forest green */
  --accent-hover:#184a30;  /* -10% luminance */
  --accent-fg:   #ffffff;  /* white on green buttons */

  /* Dark mode (v0.5 ship,  not v0) */
  --bg-dark:     #0f0f0d;
  --fg-dark:     #f5f5f1;
  --accent-dark: #2a8258;
}
```

**规则**：
- 一个 accent 颜色，**只出现在 primary CTA**（免费内测按钮）。
- 成功/警告/错误在 v0 全部用 `fg` + 文字描述，不引新色。
- Dark mode v0.5 再做，v0 专注白模式做到极致。

---

## 2. Typography

```css
font-family-latin:    "Inter", ui-sans-serif, system-ui;
font-family-chinese:  "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
/* 实际使用：body { font-family: var(--font-family-chinese), var(--font-family-latin); }  */
```

**Scale（mobile-first，桌面在 @container 放大）**：

| Token | Mobile | Desktop | Weight | Line-height | 用途 |
|---|---|---|---|---|---|
| `text-hero` | 40px | 64px | 700 | 1.15 | 首屏大标题 |
| `text-h1` | 32px | 44px | 700 | 1.2 | 二级 section 标题 |
| `text-h2` | 22px | 28px | 600 | 1.3 | 小 section 标题 |
| `text-body` | 16px | 18px | 400 | 1.6 | 正文 |
| `text-sub`  | 14px | 15px | 400 | 1.5 | 次级文字、metric、tag |
| `text-meta` | 12px | 13px | 400 | 1.4 | nav、footer、图注 |

**中文字距约定**：`letter-spacing: 0;`（默认）。**不**加负字距。
**英文 display 字距**：`-0.01em` for hero/h1。

---

## 3. Spacing Scale（8pt grid）

```
4, 8, 12, 16, 24, 32, 48, 64, 96, 128
```

首屏 hero 模块：**上下内边距 96-128px**（大胆留白）。
模块之间：**128-160px** 桌面，96px 移动。

---

## 4. Layout 规格

### Landing Hero

```
  ┌────────────────────────────────────────────────────────────┐
  │  [First 100]                          定价  博客  登录     │  ← 48px top bar
  │                                                              │
  │                                                              │  ← 96-128px breathing
  │                                                              │
  │              你的前 100 个用户，值得你亲手拿下                  │  ← text-hero
  │                                                              │
  │         即刻 + V2EX 一次扫描 · AI 写个性化破冰 · 你按发送        │  ← text-body, fg-muted
  │                                                              │
  │                         ┌──────────┐                         │
  │                         │ 免费内测  │                          │  ← CTA 按钮 accent 色
  │                         └──────────┘                         │
  │                                                              │
  │              平均 7 天 · 23 条回复 · 3 个真实用户                │  ← text-sub, fg-quiet
  │              Your first 100 users, found.                     │  ← text-meta, fg-quiet
  │                                                              │
  │                                                              │
  └────────────────────────────────────────────────────────────┘
           ↑ 全屏 viewport，不套 card 容器。 
```

**几何约束**：
- max-width: 72ch for body / 48ch for headline
- 居中 composition（text-align: center），hero 唯一允许的居中块
- 不加 hero 下面的"features 网格"
- 导航栏固定高度 48px，不 sticky

### Dashboard（logged-in）

```
  ┌────────────────────────────────────────────────────────────┐
  │ First 100   [产品选择器 v]         Streak: 🟢 3 周  │ logout│
  ├────────────────────────────────────────────────────────────┤
  │                                                              │
  │   本周                                                        │
  │   ────                                                        │
  │   你发了 12 条 · 回了 4 条 · 转化 1 个                          │  ← 大字显示数据
  │                                                              │
  │   ┌─────[ 扫一次 V2EX ]─────┐                                 │
  │                                                              │
  │   即刻粘贴区                                                  │
  │   ┌──────────────────────────────────┐                       │
  │   │ 粘贴帖子正文                      │                       │
  │   └──────────────────────────────────┘                       │
  │                                                              │
  │   Prospects (30 此次扫描)                                     │
  │   ───────────────────────                                     │
  │   [prospect row]  [draft 预览]   复制  [sent][replied][✓]     │
  │   [prospect row]  [draft 预览]   复制  [sent][replied][✓]     │
  │   ...                                                         │
  │                                                              │
  └────────────────────────────────────────────────────────────┘
```

**规则**：
- 单栏布局，max-width: 960px，居中
- Prospect 列表：**行而非卡片**。每行下 1px rule（`--rule` 色）
- 按钮：3 个状态标注按钮用 ghost 样式（bg 透明 + 1px border），sent 后变 fill
- **不**引入 sidebar 导航（增加 cognitive load）

### 周报海报（分享到即刻）

```
  ┌──────────────────────────┐  1080 × 1350（即刻竖屏最佳比例）
  │                          │
  │                          │   ← 40% top padding
  │    你的前 100 个用户         │   ← text-hero 白色
  │    第 3 周战绩              │
  │                          │
  │    ──────────             │   ← 1px rule 白色 40% 透明
  │                          │
  │    23                    │   ← 巨大 stat，96px，weight 700
  │    条 outreach 发出         │
  │                          │
  │    8                     │
  │    条收到回复              │
  │                          │
  │    2                     │
  │    个加了微信              │
  │                          │
  │    ──────────             │
  │                          │
  │    First 100              │   ← 小 logo 右下
  │    yourfirst100.co        │   ← 小 URL
  │                          │
  └──────────────────────────┘
     底：深森林绿 #1d5a3a 纯色。字：#fafaf8 白。
     **无插画、无 emoji、无装饰图形**——纯字排版。
     在即刻 feed 里和其他截图/生活照天然区隔 = "辨识度"。
```

---

## 5. Motion Spec（新增要求：动感 + 简约共存）

原则：**每个 motion 有理由**。不做炫技。不滥用 GSAP。目标：**用户不会注意到动画本身，只感觉页面"有生命"**。

**引擎**：Framer Motion（React，~30kb gzip，Next.js 生态首选）。
**Easing baseline**：`cubic-bezier(0.25, 0.1, 0.25, 1)`（"easeOut" 感觉）。

### Landing Hero Motion（必做）

| 元素 | 触发 | 动画 | Duration | Delay |
|---|---|---|---|---|
| 大 headline | Page load | opacity 0→1 + translateY 12px→0 | 600ms | 0ms |
| 副 headline | Page load | 同上 | 600ms | 120ms |
| CTA 按钮 | Page load | 同上 + scale 0.96→1 | 600ms | 280ms |
| Metric line | Page load | opacity 0→1 | 600ms | 440ms |
| CTA hover | Mouse over | scale 1→1.02 + shadow 0→12px | 180ms | — |
| CTA active | Mouse down | scale 1.02→0.98 | 80ms | — |
| Metric numbers（7/23/3） | 首次进视野（IntersectionObserver） | count-up from 0 → target | 900ms | 0ms |
| Scroll hint arrow | Page load | 0.8s delayed fade-in，上下呼吸循环 | 2s loop | 1000ms |

### Hero 背景微动（谨慎）

**默认不加**。如果你后面觉得太静态可以 +1 条：
- 背景 `var(--bg)` 有 2% 饱和度微微漂移，12s loop，`prefers-reduced-motion: reduce` 时禁用

### Dashboard Motion

- Prospect 行：首次渲染 staggered fade-in（每行 40ms 间隔）
- 标 sent/replied 按钮点击：按钮 fill 从 `--bg` → `--fg` 用 240ms 过渡，**不**加 checkmark 弹跳
- Streak counter 数字：跨周变化时 slot-machine 数字翻动，400ms

### 海报生成

**静态图片**，不做动画（PNG 不支持）。但**前端预览时**可以给导出按钮一个 subtle shimmer（800ms loop）提示"正在生成"。

### A11y 铁律

所有动画**必须**检查 `@media (prefers-reduced-motion: reduce)`，此时全部禁用 transform/opacity 过渡，只保留颜色变化。

---

## 6. Component Primitives（v0 必建）

```
/components/ui/
  Button.tsx            # variants: primary (green fill) / ghost (transparent + border) / link (no chrome)
  Input.tsx             # text input with floating label
  TextArea.tsx          # with char counter
  Nav.tsx               # top bar, 48px, logo + 3 links
  Stat.tsx              # big number + label (for metrics + poster)
  ProspectRow.tsx       # one row in dashboard prospects list
  CriticScore.tsx       # 0-10 score pill for outreach quality
  StreakBadge.tsx       # Streak counter display
  EmptyState.tsx        # reusable empty-state component (warmth + CTA + context)
```

**Component 原则**：
- **不**用 Tailwind UI / shadcn 开箱组件作为起点（会带入默认 SaaS 调性）。从零搭。
- 每个 component 自己处理 `prefers-reduced-motion`
- Props 只暴露真正需要配置的，不做万能 slot。

---

## 7. Empty States（明确文案）

每一个 empty state 都是产品的表达机会。**不**写"暂无数据"。

| 位置 | 文案 |
|---|---|
| 首次登录无 product | 先告诉我你做的是什么 →（+创建产品按钮） |
| 未扫描 prospects | 准备好了？点右边按钮扫一次 V2EX 。5 分钟出 30 个潜在用户。 |
| 扫完 0 结果 | 这次没扫出匹配的。换个关键词或节点再来一次？（+ 说明：可能是产品描述太泛） |
| outreach 未发送过 | 复制了 draft → 去 V2EX / 即刻发完后回来标一下 "sent"。 |
| 周报无数据 | 这周还没开始。离周日还有 X 天。 |

---

## 7.5 Interaction States（所有动作的 5 个状态 + 设计规范）

**每个 UI 动作必须覆盖这 5 个状态**。如果 plan 没画，implementer 会默认实现"成功分支"然后忘记其他 4 个。

| 特性 | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| **扫 V2EX** | 按钮 disabled + 文字"扫描中..." + 进度条（0→100%，真的在跑就真动，假 skeleton 行） | 见 §7 空状态（准备好了？） | banner 顶部红色 1px 边 + 文案"V2EX 暂时连不上，2 分钟后再试"，按钮 re-enable | 列表 staggered fade-in，顶部绿色 toast "扫到 28 个" 3s 后消失 | 列表出现 + 2 个 `ai_failed` 行显示 "AI 没生成成功 [重试]" 按钮 |
| **即刻粘贴** | 粘贴 textarea 下方 3 点 loading（AI 正在分析）| textarea 灰字占位"把即刻帖子正文粘这里..." | inline 红字 "需要正文，别空粘" 或 "这条 URL 已经粘过，别重复" | 刚粘的条目 fade-in 插入列表顶部 | — |
| **Claude 生成 outreach** | 每条 prospect 行出现 skeleton line（灰色条脉动）| — | 该条 prospect 行显示 `[重试]` + "AI 超时，点击重试" | 文案 fade-in，critique 分数用 count-up 动画（0→N）| 重试中保留旧 draft，不闪烁 |
| **标记 sent / replied / converted** | 按钮 icon 替换成 spinner 150ms | — | toast "保存失败，已存本地草稿"（不阻塞交互）| 按钮从 ghost 变 fill，200ms 过渡，streak badge 如果跨周+1 轻微 bounce | — |
| **周报海报生成** | 按钮内部 shimmer 动画 + 文字"渲染中..." | "这周还没 outreach，周日前加油" 文案海报 | toast "生成失败，点击重试" | PNG 下载卡片 fade-in 出现，预览可交互 | — |
| **签入 (email magic link)** | submit 按钮 spinner + 文字"发送中..." | — | inline error "邮件发送失败" 或 "格式不对" | "邮件已发，点击查看收件箱" + 30s 倒计时再发按钮 | — |
| **登录后首次无产品** | — | "先告诉我你做的是什么" + 表单（见 §7）| — | 创建 product 后自动 redirect 到 dashboard | — |

---

## 8. Accessibility Baseline

- 对比度：body 文字 ≥ 7:1（AAA）。**fg-quiet (#8b8a86) 对 bg (#fafaf8) 是 3.8:1，不足 AA，只用于 meta，不用于可读正文**
- 最小触控区：44×44px
- 键盘：全功能键盘可达；`:focus-visible` 用 `outline: 2px solid var(--accent); outline-offset: 3px`
- 语义：正确使用 `<nav>`, `<main>`, `<article>`, `<button>`（非 `<div onClick>`）
- 图片 alt：poster 下载的 PNG 分享到即刻时要有 alt 文本（通过 OG 描述）
- 中文字号：正文不小于 16px（老年设备 / 视障友好）

---

## 9. Responsive Breakpoints

```
sm:  640px   ← 小屏手机
md:  768px   ← 大屏手机 / 小平板
lg:  1024px  ← 平板横屏 / 小桌面
xl:  1280px  ← 标准桌面
2xl: 1440px+ ← 大屏桌面
```

**设计基准**：桌面 1440×900 为精准像素参考，但**先写 mobile**（375px 起）再往上适配。不是"桌面设计 + mobile stacked"。

---

## 10. 这份文档的生效范围

- **v0**：landing + dashboard + poster 全部按此文档实现。偏离需先回此文档更新，不直接在 PR 里改。
- **v0.5**：dark mode、WeChat OAuth 登录界面、pricing page 设计决策需写入第 11 章（追加）。
- **v1+**：社区 playbook 展示界面、英文版（Latin-first）需单独一章对照说明。

---

## 附：批准的 Mockup 参考

| Surface | Path | Notes |
|---|---|---|
| Landing hero | `~/.gstack/projects/YUGUUUU0920-First-100/designs/landing-20260424/variant-B.png` | 主参考，confident ownership 方向。CTA 再加粗，metric line 再小一点 |
| Landing hero (alt) | `~/.gstack/projects/YUGUUUU0920-First-100/designs/landing-20260424/variant-A.png` | 备选，anxiety hook 方向。Dashboard 页面的 empty state 可以借用这种语气 |

实现时**参考构图和留白**，**不**使用图中像素化的中文字（用代码渲染 Noto Sans SC）。
