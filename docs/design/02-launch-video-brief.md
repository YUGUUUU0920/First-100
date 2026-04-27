# Launch Video Production Brief — First 100

Generated 2026-04-24 | Author: eng-review skill
Status: DRAFT — awaiting founder 拍板 tools + style

## Goal
30 秒宣传 video，在即刻 / V2EX / Twitter 中文圈 / 官网 hero 区投放。
目标：**中文 indie 看到 10 秒内明白"这个工具帮我干啥 + 为什么我要试"**，剩下 20 秒把信任拉满 + CTA。

## Constraints
- 产品还没 build → **不能用真实产品截图**。走 AI-generated b-roll + 文字大卡片 + 声音驱动
- 预算范围：founder 月消费 ≤ $100（长期订阅），一次性 ≤ $50
- 发布平台：即刻（9:16 竖屏优先）、X/Twitter（16:9 横屏）、官网 hero（16:9 或 autoplay loop）
- **双平台版本**：录一次，剪两个比例

## 30-秒 分镜 v0 draft

```
0-3s  HOOK — 文字大卡片 + 中文配音（焦虑共鸣）
      「你做完产品，发到 Product Hunt... 24 小时后，0 个用户。」
      视觉：AI 生成 — 凌晨 3 点程序员盯着屏幕的俯拍 (Kling/Runway)

3-8s  PROBLEM — 三连快切 + 字幕
      「手动搜 subreddit。人工写 cold message。群里发广告被踢。」
      视觉：AI 生成 3 个 5 秒 clip 拼接 + 字幕 jump cut

8-15s TURN — 节奏变化 + 第一人称 voice
      「如果有个工具 5 分钟帮你找 50 个正在讨论同类问题的真实用户，
       + 给每个写好个性化开场白...」
      视觉：动态文字 + 模糊化的 dashboard 模拟画面（Figma mockup 导出）

15-22s SOCIAL PROOF — 具象数据卡片
      「我这周用 First 100 发了 23 条 outreach — 回了 8 条，3 个加了微信。」
      — founder 化名 @xxx
      视觉：海报 mockup + 即刻风格截图 (设计工具做)

22-27s CTA — 明确动作
      「现在免费内测。扫码 / 点链接加入。前 100 位送 3 个月。」
      视觉：QR code + URL 卡片

27-30s LOGO — 品牌收尾
      First 100 logo + slogan「你的前 100 个用户，值得你亲手拿下。」
```

## 工具 stack（推荐组合）

### 核心（必须）

| 环节 | 工具 | 月费 | 说明 |
|---|---|---|---|
| **中文 AI 配音** | [ElevenLabs](https://elevenlabs.io) Creator tier | $22/月 | 中文自然度 2025 最强；试声库里挑 2 个声音分别录。**长期订阅** |
| **AI 视频 b-roll** | [Kling AI](https://klingai.com) Pro | ¥98/月 | 中文语料理解更强、更容易出中文审美的画面。3 秒 clip ~1-2 credits，一支 video ~20 credits。**或 Runway Gen-3** ($35/月) 走西方审美 |
| **视频剪辑** | CapCut（免费）或 DaVinci Resolve（免费） | 0 | 功能够，不值花钱。CapCut 手机 / 网页端都有，上手快 |
| **字体 / 字幕卡片** | Canva Pro | $12.95/月 | 中文字体 + 动态字幕模板。v0 期订 1 个月够 |
| **音乐** | [Epidemic Sound](https://epidemicsound.com) Personal | $15/月 | CC-0 不够灵魂；Epidemic 声库适合 indie 感 |

**月消耗总计（生产期）**: ¥98 + $22 + $12.95 + $15 = **~¥475/月**（约 $65/月）。生产完成后退订 Canva + Epidemic，长期保留 ElevenLabs + Kling 够。

### 可选（进阶）

- **Figma**（免费 tier 够）— 做 dashboard + 海报 mockup 让 AI video 里能穿插"预期产品截图"
- **Arcade.software** 免费 tier — 未来 product ship 后录真实 demo 替换 AI mock
- **Heygen** $29/月 — 如果你想做"founder 本人说话"但不想出镜，接 Heygen AI 分身

### 不推荐
- Sora（如果发布，等着看消费级定价）— 2026 初的 Sora 还不友好个人开发者价格
- Synthesia — 企业向，$89+/月，过于商务感

## 生产时间线

**如果你今天决定动手，3 天能出片**：

| Day | 动作 | 时长 |
|---|---|---|
| D0 晚 | 订 ElevenLabs + Kling + CapCut 下载；写 voice script (~80 字) 中文 | 2h |
| D1 上午 | ElevenLabs 生成 3 版配音，挑一版 | 1h |
| D1 下午 | Kling 生成 6 个 b-roll clips（每个 3-5s），Figma 出 2 张 mockup | 3h |
| D2 | CapCut 剪辑 + 字幕 + 调 BGM | 4h |
| D2 晚 | 9:16 和 16:9 各导一版 | 1h |
| D3 | 在即刻 / X 中文圈发 test post 看反馈 | — |

**Total CC-human mix 时间：~11h**。AI 生成占 ~60%，人工创意 + 剪辑占 ~40%。

## 你需要做的决定（在我 kick off /plan-design-review 之前）

1. **风格**：走「焦虑共鸣 → 解决」 (上面 v0 draft)，还是走「炫技展示 → 数据」（拿海报 / AI 生成的 dashboard 动效为主）？
2. **出镜**：你本人出镜 / 用 Heygen AI 分身 / 完全无人脸（纯视觉 + 配音）？
3. **预算确认**：上面 ~¥475/月 生产期 OK 吗？ElevenLabs 必花，其他可 trim。
4. **品牌调性**：极简（素色 + 大字）/ 赛博朋克（霓虹 + 故障风）/ 温暖人文（暖色 + 手写字）？直接影响 Kling / Runway 的 prompt 和配色。

这些决定也会直接喂给 /plan-design-review——video 调性和官网调性必须一致，不然用户会分裂感。
