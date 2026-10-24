const defaultSettings = {
  parameter: 100,
  rankCount: 3,
  prizes: [
    { rank: '1等', name: '大当たり', probability: 5, points: 500, maxWins: 0 },
    { rank: '2等', name: 'ラッキー賞', probability: 15, points: 300, maxWins: 0 },
    { rank: '3等', name: 'スマイル賞', probability: 80, points: 100, maxWins: 0 },
    { rank: '4等', name: 'おたのしみ賞', probability: 0, points: 50, maxWins: 0 },
    { rank: '5等', name: '参加賞', probability: 0, points: 10, maxWins: 0 },
    { rank: 'ハズレ', name: 'また次回！', probability: 0, points: 0 },
  ],
};

const app = document.querySelector('#app');
const customerView = document.querySelector('.customer-view');
const adminView = document.querySelector('.admin-view');
const title = document.querySelector('#screen-title');
const content = document.querySelector('#screen-content');
const dots = document.querySelector('#progress-dots');
const savedDrawSettings = JSON.parse(localStorage.getItem('rewardDrawSettings') || 'null');
const settings = structuredClone(defaultSettings);
if (savedDrawSettings) {
  settings.parameter = Number(savedDrawSettings.parameter ?? settings.parameter);
  settings.rankCount = Number(savedDrawSettings.rankCount ?? settings.rankCount);
  settings.prizes = settings.prizes.map((prize, index) => ({ ...prize, ...(savedDrawSettings.prizes?.[index] || {}) }));
}
let currentScreen = 'welcome';
let member = { id: '123456', name: '山田 花子', points: 2480, originalPoints: 2480, acquiredPoints: 0 };
let memberBlocked = false;
const awardHistory = JSON.parse(localStorage.getItem('rewardAwardHistory') || '[]');
const errorLogs = JSON.parse(localStorage.getItem('rewardErrorLogs') || '[]');
const gameAttempts = JSON.parse(localStorage.getItem('rewardGameAttempts') || '[]');
let selectedGame = 'roulette';
let busy = false;
let bgmAudio;
const audioBasePath = './assets/audio/';
let resultResetTimer;
let resultResetTicker;
let transactionSerial = 1;
let generatedRegistrationQr = '';
let currentSessionTraining = false;
const connection = {
  mode: localStorage.getItem('rewardApiMode') || 'demo',
  protocol: localStorage.getItem('rewardApiProtocol') || 'https',
  host: localStorage.getItem('rewardApiHost') || '192.168.1.100',
  port: localStorage.getItem('rewardApiPort') || '',
  storeId: localStorage.getItem('rewardStoreId') || '123',
  storeName: localStorage.getItem('rewardStoreName') || '北町店',
  brandName: localStorage.getItem('rewardBrandName') || 'KITA MART',
  terminalNo: localStorage.getItem('rewardTerminalNo') || '1',
  businessStart: localStorage.getItem('rewardBusinessStart') || '08:00',
  businessEnd: localStorage.getItem('rewardBusinessEnd') || '20:00',
  awardPolicy: localStorage.getItem('rewardAwardPolicy') || 'daily',
  cooldownHours: Number(localStorage.getItem('rewardCooldownHours') || 24),
  showMemberName: localStorage.getItem('rewardShowMemberName') !== 'false',
  resultResetSeconds: Number(localStorage.getItem('rewardResultResetSeconds') || 15),
  registrationQrUrl: localStorage.getItem('rewardRegistrationQrUrl') || 'https://x.com/Toshibatec_TEC/',
  showTodayStats: localStorage.getItem('rewardShowTodayStats') !== 'false',
  trafficBiasEnabled: localStorage.getItem('rewardTrafficBiasEnabled') === 'true',
  brandImage: localStorage.getItem('rewardBrandImage') || '',
  registrationQr: localStorage.getItem('rewardRegistrationQr') || '',
};

const screenMeta = {
  welcome: { title: '来店ポイントを<br />受け取ろう', dot: 0 },
  scan: { title: '会員証を<br />読み取ってください', dot: 1 },
  member: { title: '会員情報を<br />確認してください', dot: 2 },
  mode: { title: '今日はどの<br />ゲームにする？', dot: 3 },
  game: { title: 'タッチして<br />運だめし！', dot: 4 },
  result: { title: 'おめでとう<br />ございます！', dot: 4 },
  'result-error': { title: 'ポイント処理を<br />確認しています', dot: 4 },
};

function render() {
  clearResultResetTimer();
  const meta = screenMeta[currentScreen];
  title.innerHTML = meta.title;
  dots.innerHTML = Array.from({ length: 5 }, (_, index) => `<span class="${index <= meta.dot ? 'active' : ''}"></span>`).join('');
  const templates = { welcome: renderWelcome, scan: renderScan, member: renderMember, mode: renderMode, game: renderGame, result: renderResult, 'result-error': renderResultError };
  content.innerHTML = templates[currentScreen]();
  app.classList.toggle('training-mode', currentSessionTraining && ['mode', 'game', 'result'].includes(currentScreen));
  if (currentScreen === 'game' && selectedGame === 'roulette') updateRouletteWheel();
  if (currentScreen === 'result') content.insertAdjacentHTML('beforeend', '<p class="result-reset-note" id="result-reset-countdown"></p>');
  content.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => go(button.dataset.screen)));
  content.querySelectorAll('[data-game]').forEach((button) => button.addEventListener('click', () => {
    selectedGame = button.dataset.game;
    playAudioFile('ui-start.wav', 0.55);
    go('game');
  }));
  content.querySelectorAll('[data-action="demo-scan"]').forEach((button) => button.addEventListener('click', () => handleBarcode(content.querySelector('#manual-barcode')?.value || '123456', '')));
  content.querySelector('#manual-barcode')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') handleBarcode(event.target.value); });
  if (currentScreen === 'scan') {
    const heading = content.querySelector('.scanner-stage h3');
    const description = content.querySelector('.scanner-stage > p');
    const input = content.querySelector('#manual-barcode');
    if (heading) heading.textContent = '会員証を読み取る';
    if (description) description.textContent = 'カメラまたは手入力で会員番号を確認してください';
    if (input) input.placeholder = '会員番号を入力';
  }
  if (currentScreen === 'result' || currentScreen === 'result-error') scheduleResultReset();
}

