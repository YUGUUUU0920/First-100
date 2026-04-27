# First 100

**产品定位：**AI-native 用户获取助手 for indies。输入产品描述 → 5 分钟出 50 个潜在用户 + 个性化破冰建议。Reddit + Twitter 起步，indie-friendly 定价（$19/月）。

**核心闭环：** 用户填表（产品描述 + 目标画像 + 平台勾选） → AI 扫 Reddit/Twitter 过去 30 天 → 相关性过滤（Claude Haiku） → 个性化破冰生成（Claude Sonnet） → 用户复制粘贴发送 → 追踪转化

**核心原则（不可违反）：**
- **人在 loop 中是 feature 不是 bug。** v0 不做自动发送。最后的发送按钮必须是人按。理由：(a) 平台 ban 防御，(b) 保留 personality，(c) 逼用户真的与用户对话
- **成功指标 = 当周发送后被回复数。** 不是 DAU、不是页面 PV
- **Founder 是 User #1。**如果 founder 自己不每周用这个工具拉用户，产品死

**设计文档：** 在 `~/.gstack/projects/CC_idea/` 下。`/office-hours` 产出的 DRAFT。本项目初始化时软链接到了 `docs/design/`（见下）。

---

# gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:

- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/design-html`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/retro`
- `/investigate`
- `/document-release`
- `/codex`
- `/cso`
- `/autoplan`
- `/plan-devex-review`
- `/devex-review`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
- `/learn`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill tool as your FIRST action. Do NOT answer directly, do NOT use other tools first. The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
