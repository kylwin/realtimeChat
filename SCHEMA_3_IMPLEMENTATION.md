# 方案 3 實施總結

## ✅ 已完成的修改

### 修改時間：2025-11-27

---

## 📋 實施步驟

### ✅ Step 1: 更新 N8N Prompt

**位置：** N8N HTTP Request 節點的 instructions 欄位

**主要變更：**
- ❌ 移除：要求 AI 輸出 JSON `{"action":"CHECK_AVAILABILITY","time":"HH:MM"}`
- ✅ 改為：AI 回應格式為 `「請稍等，我幫你查一下 [時間]。」`
- ✅ 添加：明確的時間示例和轉換指南
- ✅ 強調：說完時間後立即停止，不要繼續說話

**效果：**
- 完全避免 JSON 輸出到 TTS
- 減少 token 溢出問題
- 保留用戶體驗（仍聽到"請稍等，我幫你查一下"）

---

### ✅ Step 2: 添加時間提取函數

**位置：** `src/hooks/useRealtimeChat.ts:137-241`

**新增函數：** `extractTimeFromAIResponse(text: string): string | null`

**支持的時間格式：**
```typescript
// 中文格式
"查一下 12點"          → "12:00"
"查一下 12點半"        → "12:30"
"查一下 12點30分"      → "12:30"
"查一下 早上9點"       → "09:00"
"查一下 下午5點"       → "17:00"
"查一下 晚上7點"       → "19:00"
"查一下 中午"          → "12:00"

// 24小時制
"查一下 14:30"         → "14:30"

// 英文格式
"查一下 5pm"           → "17:00"
"查一下 9am"           → "09:00"
```

**特點：**
- 詳細的 console 日誌（方便調試）
- 支持多種時間表達方式
- 自動處理 AM/PM 轉換
- 錯誤處理完善

---

### ✅ Step 3: 修改 `response.audio_transcript.delta` 處理

**位置：** `src/hooks/useRealtimeChat.ts:452-536`

**主要變更：**

**之前的邏輯：**
```typescript
// 檢測 JSON 字符串
if (currentText.includes('"action"') ||
    currentText.includes('CHECK_AVAILABILITY')) {
  // 處理 JSON...
}
```

**現在的邏輯：**
```typescript
// 檢測觸發詞
const isTriggerPhrase = currentText.includes('請稍等') &&
                        currentText.includes('查一下')

if (isTriggerPhrase) {
  const extractedTime = extractTimeFromAIResponse(currentText)

  if (extractedTime && !actionProcessingRef.current) {
    // 1. 立即靜音
    // 2. 取消後續回應
    // 3. 保留觸發句在 UI
    // 4. 執行查表
  }
}
```

**改進點：**
- ✅ 不再依賴 JSON 檢測
- ✅ 使用簡單的關鍵字檢測
- ✅ 保留 AI 說的完整句子在 UI 上
- ✅ 從 AI 回應中提取時間（利用 AI 的理解能力）

---

### ✅ Step 4: 修改 `response.audio_transcript.done` 處理

**位置：** `src/hooks/useRealtimeChat.ts:538-596`

**主要變更：**

**之前的邏輯：**
```typescript
const action = parseActionCommand(trimmed)
if (action && action.action === 'CHECK_AVAILABILITY') {
  // 處理...
}
```

**現在的邏輯：**
```typescript
// 保底檢測（如果 delta 階段沒檢測到）
const isTriggerPhrase = trimmed.includes('請稍等') &&
                        trimmed.includes('查一下')

if (isTriggerPhrase && !actionProcessingRef.current) {
  const extractedTime = extractTimeFromAIResponse(trimmed)
  if (extractedTime) {
    // 執行查表流程
  }
}
```

**用途：**
- 作為 delta 階段的保底機制
- 確保即使 delta 階段遺漏，done 時也能檢測到
- 提高系統穩定性

---

### ✅ Step 5: 清理舊代碼

**已移除：**
- ❌ `parseActionCommand` 函數（不再需要 JSON 解析）
- ❌ `AgentAction` type import（不再使用）
- ❌ JSON 字符串檢測邏輯

**保留：**
- ✅ `CheckReservationResponse` type（仍在使用）
- ✅ `checkReservationAvailability` 函數（查表 API 調用）
- ✅ `processCheckAvailability` 函數（查表流程處理）

---

## 🎯 核心改進

### 1. 問題解決

**之前的問題：**
```
用戶: "12點可以嗎？"
AI: "請稍等，我幫你查一下。{"action":"CHECK_AVAILABILITY"...
    ↑ TTS 開始說 JSON，然後才被 cancel
```

**現在：**
```
用戶: "12點可以嗎？"
AI: "請稍等，我幫你查一下 12點。"
    ↑ 說完立即停止，前端提取 "12:00"，開始查表
```

### 2. 工作流程

```
用戶說話完成
    ↓
AI 理解意圖並說出時間
    ↓ "請稍等，我幫你查一下 12點。"
前端檢測到觸發詞
    ↓
提取時間 "12點" → "12:00"
    ↓
立即靜音 + Cancel
    ↓
調用查表 API
    ↓
發送結果給 AI
    ↓
解除靜音
    ↓
AI 說出查表結果
```

### 3. 優勢對比

| 項目 | 方案 2（舊） | 方案 3（新） |
|------|------------|------------|
| JSON 輸出 | ✅ 需要 | ❌ 不需要 |
| Token 溢出 | ⚠️ 常見 | ✅ 避免 |
| 時間提取來源 | 用戶消息 | AI 回應 |
| 模糊時間處理 | ❌ 困難 | ✅ AI 理解 |
| 維護複雜度 | 高 | 低 |
| 用戶體驗 | 一般 | 更好 |