function renderWelcome() { return `<div class="intro-icon">✦</div><h3>今日のポイントを<br />ゲームでゲット！</h3><p>会員証をご用意のうえ、ボタンをタッチして運を楽しもう。</p><button class="primary-button" type="button" data-screen="scan">会員証を読む</button>`; }
function renderScan() {
  const qrSource = connection.registrationQr || generatedRegistrationQr;
  const qr = qrSource ? `<img src="${qrSource}" alt="会員登録QRコード" />` : '<span class="qr-placeholder">QR</span>';
  return `<div class="scanner-stage"><div class="camera-frame"><video id="barcode-video" autoplay playsinline muted></video><div class="scanner-overlay"></div></div><h3>会員証をかざしてください</h3><p>カメラが起動しない場合は、下の手入力欄をご利用ください。</p><div class="scanner-actions"><button class="primary-button" type="button" data-action="demo-scan">読み取りテスト</button></div><div class="manual-lookup"><input id="manual-barcode" type="text" inputmode="numeric" placeholder="会員番号を入力" maxlength="16" /><button class="secondary-button" type="button" data-action="demo-scan">確認</button></div><div class="qr-box">${qr}</div><div class="scanner-status" id="scanner-status">カメラ起動待機中…</div></div>`;
}
function renderMember() {
  if (memberBlocked) return `<div class="duplicate-warning"><span>⏱</span><h3>本日の付与済みです</h3><p>${connection.awardPolicy === 'daily' ? '同一会員への重複付与を防止しています。' : 'クールダウン中のため、まだポイントは付与できません。'}</p><button class="secondary-button" type="button" data-screen="welcome">戻る</button></div>`;
  return `<div class="member-summary"><div class="member-card"><div class="member-avatar">${member.name.charAt(0)}</div><div><small>会員情報</small><strong>${member.name}</strong><p>${member.id}</p></div></div><div class="member-points"><span>保有ポイント</span><strong>${member.points.toLocaleString()}pt</strong></div></div><div class="member-actions"><button class="primary-button" type="button" data-screen="mode">ゲームを開始</button><button class="secondary-button" type="button" data-screen="welcome">戻る</button></div></div>`;
}
function renderMode() {
  const displayName = connection.showMemberName ? `${member.name} 様` : '会員様';
  return `${currentSessionTraining || !isWithinBusinessHours() ? '<div class="training-banner">営業時間外のため、トレーニングモードで体験できます</div>' : ''}<div class="mode-hero"><div class="mode-badge">CHOOSE YOUR GAME</div><h3>${displayName}、今日はどのゲームで遊びますか？</h3><p>どれも1回だけのチャンス。ポイントが当たるとワクワク感がアップします。</p></div><div class="visual-choice-row"><button class="visual-choice" type="button" data-game="roulette"><span class="game-icon">🎡</span><span><strong>ルーレット</strong><small>運の気分を一気に高める</small></span><em>PLAY</em></button><button class="visual-choice" type="button" data-game="slot"><span class="game-icon">🎰</span><span><strong>スロット</strong><small>揃う瞬間に大興奮</small></span><em>PLAY</em></button><button class="visual-choice" type="button" data-game="card"><span class="game-icon">🂡</span><span><strong>カード</strong><small>選ぶ瞬間に緊張感</small></span><em>PLAY</em></button></div>`;
}
function renderGame() {
  const gameVisual = selectedGame === 'slot'
    ? `<div class="game-visual slot-visual"><div class="game-topline"><span>⚡ LUCKY REELS</span><b>TOUCH READY</b></div><div class="slot-window"><div class="reel-strip"><span>7</span><span>⭐</span><span>◎</span><span>8</span><span>7</span><span>★</span></div><div class="reel-strip"><span>★</span><span>7</span><span>◎</span><span>8</span><span>⭐</span><span>7</span></div><div class="reel-strip"><span>◎</span><span>8</span><span>7</span><span>★</span><span>⭐</span><span>7</span></div></div><div class="game-tag">超激アツ</div></div>`
    : selectedGame === 'card'
      ? `<div class="game-visual card-visual"><div class="game-topline"><span>🃏 HIDDEN CARD</span><b>SELECT ONE</b></div><div class="six-cards"><button class="flip-card" type="button" data-action="pick-card" data-card="0"><span>?</span></button><button class="flip-card" type="button" data-action="pick-card" data-card="1"><span>?</span></button><button class="flip-card" type="button" data-action="pick-card" data-card="2"><span>?</span></button><button class="flip-card" type="button" data-action="pick-card" data-card="3"><span>?</span></button><button class="flip-card" type="button" data-action="pick-card" data-card="4"><span>?</span></button><button class="flip-card" type="button" data-action="pick-card" data-card="5"><span>?</span></button></div><div class="game-tag">一枚だけ選ぶ</div></div>`
      : `<div class="game-visual roulette-visual"><div class="game-topline"><span>🎯 LUCKY SPIN</span><b>READY</b></div><div class="wheel-wrap"><div class="wheel-pointer"></div><div class="wheel"></div><div class="wheel-center">GO</div></div><div class="game-tag">一瞬でハッピー</div></div>`;
  return `<div class="game-stage"><div class="game-header-row"><div class="game-badge">${selectedGame === 'roulette' ? 'ルーレット' : selectedGame === 'slot' ? 'スロット' : 'カード'}</div><div class="game-score"><span>保有</span><b>${member.points.toLocaleString()}pt</b></div></div>${gameVisual}<div class="game-cta"><button class="primary-button game-button" type="button" data-action="play">${selectedGame === 'card' ? 'カードを選ぶ' : 'スタート！'}</button></div></div>`;
}
function renderResult() {
  const result = window.lastResult || settings.prizes[2];
  const isWin = result.points > 0 && !currentSessionTraining;
  return `${currentSessionTraining ? '<div class="training-notice">営業時間外のため、今回の結果は練習結果扱いです。</div>' : ''}<div class="result-card ${isWin ? 'is-win' : 'is-miss'}"><div class="result-ribbon">${result.rank}</div><h3>${result.name}</h3><p>${result.points > 0 ? `${result.points}ポイントを獲得しました。` : 'また次回のチャンスをお楽しみください。'}</p><div class="result-points">${result.points > 0 ? `+${result.points}` : '0'}<small>pt</small></div><button class="primary-button" type="button" data-screen="welcome">もう一度遊ぶ</button></div>`;
}
function renderResultError() { return `<div class="error-box"><strong>ポイント更新を完了できませんでした</strong><p>抽選結果は記録されています。ポイントの反映に失敗した場合はスタッフへご相談ください。</p><button class="secondary-button" type="button" data-screen="welcome">戻る</button></div>`; }

