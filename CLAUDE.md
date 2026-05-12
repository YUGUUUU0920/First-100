# First 100

**产品定位：**AI-native 用户获取助手 for **中文** indie hacker。输入产品描述 → 5 分钟出 30-60 个潜在用户 + 个性化中文破冰建议。**v0 = V2EX + 即刻**（粘贴），免费 beta。

**核心闭环：** 用户填表（产品描述 + 目标画像） → AI 扫 V2EX 节点 + 用户粘即刻帖子 → 相关性过滤（Claude Haiku） → 个性化中文破冰（Claude Sonnet） → 用户复制粘贴发送 → 用户手动标 sent/replied/converted

**核心原则（不可违反）：**
- **人在 loop 中是 feature 不是 bug。** v0 不做自动发送。最后的发送按钮必须是人按。理由：(a) 平台 ban 防御，(b) 保留 personality，(c) 逼用户真的与用户对话
- **成功指标 = 当周发送后被回复数。** 不是 DAU、不是页面 PV
- **Founder 是 User #1。**如果 founder 自己不每周用这个工具拉用户，产品死

**当前状态（2026-05-12）：** v0 Lane A 完 + 已上线 https://yourfirst100.co（Vercel HKG/SIN edge）。登录 / 创建产品 / 扫 V2EX·掘金·少数派·GitHub-CN / 即刻·小红书粘贴 / Sonnet outreach + Haiku critique / 复制 + sent/replied/converted 标记 / 周报海报 / streak counter 全通。详见 `README.md`。

**设计文档：** 在 `~/.gstack/projects/CC_idea/` 下。`/office-hours` 产出的 DRAFT。本项目初始化时软链接到了 `docs/design/`（见下）。

## 测一下整套 pipeline

```bash
bun run smoke
```

5 个 check：V2EX → Haiku 过滤 → Sonnet 生成 + critique → 海报渲染。每跑一次约 $0.02。改 prompt 后必跑。

---

## Git worktree 注意事项（重要 — 防止 env 配置坑）

本项目经常被 Claude Code 在 git worktree 里编辑（`.claude/worktrees/<name>/`）。worktree 和主仓**各自有独立的工作目录**，意味着：

- `.env.local` **必须**在 worktree 里软链到主仓：`ln -s ../../../.env.local .env.local`
  （已在 `next.config.ts` 里设置 `outputFileTracingRoot` 强制 workspace root，否则 Next.js 会因为多个 lockfile 把主仓当成 root，加载错的 .env.local 文件）
- `node_modules` 各自独立，新建 worktree 后跑一次 `bun install`
- `bun.lock` 是 git tracked 的，自动同步

**新 worktree 启动 dev server 之前必做：**
```bash
ln -sf ../../../.env.local .env.local && bun install
```

## Env 加载顺序坑（已防御）

Claude Code CLI 会在 shell 里 export `ANTHROPIC_API_KEY=`（空字符串）+ `ANTHROPIC_BASE_URL`。Bun / Next.js 加载 `.env.local` 时**不会覆盖已存在的 env 变量**，所以这俩 shell 变量会屏蔽 `.env.local` 里的真值，导致 Anthropic 调用都报"key 不存在"。

**已防御**：`package.json` 的 `dev`/`build`/`start` 脚本前面都加了 `unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL`，跑 `bun run dev` 自动清掉。

**症状记忆点**：如果 Claude API 调用失败，且 `.env.local` 里的 key 看起来正确，**先检查 shell 环境**：`echo "len: ${#ANTHROPIC_API_KEY}"`。如果是 0 但又有这个变量名，就是被 shell 屏蔽了。

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
