const defaultSettings = {
  parameter: 100,
  rankCount: 3,
  prizes: [
    { rank: '1等', name: '大当たり', probability: 5, points: 500 },
    { rank: '2等', name: 'ラッキー賞', probability: 15, points: 300 },
    { rank: '3等', name: 'スマイル賞', probability: 80, points: 100 },
    { rank: '4等', name: 'おたのしみ賞', probability: 0, points: 50 },
    { rank: '5等', name: '参加賞', probability: 0, points: 10 },
    { rank: 'ハズレ', name: 'また次回！', probability: 0, points: 0 },
  ],
};

const app = document.querySelector('#app');
const customerView = document.querySelector('.customer-view');
const adminView = document.querySelector('.admin-view');
const title = document.querySelector('#screen-title');
const content = document.querySelector('#screen-content');
const dots = document.querySelector('#progress-dots');
const settings = structuredClone(defaultSettings);
let currentScreen = 'welcome';
let member = { id: '123456', name: '山田 花子', points: 2480, originalPoints: 2480, acquiredPoints: 0 };
let memberBlocked = false;
const awardHistory = JSON.parse(localStorage.getItem('rewardAwardHistory') || '[]');
let selectedGame = 'roulette';
let busy = false;
let bgmAudio;
const audioBasePath = './assets/audio/';
let resultResetTimer;
let resultResetTicker;
let transactionSerial = 1;
const connection = { mode: localStorage.getItem('rewardApiMode') || 'demo', protocol: localStorage.getItem('rewardApiProtocol') || 'https', host: localStorage.getItem('rewardApiHost') || '192.168.1.100', port: localStorage.getItem('rewardApiPort') || '', storeId: Number(localStorage.getItem('rewardStoreId') || 123), terminalNo: Number(localStorage.getItem('rewardTerminalNo') || 1), storeName: localStorage.getItem('rewardStoreName') || '北町店', brandName: localStorage.getItem('rewardBrandName') || 'KITA MART', brandImage: localStorage.getItem('rewardBrandImage') || '', registrationQr: localStorage.getItem('rewardRegistrationQr') || '', awardPolicy: localStorage.getItem('rewardAwardPolicy') || 'daily', cooldownHours: Number(localStorage.getItem('rewardCooldownHours') || 24), showMemberName: localStorage.getItem('rewardShowMemberName') !== 'false', resultResetSeconds: Number(localStorage.getItem('rewardResultResetSeconds') || 15) };

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
  if (currentScreen === 'game' && selectedGame === 'roulette') updateRouletteWheel();
  if (currentScreen === 'result') content.insertAdjacentHTML('beforeend', '<p class="result-reset-note" id="result-reset-countdown"></p>');
  content.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => go(button.dataset.screen)));
  content.querySelectorAll('[data-game]').forEach((button) => button.addEventListener('click', () => { selectedGame = button.dataset.game; playAudioFile('ui-start.wav', 0.55); go('game'); }));
  content.querySelectorAll('[data-action="demo-scan"]').forEach((button) => button.addEventListener('click', () => handleBarcode(content.querySelector('#manual-barcode')?.value || '123456', '')));
  content.querySelector('#manual-barcode')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') handleBarcode(event.target.value); });
  if (currentScreen === 'scan') { const heading = content.querySelector('.scanner-stage h3'); const description = content.querySelector('.scanner-stage > p'); const input = content.querySelector('#manual-barcode'); if (heading) heading.textContent = 'JAN / NW-7会員バーコードをかざしてください'; if (description) description.textContent = '枠内のバーコード部分をカメラに合わせると、自動で形式判定して読み取ります。'; if (input) { input.inputMode = 'text'; input.placeholder = 'JANまたはNW-7を入力（デモ用）'; } if (!startNativeScannerIfAvailable()) startScannerV2(); }
  if (currentScreen === 'result' || currentScreen === 'result-error') scheduleResultReset();
}

