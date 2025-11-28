# 🚀 快速修復指南

## 問題：Server 上無法調用 API

### ⚡ 30 秒快速檢查

```bash
# 1. 打開部署的網站
# 2. 按 F12 打開開發者工具
# 3. 點擊右上角「🔍 診斷工具」
# 4. 點擊「開始診斷」
# 5. 查看結果
```

---

## 🎯 最可能的原因 (按機率排序)

### 1. CORS 未配置 (90% 機率)

**症狀：**
```
Access to fetch ... has been blocked by CORS policy
```

**快速修復：**

登入 N8N → 打開 workflow → Webhook 節點 → 添加 Response Headers：

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*"
}
```

保存並重啟 workflow。

---

### 2. N8N Workflow 未啟動 (5% 機率)

**症狀：**
```
404 Not Found
```

**快速修復：**

1. 登入 N8N
2. 檢查 workflow 狀態是否為「Active」
3. 如果使用 `/webhook-test/...`，切換到 `/webhook/...`

---

### 3. 環境變量未生效 (3% 機率)

**症狀：**
診斷工具顯示使用了錯誤的 URL

**快速修復：**

```bash
# 檢查 .env
cat .env

# 確保有這行
VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook/realtime-ai

# 重新構建
npm run build
```

---

### 4. HTTP/HTTPS 混用 (2% 機率)

**症狀：**
```
Mixed Content: ... requested an insecure resource
```

**快速修復：**

檢查所有 URL 都用 HTTPS：
- ✅ `https://ici.zeabur.app/...`
- ❌ `http://ici.zeabur.app/...`

---

## 🔍 診斷工具使用

### 看到的結果：

#### ✅ 全部綠色
→ API 配置正確，問題在其他地方

#### ❌ Webhook 連接測試失敗
→ N8N workflow 問題，檢查：
1. Workflow 是否啟動
2. URL 是否正確
3. CORS 是否配置

#### ❌ Reservation API 測試失敗
→ 預訂 API endpoint 問題：
1. 確認 `https://ici.zeabur.app/webhook/checkResv` 存在
2. 確認支持 POST 請求
3. 檢查 CORS headers

#### ❌ CORS Headers 檢查失敗
→ 立即添加 CORS headers（見上方方法 1）

---

## 📋 快速驗證清單

部署後立即檢查：

```
□ 打開網站無 Console 錯誤
□ 點擊「🔍 診斷工具」
□ 運行診斷，所有項目 ✅
□ 點擊「Get Started」可以連接
□ 可以進行語音對話
```

---

## 🆘 如果還是不行

### 查看 Console 日誌

尋找這些關鍵字：
- `❌` - 錯誤發生的位置
- `CORS` - CORS 相關問題
- `404` - URL 或 workflow 問題
- `Failed to fetch` - 網絡或 CORS 問題

### 複製錯誤信息

1. 打開 Console
2. 右鍵點擊錯誤信息
3. 選擇「Copy」
4. 貼到文本編輯器分析

### 測試 N8N 直接訪問

在瀏覽器新標籤直接訪問：
```
https://ici.zeabur.app/webhook/realtime-ai
```

**正常結果：**
- 應該返回 JSON 數據
- 包含 `client_secret` 字段
- 不是 404 或 500 錯誤

---

## 📞 還需要幫助？

參考完整指南：[DEPLOYMENT_DEBUG_GUIDE.md](./DEPLOYMENT_DEBUG_GUIDE.md)

包含：
- 詳細錯誤代碼對照表
- N8N 配置截圖步驟
- curl 測試命令
- 進階調試技巧
