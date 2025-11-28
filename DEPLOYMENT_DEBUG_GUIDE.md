# 部署診斷指南

## 問題：localhost 正常但部署到 server 後無法調用 API

### 🔍 已實施的修復

#### 1. **增強的錯誤日誌** (src/hooks/useRealtimeChat.ts)

現在所有 API 請求都會記錄詳細信息：

- ✅ 請求 URL 和參數
- ✅ 響應狀態碼和 headers
- ✅ CORS headers 檢查
- ✅ 詳細錯誤信息

**查看方式：**
打開瀏覽器開發者工具 (F12) → Console 標籤

**關鍵日誌：**
```
🌐 Calling reservation API: {...}
📡 API response received: {...}
✅/❌ 結果信息
```

#### 2. **CORS 模式明確設置**

所有 fetch 請求現在都明確設置 `mode: 'cors'`：

```typescript
fetch(url, {
  method: 'POST',
  mode: 'cors',  // ← 新增
  headers: { ... }
})
```

#### 3. **內建診斷工具**

新增了 API 診斷頁面，可以一鍵測試所有連接：

**使用方式：**
1. 打開應用
2. 點擊右上角「🔍 診斷工具」按鈕
3. 點擊「開始診斷」
4. 查看每個測試的結果

**診斷項目：**
- ✅ 環境變量配置
- ✅ Webhook 連接測試
- ✅ Reservation API 測試
- ✅ CORS Headers 檢查

---

## 🚨 常見問題和解決方案

### 問題 1: CORS 錯誤

**症狀：**
```
Access to fetch at 'https://ici.zeabur.app/...' from origin '...'
has been blocked by CORS policy
```

**原因：**
N8N webhook 沒有設置正確的 CORS headers

**解決方案：**

在 N8N workflow 中添加 "Set Response Headers" 節點：

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept"
}
```

或者在 webhook 節點設置中啟用 CORS。

---

### 問題 2: 404 Not Found

**症狀：**
```
Failed to connect to webhook: 404 Not Found
```

**原因：**
- Webhook URL 不正確
- N8N workflow 未啟動
- 使用了測試 URL 但 workflow 未處於測試模式

**解決方案：**

1. **檢查 URL 配置：**
   ```bash
   # 查看當前環境變量
   cat .env
   ```

2. **確認 N8N workflow 狀態：**
   - 登入 N8N
   - 確認 workflow 已啟動 (Active)
   - 如果使用 `/webhook-test/...`，需要手動執行測試

3. **URL 對照表：**
   - 正式環境: `https://ici.zeabur.app/webhook/realtime-ai`
   - 測試環境: `https://ici.zeabur.app/webhook-test/realtime-ai`
   - 預訂 API: `https://ici.zeabur.app/webhook/checkResv`

---

### 問題 3: Mixed Content (HTTP/HTTPS)

**症狀：**
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource
```

**原因：**
部署的網站是 HTTPS，但嘗試調用 HTTP API

**解決方案：**
確保所有 API URLs 都使用 HTTPS。檢查代碼中的 URL：

```typescript
// ✅ 正確
const CHECK_RESV_URL = 'https://ici.zeabur.app/webhook/checkResv'

// ❌ 錯誤
const CHECK_RESV_URL = 'http://ici.zeabur.app/webhook/checkResv'
```

---

### 問題 4: 環境變量未生效

**症狀：**
部署後使用了錯誤的 URL

**原因：**
Vite 環境變量在構建時打包，而不是運行時讀取

**解決方案：**

1. **構建前檢查 .env 文件：**
   ```bash
   cat .env
   # 應該看到:
   # VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook/realtime-ai
   ```

2. **重新構建：**
   ```bash
   npm run build
   ```

3. **驗證構建產物：**
   使用診斷工具查看實際使用的 URL

---

## 📋 部署前檢查清單

### 1. 本地測試
- [ ] `npm run dev` 運行正常
- [ ] 可以連接 webhook
- [ ] 可以進行語音對話
- [ ] 預訂查詢功能正常

### 2. 環境配置
- [ ] `.env` 文件存在且配置正確
- [ ] VITE_WEBHOOK_URL 指向正式環境
- [ ] 所有 URLs 使用 HTTPS

### 3. N8N 配置
- [ ] Realtime AI workflow 已啟動
- [ ] Reservation API workflow 已啟動
- [ ] CORS headers 已配置
- [ ] Webhook URLs 可訪問

### 4. 構建
- [ ] `npm run build` 成功
- [ ] 沒有 TypeScript 錯誤
- [ ] dist/ 目錄存在
- [ ] 使用 `npm run preview` 預覽構建結果

### 5. 部署
- [ ] 上傳整個 dist/ 目錄
- [ ] 配置服務器支持 SPA (Single Page Application)
- [ ] 確保使用 HTTPS
- [ ] 測試所有功能

---

## 🔧 診斷步驟

### Step 1: 打開診斷工具

1. 訪問部署的網站
2. 打開瀏覽器開發者工具 (F12)
3. 切換到 Console 標籤
4. 點擊「🔍 診斷工具」按鈕
5. 運行診斷

### Step 2: 分析診斷結果

**如果所有測試都是 ✅：**
- API 配置正確
- 問題可能在其他地方（如 WebRTC 連接）

**如果有 ❌ 錯誤：**
1. 點擊「查看詳細信息」
2. 查看 error.name 和 error.message
3. 參考下方錯誤代碼表

### Step 3: 查看 Console 日誌

尋找這些關鍵日誌：

```javascript
// Webhook 連接
🔌 Connecting to webhook: { url: "...", ... }
📡 Webhook response: { status: 200, ... }
✅ Client secret obtained successfully

