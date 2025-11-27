# 預訂查詢流程圖

## 完整數據流程

```
┌─────────────┐
│   用戶說話   │
│"12點可以嗎?" │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   Realtime AI (N8N Backend)     │
│                                  │
│ 1. 理解用戶意圖                 │
│ 2. 輸出動作指令                 │
│    {"action":"CHECK_AVAILABILITY"│
│     "time":"12:00"}              │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   前端 (useRealtimeChat.ts)     │
│                                  │
│ 1. parseActionCommand()         │
│    ↓ 檢測到 CHECK_AVAILABILITY  │
│                                  │
│ 2. 顯示狀態消息                 │
│    "正在查詢 12:00..."          │
│                                  │
│ 3. checkReservationAvailability()│
│    ↓                             │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   N8N API                        │
│   POST /webhook-test/checkResv  │
│                                  │
│   Request:                       │
│   {"time": "12:00"}              │
│                                  │
│   Response:                      │
│   {"bookTime":"12:00",           │
│    "Availability":true}          │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   前端處理結果                   │
│                                  │
│ 1. 移除狀態消息                 │
│                                  │
│ 2. 構建結果消息                 │
│    AVAILABILITY_RESULT:          │
│    {"bookTime":"12:00",          │
│     "Availability":true}         │
│                                  │
│ 3. 通過 dataChannel 發送         │
│    conversation.item.create      │
│                                  │
│ 4. 觸發 AI 回應                 │
│    response.create               │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   Realtime AI 收到結果          │
│                                  │
│ 輸入: AVAILABILITY_RESULT: {...}│
│                                  │
│ 解析並生成自然語言回應:         │
│ "12:00 可以預訂喔！             │
│  請問要確認這個時間嗎？"        │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   前端顯示 AI 回應               │
│                                  │
│ [AI]: 12:00 可以預訂喔！        │
│       請問要確認這個時間嗎？    │
└─────────────────────────────────┘
           │
           ▼
┌─────────────┐
│  用戶聽到回應 │
└─────────────┘
```

## 關鍵技術點

### 1. 動作檢測 (parseActionCommand)
```typescript
// AI 可能輸出: "讓我查一下 {"action":"CHECK_AVAILABILITY","time":"12:00"}"
// 函數從文本中提取 JSON
const action = parseActionCommand(assistantText)
```

### 2. API 調用 (checkReservationAvailability)
```typescript
// POST request
fetch("https://ici.zeabur.app/webhook-test/checkResv", {
  method: 'POST',
  body: JSON.stringify({ time: "12:00" })
})

// 期望響應
{
  "bookTime": "12:00",
  "Availability": true
}
```

### 3. 結果傳回 AI (dataChannel.send)
```typescript
// 構建消息
const text = `AVAILABILITY_RESULT: ${JSON.stringify(payload)}`

// 發送為用戶消息
dataChannel.send(JSON.stringify({
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [{ type: 'input_text', text }]
  }
}))

// 觸發 AI 回應
dataChannel.send(JSON.stringify({
  type: 'response.create'
}))
```

## 錯誤處理流程

```
API 調用失敗
    ↓
發送錯誤結果給 AI
AVAILABILITY_RESULT: {"error":"查詢失敗，請稍後再試"}
    ↓
AI 向用戶解釋錯誤
"抱歉，系統暫時無法查詢，請稍後再試"
```

## WebRTC Data Channel 事件

```
AI 輸出文本
    ↓
response.audio_transcript.done
    ↓
handleDataChannelMessage()
    ↓
檢查是否包含動作
    ↓
執行動作 & 發送結果
    ↓
AI 收到結果並回應
    ↓
response.audio_transcript.delta/done
    ↓
顯示給用戶
```

## 時序圖

```
User          Frontend          N8N API          Realtime AI
  │               │                 │                 │
  │──"12點可以?"──>│                 │                 │
  │               │                 │                 │
  │               │<────────────────┼────JSON action──│
  │               │  {"action":"CHECK_AVAILABILITY"}  │
  │               │                 │                 │
  │               ├────POST────────>│                 │
  │               │  {"time":"12:00"}                 │
  │               │                 │                 │
  │               │<────Response────┤                 │
  │               │ {"bookTime":"12:00","Availability":true}
  │               │                 │                 │
  │               ├─────────────────┼─AVAILABILITY────>│
  │               │                 │   _RESULT       │
  │               │                 │                 │
  │               │<────────────────┼────AI Reply─────│
  │<──"可以預訂"──┤                 │                 │
  │               │                 │                 │
```

## 代碼位置參考

- **動作解析**: `src/hooks/useRealtimeChat.ts:137-158`
- **API 調用**: `src/hooks/useRealtimeChat.ts:160-188`
- **消息處理**: `src/hooks/useRealtimeChat.ts:293-352`
- **類型定義**: `src/types/index.ts:25-38`
- **UI 展示**: `src/components/ChatMessage.tsx:12-19`
