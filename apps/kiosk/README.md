# とくとくタッチ 共通キオスクアプリ

画面・ゲーム・音声・ポイントAPIは`C:\Users\TEC-14125-01\visitor-points\web`をAndroidとWindowsで共有します。

## Android

Node.js、Android Studio、Android SDKを用意してから実行します。

```powershell
cd apps/kiosk
npm install
npx cap add android
npx cap sync android
npx cap open android
```

AndroidではML Kit Barcode Scanningを利用し、JANとNW-7をネイティブカメラで読み取ります。Windows Edgeでは、共通画面内の`BarcodeDetector`フォールバックを利用します。

## Windows

管理者権限不要のローカルHTTPサーバーを起動し、Edgeをキオスクモードで開きます。

```powershell
powershell -ExecutionPolicy Bypass -File .\windows\start-edge-kiosk.ps1
```

カメラ利用のため、`file://`ではなく`http://127.0.0.1`で配信します。NSS APIは設定画面から接続先を設定します。
