# 延遲靜音更新 - 方案 C

## 問題描述

**之前的問題：**
```
用戶: "晚上7點可以嗎？"
AI: "請稍等，我幫你查一下晚上七（被截斷）"
     ↑ 查表結果很快回來，語音被截斷
AI: "好的，晚上7點可以訂位喔！"
```

**原因分析：**
1. 在 `delta` 階段檢測到觸發詞後，**立即靜音並 cancel**
2. 但此時 TTS **還在播放**「請稍等，我幫你查一下晚上七點」
3. 查表很快完成（< 說完這句話的時間）
4. 導致語音被截斷

---

## 解決方案：方案 C - 延遲靜音

### 核心思路

**讓當前句子說完再靜音**

```
Delta 階段檢測到觸發詞：
  ✅ 標記進入查表狀態 (actionProcessingRef.current = true)
  ✅ 立即開始查表（並行）
  ❌ 不立即靜音
  ❌ 不立即 cancel

Done 階段（句子說完）：
  ✅ 檢查是否為查表狀態
  ✅ 如果是，現在才靜音
  ✅ 現在才 cancel 後續回應
```

---

## 實施細節

### 修改 1: Delta 階段 - 不立即靜音

**位置：** `src/hooks/useRealtimeChat.ts:452-485`

**之前：**
```typescript
if (extractedTime && !actionProcessingRef.current) {
  actionProcessingRef.current = true

  // ❌ 立即靜音
  if (audioElementRef.current) {
    audioElementRef.current.muted = true
  }

  // ❌ 立即 cancel
  if (dataChannelRef.current?.readyState === 'open') {
    dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }))
  }

  processCheckAvailability(extractedTime)
}
```

**現在：**
```typescript
if (extractedTime && !actionProcessingRef.current) {
  actionProcessingRef.current = true

  // ⭐ 不立即靜音，讓當前句子說完
  // 靜音會在 response.audio_transcript.done 時執行

  // ⭐ 也不立即 cancel，讓當前回應說完
  // 阻止後續新的回應會在 done 時處理

  // 立即開始查表（並行進行）
  processCheckAvailability(extractedTime)
}
```

---

### 修改 2: Done 階段 - 現在才靜音

**位置：** `src/hooks/useRealtimeChat.ts:514-592`

**新增邏輯：**
```typescript
else if (type === 'response.audio_transcript.done') {
  const assistantText = message.transcript || currentTranscriptRef.current.assistant
  const trimmed = assistantText.trim()

  if (!trimmed) {
    // ... 清理邏輯
    return
  }

  // ⭐ 新增：檢查是否為查表觸發句剛說完
  if (actionProcessingRef.current) {
    console.log('🔇 Trigger sentence completed, muting audio and canceling further responses')

    // 現在靜音（當前句子已經說完了）
    if (audioElementRef.current) {
      audioElementRef.current.muted = true
    }

    // 取消後續回應（避免 AI 繼續說多餘的話）
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }))
    }

    // 清空 transcript，等待查表結果
    currentTranscriptRef.current.assistant = ''
    assistantMessageTimestampRef.current = null
    setConversationState('processing')
    return
  }

  // ... 保底檢測邏輯
  // ... 正常對話邏輯
}
```

---

## 時序圖

### 之前的流程（有問題）

```
時間軸 →

用戶說完話
    ↓
AI 開始說: "請稍等，我幫你查一下晚上七點。"
    ↓ (TTS 開始播放)
Delta 檢測到觸發詞 → 提取時間 "19:00"
    ↓
立即靜音 ❌ (TTS 被截斷！)
立即 cancel
開始查表
    ↓ (很快完成)
查表結果回來
    ↓
解除靜音
AI 說: "好的，晚上7點可以..."
```

**問題：** 「請稍等，我幫你查一下晚上七（被截斷）」

---

### 現在的流程（已修復）

```
時間軸 →

用戶說完話
    ↓
AI 開始說: "請稍等，我幫你查一下晚上七點。"
    ↓ (TTS 開始播放)
Delta 檢測到觸發詞 → 提取時間 "19:00"
    ↓
設置查表狀態標記
並行開始查表
    ↓ (不靜音，不 cancel，讓句子繼續說)
TTS 繼續播放: "...晚上七點。" ✅
    ↓
Done 事件觸發（句子說完）
    ↓
檢測到查表狀態 → 現在才靜音 ✅
現在才 cancel
    ↓ (此時查表可能已完成或還在進行)
等待查表完成...
    ↓
查表結果回來
    ↓
解除靜音
AI 說: "好的，晚上7點可以訂位喔！"
```

**效果：** 完整聽到「請稍等，我幫你查一下晚上七點。」

---

## 關鍵改進點

### 1. 並行查表
```typescript
// Delta 階段
actionProcessingRef.current = true  // 標記狀態
processCheckAvailability(extractedTime)  // 立即開始查表（並行）

// Done 階段
if (actionProcessingRef.current) {
  // 靜音（句子已說完）
  // Cancel（阻止後續話）
}
```