function rouletteSegments() {
  const prizes = [...settings.prizes.slice(0, settings.rankCount), settings.prizes[5]];
  const colors = ['#ffb703', '#d01846', '#6320ee', '#52fbc2', '#d59017', '#3b335c'];
  const palette = prizes.map((prize, index) => ({ prize, color: colors[index % colors.length], label: prize.rank }));
  const wedges = palette.map((entry, index) => ({ ...entry, start: (360 / palette.length) * index, end: (360 / palette.length) * (index + 1) }));
  return wedges;
}
function updateRouletteWheel() {
  const wheel = content.querySelector('.wheel');
  if (!wheel) return;
  const roulette = rouletteSegments();
  wheel.style.background = `conic-gradient(${roulette.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(', ')})`;
}
function clearResultResetTimer() {
  if (resultResetTimer) window.clearTimeout(resultResetTimer);
  if (resultResetTicker) window.clearInterval(resultResetTicker);
  resultResetTimer = null;
  resultResetTicker = null;
}
function scheduleResultReset() {
  const seconds = Math.max(5, Math.min(120, Number(connection.resultResetSeconds) || 15));
  let remaining = seconds;
  const countdown = content.querySelector('#result-reset-countdown');
  if (countdown) countdown.textContent = `${seconds}秒後に初期画面へ戻ります`;
  resultResetTicker = window.setInterval(() => {
    remaining -= 1;
    if (countdown) countdown.textContent = `${Math.max(0, remaining)}秒後に初期画面へ戻ります`;
  }, 1000);
  resultResetTimer = window.setTimeout(() => go('welcome'), seconds * 1000);
}
function go(screen) { currentScreen = screen; busy = false; stopScanner(); render(); }

function nowFields() {
  const now = new Date();
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return {
    FinancialDate: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    FinancialTime: `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`,
  };
}

