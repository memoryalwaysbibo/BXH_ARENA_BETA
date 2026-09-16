# v13.35.0 領獎 QR 核銷與紀錄追蹤

Beta only。基準後端 a9407434561a8d61be50ded5d2c450d19e186268。

- memberRaffle 新增 claimCode、claimLookup、claimRedeem、claimHistory、claimStaff。
- 每份獎品以後端 96-bit 隨機憑證產生專屬碼；只有得獎者本人可取得。QR 為 BXHCLAIM: 憑證，沒有 UID 或個資。
- 憑證索引只存後端集合 raffleClaimCodes；原碼存私有結果，公開結果/通知/歷史紀錄不回傳原碼。
- 核銷在同一 Firestore transaction 再驗證人員權限、授權、活動、獎品、期限與原得獎者。兩人同時提交只有一次核銷紀錄，重試不重複交付。
- 核銷保存後端時間 claimedAt、操作人 UID/當時姓名及 code/manual 方式。主辦查完整紀錄，得獎者查本人領獎時間，公開結果不回傳核銷人。
- 主辦/最高管理員可授權最多20位有效正式工作人員；逐次核銷重新驗證。被授權者沒有編輯/開獎/棄領權限。Tester 限自己的 TEST，TEST 不可新增核銷代理。
- 棄領、過期不能核銷；補抽後舊碼失效。原有手動核銷同步留時間、人員及方式。舊資料不捏造歷史時間與人員。
- 沒有核銷撤銷/刪改入口；沒有發送額外通知或替真實得獎者測試核銷。

部署工作合併既有全部相關補丁（包含 court-call），只部署 functions:memberRaffle，不修改 Rules。
claims-emulator-test.cjs 與既有 raffle emulator 在隔離 Firestore emulator 驗證後才部署。
最終工作結果與 commit 見交接 ZIP。手機相機及登入後端到端操作仍待實機驗證。

## 前端入口
- 管理端 → 會員抽獎 → 掃碼核銷（可掃任何已授權活動）。
- 主辦活動 → 主辦管理 → 核銷紀錄／核銷人員授權。
- 玩家 → 我的活動 → 待領獎活動 → 出示我的領獎碼。
- 掃描只是查詢；二次確認已交付才核銷。相機權限拒絕、瀏覽器不支援或 QR 程式載入失敗，可改輸入文字碼。
- QR 憑證只在登入者對話框記憶體呈現，不寫入網址或瀏覽器儲存。切換帳號即關閉並停止鏡頭。

本地驗證：claims UI DOM 模擬測試、既有 raffle UI/share/replay、JS 語法與 diff whitespace 檢查。
未完成：手機鏡頭、真實 QR 解碼、登入後端到端核銷。沒有新增核銷撤銷功能。