---

## 🧪 測試案例

### 測試 1: 明確時間
```
輸入: "12點可以嗎？"
AI: "請稍等，我幫你查一下 12點。"
提取: "12:00" ✅
```

### 測試 2: 模糊時間（中午）
```
輸入: "中午可以嗎？"
AI: "請稍等，我幫你查一下 12點。"
提取: "12:00" ✅
```

### 測試 3: 英文 PM
```
輸入: "Can I book at 5pm?"
AI: "請稍等，我幫你查一下 下午5點。"
提取: "17:00" ✅
```

### 測試 4: 半點
```
輸入: "11點半可以嗎？"
AI: "請稍等，我幫你查一下 11點半。"
提取: "11:30" ✅
```

### 測試 5: 早上/下午
```
輸入: "早上9點"
AI: "請稍等，我幫你查一下 早上9點。"
提取: "09:00" ✅

輸入: "下午5點"
AI: "請稍等，我幫你查一下 下午5點。"
提取: "17:00" ✅
```

---

## 📊 性能指標

### 構建結果
```bash
✓ built in 428ms
dist/assets/index-CSaGsI87.js   163.80 kB │ gzip: 52.81 kB
```

**變化：**
- 舊版本: 162.38 kB
- 新版本: 163.80 kB
- 增加: +1.42 kB（主要是新的時間提取函數）

### TypeScript 編譯
- ✅ 無錯誤
- ✅ 無警告
- ✅ 類型完整

---

## 🔍 調試日誌

啟用了詳細的 console 日誌，方便調試：

```javascript
// 時間提取
🕐 Extracting time from AI response: 請稍等，我幫你查一下 12點。
✅ Extracted time: 12:00 from "請稍等，我幫你查一下 12點。"

// 檢測到觸發詞
🎯 Detected trigger phrase in delta: 請稍等，我幫你查一下 12點。
🎯 Time extracted, entering tool phase: 12:00

// API 調用
🌐 Calling reservation API: { url: "...", time: "12:00", ... }
📡 API response received: { status: 200, ... }
📥 Raw API response: { bookTime: "12:00", Availability: false }

// 發送結果給 AI
📤 Sending availability result to Realtime AI: { ... }
```

---

## 📝 部署說明

### 部署前檢查

```bash
# 1. 確認 N8N prompt 已更新 ✅
# 2. 本地測試
npm run dev

# 3. 構建
npm run build

# 4. 預覽構建結果
npm run preview

# 5. 上傳 dist/ 目錄到 server
```

### 驗證步驟

1. **基本連接測試**
   - 打開網站
   - 點擊 "Get Started"
   - 確認可以連接

2. **查表功能測試**
   - 說 "12點可以嗎？"
   - 檢查 Console 日誌
   - 確認看到：
     - 🎯 Detected trigger phrase
     - ✅ Extracted time: 12:00
     - 🌐 Calling reservation API
     - 📡 API response received

3. **多種時間格式測試**
   - "中午可以嗎？" → 12:00
   - "下午5點" → 17:00
   - "11點半" → 11:30

4. **正常對話測試**
   - 說一些非查表的話
   - 確認 AI 正常回應
   - 沒有誤觸發查表

---

## 🐛 已知問題和解決方案

### 問題 1: AI 不遵守 Prompt
**症狀：** AI 仍然輸出 JSON 或多餘的話

**解決：**
- 檢查 N8N prompt 是否正確更新
- 確認使用的是新的 instructions
- 可能需要重啟 N8N workflow

### 問題 2: 時間提取失敗
**症狀：** Console 顯示 "❌ Could not extract time"

**解決：**
- 檢查 AI 回應的格式
- 可能需要在 `extractTimeFromAIResponse` 中添加新的 pattern
- 查看 Console 日誌，確認 AI 實際說了什麼

### 問題 3: 查表沒有觸發
**症狀：** AI 說了觸發詞，但沒有查表

**檢查：**
```javascript
// 1. 確認檢測到觸發詞
🎯 Detected trigger phrase in delta: ...

// 2. 確認提取到時間
✅ Extracted time: ...

// 3. 如果沒有這些日誌，檢查：
// - actionProcessingRef.current 是否為 false
// - dataChannelRef.current?.readyState 是否為 'open'
```

---

## 🎉 預期效果

### 用戶體驗
- ✅ 聽到："請稍等，我幫你查一下 12點。"
- ✅ 短暫停頓（查表中）
- ✅ 聽到查表結果："12點可以訂位喔！"
- ❌ **不會再聽到** JSON 字符串或多餘的話

### 開發體驗
- ✅ 邏輯更簡單清晰
- ✅ 調試信息完整
- ✅ 容易擴展（未來可加其他查詢類型）

### 性能
- ✅ 減少 token 消耗
- ✅ 避免不必要的 TTS 生成
- ✅ 更快的響應時間

---

## 📚 相關文檔

- [README.md](./README.md) - 項目總覽
- [DEPLOYMENT_DEBUG_GUIDE.md](./DEPLOYMENT_DEBUG_GUIDE.md) - 部署診斷指南
- [QUICK_FIX.md](./QUICK_FIX.md) - 快速修復參考

---

**實施完成時間：** 2025-11-27
**版本：** 方案 3 (基於 AI 回應的時間提取)
**狀態：** ✅ 已完成並構建成功