// API 調用
🌐 Calling reservation API: { url: "...", time: "..." }
📡 API response received: { status: 200, ... }
📥 Raw API response: { ... }

// 錯誤日誌
❌ Error checking reservation: { ... }
❌ Webhook error: ...
```

---

## 📊 錯誤代碼對照表

| 錯誤類型 | 錯誤信息 | 原因 | 解決方案 |
|---------|---------|-----|---------|
| `TypeError: Failed to fetch` | Network request failed | CORS 被阻止或網絡問題 | 檢查 N8N CORS 設置 |
| `404 Not Found` | Failed to connect | URL 錯誤或 workflow 未啟動 | 檢查 URL 和 N8N |
| `500 Internal Server Error` | Server error | N8N workflow 出錯 | 檢查 N8N 執行日誌 |
| `Mixed Content` | HTTP/HTTPS 混用 | 協議不一致 | 全部使用 HTTPS |
| `No 'Access-Control-Allow-Origin'` | CORS 未配置 | N8N 缺少 CORS headers | 添加 CORS headers |

---

## 🛠️ N8N Webhook CORS 配置

### 方法 1: 使用 Webhook 節點設置

1. 打開 N8N workflow
2. 選擇 Webhook 節點
3. 在設置中找到「Options」
4. 添加「Response Headers」：

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization"
}
```

### 方法 2: 使用 Set 節點

在 webhook 後添加 "Set" 節點：

```
Webhook → Set (Add Headers) → Return Response
```

Set 節點配置：
```json
{
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  }
}
```

---

## 📞 進階調試

### 使用 curl 測試 API

```bash
# 測試 Webhook
curl -v https://ici.zeabur.app/webhook/realtime-ai

# 測試 Reservation API
curl -v -X POST https://ici.zeabur.app/webhook/checkResv \
  -H "Content-Type: application/json" \
  -d '{"time":"12:00"}'

# 測試 CORS
curl -v -X OPTIONS https://ici.zeabur.app/webhook/checkResv \
  -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: POST"
```

查看響應中的 headers：
- `Access-Control-Allow-Origin: *` ← 必須存在
- `Access-Control-Allow-Methods: POST, GET, OPTIONS` ← 必須包含 POST
- `Content-Type: application/json` ← 必須是 JSON

---

## 🎯 快速修復腳本

如果問題仍然存在，可以嘗試這個快速修復：

```bash
# 1. 清理舊構建
rm -rf dist/

# 2. 檢查環境變量
cat .env

# 3. 重新安裝依賴（可選）
rm -rf node_modules/
npm install

# 4. 重新構建
npm run build

# 5. 本地預覽構建結果
npm run preview
```

---

## 📝 部署後驗證

### 1. 基本連接測試

訪問部署的 URL，打開 Console，應該看到：

```
✅ 沒有紅色錯誤
✅ 可以點擊「Get Started」
✅ 顯示「Connecting...」
✅ 成功連接並顯示聊天界面
```

### 2. 預訂功能測試

1. 連接成功後
2. 說「12點可以預訂嗎？」
3. 查看 Console 日誌
4. 應該看到 API 調用和響應

### 3. 性能測試

使用診斷工具查看：
- Webhook 響應時間 < 2s
- API 調用響應時間 < 1s
- 無 CORS 錯誤

---

## 📚 相關文件

- [README.md](./README.md) - 專案總覽
- [SETUP.md](./SETUP.md) - 安裝設置指南
- [FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md) - 預訂查詢流程圖

---

## 💡 仍然有問題？

1. **查看 Console 日誌**，複製所有錯誤信息
2. **運行診斷工具**，截圖診斷結果
3. **測試 N8N webhook**，確認可以直接訪問
4. **檢查網絡**，確認沒有防火牆阻止

**常見成功指標：**
- ✅ Console 沒有紅色 CORS 錯誤
- ✅ 診斷工具所有測試通過
- ✅ 可以看到 `📡 API response received` 日誌
- ✅ N8N execution 日誌顯示請求已收到

如果所有這些都正常但仍有問題，可能是：
- WebRTC 連接問題（與 API 無關）
- 麥克風權限問題
- 瀏覽器兼容性問題

祝部署順利！🚀