**優勢：**
- 查表在 TTS 播放期間就開始了
- 如果查表慢，用戶聽完句子後再等
- 如果查表快，用戶也聽到完整句子

### 2. 狀態標記 `actionProcessingRef.current`

**用途：**
- Delta 階段：設為 `true`，表示進入查表狀態
- Done 階段：檢查這個標記，決定是否靜音
- 查表完成後：在 `processCheckAvailability` 的 `finally` 中重置為 `false`

### 3. 保底機制仍然保留

```typescript
// 如果 delta 階段沒檢測到，done 時作為保底
if (isTriggerPhrase && !actionProcessingRef.current) {
  // 立即靜音並 cancel（因為句子已經說完了）
  // 開始查表
}
```

---

## 測試場景

### 場景 1: 查表很快（< 說話時間）

```
用戶: "12點可以嗎？"
AI 開始說: "請稍等，我幫你查一下 12點。" (約 2 秒)
    ↓ Delta 檢測，開始查表
查表完成 (0.5 秒) ← 比說話快
    ↓ 但不靜音，繼續說
AI 說完: "...12點。" ✅
    ↓ Done 事件，現在靜音
    ↓ 查表結果已在內存中
AI 說: "好的，12點可以訂位喔！"
```

**效果：** 完整句子 + 無縫接續

---

### 場景 2: 查表較慢（> 說話時間）

```
用戶: "晚上7點可以嗎？"
AI 開始說: "請稍等，我幫你查一下 晚上7點。" (約 2 秒)
    ↓ Delta 檢測，開始查表
AI 說完: "...晚上7點。" ✅
    ↓ Done 事件，現在靜音
    ↓ 等待查表...
查表完成 (3 秒) ← 比說話慢
    ↓
AI 說: "好的，晚上7點可以訂位喔！"
```

**效果：** 完整句子 + 短暫停頓（等查表）

---

## Console 日誌

新增了關鍵日誌，方便調試：

```javascript
// Delta 階段
🎯 Time extracted, entering tool phase: 19:00

// Done 階段（查表狀態）
🔇 Trigger sentence completed, muting audio and canceling further responses

// 查表過程
🌐 Calling reservation API: { time: "19:00", ... }
📡 API response received: { status: 200, ... }
```

---

## 構建結果

```bash
✓ built in 414ms
dist/assets/index-C0277Dzz.js   163.97 kB │ gzip: 52.85 kB
```

**變化：**
- 之前: 163.80 kB
- 現在: 163.97 kB
- 增加: +0.17 kB（新增的邏輯很少）

---

## 預期效果

### 用戶體驗
- ✅ 完整聽到：「請稍等，我幫你查一下晚上七點。」
- ✅ 短暫停頓（如果查表還在進行）
- ✅ 聽到結果：「好的，晚上7點可以訂位喔！」
- ❌ **不再有**語音被截斷的情況

### 開發調試
- ✅ Console 有清晰的狀態日誌
- ✅ 可以看到 Delta → Done → 查表完成的完整流程
- ✅ 容易定位問題

---

## 注意事項

### 1. 查表應該盡量快

雖然延遲靜音解決了截斷問題，但如果查表太慢：
- 用戶會在聽完觸發句後等待
- 建議查表時間控制在 1-2 秒內

### 2. N8N Prompt 仍然重要

確保 AI 說完觸發句後**立即停止**：
```
「請稍等，我幫你查一下 [時間]。」
↑ 說完這句立即停止，不要繼續說
```

如果 AI 不遵守，會繼續說多餘的話，被 cancel 掉。

### 3. 保底機制仍然存在

如果 Delta 階段沒檢測到觸發詞（極少見），Done 階段會作為保底：
- 立即靜音並 cancel（因為句子已說完）
- 開始查表

---

## 未來優化方向

如果查表經常很慢（> 3 秒），可以考慮：

### 選項 1: 在觸發句中加入時間估計
```
AI: "請稍等，我幫你查一下 12點，大約需要幾秒鐘。"
```

### 選項 2: 播放等待音效
```typescript
// Done 階段靜音後
if (actionProcessingRef.current) {
  audioElement.muted = true
  // 播放等待音效（可選）
  playWaitingSound()
}
```

### 選項 3: 顯示視覺反饋
在 UI 顯示「查詢中...」的動畫。

---

## 測試建議

### 本地測試
```bash
npm run dev
```

**測試案例：**
1. "12點可以嗎？" - 聽完整句子
2. "中午可以嗎？" - AI 理解為 12點
3. "下午5點" - 完整播放
4. "Can I book at 7pm?" - 英文也正常

**檢查點：**
- ✅ 觸發句完整播放，不被截斷
- ✅ Console 看到 `🔇 Trigger sentence completed`
- ✅ 查表正常執行
- ✅ 結果正常回應

---

## 相關文檔

- [SCHEMA_3_IMPLEMENTATION.md](./SCHEMA_3_IMPLEMENTATION.md) - 方案 3 完整文檔
- [README.md](./README.md) - 專案總覽

---

**更新時間：** 2025-11-27
**版本：** 方案 C (延遲靜音)
**狀態：** ✅ 已實施並構建成功
