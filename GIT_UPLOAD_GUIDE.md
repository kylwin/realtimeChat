# Git 上传指南

## 📋 准备工作清单

### ✅ 已完成项目
- [x] 所有功能开发完成
- [x] 代码优化完成
- [x] TypeScript 编译通过
- [x] 构建成功 (npm run build)
- [x] 文档完整 (README, SETUP, 等)
- [x] .gitignore 配置正确

---

## 🚀 首次上传步骤

### 1. 初始化 Git 仓库

```bash
cd /Users/macbookpro/Desktop/dev/realtimechat
git init
```

### 2. 添加所有文件

```bash
git add .
```

### 3. 检查将要提交的文件

```bash
git status
```

**应该看到:**
- ✅ src/ 目录下的所有代码
- ✅ public/ 目录
- ✅ package.json, package-lock.json
- ✅ tsconfig.json, vite.config.ts
- ✅ tailwind.config.js, postcss.config.js
- ✅ README.md 和其他文档
- ✅ .env.example

**不应该看到:**
- ❌ node_modules/
- ❌ dist/
- ❌ .env (如果有)
- ❌ .DS_Store

### 4. 创建首次提交

```bash
git commit -m "🎉 Initial commit: Realtime Chat with OpenAI Realtime API

Features:
- Real-time voice chat with WebRTC
- Live transcription (user & AI)
- Smart message ordering algorithm
- N8N workflow integration
- Modern UI with Tailwind CSS
- TypeScript + React 18 + Vite

Technical Highlights:
- Optimized code structure (433 lines in main hook)
- Helper functions for reusability
- Complete TypeScript types
- Responsive design
- Production-ready build

Architecture:
- Browser → N8N Webhook → OpenAI Realtime API
- WebRTC for low-latency audio
- Data channel for transcriptions
- Smart async event handling

Performance:
- Bundle: 153KB (gzipped: 50KB)
- Build time: ~400ms
- WebRTC latency: <100ms

Documentation:
- Complete README with setup guide
- Code optimization summary
- Project summary
- Environment configuration

🤖 Generated with Claude Code
https://claude.com/claude-code"
```

### 5. 创建 GitHub 仓库

**选项 A: 通过 GitHub 网站**
1. 访问 https://github.com/new
2. 填写仓库信息:
   - Repository name: `realtime-chat`
   - Description: `Real-time voice chat with OpenAI Realtime API`
   - Public 或 Private (根据需要)
   - ❌ 不要初始化 README (我们已经有了)

**选项 B: 使用 GitHub CLI**
```bash
gh repo create realtime-chat --public --source=. --remote=origin
```

### 6. 连接远程仓库

```bash
# 替换为你的 GitHub 用户名
git remote add origin https://github.com/YOUR_USERNAME/realtime-chat.git

# 或使用 SSH (推荐)
git remote add origin git@github.com:YOUR_USERNAME/realtime-chat.git
```

### 7. 推送到 GitHub

```bash
git branch -M main
git push -u origin main
```

---

## 📝 后续提交建议

### 提交消息格式

```bash
# 功能
git commit -m "✨ feat: Add message export feature"

# 修复
git commit -m "🐛 fix: Fix message ordering in Safari"

# 优化
git commit -m "⚡ perf: Optimize WebRTC connection handling"

# 文档
git commit -m "📝 docs: Update setup guide"

# 重构
git commit -m "♻️ refactor: Extract audio handling logic"

# 样式
git commit -m "💄 style: Improve mobile layout"

# 测试
git commit -m "✅ test: Add unit tests for message ordering"
```

### Emoji 参考

- 🎉 `:tada:` - 初始提交
- ✨ `:sparkles:` - 新功能
- 🐛 `:bug:` - 修复 bug
- 📝 `:memo:` - 文档更新
- ⚡ `:zap:` - 性能优化
- 💄 `:lipstick:` - UI/样式更新
- ♻️ `:recycle:` - 代码重构
- 🔧 `:wrench:` - 配置文件
- ✅ `:white_check_mark:` - 添加测试
- 🚀 `:rocket:` - 部署相关

---

## 🔄 日常工作流

### 开发新功能

```bash
# 1. 创建新分支
git checkout -b feature/message-export

# 2. 开发并测试
# ... 编写代码 ...

# 3. 提交更改
git add .
git commit -m "✨ feat: Add message export to JSON"

# 4. 推送到远程
git push origin feature/message-export

# 5. 在 GitHub 创建 Pull Request
```

### 修复 Bug

```bash
git checkout -b fix/safari-audio-issue
# ... 修复 bug ...
git add .
git commit -m "🐛 fix: Resolve audio playback issue in Safari"
git push origin fix/safari-audio-issue
```

### 更新主分支

```bash
git checkout main
git pull origin main
```

---

## 🏷️ 版本标签

### 创建版本

```bash
# 创建 v1.0.0 标签
git tag -a v1.0.0 -m "Release version 1.0.0

Features:
- Real-time voice chat
- Live transcription
- Smart message ordering
- N8N integration"

# 推送标签
git push origin v1.0.0

# 推送所有标签
git push origin --tags
```

### 版本号规范 (Semantic Versioning)

- **v1.0.0** - 主版本.次版本.修订号
- **v1.0.1** - Bug 修复
- **v1.1.0** - 新功能 (向后兼容)
- **v2.0.0** - 重大变更 (破坏性更新)

---

## 📦 发布到 GitHub Pages (可选)

### 配置 Vite

编辑 `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/realtime-chat/', // 你的仓库名
  // ... 其他配置
})
```

### 构建并部署

```bash
# 构建
npm run build

# 部署到 gh-pages 分支
npx gh-pages -d dist
```

### GitHub 设置

1. 进入仓库 Settings → Pages
2. Source: Deploy from a branch
3. Branch: gh-pages / root
4. 访问 `https://YOUR_USERNAME.github.io/realtime-chat/`

---

## 🔒 保护敏感信息

### ⚠️ 永远不要提交

- `.env` 文件 (已在 .gitignore)
- API keys
- 密码
- 私钥

### 如果不小心提交了

```bash
# 从历史中移除敏感文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送
git push origin --force --all
```

---

## 📊 提交历史查看

```bash
# 查看提交历史
git log --oneline --graph --all

# 查看具体提交
git show <commit-hash>

# 查看文件修改历史
git log -p src/hooks/useRealtimeChat.ts
```

---

## 🤝 协作建议

### 分支策略

```
main (production)
  ├── develop (开发)
  │   ├── feature/xxx
  │   └── feature/yyy
  └── hotfix/xxx
```

### Pull Request 模板

```markdown
## 描述
简要说明本次更改的内容

## 类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 性能优化
- [ ] 代码重构

## 测试
- [ ] 本地测试通过
- [ ] 构建成功
- [ ] 无 TypeScript 错误

## 截图 (如适用)

## 相关 Issue
Closes #123
```

---

## 📚 推荐阅读

- [Git 基础](https://git-scm.com/book/zh/v2)
- [GitHub 指南](https://guides.github.com/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## ✅ 上传检查清单

在推送前确认:

- [ ] 所有测试通过
- [ ] 构建成功 (`npm run build`)
- [ ] 没有 console.error (除非故意的)
- [ ] README 已更新
- [ ] 版本号已更新 (package.json)
- [ ] CHANGELOG 已更新 (如果有)
- [ ] 敏感信息已移除
- [ ] .gitignore 正确配置
- [ ] 提交消息清晰明确

---

**准备好了就可以开始上传了！🚀**

Good luck with your first Git upload! 🎉
