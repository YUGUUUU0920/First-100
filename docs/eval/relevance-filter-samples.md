# Relevance Filter Eval Samples

**Why this exists:** CEO plan §Open Decision 3 requires 30 V2EX + 30 即刻 hand-labeled samples (15 RELEVANT + 15 NOT_RELEVANT each) to baseline the Haiku relevance filter prompt. Without this, prompt regressions are invisible.

**How to use:**
1. Read each sample below.
2. Mark `label:` as `relevant` if **the author is talking about a problem First 100 solves**: cold start, finding users, distribution, low traffic, no engagement, marketing fatigue, indie loneliness. Otherwise mark `not_relevant`.
3. Once you have ≥ 15 relevant + ≥ 15 not_relevant per platform, hand off to me and I'll wire up `bun run eval` that runs Haiku against each sample and reports precision/recall.

**Threshold:** filter is considered passing if precision ≥ 80%, recall ≥ 70% (per CEO plan eng-review test plan).

**Versioning:** when prompt changes (`RELEVANCE_FILTER_VERSION` in `lib/claude/prompts.ts`), re-run eval and record results below.

---

## V2EX samples

> Auto-seeded 2026-05-09 from `v2ex.com/go/create`. Add 22 more to hit 30 total (mix in `aisaas`, `sidehustle`, `programmer`).

### 1. ⬜ unlabeled — "做了一个免费的 web 端三国版杀戮尖塔"
- url: https://www.v2ex.com/t/1211501
- author: @zxypro
- body: "最近在研究 AI 游戏生成 agent，尝试了下 codex + 插件，感觉很不错，再加上很喜欢卡牌类肉鸽游戏，便花了一些时间做了一个三国版的杀戮尖塔的 demo。网址：1p5eoqm.pub.atoms.dev。欢迎试试。这个 demo 我还在持续更新，欢迎提提意见，很快就会更新上。"
- label: ?
- reason: ?

### 2. ⬜ unlabeled — "做了一个在线自动图片拼接工具，智能排列"
- url: https://www.v2ex.com/t/1211497
- author: @blackboxo
- body: "分享一个自己做的小工具：Auto Merge Images (automergeimages.com)。为什么做这个：试了市面上能找到的在线拼图工具，体验都很难受。所以我设计了一个反过来的思路：不选模板，拖进去就自动帮你拼好。完全免费，无需注册，无水印。欢迎试用反馈。"
- label: ?
- reason: ?

### 3. ⬜ unlabeled — "[开源] DeployX：一个记录每个环境部署版本的桌面工具"
- url: https://www.v2ex.com/t/1211474
- author: @q2316367743
- body: "项目地址：github.com/q2316367743/DeployX。简单说：帮你记住每个环境（测试/生产/客户 A/客户 B）当前跑的版本号，以及每次升级时的日志和物料。就是一个发版记录本，但比 Excel 直观。"
- label: ?
- reason: ?

### 4. ⬜ unlabeled — "针对小学生的口语练习小程序，迷茫怎么推广"
- url: https://www.v2ex.com/t/1211473
- author: @yuzhixin411416
- body: "免费功能：针对课本的课文听读，单词背诵。想要收费的功能是 AI 对话功能。目前再给自己的娃用。**迷茫在于有没有前途，怎么推广，后续怎么更新方向呢**"
- label: ?
- reason: ?
- _hint：标题就在问"怎么推广"，应该是 RELEVANT_

### 5. ⬜ unlabeled — "做了一个 AI 交友网络"
- url: https://www.v2ex.com/t/1211470
- author: @danielaladewig92
- body: "我们这个小团队最近做了一个 OpenClaw 的 Skill，叫 N3N。东西刚刚做出来，**基本没什么人，所以想看看能不能找些大佬们试用试用**，顺便测试一下有没有什么 bug。"
- label: ?
- reason: ?
- _hint：明确说"基本没什么人，想找试用"，RELEVANT_

### 6. ⬜ unlabeled — "OpenClacky 1.0 发布，最省 Token 的开源 AI Agent"
- url: https://www.v2ex.com/t/1211434
- author: @yafeilee
- body: "ClackyAI 创始人，老 V 友。我们把 ClackyAI 的内核完全开源，用 Ruby 原生重写成第三版架构。**100% MIT。求 Star。**"
- label: ?
- reason: ?

### 7. ⬜ unlabeled — "Omoggle 风格的先拍照再匹配相机对战小工具"
- url: https://www.v2ex.com/t/1211426
- author: @(redacted)
- body: "我做了 SnapMog，算是一个 Omoggle 风格的差异化入口：先拍一张快照。**不太确定这种先快照再匹配的方式，会不会对社恐一点的人友好。**"
- label: ?
- reason: ?
- _hint：在求反馈但没明确说没用户，可能 weakly relevant_

### 8. ⬜ unlabeled — (8th seed)
- _add by reading another v2ex/go/create page_

### 9-30. Add by hand
> Suggested nodes to mine: `aisaas`, `sidehustle`, `saashub`, `programmer`, `share`, `ideas`. Pick a mix that gives you 15 relevant + 15 not_relevant.

---

## 即刻 samples

> 即刻没有公开 API。每条要手动从 app 长按复制正文。

### 1. ⬜ unlabeled
- url: ?
- author: ?
- body: ?
- label: ?
- reason: ?

### 2-30. Add manually as you scroll 即刻 feed.

---

## After labeling

Once both lists have ≥30 each:

1. Save this file (or copy to `docs/eval/labeled-2026-05-09.md` for snapshot).
2. Run: `bun run eval` (script will be added — reads this file, calls Haiku per sample, reports precision/recall).
3. If precision ≥ 80% AND recall ≥ 70% → ship as-is.
4. If below: revise prompt in `lib/claude/prompts.ts`, bump `RELEVANCE_FILTER_VERSION`, re-run.