function renderWelcome() { return `<div class="intro-icon">✦</div><h3>今日のポイントを<br />ゲームでゲット！</h3><p>会員証をご用意のうえ、ボタンをタッチしてください。<br />1日1回、楽しくチャレンジできます。</p><button class="primary-button game-button" data-screen="scan">ゲームを始める <span>→</span></button>`; }
function renderScan() { const qr = connection.registrationQr ? `<img src="${connection.registrationQr}" alt="会員登録QRコード" />` : '<span class="qr-placeholder">QR</span>'; return `<div class="scanner-stage"><div class="camera-frame"><video id="barcode-video" autoplay muted playsinline></video><div class="scan-line"></div><span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span><div class="camera-placeholder" id="camera-placeholder">▣<small>カメラを起動しています</small></div></div><h3>会員バーコードをかざしてください</h3><p>バーコードを枠内に合わせると、自動で読み取ります。</p><div class="scanner-status" id="scanner-status">カメラへのアクセスを確認中…</div><div class="manual-scan"><input id="manual-barcode" inputmode="numeric" placeholder="会員番号を入力（デモ用）" /><button class="secondary-button" type="button" data-action="demo-scan">読み取る</button></div><div class="nonmember-card"><div class="nonmember-copy"><span class="nonmember-kicker">MEMBER REGISTRATION</span><h4>会員証をお持ちでない方へ</h4><p>QRコードをスマートフォンで読み取り、会員登録をお願いします。</p></div><div class="registration-qr">${qr}</div></div></div>`; }
function renderMember() { if (memberBlocked) return `<div class="duplicate-warning"><span>⏱</span><h3>本日の付与済みです</h3><p>${connection.awardPolicy === 'daily' ? 'この会員は本日の来店ポイントをすでに受け取っています。' : `前回の付与から${connection.cooldownHours}時間以内のため、現在は受け取れません。`}</p><small>時間をおいて、もう一度お試しください。</small></div><button class="secondary-button game-button" data-screen="welcome">トップへ戻る</button>`; return `<div class="member-card"><div class="member-avatar">花</div><div><small>会員番号　**** ${member.id.slice(-4)}</small>${connection.showMemberName ? `<strong>${member.name} 様</strong>` : '<strong>会員様</strong>'}</div><div class="member-points"><small>現在のポイント</small><b>${member.points.toLocaleString()} pt</b></div></div><p style="margin-top:20px">ポイントを確認しました。ゲームを選んでください。</p><button class="primary-button game-button" data-screen="mode">ゲームを選ぶ <span>→</span></button><small class="connection-note">${connection.mode === 'live' ? 'NSSポイント照会済み' : 'デモポイントを表示中'}</small>`; }
function renderMode() { const displayName = connection.showMemberName ? `${member.name} 様` : '会員様'; return `<div class="member-context"><div class="member-context-identity"><span class="member-context-icon">✦</span><div><small>ポイント照会済み / 会員番号 **** ${member.id.slice(-4)}</small><strong>${displayName}</strong></div></div><div class="member-context-points"><small>現在の保有ポイント</small><b>${member.points.toLocaleString()}<em>pt</em></b></div></div><div class="mode-hero"><span class="mode-kicker">TODAY'S SPECIAL BONUS</span><h3>好きなゲームを<br /><em>1つ選んで</em>スタート！</h3><p>タイルをタップするとすぐにゲームが始まります</p></div><div class="visual-choice-row"><button class="visual-choice card-choice" data-game="card"><span class="choice-art">♢</span><strong>カード<br />めくり</strong><small>直感で1枚を選ぶ</small><b>Card Flip　→</b></button><button class="visual-choice roulette-choice" data-game="roulette"><span class="choice-art">◎</span><strong>ルーレット</strong><small>大迫力の回転ホイール</small><b>Wheel Spin　→</b></button><button class="visual-choice slot-choice" data-game="slot"><span class="choice-art">7 7 7</span><strong>スロット</strong><small>777を狙え！</small><b>Slot Machine　→</b></button></div><div class="prize-line"><span>🏆 本日の賞品ラインナップ</span><span>● タイルを選んで即スタート</span></div>`; }
function renderGame() { const gameVisual = selectedGame === 'slot' ? `<div class="game-visual slot-visual"><div class="game-topline"><span>⚡ LUCKY REELS</span><b>TOUCH READY</b></div><div class="jackpot-bar">JACKPOT <strong>10,000<small>PT</small></strong></div><div class="reels"><div class="reel-window"><div class="reel-strip"><span>7</span><span>🔔</span><span>★</span><span>7</span><span>💎</span></div></div><div class="reel-window"><div class="reel-strip"><span>🔔</span><span>★</span><span>💎</span><span>7</span><span>🎁</span></div></div><div class="reel-window"><div class="reel-strip"><span>★</span><span>💎</span><span>7</span><span>🎁</span><span>🔔</span></div></div></div><div class="slot-levers"><span>STOP 1</span><span>STOP 2</span><span>STOP 3</span></div></div>` : selectedGame === 'card' ? `<div class="game-visual card-visual"><div class="game-topline"><span>✦ CARD FLIP</span><b>CHOOSE ONE</b></div><p>好きなカードを1枚タップしてください</p><div class="flip-cards six-cards"><button class="flip-card" data-action="pick-card" data-card="0"><span>?</span><small>TAP</small></button><button class="flip-card" data-action="pick-card" data-card="1"><span>?</span><small>TAP</small></button><button class="flip-card" data-action="pick-card" data-card="2"><span>?</span><small>TAP</small></button><button class="flip-card" data-action="pick-card" data-card="3"><span>?</span><small>TAP</small></button><button class="flip-card" data-action="pick-card" data-card="4"><span>?</span><small>TAP</small></button><button class="flip-card" data-action="pick-card" data-card="5"><span>?</span><small>TAP</small></button></div><small>ディーラーが配ったカードから1枚を選びます</small></div>` : `<div class="game-visual roulette-visual"><div class="game-topline"><span>● LUCKY ROULETTE</span><b>LIVE</b></div><div class="wheel-wrap"><div class="wheel"><span class="wheel-label label-1">1等</span><span class="wheel-label label-2">2等</span><span class="wheel-label label-3">3等</span><span class="wheel-label label-4">4等</span><span class="wheel-label label-5">5等</span><span class="wheel-label label-miss">はずれ</span><div class="wheel-center">◎</div></div><div class="wheel-pointer">★</div></div><p>中央のボタンをタップすると即座に抽選スタート</p></div>`; return `<div class="game-stage"><div class="game-badge">SESSION ACTIVE　•　BGM ON</div><h3>${selectedGame === 'slot' ? 'ラッキースロット' : selectedGame === 'card' ? 'カードめくり' : 'ラッキールーレット'}</h3>${gameVisual}${selectedGame !== 'card' ? `<button class="primary-button game-action-main" data-action="play" ${busy ? 'disabled' : ''}>☝　TAP TO ${selectedGame === 'roulette' ? 'SPIN' : 'PLAY'}!　<span>▶</span></button>` : ''}<p class="hint">ゲーム中はワクワクBGMが流れます</p></div>`; }
function renderResult() { const result = window.lastResult || settings.prizes[2]; const isWin = result.points > 0; return `<div class="result-badge">${isWin ? '🎉' : '☺'}</div><h3>${result.name}</h3><div class="result-points">+${result.points.toLocaleString()}<small>pt</small></div><p>${isWin ? '来店ポイントをプレゼントしました！' : '今回はハズレでした。また遊びに来てください。'}</p><div class="point-summary"><div><small>ゲーム前</small><b>${member.originalPoints.toLocaleString()}<em>pt</em></b></div><strong>＋</strong><div class="earned"><small>今回獲得</small><b>${member.acquiredPoints.toLocaleString()}<em>pt</em></b></div><strong>＝</strong><div><small>現在</small><b>${member.points.toLocaleString()}<em>pt</em></b></div></div><button class="primary-button game-button" data-screen="welcome">ありがとうございました <span>↗</span></button>`; }
function renderResultError() { return `<div class="error-box"><strong>ポイント更新を完了できませんでした</strong><p>抽選結果は記録されています。ポイントの反映状況を店員が確認します。</p></div><button class="primary-button game-button" data-screen="welcome">画面を閉じる <span>↗</span></button>`; }

