# 預訂查詢功能說明

## 功能概述

已在前端實現查詢定位 (Reservation Availability Check) 功能。當 AI agent 理解用戶想要查詢定位時，會自動調用後端 API 檢查預訂情況。

## 工作流程

1. **用戶查詢**: 用戶通過語音或文字詢問預訂情況
   - 例如："12點可以預訂嗎？"、"我想訂 11 點"、"五點可以嗎？"

2. **Agent 輸出動作**: N8N 後端的 AI agent 理解意圖後，輸出 JSON 動作指令：
   ```json
   {"action":"CHECK_AVAILABILITY","time":"12:00"}
   ```

3. **前端檢測**: 前端檢測到 `CHECK_AVAILABILITY` 動作

4. **API 調用**: 自動調用 `https://ici.zeabur.app/webhook-test/checkResv`
   - Method: POST
   - Body: `{"time": "12:00"}`

5. **API 響應**: 後端返回查詢結果
   ```json
   {
     "bookTime": "12:00",
     "Availability": true
   }
   ```

6. **結果傳回 AI**: 前端將結果包裝成特殊格式發送回 Realtime AI：
   ```
   AVAILABILITY_RESULT: {"bookTime":"12:00","Availability":true}
   ```

7. **AI 自然回應**: Realtime AI 根據結果用自然語言回答用戶：
   - 可預訂: "12:00 可以預訂喔！請問要確認這個時間嗎？"
   - 已被預訂: "抱歉，12:00 已經被預訂了。您想換個時間嗎？"

## 技術實現

### 新增類型定義 (`src/types/index.ts`)

```typescript
// Action types for agent responses
export interface CheckAvailabilityAction {
  action: 'CHECK_AVAILABILITY'
  time: string // Format: "HH:mm" (e.g., "12:00")
}

export type AgentAction = CheckAvailabilityAction

// API response types
export interface CheckReservationResponse {
  available: boolean
  time: string
  message?: string
}
```

### 核心函數 (`src/hooks/useRealtimeChat.ts`)

#### 1. `parseActionCommand(content: string)`
- 從 AI 回應文本中提取 JSON 動作指令
- 支持靈活的 JSON 提取（即使文本中混有其他內容）

#### 2. `checkReservationAvailability(time: string)`
- 調用後端 API 檢查預訂狀態
- 返回格式化的結果對象

#### 3. 增強的 `handleDataChannelMessage`
- 在 AI 回應完成時檢查是否包含動作指令
- 自動執行相應操作並顯示結果

### UI 增強 (`src/components/ChatMessage.tsx`)

- 新增 `system` 消息類型支持
- 用於顯示查詢狀態和結果
- 居中灰色小標籤樣式

## API 規範

### 請求 (Request)

```
POST https://ici.zeabur.app/webhook-test/checkResv
Content-Type: application/json

{
  "time": "12:00"
}
```

### 響應 (Response)

後端應返回以下格式：

```json
{
  "bookTime": "12:00",
  "Availability": true
}
```

或

```json
{
  "bookTime": "12:00",
  "Availability": false
}
```

**注意**: 字段名是 `Availability` (正確拼寫)

## 後端配置要求

### N8N Realtime AI Agent Prompt 配置

你的 prompt 已經設置得很好！關鍵點：

1. **輸出動作格式**: 當理解用戶的預訂意圖時，輸出：
   ```json
   {"action":"CHECK_AVAILABILITY","time":"HH:MM"}
   ```

2. **等待結果**: 輸出動作後，AI 應該等待接收：
   ```
   AVAILABILITY_RESULT: {"bookTime":"12:00","Availability":true}
   ```

3. **解釋結果**: 收到 `AVAILABILITY_RESULT` 後，AI 會用自然語言告訴用戶：
   - 如果 `Availability: true`: "12:00 可以預訂喔！請問要確認這個時間嗎？"
   - 如果 `Availability: false`: "抱歉，12:00 已經被預訂了。您想換個時間嗎？"

你當前的 prompt 已經包含這些邏輯，完全符合要求！

## 使用示例

### 對話示例 1 - 可以預訂
```
User: "12點可以預訂嗎？"

AI (輸出動作): {"action":"CHECK_AVAILABILITY","time":"12:00"}

[前端]
1. 顯示: "正在查詢 12:00 的預訂情況..."
2. 調用 API: POST /webhook-test/checkResv {"time":"12:00"}
3. 收到: {"bookTime":"12:00","Availability":true}
4. 發送給 AI: AVAILABILITY_RESULT: {"bookTime":"12:00","Availability":true}

AI (自然回應): "12:00 可以預訂喔！請問要確認這個時間嗎？"
```

### 對話示例 2 - 已被預訂
```
User: "下午3點還有位置嗎？"

AI (輸出動作): {"action":"CHECK_AVAILABILITY","time":"15:00"}

[前端]
1. 顯示: "正在查詢 15:00 的預訂情況..."
2. 調用 API: POST /webhook-test/checkResv {"time":"15:00"}
3. 收到: {"bookTime":"15:00","Availability":false}
4. 發送給 AI: AVAILABILITY_RESULT: {"bookTime":"15:00","Availability":false}

AI (自然回應): "抱歉，15:00 已經被預訂了。您想換個時間嗎？"
```

## 時間格式

- 標準格式: `"HH:mm"` (24小時制)
- 示例:
  - `"09:00"` - 上午9點
  - `"12:00"` - 中午12點
  - `"15:30"` - 下午3點30分
  - `"21:00"` - 晚上9點

## 錯誤處理

- **API 調用失敗**: 顯示 "查詢預訂時發生錯誤，請稍後再試。"
- **JSON 解析失敗**: 靜默失敗，不影響正常對話
- **網絡錯誤**: Console 記錄錯誤，顯示用戶友好的錯誤消息

## 測試清單

- [ ] 語音詢問預訂情況
- [ ] 文字輸入詢問預訂情況
- [ ] 驗證時間格式正確傳遞到 API
- [ ] 確認 API 返回 true 時的顯示
- [ ] 確認 API 返回 false 時的顯示
- [ ] 測試 API 錯誤時的錯誤處理
- [ ] 測試多次連續查詢

## 環境配置

確保 API endpoint 正確配置：
- 測試環境: `https://ici.zeabur.app/webhook-test/checkResv`
- 生產環境: 需要時可在代碼中更新 `CHECK_RESV_URL` 常量

## 後續優化建議

1. **緩存機制**: 對近期查詢結果進行短時緩存
2. **批量查詢**: 支持一次查詢多個時間段
3. **日期支持**: 擴展支持日期查詢 (如 "明天12點")
4. **可視化日曆**: 顯示可用時段的日曆視圖
5. **直接預訂**: 在查詢結果後直接進行預訂操作