function apiBaseUrl() {
  const port = connection.port ? `:${connection.port}` : '';
  return `${connection.protocol}://${connection.host}${port}/CSPointApi`;
}
function apiEnvelope(extra = {}) {
  return { ...nowFields(), FinancialSerialNumber: transactionSerial++ > 9999 ? (transactionSerial = 1) : transactionSerial - 1, CustomerId: member.id, StoreId: connection.storeId, TerminalNo: connection.terminalNo, ...extra };
}
async function nssRequest(path, payload) {
  try {
    const response = await fetch(`${apiBaseUrl()}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    saveErrorLog({ type: 'api', message: `${path}: ${detail}`, customerId: member.id, detail: JSON.stringify(payload) });
    throw error;
  }
}
async function loadMemberPoint() {
  try {
    const data = await nssRequest('CsPointService/GetPoint', apiEnvelope());
    const info = data.GetPointInfo || {};
    member.originalPoints = Number(info.TotalPoints ?? info.TotalPoint ?? member.points);
    member.points = Number(info.TotalPoints ?? info.TotalPoint ?? member.points);
  } catch (error) {
    console.warn('会員ポイント照会に失敗しました', error);
  }
}
async function affectMemberPoint(amount) {
  if (connection.mode !== 'live') {
    member.points += amount;
    return;
  }
  const before = member.points;
  try {
    const data = await nssRequest('CsPointService/AffectPoint', apiEnvelope({ TotalPoints: before, AwardPoints: amount }));
    const updated = Number(data.TotalPoints ?? data?.AffectPointInfo?.TotalPoints ?? (before + amount));
    member.points = updated;
  } catch (error) {
    console.warn('ポイント付与失敗', error);
    throw error;
  }
}

function playAudioFile(fileName, volume = 0.7, loop = false) {
  const audio = new Audio(`${audioBasePath}${fileName}`);
  audio.volume = volume;
  audio.loop = loop;
  audio.preload = 'auto';
  audio.playbackRate = 1.02;
  audio.play().catch((error) => console.warn(`音声再生をスキップ: ${fileName}`, error));
  return audio;
}
function startGameAudio() {
  stopGameAudio();
  bgmAudio = playAudioFile('game-bgm.wav', 0.22, true);
  if (bgmAudio) {
    bgmAudio.volume = 0.2;
    bgmAudio.playbackRate = 1.02;
  }
}
function playRankFanfare(result) {
  stopGameAudio();
  const rank = result?.rank || 'はずれ';
  const fileName = rank === '1等' ? 'ai-rank-1-v2.wav' : rank === '2等' ? 'ai-rank-2-v2.wav' : rank === '3等' ? 'ai-rank-3-v2.wav' : rank === '4等' ? 'ai-rank-4-v2.wav' : rank === '5等' ? 'ai-rank-5-v2.wav' : 'ai-miss-v2.wav';
  playAudioFile(fileName, rank === 'ハズレ' ? 0.7 : 0.8);
}
function playWinAudio() { playRankFanfare(window.lastResult); }
function stopGameAudio() { if (bgmAudio) { bgmAudio.pause(); bgmAudio.currentTime = 0; } bgmAudio = null; }

let cameraStream;
let scannerTimer;
let zxingControls;
let quaggaActive = false;
let quaggaDetectedHandler;

function startNativeScannerIfAvailable() {
  if (!window.kioskPlatform?.isAndroidNative?.()) return false;
  const status = document.querySelector('#scanner-status');
  if (status) status.textContent = 'ネイティブスキャナー起動中…';
  return true;
}
function normalizeBarcode(rawValue, format = '') {
  const raw = String(rawValue ?? '').trim();
  const upperFormat = String(format || '').toLowerCase();
  const numeric = raw.replace(/\D/g, '');
  const isJanFormat = ['ean_8', 'ean_13', 'upc_a', 'upc_e'].includes(upperFormat);
  const isJan = isJanFormat || /^\d{8}$/.test(raw) || /^\d{13}$/.test(raw);
  if (isJan) {
    if (!/^\d{8}$|^\d{13}$/.test(raw) || !validateJanChecksum(raw)) {
      return { error: 'JANコードのチェックデジットが正しくありません。' };
    }
    return { customerId: raw, format: raw.length === 8 ? 'JAN-8' : 'JAN-13', rawValue: raw };
  }
  const isNw7 = upperFormat === 'codabar' || /^[A-Da-d][0-9\-$:/.+]+[A-Da-d]$/.test(raw);
  if (isNw7) {
    if (!/^[A-Da-d][0-9\-$:/.+]+[A-Da-d]$/.test(raw)) {
      return { error: 'NW-7の開始・終了キャラクターが正しくありません。' };
    }
    const body = raw.slice(1, -1);
    const customerId = body.replace(/\D/g, '');
    if (!customerId || customerId.length > 16) {
      return { error: 'NW-7の数値部分は16桁以下で指定してください。' };
    }
    return { customerId, format: 'NW-7', rawValue: raw };
  }
  if (/^\d{1,16}$/.test(raw)) return { customerId: raw, format: 'MANUAL', rawValue: raw };
  if (numeric && numeric.length <= 16) return { customerId: numeric, format: 'MANUAL', rawValue: raw };
  return { error: 'JANまたはNW-7のバーコード情報を確認してください。' };
}
function validateJanChecksum(code) {
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reduce((total, digit, index) => total + digit * ((digits.length - index) % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
async function optimizeCameraTrack(stream) {
  const track = stream?.getVideoTracks?.()[0];
  if (!track?.getCapabilities || !track.applyConstraints) return;
  const capabilities = track.getCapabilities();
  if (!capabilities?.width || !capabilities?.height) return;
  const width = Math.min(1280, capabilities.width.max ?? 1280);
  const height = Math.min(720, capabilities.height.max ?? 720);
  await track.applyConstraints({ advanced: [{ width, height }] });
}
async function startScannerV2() {
  const status = document.querySelector('#scanner-status');
  const video = document.querySelector('#barcode-video');
  if (!video) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = cameraStream;
    await optimizeCameraTrack(cameraStream);
    video.play();
    if (status) status.textContent = 'スキャナー起動中…';
  } catch (error) {
    console.warn('カメラ起動失敗', error);
    if (status) status.textContent = 'カメラが起動しませんでした';
  }
}
async function startScanner() {
  const status = document.querySelector('#scanner-status');
  const video = document.querySelector('#barcode-video');
  if (!video) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = cameraStream;
    await optimizeCameraTrack(cameraStream);
    video.play();
    if (status) status.textContent = 'スキャナー起動中…';
  } catch (error) {
    if (status) status.textContent = 'カメラ起動に失敗しました';
    console.warn(error);
  }
}
function startQuaggaScanner(status) {
  if (!window.Quagga) return Promise.resolve(false);
  const target = document.querySelector('.camera-frame');
  if (!target) return Promise.resolve(false);
  return new Promise((resolve) => {
    window.Quagga.init({
      inputStream: { name: 'Live', type: 'LiveStream', target },
      decoder: { readers: ['ean_reader', 'code_128_reader', 'codabar_reader'] },
    }, (error) => {
      if (error) {
        status.textContent = 'バーコード読み取り初期化に失敗';
        resolve(false);
        return;
      }
      window.Quagga.start();
      quaggaActive = true;
      quaggaDetectedHandler = (result) => {
        if (!result || !result.codeResult || !result.codeResult.code) return;
        const { code } = result.codeResult;
        handleBarcode(code, '');
        window.Quagga.stop();
        quaggaActive = false;
      };
      window.Quagga.onDetected(quaggaDetectedHandler);
      resolve(true);
    });
  });
}
async function startZxingScanner(video, status) {
  if (!window.ZXingBrowser?.BrowserMultiFormatReader) return false;
  try {
    const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
    zxingControls = reader;
    const result = await reader.decodeFromVideoDevice(undefined, video, (decoded, error) => {
      if (decoded) {
        handleBarcode(decoded.getText(), decoded.getBarcodeFormat?.());
      }
      if (error) {
        console.warn('ZXing decode error', error);
      }
    });
    return !!result;
  } catch (error) {
    status.textContent = 'ZXingでの読み取りに失敗';
    return false;
  }
}
function stopScanner() {
  if (scannerTimer) window.clearTimeout(scannerTimer);
  scannerTimer = null;
  if (quaggaActive && window.Quagga) {
    if (quaggaDetectedHandler) window.Quagga.offDetected(quaggaDetectedHandler);
    window.Quagga.stop();
    quaggaActive = false;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  const video = document.querySelector('#barcode-video');
  if (video) video.srcObject = null;
}
function businessDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function timeToMinutes(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}
function isWithinBusinessHours(date = new Date()) {
  const start = timeToMinutes(connection.businessStart);
  const end = timeToMinutes(connection.businessEnd);
  if (start === end) return true;
  const now = date.getHours() * 60 + date.getMinutes();
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}
function pruneOperationalHistory() {
  const cutoff = Date.now() - 100 * 24 * 60 * 60 * 1000;
  for (let index = awardHistory.length - 1; index >= 0; index -= 1) {
    if (new Date(awardHistory[index].awardedAt).getTime() < cutoff) awardHistory.splice(index, 1);
  }
  for (let index = gameAttempts.length - 1; index >= 0; index -= 1) {
    if (new Date(gameAttempts[index].attemptedAt).getTime() < cutoff) gameAttempts.splice(index, 1);
  }
  for (let index = errorLogs.length - 1; index >= 0; index -= 1) {
    if (new Date(errorLogs[index].timestamp).getTime() < cutoff) errorLogs.splice(index, 1);
  }
  localStorage.setItem('rewardAwardHistory', JSON.stringify(awardHistory));
  localStorage.setItem('rewardGameAttempts', JSON.stringify(gameAttempts));
  localStorage.setItem('rewardErrorLogs', JSON.stringify(errorLogs));
}
function renderTrafficDashboard() {
  if (!connection.showTodayStats) return '';
  const today = businessDate();
  const records = gameAttempts.filter((record) => record.businessDate === today);
  const totalAttempts = records.length;
  const uniqueCustomers = new Set(records.map((record) => record.customerId)).size;
  return `<div class="traffic-dashboard"><div class="traffic-summary"><div><span>今日の試行</span><strong>${totalAttempts}</strong></div><div><span>利用者数</span><strong>${uniqueCustomers}</strong></div><div><span>当選率</span><strong>${totalAttempts ? `${(awardHistory.filter((record) => record.businessDate === today).length / totalAttempts * 100).toFixed(1)}%` : '0.0%'}</strong></div></div></div>`;
}
function isAwardBlocked(customerId) {
  const latest = awardHistory.filter((record) => record.customerId === customerId).sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt))[0];
  if (!latest) return false;
  const coolDownMs = (Number(connection.cooldownHours) || 0) * 60 * 60 * 1000;
  return Date.now() - new Date(latest.awardedAt).getTime() < coolDownMs;
}
function saveAwardRecord(result) {
  if (currentSessionTraining) return;
  awardHistory.push({ customerId: member.id, businessDate: businessDate(), awardedAt: new Date().toISOString(), rank: result.rank, points: result.points });
  localStorage.setItem('rewardAwardHistory', JSON.stringify(awardHistory));
}
function saveGameAttempt() {
  if (currentSessionTraining) return;
  const now = new Date();
  gameAttempts.push({ customerId: member.id, businessDate: businessDate(now), attemptedAt: now.toISOString(), game: selectedGame });
  localStorage.setItem('rewardGameAttempts', JSON.stringify(gameAttempts));
}
function saveErrorLog(entry = {}) {
  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    customerId: member.id,
    ...entry,
  };
  errorLogs.push(payload);
  localStorage.setItem('rewardErrorLogs', JSON.stringify(errorLogs.slice(-200)));
  return payload;
}
function rankAwardCount(rank) { return awardHistory.filter((record) => record.rank === rank).length; }
function trafficBoostForFirstPrize() {
  if (!connection.trafficBiasEnabled) return 1;
  const now = Date.now();
  const recent = gameAttempts.filter((record) => now - new Date(record.attemptedAt).getTime() < 12 * 60 * 60 * 1000);
  return recent.length > 0 ? 1.3 : 1;
}
async function handleBarcode(rawValue, format = '') {
  const normalized = normalizeBarcode(rawValue, format);
  if (normalized.error || !normalized.customerId || normalized.customerId === '0') {
    saveErrorLog({ type: 'barcode', message: normalized.error || '会員番号を確認してください。', customerId: String(rawValue || ''), detail: format || 'MANUAL' });
    alert(normalized.error || '会員番号を確認してください。');
    return;
  }
  member.id = normalized.customerId;
  memberBlocked = isAwardBlocked(member.id);
  if (memberBlocked) {
    go('member');
    return;
  }
  try {
    await loadMemberPoint();
  } catch (error) {
    console.warn('会員ポイント取得失敗', error);
  }
  go('member');
}

function drawPrize() {
  if (currentSessionTraining) return { ...settings.prizes[5], name: 'トレーニングモード（はずれ）', points: 0 };
  const available = settings.prizes.slice(0, settings.rankCount).map((prize) => ({
    ...prize,
    weight: Number(prize.maxWins) > 0 && rankAwardCount(prize.rank) >= Number(prize.maxWins) ? 0 : Math.max(1, prize.probability * trafficBoostForFirstPrize()),
  }));
  const total = available.reduce((sum, prize) => sum + prize.weight, 0);
  if (!total) return settings.prizes[5];
  let cursor = Math.random() * total;
  for (const prize of available) {
    cursor -= prize.weight;
    if (cursor <= 0) return prize;
  }
  return settings.prizes[5];
}

function startGame(options = {}) {
  currentSessionTraining = !isWithinBusinessHours();
  saveGameAttempt();
  busy = true;
  startGameAudio();
  playAudioFile(selectedGame === 'card' ? 'ai-card-flip-v2.wav' : selectedGame === 'roulette' ? 'ai-roulette-spin-v2.wav' : 'ai-slot-spin-v2.wav', 0.65);
  content.querySelector('.game-stage')?.classList.add('is-playing');
  if (options.cardIndex !== undefined) {
    content.querySelectorAll('.flip-card').forEach((card, index) => {
      card.disabled = true;
      if (index === options.cardIndex) card.classList.add('is-selected');
      else card.classList.add('is-dimmed');
    });
  }
  const playButton = content.querySelector('[data-action="play"]');
  if (playButton) {
    playButton.disabled = true;
    playButton.textContent = '抽選中…';
  }
  window.setTimeout(async () => {
    window.lastResult = drawPrize();
    member.originalPoints = member.points;
    member.acquiredPoints = currentSessionTraining ? 0 : window.lastResult.points;
    try {
      if (window.lastResult.points > 0 && !currentSessionTraining) {
        await affectMemberPoint(window.lastResult.points);
        saveAwardRecord(window.lastResult);
      }
    } catch (error) {
      console.warn('ポイント付与失敗', error);
      saveErrorLog({
        type: 'award',
        message: `ポイント付与失敗: ${window.lastResult?.rank || '不明'} / ${window.lastResult?.points ?? 0}pt`,
        customerId: member.id,
        detail: error instanceof Error ? error.message : String(error),
      });
      currentScreen = 'result-error';
      return go('result-error');
    }
    playWinAudio();
    busy = false;
    go('result');
  }, 1400);
}

content.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'pick-card' && !busy) {
    startGame({ cardIndex: Number(event.target.closest('[data-card]')?.dataset.card || 0) });
    return;
  }
  if (action !== 'play' || busy) return;
  startGame();
});

document.querySelectorAll('[data-action="toggle-admin"]').forEach((button) => button.addEventListener('click', () => {
  const showAdmin = adminView.hidden;
  adminView.hidden = !showAdmin;
  customerView.hidden = showAdmin;
  app.dataset.mode = showAdmin ? 'admin' : 'customer';
  if (showAdmin) renderSettings();
}));

const reportView = document.querySelector('.report-view');
document.querySelector('[data-action="show-report"]').addEventListener('click', () => { adminView.hidden = true; reportView.hidden = false; renderReport(); });
document.querySelector('[data-action="hide-report"]').addEventListener('click', () => { reportView.hidden = true; adminView.hidden = false; });
document.querySelector('[data-action="refresh-report"]').addEventListener('click', renderReport);

function renderReport() {
  pruneOperationalHistory();
  const reportCard = document.querySelector('.report-card');
  if (!reportCard) return;

  const months = [];
  for (let offset = 3; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - offset);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthlyRows = months.map((month) => {
    const attempts = gameAttempts.filter((record) => String(record.businessDate || '').startsWith(month));
    const awards = awardHistory.filter((record) => String(record.businessDate || '').startsWith(month));
    const unique = new Set(attempts.map((record) => record.customerId)).size;
    return { month, attempts, awards, unique };
  });

  const maxAttempts = Math.max(1, ...monthlyRows.map((row) => row.attempts.length));
  const dailyEntries = [...awardHistory]
    .sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt))
    .map((record) => ({
      time: new Date(record.awardedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      customerId: record.customerId,
      rank: record.rank,
      points: record.points,
      businessDate: record.businessDate,
    }));

  const errorEntries = [...errorLogs]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((entry) => ({
      time: new Date(entry.timestamp).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      customerId: entry.customerId,
      type: entry.type || 'system',
      message: entry.message || 'エラー',
      detail: entry.detail || '',
    }));

  reportCard.innerHTML = `
    <div class="report-toolbar">
      <div>
        <h3>過去100日・月次・日別実績</h3>
        <p id="report-period">${months[0]} 〜 ${months.at(-1)}（直近100日保持）</p>
      </div>
      <button class="secondary-button" type="button" data-action="refresh-report">更新</button>
    </div>
    <div class="report-grid">
      <section class="report-panel">
        <h4>月次実績</h4>
        <div id="monthly-chart" class="monthly-chart">
          ${monthlyRows.map((row) => `<div class="monthly-bar" title="${row.month}: ${row.attempts.length}件"><span style="height:${Math.max(row.attempts.length / maxAttempts * 100, 12)}%"></span></div>`).join('')}
        </div>
        <table class="report-table compact-table">
          <thead><tr><th>月</th><th>試行</th><th>顧客数</th><th>付与件数</th></tr></thead>
          <tbody>
            ${monthlyRows.map((row) => `<tr><td>${row.month}</td><td>${row.attempts.length.toLocaleString()}<small>回</small></td><td>${row.unique.toLocaleString()}<small>人</small></td><td>${row.awards.length.toLocaleString()}<small>件</small></td></tr>`).join('')}
          </tbody>
        </table>
      </section>
      <section class="report-panel">
        <h4>日別実績</h4>
        <div class="report-scroll">
          <table class="report-table compact-table">
            <thead><tr><th>日時</th><th>会員No</th><th>等級</th><th>pt</th></tr></thead>
            <tbody>
              ${dailyEntries.length ? dailyEntries.map((row) => `<tr><td>${row.time}</td><td>${row.customerId}</td><td>${row.rank}</td><td>+${row.points}</td></tr>`).join('') : '<tr><td colspan="4">実績データはまだありません</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
      <section class="report-panel report-panel-full">
        <h4>エラーログ</h4>
        <div class="report-scroll">
          <table class="report-table compact-table">
            <thead><tr><th>日時</th><th>会員No</th><th>種別</th><th>内容</th></tr></thead>
            <tbody>
              ${errorEntries.length ? errorEntries.map((row) => `<tr><td>${row.time}</td><td>${row.customerId || '-'}</td><td>${row.type}</td><td title="${(row.detail || row.message).replace(/"/g, '&quot;')}">${row.message}</td></tr>`).join('') : '<tr><td colspan="4">エラーログはありません</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  const refreshButton = document.querySelector('[data-action="refresh-report"]');
  if (refreshButton) {
    refreshButton.addEventListener('click', renderReport);
  }
}

const staffDialog = document.querySelector('#staff-dialog');
document.querySelector('[data-action="staff-login"]').addEventListener('click', () => {
  document.querySelector('#staff-pin').value = '';
  document.querySelector('#login-error').textContent = '';
  staffDialog.showModal();
});
document.querySelector('#staff-login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (document.querySelector('#staff-pin').value !== '5963') {
    document.querySelector('#login-error').textContent = 'PINが違います';
    return;
  }
  staffDialog.close();
  adminView.hidden = false;
  customerView.hidden = true;
  app.dataset.mode = 'admin';
  renderSettings();
});

function renderSettings() {
  const rows = document.querySelector('#prize-rows');
  rows.innerHTML = settings.prizes.map((prize, index) => `<tr class="${index > settings.rankCount - 1 && index < 5 ? 'disabled-row' : ''}"><td><span class="rank-pill">${index === 5 ? '×' : index + 1}</span></td><td><input data-index="${index}" data-key="name" value="${prize.name}" /></td><td><input data-index="${index}" data-key="probability" type="number" min="0" max="100" value="${prize.probability}" /></td><td><input data-index="${index}" data-key="points" type="number" min="0" value="${prize.points}" /></td><td><input data-index="${index}" data-key="maxWins" type="number" min="0" step="1" value="${prize.maxWins}" /></td></tr>`).join('');
  document.querySelector('[name="parameter"]').value = settings.parameter;
  document.querySelector('[name="rankCount"]').value = settings.rankCount;
  document.querySelector('[name="apiMode"]').value = connection.mode;
  document.querySelector('[name="apiProtocol"]').value = connection.protocol;
  document.querySelector('[name="apiHost"]').value = connection.host;
  document.querySelector('[name="apiPort"]').value = connection.port;
  document.querySelector('[name="storeId"]').value = connection.storeId;
  document.querySelector('[name="storeName"]').value = connection.storeName;
  document.querySelector('[name="brandName"]').value = connection.brandName;
  document.querySelector('[name="terminalNo"]').value = connection.terminalNo;
  document.querySelector('[name="awardPolicy"]').value = connection.awardPolicy;
  document.querySelector('[name="cooldownHours"]').value = connection.cooldownHours;
  document.querySelector('[name="resultResetSeconds"]').value = connection.resultResetSeconds;
  document.querySelector('[name="showMemberName"]').value = connection.showMemberName ? 'true' : 'false';
  document.querySelector('[name="showTodayStats"]').value = connection.showTodayStats ? 'true' : 'false';
  document.querySelector('[name="trafficBiasEnabled"]').value = connection.trafficBiasEnabled ? 'true' : 'false';
  document.querySelector('[name="businessStart"]').value = connection.businessStart;
  document.querySelector('[name="businessEnd"]').value = connection.businessEnd;
  document.querySelector('[name="registrationQrUrl"]').value = connection.registrationQrUrl;
  document.querySelector('[name="storeNameDisplay"]').value = connection.storeName;
  document.querySelector('[name="brandImage"]').value = '';
  document.querySelector('[name="registrationQr"]').value = '';
  if (connection.brandImage) setPreview('brand-image-preview', connection.brandImage);
  if (connection.registrationQr) setPreview('qr-image-preview', connection.registrationQr);
  rows.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      settings.prizes[Number(input.dataset.index)][input.dataset.key] = input.dataset.key === 'name' ? input.value : Number(input.value);
    });
  });
  document.querySelector('[name="rankCount"]').addEventListener('change', (event) => {
    settings.rankCount = Number(event.target.value);
    renderSettings();
  });
}

