import React, { useState, useEffect, useRef } from 'react';
import {
  MemberProfile,
  PointTransaction,
  StoreAdminSettings,
  VisitorFlowStep,
} from './types';
import {
  loadMemberData,
  saveMemberData,
  loadHistoryData,
  saveHistoryData,
  loadSettingsData,
  saveSettingsData,
  resetAllData,
  normalizeBarcode,
} from './services/mockData';
import { audioService } from './services/audioService';
import { executePointCorrection } from './services/apiService';

import { IdleWelcomeScreen } from './components/IdleWelcomeScreen';
import { BarcodeCameraScanner } from './components/BarcodeCameraScanner';
import { GamesHub } from './components/GamesHub';
import { AdminSettingsModal } from './components/AdminSettingsModal';

import {
  Sparkles,
  Settings,
  Dices,
  Volume2,
  Music,
  RotateCcw,
  CheckCircle2,
  User,
  CreditCard,
  Timer,
  ArrowLeft,
} from 'lucide-react';

export default function App() {
  const [member, setMember] = useState<MemberProfile>(loadMemberData);
  const [history, setHistory] = useState<PointTransaction[]>(loadHistoryData);
  const [settings, setSettings] = useState<StoreAdminSettings>(loadSettingsData);

  // Flow State Machine: Initial state is IDLE_WELCOME matching original kiosk screen
  const [currentStep, setCurrentStep] = useState<VisitorFlowStep>('IDLE_WELCOME');
  const [scannedCode, setScannedCode] = useState<string>('');

  // Points breakdown state
  const [pointsBefore, setPointsBefore] = useState<number>(0);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const [awardedRankName, setAwardedRankName] = useState<string>('');

  // Auto-reset Countdown Timer
  const [countdown, setCountdown] = useState<number>(settings.autoResetSeconds || 10);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Admin Modal
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState<boolean>(false);

  // Sync state
  useEffect(() => {
    saveMemberData(member);
  }, [member]);

  useEffect(() => {
    saveHistoryData(history);
  }, [history]);

  useEffect(() => {
    saveSettingsData(settings);
    audioService.setVolume(settings.soundVolume);
    if (settings.bgmEnabled) {
      audioService.toggleBgm(true);
    }
  }, [settings]);

  // Pre-load voices on component mount for instant low-latency speech
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Handle N-seconds countdown on AWARD_RESULT screen to auto-return to IDLE_WELCOME
  useEffect(() => {
    if (currentStep === 'AWARD_RESULT') {
      const initialSeconds = settings.autoResetSeconds || 10;
      setCountdown(initialSeconds);

      resetTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleResetToTop();
            return initialSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (resetTimerRef.current) {
        clearInterval(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    }

    return () => {
      if (resetTimerRef.current) {
        clearInterval(resetTimerRef.current);
      }
    };
  }, [currentStep, settings.autoResetSeconds]);

  // Reset back to Standby Welcome Screen
  const handleResetToTop = () => {
    if (resetTimerRef.current) {
      clearInterval(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    audioService.cancelAnnouncement();
    setCurrentStep('IDLE_WELCOME');
    setScannedCode('');
    setEarnedPoints(0);
  };

  // STEP 1: Customer touches "ゲームを始める →"
  const handleStartGame = () => {
    audioService.playTone('SUBTLE_PING');
    setCurrentStep('SCAN_WAITING');
  };

  // STEP 2: Barcode Scanned successfully
  const handleScanSuccess = (barcodeValue: string) => {
    const normalizedCode = normalizeBarcode(barcodeValue);
    setScannedCode(normalizedCode);
    setCurrentStep('INQUIRY_LOADING');

    // Simulate API inquiry with member point fetch
    setTimeout(() => {
      const currentPts = member.points;
      setPointsBefore(currentPts);
      setCurrentStep('GAME_SELECTION');
      audioService.playTone('MELODIC_CHIME');
    }, 600);
  };

  // STEP 3: Game Completed & Points Awarded -> 3分割アナウンス順次再生
  const handleGameComplete = async (pointsWon: number, rankName: string, updatedLottery?: any) => {
    const before = member.points;
    const total = before + pointsWon;
    setPointsBefore(before);
    setEarnedPoints(pointsWon);
    setPointsTotal(total);
    setAwardedRankName(rankName);

    const updatedMember: MemberProfile = {
      ...member,
      points: total,
      totalVisits: member.totalVisits + 1,
      hasCheckedInToday: true,
      lastVisitDate: new Date().toISOString().split('T')[0],
    };

    const apiResult = await executePointCorrection(
      settings,
      member,
      pointsWon,
      `来店ゲーム (${rankName})`
    );

    const newTx: PointTransaction = {
      id: `tx_${Date.now()}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      memberCode: scannedCode || member.memberCode,
      title: `来店ゲーム (${rankName})`,
      type: 'GAME_WIN',
      amount: pointsWon,
      balanceAfter: apiResult.balanceAfter,
      note: settings.storeName,
    };

    if (updatedLottery) {
      setSettings((prev) => ({
        ...prev,
        lotterySettings: updatedLottery,
      }));
    }

    setMember(updatedMember);
    setHistory((prev) => [newTx, ...prev]);

    // Transition to Result Screen
    setCurrentStep('AWARD_RESULT');

    // 1. Play celebratory fanfare
    audioService.playWin();

    // 2. 確定アナウンスを3分割シーケンシャル再生
    // ①「おめでとうございます！」(WAV/AI) → ②「Xポイント付与です！」(AI) → ③「ご来店ありがとうございます。」(WAV/AI)
    setTimeout(() => {
      audioService.playAwardAnnouncement(pointsWon, {
        congratsAudioUrl: settings.congratsAudioUrl,
        thanksAudioUrl: settings.thanksAudioUrl,
      });
    }, 450);
  };

  const appTitle = settings.appTitle || 'とくとくタッチ';
  const appSubtitle = settings.appSubtitle || 'TEC MART / MEMBER BENEFITS';
  const appIconText = settings.appIconText || 'TEC';
  const appIconBg = settings.appIconBgColor || 'bg-white text-slate-900';

  return (
    <div className="min-h-screen bg-[#0f1021] text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950">
      
      {/* Top Header Matching Original Layout */}
      <header className="sticky top-0 z-40 bg-[#0f1021]/95 backdrop-blur-md border-b border-[#232442] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            onClick={handleResetToTop}
            className="flex items-center space-x-3 cursor-pointer select-none"
          >
            {/* TEC / Branding Icon Badge */}
            <div className={`w-9 h-9 rounded-xl ${appIconBg} font-black flex items-center justify-center text-xs shadow-md border border-white/20 tracking-tighter`}>
              {appIconText}
            </div>
            <div>
              <div className="text-[10px] tracking-widest font-bold text-[#8f91b5] uppercase">
                {appSubtitle}
              </div>
              <div className="text-base font-black text-white leading-tight tracking-tight">
                {appTitle}
              </div>
            </div>
          </div>

          {/* Right Header Status & Settings Button */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Store Status Indicator */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1b1c38] border border-[#2f315c] text-xs font-bold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{settings.storeName}</span>
            </div>

            {/* Ambient Sound Test */}
            <button
              onClick={() => audioService.playTone(settings.soundTone)}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1f2040] rounded-xl transition cursor-pointer"
              title="店舗チャイム音試聴"
              aria-label="チャイム試聴"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Store Settings Menu Trigger Button */}
            <button
              type="button"
              onClick={() => setIsAdminSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1f2040] rounded-xl transition border border-[#2d2f57] shadow-xs cursor-pointer"
              title="店舗設定メニュー"
              aria-label="店舗設定メニュー"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Flow Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        
        {/* STEP 0: IDLE_WELCOME (Standby Screen Matching Attachment) */}
        {currentStep === 'IDLE_WELCOME' && (
          <IdleWelcomeScreen
            settings={settings}
            history={history}
            onStartGame={handleStartGame}
          />
        )}

        {/* STEP 1: SCAN_WAITING (Camera Barcode Reader) */}
        {currentStep === 'SCAN_WAITING' && (
          <div className="space-y-6 text-center max-w-xl mx-auto w-full animate-fade-in">
            <div className="flex items-center justify-between">
              <button
                onClick={handleResetToTop}
                className="px-3 py-1.5 bg-[#1b1c38] hover:bg-[#282a52] text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1 border border-[#2f315c] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>戻る</span>
              </button>
              <span className="inline-flex items-center px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
                会員コード認証
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                会員バーコードをかざしてください
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                カメラに会員証を向けると自動認識されます
              </p>
            </div>

            <BarcodeCameraScanner onScanSuccess={handleScanSuccess} />
          </div>
        )}

        {/* STEP 2: INQUIRY_LOADING */}
        {currentStep === 'INQUIRY_LOADING' && (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-white">会員情報を照会中...</h2>
            <p className="text-xs text-slate-400 font-mono">コード: {scannedCode}</p>
          </div>
        )}

        {/* STEP 3: GAME_SELECTION */}
        {currentStep === 'GAME_SELECTION' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full animate-fade-in">
            {/* Point Header Card */}
            <div className="bg-[#161730] rounded-3xl p-5 sm:p-6 border border-[#2c2d54] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className={`w-12 h-12 rounded-2xl ${appIconBg} flex items-center justify-center font-bold text-lg shadow-md`}>
                  {appIconText}
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    会員コード: <b className="text-white font-mono">{scannedCode || member.memberCode}</b>
                  </div>
                  {settings.showMemberName && (
                    <div className="text-sm font-bold text-white flex items-center space-x-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{member.name} 様</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Points Badge */}
              <div className="text-center sm:text-right bg-[#1c1d3b] px-5 py-3 rounded-2xl border border-[#343666]">
                <div className="text-[11px] font-bold text-amber-300">現在の保有ポイント</div>
                <div className="flex items-baseline justify-center sm:justify-end space-x-1">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 font-sans tracking-tight">
                    {pointsBefore.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-amber-300">pt</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-white flex items-center justify-center space-x-1.5">
                <Dices className="w-5 h-5 text-amber-400" />
                <span>お好きなゲームを選んで来店ポイントを獲得！</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                スロット・ルーレット・スクラッチのいずれかを1回プレイできます
              </p>
            </div>

            <GamesHub
              member={member}
              settings={settings}
              onGameComplete={handleGameComplete}
            />
          </div>
        )}

        {/* STEP 4: AWARD_RESULT (Now -> Added -> Total + 3-Part Voice Announcement) */}
        {currentStep === 'AWARD_RESULT' && (
          <div className="max-w-lg w-full mx-auto bg-[#161730] rounded-3xl p-6 sm:p-8 border border-[#2c2d54] shadow-2xl text-center space-y-6 animate-scale-up">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-3.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold mb-2">
                🎉 {awardedRankName} 当選！
              </span>
              <h2 className="text-2xl font-black text-white">
                来店ポイントが付与されました！
              </h2>
              {settings.showMemberName && (
                <div className="text-xs text-slate-400 mt-1">
                  {member.name} 様、ご来店ありがとうございます
                </div>
              )}
            </div>

            {/* Clear Points Transition: 付与前 → 今回付与 → 合計ポイント */}
            <div className="bg-[#1c1d3b] rounded-2xl p-4 sm:p-5 border border-[#343666]">
              <div className="grid grid-cols-3 gap-2 items-center text-center">
                
                <div className="bg-[#121329] p-3 rounded-xl border border-[#2c2d54]">
                  <div className="text-[10px] font-bold text-slate-400">付与前ポイント</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-200 font-sans mt-0.5">
                    {pointsBefore.toLocaleString()} <span className="text-[10px]">pt</span>
                  </div>
                </div>

                <div className="bg-amber-500 text-slate-950 p-3 rounded-xl shadow-md border-2 border-amber-300">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-900">今回付与</div>
                  <div className="text-xl sm:text-2xl font-black font-sans mt-0.5">
                    +{earnedPoints} <span className="text-xs">pt</span>
                  </div>
                </div>

                <div className="bg-[#121329] p-3 rounded-xl border-2 border-emerald-400 text-emerald-400 shadow-xs">
                  <div className="text-[10px] font-black text-emerald-300">合計ポイント</div>
                  <div className="text-lg sm:text-xl font-black font-sans mt-0.5">
                    {pointsTotal.toLocaleString()} <span className="text-[10px]">pt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Replay Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() =>
                  audioService.playAwardAnnouncement(earnedPoints, {
                    congratsAudioUrl: settings.congratsAudioUrl,
                    thanksAudioUrl: settings.thanksAudioUrl,
                  })
                }
                className="px-3 py-1.5 rounded-full bg-[#1e2040] hover:bg-[#2a2c54] text-amber-300 text-xs font-bold border border-[#353763] flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>アナウンス音声をもう一度再生する</span>
              </button>
            </div>

            {/* N-second auto-reset countdown bar to return to Standby Screen */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-300 font-medium">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>
                  あと <b className="text-amber-400 font-mono text-sm">{countdown}</b> 秒で待ち受け画面へ戻ります
                </span>
              </div>

              <div className="w-full bg-[#1c1d3b] h-2 rounded-full overflow-hidden border border-[#2c2d54]">
                <div
                  className="bg-amber-400 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{
                    width: `${(countdown / (settings.autoResetSeconds || 10)) * 100}%`,
                  }}
                />
              </div>

              <button
                onClick={handleResetToTop}
                className="mt-3 w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 active:scale-98 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>今すぐ最初の画面に戻る</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Admin Settings Modal */}
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        settings={settings}
        history={history}
        onSaveSettings={setSettings}
        onClearHistory={() => setHistory([])}
        onResetAllData={() => {
          resetAllData();
          audioService.stopBgm();
          setMember(loadMemberData());
          setHistory(loadHistoryData());
          setSettings(loadSettingsData());
          handleResetToTop();
        }}
      />
    </div>
  );
}