function rouletteSegments() { const prizes = [...settings.prizes.slice(0, settings.rankCount), settings.prizes[5]]; const colors = ['#ffb703', '#d01846', '#6320ee', '#52fbc2', '#d59017', '#3b335c']; const angle = 360 / prizes.length; const background = prizes.map((_, index) => `${colors[index % colors.length]} ${index * angle}deg ${(index + 1) * angle}deg`).join(','); const labels = prizes.map((prize, index) => `<span class="wheel-label" style="--angle:${index * angle}deg">${prize.rank === 'はずれ' ? 'はずれ' : prize.rank}</span>`).join(''); return { background, labels }; }
function updateRouletteWheel() { const wheel = content.querySelector('.wheel'); if (!wheel) return; const roulette = rouletteSegments(); wheel.style.background = `conic-gradient(${roulette.background})`; wheel.querySelectorAll('.wheel-label').forEach((label) => label.remove()); wheel.insertAdjacentHTML('afterbegin', roulette.labels); }
function clearResultResetTimer() { if (resultResetTimer) window.clearTimeout(resultResetTimer); if (resultResetTicker) window.clearInterval(resultResetTicker); resultResetTimer = null; resultResetTicker = null; }
function scheduleResultReset() { const seconds = Math.max(5, Math.min(120, Number(connection.resultResetSeconds) || 15)); let remaining = seconds; const countdown = content.querySelector('#result-reset-countdown'); if (countdown) countdown.textContent = `${remaining}秒後にTOPへ戻ります`; resultResetTicker = window.setInterval(() => { remaining -= 1; if (countdown) countdown.textContent = `${Math.max(remaining, 0)}秒後にTOPへ戻ります`; }, 1000); resultResetTimer = window.setTimeout(() => go('welcome'), seconds * 1000); }
function go(screen) { currentScreen = screen; busy = false; stopScanner(); render(); }

function nowFields() {
  const now = new Date();
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return { FinancialDate: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`, FinancialTime: `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`, StoreDate: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` };
}