function setPreview(id, source) {
  const image = document.querySelector(`#${id}`);
  if (!image) return;
  image.src = source || '';
  image.style.display = source ? 'block' : 'none';
}
function generateRegistrationQr() {
  const url = connection.registrationQrUrl.trim();
  if (!url || typeof window.qrcode !== 'function') {
    generatedRegistrationQr = '';
    setPreview('qr-image-preview', connection.registrationQr);
    return;
  }
  generatedRegistrationQr = `data:image/png;base64,${window.qrcode(url)}`;
  setPreview('qr-image-preview', generatedRegistrationQr);
}
function bindRegistrationQrUrl() {
  const input = document.querySelector('[name="registrationQrUrl"]');
  if (!input) return;
  input.addEventListener('input', () => {
    connection.registrationQrUrl = input.value;
    generateRegistrationQr();
    localStorage.setItem('rewardRegistrationQrUrl', connection.registrationQrUrl);
  });
}
function bindImageInput(inputName, stateKey, previewId) {
  const input = document.querySelector(`[name="${inputName}"]`);
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      connection[stateKey] = src;
      localStorage.setItem(`reward${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}`, src);
      setPreview(previewId, src);
    };
    reader.readAsDataURL(file);
  });
}
function updateBranding() {
  const storeName = document.querySelector('#store-name-display');
  const brandName = document.querySelector('#brand-name-display');
  const brandMark = document.querySelector('#brand-mark');
  if (storeName) storeName.textContent = connection.storeName;
  if (brandName) brandName.textContent = connection.brandName;
  if (brandMark) brandMark.textContent = connection.brandName.slice(0, 1).toUpperCase() || 'T';
}

