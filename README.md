# visitor-points

店舗設置型タッチディスプレイ向けの来店ポイントゲームPoCです。
Web画面を共通資産として、Windows EdgeキオスクとAndroid Capacitorアプリから起動します。

## ディレクトリ構成

```text
visitor-points/
├─ web/                         # 共通Web画面・ゲーム・音声
│  ├─ index.html                # エントリーページ
│  ├─ app.js                    # 画面遷移、ゲーム、ポイント処理
│  ├─ platform-bridge.js        # Androidネイティブ連携
│  ├─ styles.css                # 画面デザイン・アニメーション
│  ├─ assets/audio/             # BGM・効果音
│  └─ vendor/                   # Windowsブラウザ用バーコード解析
│     ├─ quagga.min.js          # 位置・傾き補正付き1D解析（MIT）
│     └─ zxing-browser.min.js   # 追加フォールバック解析
└─ apps/kiosk/                  # Capacitorプロジェクト
   ├─ android/                  # Android Studioプロジェクト
   ├─ windows/                  # Windows Edgeキオスク起動スクリプト
   ├─ scripts/                  # Web資産検証スクリプト
   ├─ capacitor.config.ts       # Web資産参照先・アプリ設定
   ├─ package.json
   └─ package-lock.json
```

## Windowsでの起動

必要なもの：Microsoft Edge、Python、Node.js（依存関係の更新時）。

PowerShellで以下を実行します。

```powershell
cd C:\Users\TEC-14125-01\visitor-points\apps\kiosk
powershell -ExecutionPolicy Bypass -File .\windows\start-edge-kiosk.ps1
```

起動スクリプトは、Node.jsで`web/`をローカルHTTPサーバーとして公開し、Edgeをキオスクモードで起動します。Pythonは不要です。

ブラウザから確認する場合のURLは `http://127.0.0.1:5173/` です。`http://127.0.0.1/` はポート80のため、本アプリには接続できません。

## Androidでの起動・同期

必要なもの：Node.js、Android Studio、Android SDK、JDK。

```powershell
cd C:\Users\TEC-14125-01\visitor-points\apps\kiosk
npm install
npx cap sync android
npx cap open android
```

Android実機でカメラを使用する場合は、カメラ権限を許可してください。

## 接続設定

店員PINで設定画面を開き、以下を設定します。

- 接続方式：デモまたは実API
- プロトコル：HTTPまたはHTTPS
- CSdelightサーバーIP／ホスト名
- ポート番号
- 店舗コード・店舗名称
- 端末番号

実API接続時の基本URLは次の形式です。

```text
{プロトコル}://{ホスト}:{ポート}/CSPointApi
```

利用するAPI：

- `POST /CsPointService/GetPoint`：会員ポイント照会
- `POST /CsPointService/AffectPoint`：ポイント更新

接続先のファイアウォール、端末からの疎通、HTTP/HTTPS、ポート番号、CORS設定を事前に確認してください。
本番環境ではデモ接続のままにせず、HTTPSと認証・アクセス制御を設定してください。

## カメラ・バーコード読み取りの注意事項

- Windowsは必ず `http://127.0.0.1` で起動してください。`file://` で直接開くとカメラ権限や読み取りが不安定になります。
- EdgeではQuagga2（主解析）、標準BarcodeDetector、ZXingを併用し、JAN-8、JAN-13、NW-7を読み取ります。
- AndroidではML Kit Barcode Scanningを使用します。
- カメラはバーコードに正対させ、15〜30cm程度の距離を保ってください。
- 反射、暗い照明、手ぶれ、バーコードの小さすぎる表示は認識率を下げます。
- NW-7は開始・終了キャラクターをチェックし、APIには数値部分のみを設定します。
- 認識できない場合は、画面下部の手入力欄またはUSBバーコードリーダーを利用してください。
- ブラウザのカメラ権限を拒否した場合は、Edgeのサイト権限からカメラを許可してください。

## バーコードSDK候補の調査結果

- **Quagga2**：MITライセンス。EAN、EAN-8、CODABARなどの1Dバーコードに対応し、映像内の位置・傾き・スケールを推定するロケーターを備えるため、Windowsの主解析として採用しています。
- **ZXing Browser**：オープンソースの追加フォールバックとして採用済みです。Quagga2で初期化できない場合に利用します。
- **Dynamsoft Barcode Reader JS**：ブラウザ向け高性能SDKですが、無償利用は組み込み24時間試用または申請制30日評価で、本番利用にはライセンスが必要です。
- **Scandit Web SDK**：高精度でCodabarにも対応しますが、無償版は30日試用で、終了後は本番ライセンスが必要です。

商用SDKは、Quagga2・ZXingで実機の認識率が要件を満たさない場合に、評価ライセンスを取得して同一端末・同一バーコードで比較検証する候補です。

## 店員設定

設定画面では、抽選設定、重複付与防止、API接続先、店舗表示、ブランド名称、店舗アイコン、会員登録QRコードを設定できます。会員登録QRコードは画像アップロードを優先し、画像が未登録の場合は入力URLから端末内で自動生成します。初期URLは `https://x.com/Toshibatec_TEC/` です。
設定値は端末の`localStorage`に保存されます。端末交換・ブラウザデータ削除時に消えるため、本番では設定バックアップ運用を追加してください。

抽選設定では、従来の当選確率に加えて1〜5等ごとの「当選上限本数」を指定できます。0は無制限です。上限到達後はその等級を抽選対象から除外し、残りの確率で抽選します。混雑時間帯の1等ブーストを有効にすると、直近30分の正式ゲーム実施数をもとに1等の重みを最大3倍まで補正します。これは予算上限を超えないよう、当選上限本数と併用してください。

営業時間外に開始されたゲームはトレーニングモードになります。トレーニングモードは全結果をはずれ扱いとし、ポイント更新・正式実績・参加者数集計を行いません。TOP画面の本日参加者数と時間帯別グラフは設定で表示／非表示を切り替えられます。正式ゲームの実施履歴と付与履歴は直近100日保持し、店員レポートでは月次の実施件数、ユニーク顧客数、等級別人数、付与ポイント合計を表示します。

現在のPoC店員PINは`5963`です。本番運用では固定PINを使用せず、認証基盤または端末ごとの安全な認証へ変更してください。

## 検証

```powershell
cd C:\Users\TEC-14125-01\visitor-points\apps\kiosk
npm run build:web
```

Gitリポジトリ：[ShinjirouTakata-dev/visitor-points](https://github.com/ShinjirouTakata-dev/visitor-points)
