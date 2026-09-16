# v13.37.0 家庭選手代報名與賽事身分

基底：前端 c26427d054ccd35d150e3d878cd73e9ad5be1930；後端 9fffba99f80cc6f26b22cef0e114db4a945d5416。

一般非積分、非超額抽籤賽事開放家庭選手代報名。每帳號每場只能選本人或一位孩子，共用一個報名文件與名額。孩子採固定選手編號，家長 UID 僅為操作／叫號身分；取消後不得切換參賽者。報名交易同步檢查主辦公開狀態、時間、資格、容量及候補，並更新私人與公開計數。重複 operationId 不重複占位。已產生對戰表不接受新的孩子報名。

家庭賽事紀錄從賽事正式狀態讀取，不寫入家長 playerStats、天梯或稱號。裁判名單保存孩子選手編號與家長叫號身分，公開鏡像不增加生日或家長 UID。PASS 額度歸屬孩子編號；規則維持同桌同輪遞延兩場、裁判同意。

未開放：兒童積分賽、超額抽籤賽事、長大後移交帳號、同帳號同場多人參賽。

部署流程合併最新 ZIP 及既有補丁，family 流程僅部署 familyPlayers、familyRegistration；court-call 流程部署 courtCallService 與既有規則。CI 模擬器測試成功才部署。前端需待兩個後端流程成功後發布。

驗證：registration-test.cjs（Firestore 模擬器、競爭交易／身分／時間／權限／紀錄）；既有 family emulator-test；court-call emulator-test 新增孩子叫號與獨立 PASS 額度；前端 family-registration-test.cjs（語法、名單同步、固定身分、結算隔離）。最終結果與 Run 編號另記交接檔。

手機登入後「代報名 → 主辦載入名單 → 叫號 → 結束賽事 → 查看孩子紀錄」仍需實機驗收。