document.querySelector('#settings-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const active = settings.prizes.slice(0, settings.rankCount);
  const total = active.reduce((sum, prize) => sum + prize.probability, 0);
  const pointsOk = active.every((prize, index) => index === 0 || prize.points < active[index - 1].points) && settings.prizes[5].points < active.at(-1).points;
  const maxWinsOk = settings.prizes.slice(0, settings.rankCount).every((prize) => Number.isInteger(Number(prize.maxWins)) && Number(prize.maxWins) >= 0);
  const message = document.querySelector('#save-message');
  if (total !== 100) {
    message.style.color = '#c65d4b';
    message.textContent = `保存できません：当選確率の合計が${total}%です（100%にしてください）。`;
    return;
  }
  if (!pointsOk) {
    message.style.color = '#c65d4b';
    message.textContent = '保存できません：付与ポイントの順位を確認してください。';
    return;
  }
  if (!maxWinsOk) {
    message.style.color = '#c65d4b';
    message.textContent = '保存できません：当選上限本数は0以上の整数で入力してください（0は無制限）。';
    return;
  }
  settings.parameter = Number(document.querySelector('[name="parameter"]').value);
  connection.mode = document.querySelector('[name="apiMode"]').value;
  connection.protocol = document.querySelector('[name="apiProtocol"]').value;
  connection.host = document.querySelector('[name="apiHost"]').value;
  connection.port = document.querySelector('[name="apiPort"]').value;
  connection.storeId = document.querySelector('[name="storeId"]').value;
  connection.storeName = document.querySelector('[name="storeName"]').value;
  connection.brandName = document.querySelector('[name="brandName"]').value;
  connection.terminalNo = document.querySelector('[name="terminalNo"]').value;
  connection.awardPolicy = document.querySelector('[name="awardPolicy"]').value;
  connection.cooldownHours = Number(document.querySelector('[name="cooldownHours"]').value);
  connection.businessStart = document.querySelector('[name="businessStart"]').value;
  connection.businessEnd = document.querySelector('[name="businessEnd"]').value;
  connection.resultResetSeconds = Number(document.querySelector('[name="resultResetSeconds"]').value);
  connection.showMemberName = document.querySelector('[name="showMemberName"]').value === 'true';
  connection.showTodayStats = document.querySelector('[name="showTodayStats"]').value === 'true';
  connection.trafficBiasEnabled = document.querySelector('[name="trafficBiasEnabled"]').value === 'true';
  connection.registrationQrUrl = document.querySelector('[name="registrationQrUrl"]').value;
  updateBranding();
  localStorage.setItem('rewardDrawSettings', JSON.stringify(settings));
  localStorage.setItem('rewardApiMode', connection.mode);
  localStorage.setItem('rewardApiProtocol', connection.protocol);
  localStorage.setItem('rewardApiHost', connection.host);
  localStorage.setItem('rewardApiPort', connection.port);
  localStorage.setItem('rewardStoreId', connection.storeId);
  localStorage.setItem('rewardStoreName', connection.storeName);
  localStorage.setItem('rewardBrandName', connection.brandName);
  localStorage.setItem('rewardTerminalNo', connection.terminalNo);
  localStorage.setItem('rewardBusinessStart', connection.businessStart);
  localStorage.setItem('rewardBusinessEnd', connection.businessEnd);
  localStorage.setItem('rewardAwardPolicy', connection.awardPolicy);
  localStorage.setItem('rewardCooldownHours', String(connection.cooldownHours));
  localStorage.setItem('rewardResultResetSeconds', String(connection.resultResetSeconds));
  localStorage.setItem('rewardShowMemberName', String(connection.showMemberName));
  localStorage.setItem('rewardShowTodayStats', String(connection.showTodayStats));
  localStorage.setItem('rewardTrafficBiasEnabled', String(connection.trafficBiasEnabled));
  localStorage.setItem('rewardRegistrationQrUrl', connection.registrationQrUrl);
  message.style.color = 'var(--green)';
  message.textContent = '設定を保存しました。次回の抽選から反映されます。';
});

document.querySelector('[data-action="reset-settings"]').addEventListener('click', () => {
  Object.assign(settings, structuredClone(defaultSettings));
  renderSettings();
  document.querySelector('#save-message').textContent = '初期設定を復元しました。';
});

updateBranding();
generateRegistrationQr();
render();
