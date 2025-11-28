# Git Push 指南

## 📋 當前狀態檢查

首先確認當前 git 狀態：

```bash
# 查看當前分支和狀態
git status

# 查看最近的提交
git log --oneline -5
```

---

## 🚀 推送到 Server 的步驟

### Step 1: 查看變更內容

```bash
# 查看所有變更的文件
git status

# 查看具體變更內容
git diff
```

---

### Step 2: 添加變更到暫存區

**選項 A: 添加所有變更**
```bash
git add .
```

**選項 B: 選擇性添加**
```bash
# 只添加源代碼
git add src/

# 添加文檔
git add *.md

# 添加構建配置
git add package.json vite.config.ts tsconfig.json

# 查看暫存的內容
git status
```

---

### Step 3: 創建提交

```bash
git commit -m "優化查表功能：解決 token 溢出和語音截斷問題

主要改進：
- 實施方案 3：從 AI 回應中提取時間，避免 JSON 輸出
- 新增延遲靜音機制：確保觸發句完整播放
- 增強 API 錯誤處理和診斷工具
- 支持模糊時間表達（中午、晚餐時間等）
- 新增詳細的 console 日誌和內建診斷工具

技術細節：
- 修改 N8N Prompt，移除 JSON 輸出要求
- 新增 extractTimeFromAIResponse() 時間提取函數
- 實施兩階段靜音：delta 檢測 + done 靜音
- 新增 ApiDiagnostics 診斷組件

文檔更新：
- SCHEMA_3_IMPLEMENTATION.md - 方案 3 完整實施文檔
- DELAYED_MUTING_UPDATE.md - 延遲靜音說明
- DEPLOYMENT_DEBUG_GUIDE.md - 部署診斷指南
- QUICK_FIX.md - 快速修復參考
- PROJECT_SUMMARY.md - 新增開發日誌

構建結果：163.97 kB (gzip: 52.85 kB)

🤖 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Step 4: 推送到遠端

**如果是首次推送到新分支：**
```bash
# 推送並設置上游分支
git push -u origin main
```

**如果分支已存在：**
```bash
# 直接推送
git push
```

**如果需要推送到其他分支：**
```bash
# 創建並切換到新分支
git checkout -b feature/table-query-optimization

# 推送到新分支
git push -u origin feature/table-query-optimization
```

---

## 🔍 推送前檢查清單

```bash
# ✅ 1. 確認構建成功
npm run build

# ✅ 2. 確認沒有 TypeScript 錯誤
# (build 指令已包含 tsc 檢查)

# ✅ 3. 查看將要提交的內容
git diff --cached

# ✅ 4. 確認 .gitignore 正確
# 確保 node_modules, .env 等不會被提交
git status --ignored

# ✅ 5. 檢查提交消息
git log -1
```

---

## 📦 重要文件確認

### 應該提交的文件：
```
✅ src/                         # 源代碼
✅ dist/                        # 構建產物（如果要部署）
✅ public/                      # 靜態資源
✅ *.md                         # 文檔
✅ package.json                 # 依賴配置
✅ package-lock.json            # 依賴鎖定
✅ tsconfig.json                # TypeScript 配置
✅ vite.config.ts               # Vite 配置
✅ tailwind.config.js           # Tailwind 配置
✅ postcss.config.js            # PostCSS 配置
✅ .env.example                 # 環境變量示例
✅ .gitignore                   # Git 忽略文件
```

### 不應該提交的文件：
```
❌ node_modules/                # 依賴包（太大）
❌ .env                         # 環境變量（含密鑰）
❌ .DS_Store                    # macOS 系統文件
❌ *.log                        # 日誌文件
```

---

## 🔄 常見場景

### 場景 1: 首次推送

```bash
# 1. 初始化 git（如果還沒有）
git init

# 2. 添加所有文件
git add .

# 3. 創建首次提交
git commit -m "🎉 Initial commit with table query optimization"

# 4. 添加遠端倉庫（替換為你的 URL）
git remote add origin <your-repo-url>