function apiBaseUrl() { const port = connection.port ? `:${connection.port}` : ''; return `${connection.protocol}://${connection.host}${port}/CSPointApi`; }
function apiEnvelope(extra = {}) { return { ...nowFields(), FinancialSerialNumber: transactionSerial++ > 9999 ? (transactionSerial = 1) : transactionSerial - 1, CustomerId: member.id, StoreId: connection.storeId, TerminalNo: connection.terminalNo, ...extra }; }
async function nssRequest(path, payload) { const response = await fetch(`${apiBaseUrl()}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`NSS_HTTP_${response.status}`); const data = await response.json(); if (data.ResultCode !== 0) throw new Error(`NSS_RESULT_${data.ResultCode}`); return data; }
async function loadMemberPoint() { try { const data = await nssRequest('CsPointService/GetPoint', apiEnvelope()); const info = data.GetPointInfo || {}; member.originalPoints = Number(info.TotalPoint ?? member.points); member.points = member.originalPoints; member.name = info.Name || member.name; render(); } catch (error) { console.warn('NSS GetPoint failed', error); content.insertAdjacentHTML('beforeend', '<p class="connection-warning">NSSポイント参照に失敗しました。店員へお知らせください。</p>'); } }
async function affectMemberPoint(amount) { if (connection.mode !== 'live') { member.points += amount; return; } const before = member.points; const data = await nssRequest('CsPointService/AffectPoint', apiEnvelope({ PointFlag: 1, AmountOfChange: amount, BeforeTotalPoint: before })); member.points = Number(data.AffectPointInfo?.TotalPoint ?? before + amount); }

function playAudioFile(fileName, volume = 0.7, loop = false) { const audio = new Audio(`${audioBasePath}${fileName}`); audio.volume = volume; audio.loop = loop; audio.play().catch((error) => console.warn('Audio playback was blocked', error)); return audio; }
function startGameAudio() { stopGameAudio(); bgmAudio = playAudioFile('game-bgm.wav', 0.28, true); }
function playRankFanfare(result) { stopGameAudio(); const rank = result?.rank || 'はずれ'; const fileName = rank === '1等' ? 'ai-rank-1-v2.wav' : rank === '2等' ? 'ai-rank-2-v2.wav' : rank === '3等' ? 'ai-rank-3-v2.wav' : rank === '4等' ? 'ai-rank-4-v2.wav' : rank === '5等' ? 'ai-rank-5-v2.wav' : 'ai-miss-v2.wav'; playAudioFile(fileName, rank === '1等' ? 0.9 : 0.72); }
function playWinAudio() { playRankFanfare(window.lastResult); }
function stopGameAudio() { if (bgmAudio) { bgmAudio.pause(); bgmAudio.currentTime = 0; } bgmAudio = null; }

let cameraStream;
let scannerTimer;
let zxingControls;
let quaggaActive = false;
let quaggaDetectedHandler;
function startNativeScannerIfAvailable() { if (!window.kioskPlatform?.isAndroidNative?.()) return false; const status = document.querySelector('#scanner-status'); if (status) status.textContent = 'Androidカメラを起動しています…'; window.kioskPlatform.scanBarcode().then((code) => { if (code) handleBarcode(code.rawValue, code.format); else if (status) status.textContent = 'バーコードを読み取れませんでした。もう一度お試しください'; }).catch((error) => { console.warn('Native barcode scan failed', error); if (status) status.textContent = error.message === 'CAMERA_PERMISSION_DENIED' ? 'カメラ権限が必要です。設定を確認してください' : 'カメラを利用できません。手入力をご利用ください'; }); return true; }
function normalizeBarcode(rawValue, format = '') {
  const raw = String(rawValue ?? '').trim();
  const upperFormat = String(format || '').toLowerCase();
  const numeric = raw.replace(/\D/g, '');
  const isJanFormat = ['ean_8', 'ean_13', 'upc_a', 'upc_e'].includes(upperFormat);
  const isJan = isJanFormat || /^\d{8}$/.test(raw) || /^\d{13}$/.test(raw);
  if (isJan) {
    if (!/^\d{8}$|^\d{13}$/.test(raw) || !validateJanChecksum(raw)) return { error: 'JANコードのチェックデジットが正しくありません。' };
    return { customerId: raw, format: raw.length === 8 ? 'JAN-8' : 'JAN-13', rawValue: raw };
  }
  const isNw7 = upperFormat === 'codabar' || /^[A-Da-d][0-9\-$:/.+]+[A-Da-d]$/.test(raw);
  if (isNw7) {
    if (!/^[A-Da-d][0-9\-$:/.+]+[A-Da-d]$/.test(raw)) return { error: 'NW-7の開始・終了キャラクターが正しくありません。' };
    const body = raw.slice(1, -1);
    const customerId = body.replace(/\D/g, '');
    if (!customerId || customerId.length > 16) return { error: 'NW-7の数値部分は16桁以下で指定してください。' };
    return { customerId, format: 'NW-7', rawValue: raw };
  }
  if (/^\d{1,16}$/.test(raw)) return { customerId: raw, format: 'MANUAL', rawValue: raw };
  if (numeric && numeric.length <= 16) return { customerId: numeric, format: 'MANUAL', rawValue: raw };
  return { error: 'JANまたはNW-7のバーコード情報を確認してください。' };
}
function validateJanChecksum(code) { const digits = code.split('').map(Number); const check = digits.pop(); const sum = digits.reduce((total, digit, index) => total + digit * ((digits.length - index) % 2 ? 3 : 1), 0); return (10 - (sum % 10)) % 10 === check; }
async function optimizeCameraTrack(stream) { const track = stream?.getVideoTracks?.()[0]; if (!track?.getCapabilities || !track.applyConstraints) return; const capabilities = track.getCapabilities(); const advanced = []; if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) advanced.push({ focusMode: 'continuous' }); if (Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes('continuous')) advanced.push({ exposureMode: 'continuous' }); if (advanced.length) { try { await track.applyConstraints({ advanced }); } catch (error) { console.debug('Camera optimization not supported', error); } } window.setTimeout(async () => { const video = document.querySelector('#barcode-video'); const status = document.querySelector('#scanner-status'); if (currentScreen === 'scan' && video && !quaggaActive && !zxingControls) { if (scannerTimer) window.clearTimeout(scannerTimer); const quaggaStarted = await startQuaggaScanner(status); if (!quaggaStarted && window.ZXingBrowser) { startZxingScanner(video, status); } } }, 900); }
async function startScannerV2() { const status = document.querySelector('#scanner-status'); const video = document.querySelector('#barcode-video'); if (!video) return; try { cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, resizeMode: { ideal: 'none' } }, audio: false }); if (currentScreen !== 'scan') { cameraStream.getTracks().forEach((track) => track.stop()); return; } await optimizeCameraTrack(cameraStream); video.srcObject = cameraStream; await video.play().catch(() => {}); const placeholder = document.querySelector('#camera-placeholder'); if (placeholder) placeholder.style.display = 'none'; if (status) status.textContent = 'JAN / NW-7の読み取り準備完了'; if (!('BarcodeDetector' in window)) { if (status) status.textContent = '自動読み取り非対応。下の入力欄をご利用ください'; return; } const supported = await BarcodeDetector.getSupportedFormats?.() || []; const formats = ['ean_13', 'ean_8', 'codabar'].filter((format) => supported.length === 0 || supported.includes(format)); if (!formats.length) { if (status) status.textContent = 'JAN / NW-7の自動読み取りに非対応。下の入力欄をご利用ください'; return; } const detector = new BarcodeDetector({ formats }); const scan = async () => { if (currentScreen !== 'scan') return; try { const codes = await detector.detect(video); if (codes.length) { const code = codes[0]; await handleBarcode(code.rawValue, code.format); return; } } catch (error) { console.warn('JAN/NW-7 barcode scan failed', error); } scannerTimer = window.setTimeout(scan, 120); }; scan(); } catch (error) { console.warn('Camera access failed', error); if (status) status.textContent = 'カメラを利用できません。下の入力欄をご利用ください'; const placeholderText = document.querySelector('#camera-placeholder small'); if (placeholderText) placeholderText.textContent = 'カメラ権限を確認してください'; } }
async function startScanner() { const status = document.querySelector('#scanner-status'); const video = document.querySelector('#barcode-video'); if (!video) return; try { cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); if (currentScreen !== 'scan') { cameraStream.getTracks().forEach((track) => track.stop()); return; } video.srcObject = cameraStream; const placeholder = document.querySelector('#camera-placeholder'); if (placeholder) placeholder.style.display = 'none'; if (status) status.textContent = '読み取り準備完了'; if ('BarcodeDetector' in window) { const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] }); const scan = async () => { if (currentScreen !== 'scan') return; try { const codes = await detector.detect(video); if (codes.length) { handleBarcode(codes[0].rawValue); return; } } catch (error) { console.warn('Barcode scan failed', error); } scannerTimer = window.setTimeout(scan, 250); }; scan(); } else if (status) { status.textContent = '自動読み取り非対応。下の入力欄をご利用ください'; } } catch (error) { console.warn('Camera access failed', error); if (status) status.textContent = 'カメラを利用できません。下の入力欄をご利用ください'; const placeholderText = document.querySelector('#camera-placeholder small'); if (placeholderText) placeholderText.textContent = 'カメラ権限を確認してください'; } }
function startQuaggaScanner(status) { if (!window.Quagga) return Promise.resolve(false); const target = document.querySelector('.camera-frame'); if (!target) return Promise.resolve(false); return new Promise((resolve) => { if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop()); cameraStream = null; const detected = (data) => { if (currentScreen !== 'scan') return; const result = data?.codeResult; const rawValue = result?.code; if (rawValue) handleBarcode(rawValue, result.format || ''); }; const config = { inputStream: { name: 'KioskCamera', type: 'LiveStream', target, constraints: { facingMode: 'environment', width: { min: 1280, ideal: 1920 }, height: { min: 720, ideal: 1080 } }, area: { top: '12%', right: '4%', left: '4%', bottom: '12%' } }, locator: { patchSize: 'medium', halfSample: false }, decoder: { readers: ['ean_reader', 'ean_8_reader', 'codabar_reader'], multiple: false }, locate: true, numOfWorkers: Math.max(2, Math.min(4, navigator.hardwareConcurrency || 2)) }; Quagga.init(config, (error) => { if (error) { console.warn('Quagga barcode scan failed', error); resolve(false); return; } quaggaDetectedHandler = detected; Quagga.onDetected(quaggaDetectedHandler); Quagga.start(); quaggaActive = true; if (status) status.textContent = 'JAN / NW-7を高精度カメラ解析中'; resolve(true); }); }); }
async function startZxingScanner(video, status) { if (!window.ZXingBrowser?.BrowserMultiFormatReader) return false; try { const reader = new window.ZXingBrowser.BrowserMultiFormatReader(); zxingControls = await reader.decodeFromVideoElementContinuously(video, (result, error, controls) => { if (currentScreen !== 'scan') { controls?.stop(); return; } if (result) { const rawValue = result.getText?.() || result.text; if (rawValue) handleBarcode(rawValue); } }); if (status) status.textContent = 'JAN / NW-7を高精度モードで読み取り中'; return true; } catch (error) { console.warn('ZXing barcode scan failed', error); zxingControls = null; return false; } }
function stopScanner() { if (scannerTimer) window.clearTimeout(scannerTimer); scannerTimer = null; if (quaggaActive && window.Quagga) { if (quaggaDetectedHandler) window.Quagga.offDetected(quaggaDetectedHandler); window.Quagga.stop(); quaggaActive = false; quaggaDetectedHandler = null; } if (zxingControls?.stop) zxingControls.stop(); zxingControls = null; if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop()); cameraStream = null; }
function businessDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function isAwardBlocked(customerId) { const latest = awardHistory.filter((record) => record.customerId === customerId).sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt))[0]; if (!latest) return false; const elapsedHours = (Date.now() - new Date(latest.awardedAt).getTime()) / 3600000; return connection.awardPolicy === 'daily' ? latest.businessDate === businessDate() : elapsedHours < connection.cooldownHours; }
function saveAwardRecord(result) { awardHistory.push({ customerId: member.id, businessDate: businessDate(), awardedAt: new Date().toISOString(), rank: result.rank, name: result.name, points: result.points }); while (awardHistory.length > 5000) awardHistory.shift(); localStorage.setItem('rewardAwardHistory', JSON.stringify(awardHistory)); }
async function handleBarcode(rawValue, format = '') { const normalized = normalizeBarcode(rawValue, format); if (normalized.error || !normalized.customerId || normalized.customerId === '0') { const status = document.querySelector('#scanner-status'); if (status) status.textContent = normalized.error || '会員番号を確認してください'; return; } stopScanner(); member.id = normalized.customerId; member.barcodeFormat = normalized.format; member.rawBarcode = normalized.rawValue; memberBlocked = isAwardBlocked(normalized.customerId); currentScreen = memberBlocked ? 'member' : 'mode'; render(); if (!memberBlocked && connection.mode === 'live') await loadMemberPoint(); }

function drawPrize() {
  const available = settings.prizes.slice(0, settings.rankCount);
  const total = available.reduce((sum, prize) => sum + prize.probability, 0);
  let cursor = Math.random() * total;
  for (const prize of available) { cursor -= prize.probability; if (cursor <= 0) return prize; }
  return settings.prizes[5];
}

function startGame(options = {}) {
  busy = true;
  startGameAudio();
  playAudioFile(selectedGame === 'card' ? 'ai-card-flip-v2.wav' : selectedGame === 'roulette' ? 'ai-roulette-spin-v2.wav' : 'ai-slot-spin-v2.wav', 0.65);
  content.querySelector('.game-stage')?.classList.add('is-playing');
  if (options.cardIndex !== undefined) { content.querySelectorAll('.flip-card').forEach((card, index) => { card.disabled = true; if (index === options.cardIndex) card.classList.add('is-selected'); else card.classList.add('is-dimmed'); }); }
  const playButton = content.querySelector('[data-action="play"]');
  if (playButton) { playButton.disabled = true; playButton.textContent = '抽選中…'; }
  window.setTimeout(async () => { window.lastResult = drawPrize(); member.originalPoints = member.points; member.acquiredPoints = window.lastResult.points; try { await affectMemberPoint(window.lastResult.points); saveAwardRecord(window.lastResult); currentScreen = 'result'; playWinAudio(); } catch (error) { console.warn('NSS AffectPoint failed', error); currentScreen = 'result-error'; stopGameAudio(); } busy = false; render(); }, selectedGame === 'card' ? 1800 : 2400);
}

content.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'pick-card' && !busy) { startGame({ cardIndex: Number(event.target.closest('[data-card]')?.dataset.card || 0) }); return; }
  if (action !== 'play' || busy) return;
  startGame();
  return;
  busy = true;
  startGameAudio();
  content.querySelector('.game-stage')?.classList.add('is-playing');
  const playButton = content.querySelector('[data-action="play"]'); if (playButton) { playButton.disabled = true; playButton.textContent = '抽選中…'; }
  content.innerHTML = '<div class="intro-icon" style="animation:pulse 1s infinite">✦</div><h3>抽選しています…</h3><p>ドキドキしながらお待ちください</p>';
  window.setTimeout(async () => { window.lastResult = drawPrize(); member.originalPoints = member.points; member.acquiredPoints = window.lastResult.points; try { await affectMemberPoint(window.lastResult.points); currentScreen = 'result'; playWinAudio(); } catch (error) { console.warn('NSS AffectPoint failed', error); currentScreen = 'result-error'; stopGameAudio(); } busy = false; render(); }, 1450);
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
function renderReport() { const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return businessDate(date); }); const labels = ['1等', '2等', '3等', '4等', '5等', 'ハズレ']; const rows = days.map((day) => { const records = awardHistory.filter((record) => record.businessDate === day); const counts = labels.map((label) => records.filter((record) => record.rank === label).length); const totalPoints = records.reduce((sum, record) => sum + Number(record.points || 0), 0); return `<tr><td>${day}</td>${counts.map((count) => `<td>${count.toLocaleString()}<small>人</small></td>`).join('')}<td>${records.length.toLocaleString()}<small>人</small></td><td class="report-points">${totalPoints.toLocaleString()}<small>pt</small></td></tr>`; }).join(''); const allRecords = awardHistory.filter((record) => days.includes(record.businessDate)); const totalPoints = allRecords.reduce((sum, record) => sum + Number(record.points || 0), 0); document.querySelector('#report-period').textContent = `${days[0]} 〜 ${days.at(-1)}`; document.querySelector('#report-rows').innerHTML = rows; document.querySelector('#report-summary').innerHTML = `<div><small>付与人数</small><b>${allRecords.length.toLocaleString()}<em>人</em></b></div><div><small>付与ポイント合計</small><b>${totalPoints.toLocaleString()}<em>pt</em></b></div><div><small>1等〜5等合計</small><b>${allRecords.filter((record) => record.rank !== 'ハズレ').length.toLocaleString()}<em>人</em></b></div>`; }

const staffDialog = document.querySelector('#staff-dialog');
document.querySelector('[data-action="staff-login"]').addEventListener('click', () => { document.querySelector('#staff-pin').value = ''; document.querySelector('#login-error').textContent = ''; staffDialog.showModal(); });
document.querySelector('#staff-login-form').addEventListener('submit', (event) => { event.preventDefault(); if (document.querySelector('#staff-pin').value !== '5963') { document.querySelector('#login-error').textContent = 'PINが正しくありません。'; return; } staffDialog.close(); adminView.hidden = false; customerView.hidden = true; app.dataset.mode = 'admin'; renderSettings(); });

function renderSettings() {
  const rows = document.querySelector('#prize-rows');
  rows.innerHTML = settings.prizes.map((prize, index) => `<tr class="${index > settings.rankCount - 1 && index < 5 ? 'disabled-row' : ''}"><td><span class="rank-pill">${index === 5 ? '×' : index + 1}</span></td><td><input data-index="${index}" data-key="name" value="${prize.name}" maxlength="10" ${index > settings.rankCount - 1 && index < 5 ? 'disabled' : ''} /></td><td><div class="input-with-unit"><input data-index="${index}" data-key="probability" type="number" min="0" max="100" value="${prize.probability}" ${index === 5 || (index > settings.rankCount - 1 && index < 5) ? 'disabled' : ''} /><b>%</b></div></td><td><div class="input-with-unit"><input data-index="${index}" data-key="points" type="number" min="0" value="${prize.points}" ${index > settings.rankCount - 1 && index < 5 ? 'disabled' : ''} /><b>pt</b></div></td></tr>`).join('');
  document.querySelector('[name="parameter"]').value = settings.parameter;
  document.querySelector('[name="rankCount"]').value = settings.rankCount;
  document.querySelector('[name="apiMode"]').value = connection.mode; document.querySelector('[name="apiProtocol"]').value = connection.protocol; document.querySelector('[name="apiHost"]').value = connection.host; document.querySelector('[name="apiPort"]').value = connection.port; document.querySelector('[name="storeId"]').value = connection.storeId; document.querySelector('[name="terminalNo"]').value = connection.terminalNo;
  document.querySelector('[name="awardPolicy"]').value = connection.awardPolicy; document.querySelector('[name="cooldownHours"]').value = connection.cooldownHours; document.querySelector('[name="showMemberName"]').checked = connection.showMemberName; document.querySelector('[name="resultResetSeconds"]').value = connection.resultResetSeconds;
  document.querySelector('[name="storeName"]').value = connection.storeName; document.querySelector('[name="brandName"]').value = connection.brandName; setPreview('brand-image-preview', connection.brandImage); setPreview('qr-image-preview', connection.registrationQr);
  bindImageInput('brandImage', 'brandImage', 'brand-image-preview'); bindImageInput('registrationQr', 'registrationQr', 'qr-image-preview');
  rows.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => { settings.prizes[Number(input.dataset.index)][input.dataset.key] = input.dataset.key === 'name' ? input.value : Number(input.value); }));
  document.querySelector('[name="rankCount"]').addEventListener('change', (event) => { settings.rankCount = Number(event.target.value); renderSettings(); });
}

function setPreview(id, source) { const image = document.querySelector(`#${id}`); if (!image) return; image.src = source || ''; image.style.display = source ? 'block' : 'none'; }
function bindImageInput(inputName, stateKey, previewId) { const input = document.querySelector(`[name="${inputName}"]`); if (!input) return; input.addEventListener('change', () => { const file = input.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { connection[stateKey] = String(reader.result); localStorage.setItem(`reward${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}`, connection[stateKey]); setPreview(previewId, connection[stateKey]); updateBranding(); }; reader.readAsDataURL(file); }); }
function updateBranding() { const storeName = document.querySelector('#store-name-display'); const brandName = document.querySelector('#brand-name-display'); const brandMark = document.querySelector('#brand-mark'); if (storeName) storeName.textContent = connection.storeName; if (brandName) brandName.textContent = connection.brandName; if (brandMark) brandMark.innerHTML = connection.brandImage ? `<img src="${connection.brandImage}" alt="" />` : 'T'; }

document.querySelector('#settings-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const active = settings.prizes.slice(0, settings.rankCount);
  const total = active.reduce((sum, prize) => sum + prize.probability, 0);
  const pointsOk = active.every((prize, index) => index === 0 || prize.points < active[index - 1].points) && settings.prizes[5].points < active.at(-1).points;
  const message = document.querySelector('#save-message');
  if (total !== 100) { message.style.color = '#c65d4b'; message.textContent = `保存できません：当選確率の合計が${total}%です（100%にしてください）。`; return; }
  if (!pointsOk) { message.style.color = '#c65d4b'; message.textContent = '保存できません：付与ポイントの順位を確認してください。'; return; }
  settings.parameter = Number(document.querySelector('[name="parameter"]').value);
  connection.mode = document.querySelector('[name="apiMode"]').value; connection.protocol = document.querySelector('[name="apiProtocol"]').value; connection.host = document.querySelector('[name="apiHost"]').value.trim(); connection.port = document.querySelector('[name="apiPort"]').value.trim(); connection.storeId = Number(document.querySelector('[name="storeId"]').value); connection.storeName = document.querySelector('[name="storeName"]').value.trim() || '店舗'; connection.brandName = document.querySelector('[name="brandName"]').value.trim() || 'ブランド'; connection.terminalNo = Number(document.querySelector('[name="terminalNo"]').value); connection.awardPolicy = document.querySelector('[name="awardPolicy"]').value; connection.cooldownHours = Math.max(1, Number(document.querySelector('[name="cooldownHours"]').value) || 1); connection.showMemberName = document.querySelector('[name="showMemberName"]').checked; connection.resultResetSeconds = Math.max(5, Math.min(120, Number(document.querySelector('[name="resultResetSeconds"]').value) || 15)); localStorage.setItem('rewardApiMode', connection.mode); localStorage.setItem('rewardApiProtocol', connection.protocol); localStorage.setItem('rewardApiHost', connection.host); localStorage.setItem('rewardApiPort', connection.port); localStorage.setItem('rewardStoreId', connection.storeId); localStorage.setItem('rewardStoreName', connection.storeName); localStorage.setItem('rewardBrandName', connection.brandName); localStorage.setItem('rewardTerminalNo', connection.terminalNo); localStorage.setItem('rewardAwardPolicy', connection.awardPolicy); localStorage.setItem('rewardCooldownHours', connection.cooldownHours); localStorage.setItem('rewardShowMemberName', connection.showMemberName); localStorage.setItem('rewardResultResetSeconds', connection.resultResetSeconds); updateBranding();
  message.style.color = 'var(--green)'; message.textContent = '設定を保存しました。次回の抽選から反映されます。';
});

document.querySelector('[data-action="reset-settings"]').addEventListener('click', () => { Object.assign(settings, structuredClone(defaultSettings)); renderSettings(); document.querySelector('#save-message').textContent = ''; });

updateBranding();
render();
