# BXH ARENA Beta v13.30.0｜站內信基礎系統

日期：2026-09-16（Asia/Taipei）

## 本版目標

建立獨立站內信入口與可靠的個人收件匣，作為日後抽獎中獎、活動異動與道具發放通知的共用基礎。

## 新增內容

- 玩家中心頂部新增獨立「站內信」按鈕與未讀數量。
- 收件匣顯示最近 50 封信、寄件來源、時間及已讀狀態。
- 點開未讀信件時自動標記已讀，也可手動改回未讀。
- 最高管理員可透過玩家 Firebase UID 發送測試信。
- 站內信呼叫 `mailboxService`，前端不直接寫入信件與未讀統計。

## 後端資料

- `userMail/{uid}/messages/{messageId}`：個人信件。
- `mailboxStats/{uid}`：未讀數量。
- `mailOperations/{operationId}`：寄送冪等紀錄，避免重試重複寄信。

## 權限與限制

- 有效登入帳號只能透過後端查看及切換自己的信件狀態。
- 測試寄信僅非測試的最高管理員可執行。
- 收件人必須是存在且有效的帳號。
- 第一階段尚未包含玩家互寄、附件、刪除、封存與外部 Email。
- 抽獎中獎與道具通知尚未串接。

## 部署方式

- 前端：更新 `index.html`，由 GitHub Pages 部署。
- 後端：`BXH_ARENA_Functions_Deploy` 的 `deploy-beta-mailbox.yml` 合併既有 Beta 補丁後，只部署 `mailboxService` 到 `bxh-arena-beta`。

## 驗證要求

- 前端腳本語法及既有測試。
- 後端 mailbox core 測試與組裝後 Functions check。
- 部署後以最高管理員寄信給測試玩家，驗證未讀數字、讀信、改回未讀與重新登入後狀態。