# 5. 推送
git push -u origin main
```

---

### 場景 2: 更新現有倉庫

```bash
# 1. 拉取最新代碼（如果有其他人在協作）
git pull

# 2. 添加變更
git add .

# 3. 提交
git commit -m "優化查表功能"

# 4. 推送
git push
```

---

### 場景 3: 解決衝突

```bash
# 1. 拉取遠端代碼
git pull

# 2. 如果有衝突，手動解決
# 編輯有衝突的文件，移除衝突標記

# 3. 標記衝突已解決
git add <resolved-files>

# 4. 完成合併
git commit

# 5. 推送
git push
```

---

## 📝 提交消息建議

### 簡短版（單行）：
```bash
git commit -m "優化查表功能：解決 token 溢出和語音截斷"
```

### 詳細版（多行，推薦）：
```bash
git commit -m "優化查表功能：解決 token 溢出和語音截斷問題

主要改進：
- 實施方案 3：從 AI 回應提取時間
- 延遲靜音機制：確保觸發句完整
- 增強 API 診斷和錯誤處理

技術細節：
- 新增 extractTimeFromAIResponse() 函數
- 修改靜音時機（delta 標記 + done 執行）
- 新增診斷工具組件

文檔：SCHEMA_3_IMPLEMENTATION.md, DELAYED_MUTING_UPDATE.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🎯 推送後驗證

### 1. 檢查遠端倉庫
```bash
# 查看遠端分支
git remote -v

# 查看遠端狀態
git remote show origin
```

### 2. 在 GitHub/GitLab 上確認
- ✅ 提交已出現在倉庫中
- ✅ 文件變更正確
- ✅ 構建狀態正常（如果有 CI/CD）

### 3. 部署到 Server
```bash
# SSH 到 server
ssh user@your-server

# 進入專案目錄
cd /path/to/project

# 拉取最新代碼
git pull

# 安裝依賴（如果有更新）
npm install

# 構建（如果需要）
npm run build

# 重啟服務（根據你的部署方式）
pm2 restart app
# 或
systemctl restart your-service
```

---

## ⚠️ 注意事項

### 1. 環境變量安全
```bash
# ❌ 不要提交 .env 文件
# 確保 .gitignore 包含：
.env
.env.local
.env.*.local
```

### 2. dist/ 目錄
```bash
# 如果直接部署 dist/，可以提交
git add dist/

# 如果 server 上重新構建，不需要提交
# .gitignore 添加：
dist/
```

### 3. 大文件
```bash
# 檢查大文件
git ls-files | xargs ls -lh | sort -k5 -h -r | head -20

# 如果有大文件，考慮使用 Git LFS
git lfs track "*.psd"
git lfs track "*.mp4"
```

---

## 🔧 Git 配置建議

### 設置用戶信息
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 設置編輯器
```bash
# 使用 VS Code
git config --global core.editor "code --wait"

# 使用 Vim
git config --global core.editor "vim"
```

### 設置默認分支名
```bash
git config --global init.defaultBranch main
```

---

## 📚 相關資源

- [Git 官方文檔](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🆘 常見問題

### Q: 如何撤銷最後一次提交？
```bash
# 保留變更，撤銷提交
git reset --soft HEAD~1

# 完全撤銷（小心使用）
git reset --hard HEAD~1
```

### Q: 如何修改最後一次提交消息？
```bash
git commit --amend -m "新的提交消息"
```

### Q: 如何查看提交歷史？
```bash
# 簡潔版
git log --oneline

# 圖形版
git log --graph --oneline --all

# 詳細版
git log -p
```

### Q: 推送被拒絕怎麼辦？
```bash
# 先拉取遠端變更
git pull --rebase

# 解決衝突（如果有）
# 然後推送
git push
```

---

**當前專案狀態：** ✅ 準備推送
**構建狀態：** ✅ 成功 (163.97 kB)
**測試狀態：** ⏳ 待部署後測試
