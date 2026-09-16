# v13.34.0 黑金拉霸與得獎揭曉

日期：2026-09-16；環境：BXH ARENA Beta / GitHub Pages。
基準：644dd69cbb4ae0478f1fe0000daa29bc18df4443（v13.33.0）。

## 修改
- 以使用者提供的 BXH 雙龍參考圖作為頂部裝飾，加入黑金三軸、金屬邊框、依序減速與停止動畫。
- 停止後彈出得獎者暱稱、玩家編號、獎品名稱、數量及可用的 HTTPS 獎品圖片。
- 預設手動下一位；可自動逐位播放，揭曉停留 5.5 秒，支援中途暫停。
- 頁面滿版為預設；原生全螢幕不支援或被拒絕時仍保留頁面滿版。
- 紀錄回放標示、固定公開結果快照；播放沒有任何抽獎、報名或通知 API 呼叫。
- 關閉或 Escape 清理計時器、回復捲動及焦點；避免多重回放與連點跳過。
- 尊重減少動態效果設定；長姓名換行、空名單明確提示。

## 範圍
前端新增 raffle-replay.js、raffle-replay.css、assets/raffle-bxh-machine.jpeg；整合 raffle-ui.js、index.html。
不修改後端、Rules、抽獎結果、叫號 PASS、站內信、道具或家庭選手資料。
本版是畫面動畫回放，尚未提供影片下載、音效或主辦公開/取消公開功能。

## 驗證
- tests/raffle-replay.cjs：DOM 模擬驗證固定快照、依序揭曉、手動停留、自動/暫停、重複點擊、安全文字、空名單、減少動態效果、Escape、計時器與焦點/捲動清理。
- tests/raffle-ui.cjs、tests/raffle-share.cjs：抽獎整合與分享回歸。
- JS 語法及 git diff --check。
- 瀏覽器執行檔下載逾時，未完成真實瀏覽器視覺驗證。
- 尚未完成手機實機、iPhone Safari 原生全螢幕及登入後端到端測試。

## 追溯
實際部署 commit、GitHub Pages run 與狀態保存在同版交接 ZIP。
回復時針對本版變更建立反向 commit，勿覆蓋後續其他視窗更新。
