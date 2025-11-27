# 快速参考 (Quick Reference)

## 🌐 API 环境配置

### N8N Webhook URLs

| 环境 | URL | 状态 | 说明 |
|------|-----|------|------|
| **正式环境** | `https://ici.zeabur.app/webhook/realtime-ai` | ✅ 当前使用 | N8N workflow 需设置为 production mode |
| **测试环境** | `https://ici.zeabur.app/webhook-test/realtime-ai` | 📝 备用 | 需要手动点击 "Execute workflow" |

### 切换环境

#### 方法 1: 使用 .env 文件（推荐）

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env
# 正式环境
VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook/realtime-ai

# 测试环境
# VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook-test/realtime-ai
```

#### 方法 2: 修改源代码

编辑 `src/hooks/useRealtimeChat.ts` 第 152 行：

```typescript
const webhookUrl = options.webhookUrl ||
  import.meta.env.VITE_WEBHOOK_URL ||
  'https://ici.zeabur.app/webhook/realtime-ai'  // 修改这里
```

#### 应用更改

```bash
# 重启开发服务器
npm run dev
```

---

## 📁 项目结构速览

```
realtimechat/
├── src/
│   ├── components/
│   │   ├── ChatPage.tsx          # 主页面容器
│   │   ├── ChatMessage.tsx       # 消息气泡
│   │   ├── ChatInput.tsx         # 文字输入
│   │   └── FloatingActionBar.tsx # 浮动状态栏
│   ├── hooks/
│   │   └── useRealtimeChat.ts    # 核心业务逻辑 ⭐
│   ├── types/
│   │   └── index.ts              # TypeScript 类型
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
├── docs/
│   ├── README.md                 # 项目说明
│   ├── SETUP.md                  # 设置指南
│   ├── PROJECT_SUMMARY.md        # 项目总结
│   ├── OPTIMIZATION_SUMMARY.md   # 优化记录
│   ├── GIT_UPLOAD_GUIDE.md       # Git 指南
│   └── QUICK_REFERENCE.md        # 本文档
├── .env.example
├── package.json
└── vite.config.ts
```

---

## 🚀 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (localhost:3000)
npm run build            # 构建生产版本
npm run preview          # 预览生产构建

# 代码检查
npm run lint             # ESLint 检查

# 依赖管理
npm install              # 安装依赖
npm update               # 更新依赖
```

---

## 🔧 核心配置文件

### useRealtimeChat.ts (第 152 行)
```typescript
const webhookUrl = options.webhookUrl ||
  import.meta.env.VITE_WEBHOOK_URL ||
  'https://ici.zeabur.app/webhook/realtime-ai'  // 默认 URL
```

### .env.example
```env
VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook/realtime-ai
```

### vite.config.ts
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000
  }
})
```

---

## 🐛 常见问题速查

### 连接失败 (404)
```
❌ Error: Failed to connect to webhook: 404
```
**解决方案:**
1. 检查 N8N workflow 是否激活
2. 确认使用正式环境 URL（production mode）
3. 测试环境需要手动点击 "Execute workflow"

### 找不到 client_secret
```
❌ Error: Could not find client_secret in response
```
**解决方案:**
1. 检查 N8N workflow 是否正确返回 client_secret
2. 查看浏览器 Console 的完整响应
3. 确认 N8N 使用正确的 OpenAI API

### 麦克风无法访问
```
❌ Error: getUserMedia failed
```
**解决方案:**
1. 授予浏览器麦克风权限
2. 生产环境必须使用 HTTPS
3. 确认没有其他应用占用麦克风

### 消息顺序错乱
**解决方案:**
- 代码已包含智能排序逻辑，应该自动修复
- 如仍有问题，检查浏览器 Console 日志

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| Bundle Size | 153 KB (gzipped: 50 KB) |
| Build Time | ~400ms |
| WebRTC Latency | < 100ms |
| First Load | < 1s |

---

## 🔐 安全提醒

### ⚠️ 不要提交到 Git

```bash
.env              # 包含实际配置
.env.local        # 本地配置
.env.production   # 生产配置
node_modules/     # 依赖包
dist/             # 构建输出
.DS_Store         # Mac 系统文件
```

### ✅ 应该提交到 Git

```bash
.env.example      # 环境变量示例（不包含敏感信息）
src/              # 源代码
public/           # 静态资源
package.json      # 依赖配置
README.md         # 文档
```

---

## 🎯 开发流程

### 开始开发
```bash
cd /Users/macbookpro/Desktop/dev/realtimechat
npm run dev
# 打开 http://localhost:3000
```

### 修改代码
1. 编辑 `src/` 下的文件
2. 浏览器自动热更新
3. 检查 Console 无错误

### 构建测试
```bash
npm run build    # 确保能成功构建
npm run preview  # 预览生产版本
```

### 提交代码
```bash
git add .
git commit -m "描述你的改动"
git push
```

---

## 📚 相关文档

| 文档 | 用途 |
|------|------|
| [README.md](./README.md) | 完整项目说明 |
| [SETUP.md](./SETUP.md) | 详细设置指南 |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | 项目总结（中文） |
| [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) | 代码优化记录 |
| [GIT_UPLOAD_GUIDE.md](./GIT_UPLOAD_GUIDE.md) | Git 上传指南 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 本文档 |

---

## 🆘 获取帮助

### 项目相关
- 查看完整文档：`README.md`
- 设置问题：`SETUP.md`
- 代码问题：检查 `src/hooks/useRealtimeChat.ts`

### 技术支持
- OpenAI Realtime API: https://platform.openai.com/docs
- React 文档: https://react.dev
- Vite 文档: https://vitejs.dev
- N8N 文档: https://docs.n8n.io

---

## ⏱️ 快速恢复工作

下次继续开发时：

```bash
# 1. 进入项目目录
cd /Users/macbookpro/Desktop/dev/realtimechat

# 2. 确认当前使用的 API 环境
cat .env  # 查看是否有自定义配置
# 或查看默认配置
grep "webhookUrl" src/hooks/useRealtimeChat.ts

# 3. 启动开发服务器
npm run dev

# 4. 查看项目状态
git status
```

**当前配置:**
- ✅ 正式环境: `https://ici.zeabur.app/webhook/realtime-ai`
- ✅ 代码已优化
- ✅ 构建通过
- ✅ 文档完整
- ✅ 准备上传 Git

---

**最后更新:** 2025-11-24
**项目状态:** ✅ 生产就绪
