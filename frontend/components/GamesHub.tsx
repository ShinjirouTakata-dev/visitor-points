import React, { useState } from 'react';
import { MiniGameType, MemberProfile, StoreAdminSettings } from '../types';
import { audioService } from '../services/audioService';
import { drawLotteryPrize } from '../services/lotteryEngine';
import { Sparkles, Trophy, Flame, RotateCcw } from 'lucide-react';

interface Props {
  member: MemberProfile;
  settings: StoreAdminSettings;
  onGameComplete: (earnedPoints: number, rankName: string, updatedLottery?: any) => void;
}

export const GamesHub: React.FC<Props> = ({ member, settings, onGameComplete }) => {
  const [activeGame, setActiveGame] = useState<MiniGameType>('SLOT');

  // Slot Machine
  const slotSymbols = ['🍒', '🍋', '⭐', '🔔', '7️⃣'];
  const [reels, setReels] = useState<[string, string, string]>(['⭐', '7️⃣', '🍒']);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);

  // Roulette
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);

  // Scratch
  const [scratchedCells, setScratchedCells] = useState<boolean[]>([false, false, false, false, false, false]);
  const [scratchDone, setScratchDone] = useState(false);

  const activeTiers = settings.lotterySettings.tiers.filter(
    (t) => t.rank <= settings.lotterySettings.maxRanksEnabled
  );
  const topPrize = activeTiers[0]?.points || 100;

  // --- Slot Spin Handler ---
  const handleSpinSlot = () => {
    if (isSlotSpinning) return;
    setIsSlotSpinning(true);

    let count = 0;
    const interval = setInterval(() => {
      audioService.playSpinTick();
      setReels([
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
      ]);
      count++;

      if (count > 16) {
        clearInterval(interval);
        const draw = drawLotteryPrize(settings.lotterySettings);

        let finalReels: [string, string, string] = ['🍒', '🍋', '🔔'];
        if (draw.wonTierRank === 1) finalReels = ['7️⃣', '7️⃣', '7️⃣'];
        else if (draw.wonTierRank === 2) finalReels = ['⭐', '⭐', '⭐'];
        else if (draw.wonTierRank === 3) finalReels = ['🔔', '🔔', '🍒'];
        else if (draw.wonTierRank && draw.wonTierRank > 3) finalReels = ['🍒', '🍒', '🍋'];

        setReels(finalReels);
        setIsSlotSpinning(false);
        audioService.playWin();

        onGameComplete(draw.points, draw.rankName, {
          ...settings.lotterySettings,
          tiers: draw.updatedTiers,
        });
      }
    }, 85);
  };

  // --- Roulette Spin Handler ---
  const handleSpinRoulette = () => {
    if (isRouletteSpinning) return;
    setIsRouletteSpinning(true);

    const randomDeg = 1440 + Math.floor(Math.random() * 360);
    const targetAngle = rouletteAngle + randomDeg;
    setRouletteAngle(targetAngle);

    let clicks = 0;
    const clickInt = setInterval(() => {
      audioService.playSpinTick();
      clicks++;
      if (clicks > 24) clearInterval(clickInt);
    }, 110);

    setTimeout(() => {
      setIsRouletteSpinning(false);
      audioService.playWin();

      const draw = drawLotteryPrize(settings.lotterySettings);
      onGameComplete(draw.points, draw.rankName, {
        ...settings.lotterySettings,
        tiers: draw.updatedTiers,
      });
    }, 3200);
  };

  // --- Scratch Card Handler ---
  const handleScratchCell = (idx: number) => {
    if (scratchedCells[idx] || scratchDone) return;
    audioService.playScratchSound();

    const updated = [...scratchedCells];
    updated[idx] = true;
    setScratchedCells(updated);

    const scratchedCount = updated.filter(Boolean).length;
    if (scratchedCount >= 3 && !scratchDone) {
      setScratchDone(true);
      audioService.playWin();
      const draw = drawLotteryPrize(settings.lotterySettings);

      setTimeout(() => {
        onGameComplete(draw.points, draw.rankName, {
          ...settings.lotterySettings,
          tiers: draw.updatedTiers,
        });
      }, 700);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Game Selector Menu */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex">
        <button
          onClick={() => setActiveGame('SLOT')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1.5 ${
            activeGame === 'SLOT'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🎰</span>
          <span>① 来店スロット</span>
        </button>

        <button
          onClick={() => setActiveGame('ROULETTE')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1.5 ${
            activeGame === 'ROULETTE'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🎡</span>
          <span>② ルーレット</span>
        </button>

        <button
          onClick={() => setActiveGame('SCRATCH')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1.5 ${
            activeGame === 'SCRATCH'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🪙</span>
          <span>③ スクラッチ</span>
        </button>
      </div>

      {/* 1. SLOT MACHINE */}
      {activeGame === 'SLOT' && (
        <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-800 shadow-xl text-center relative overflow-hidden">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>特賞 {topPrize} pt を狙おう！</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            ラッキースロットマシン
          </h3>
          <p className="text-xs text-slate-300 mb-6">
            SPINをタップしてリールを回してください
          </p>

          <div className="bg-slate-800/90 border-4 border-amber-400 p-4 rounded-2xl max-w-xs mx-auto shadow-inner flex items-center justify-center space-x-3 mb-6">
            {reels.map((symbol, idx) => (
              <div
                key={idx}
                className="w-20 h-24 bg-gradient-to-b from-white to-slate-100 rounded-xl flex items-center justify-center text-4xl shadow-md border border-slate-300 text-slate-900"
              >
                <span className={isSlotSpinning ? 'animate-bounce' : ''}>{symbol}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSpinSlot}
            disabled={isSlotSpinning}
            className={`w-full max-w-xs py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider transition shadow-lg active:scale-95 ${
              isSlotSpinning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/30'
            }`}
          >
            {isSlotSpinning ? '回転中...' : 'SPIN! スロットを回す'}
          </button>
        </div>
      )}

      {/* 2. ROULETTE */}
      {activeGame === 'ROULETTE' && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl text-center relative overflow-hidden">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30 mb-3">
            <Trophy className="w-3.5 h-3.5" />
            <span>ホイールを回して運試し！</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
            フォーチュン来店ルーレット
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            止まった等級のポイントをそのまま獲得できます
          </p>

          <div className="relative w-60 h-60 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-x-8 border-x-transparent border-t-[16px] border-t-amber-400 filter drop-shadow" />

            <div
              className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden relative transition-transform duration-[3200ms] ease-out"
              style={{ transform: `rotate(${rouletteAngle}deg)` }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
                const rotation = idx * 45;
                const bg = idx % 2 === 0 ? 'bg-indigo-950' : 'bg-amber-600';
                const label = idx <= activeTiers.length ? `${activeTiers[idx - 1].rank}等` : '参加賞';
                return (
                  <div
                    key={idx}
                    className={`absolute w-1/2 h-1/2 top-0 right-0 origin-bottom-left flex items-start justify-center pt-2 text-xs font-black text-white ${bg}`}
                    style={{
                      transform: `rotate(${rotation}deg) skewY(45deg)`,
                    }}
                  >
                    <span style={{ transform: 'skewY(-45deg) rotate(22deg)' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="absolute w-12 h-12 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center font-bold text-amber-300 text-xs shadow-md z-10">
              P
            </div>
          </div>

          <button
            onClick={handleSpinRoulette}
            disabled={isRouletteSpinning}
            className={`w-full max-w-xs py-4 px-6 rounded-2xl font-black text-base uppercase transition shadow-lg active:scale-95 ${
              isRouletteSpinning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/30'
            }`}
          >
            {isRouletteSpinning ? 'ルーレット回転中...' : 'START! ルーレットを回す'}
          </button>
        </div>
      )}

      {/* 3. SCRATCH */}
      {activeGame === 'SCRATCH' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg text-center">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold border border-amber-200 mb-3">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>お好きなマスを3箇所削ってください</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">
            スクラッチラッキーくじ
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            削ったマスの中から等級が決定します！
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isRevealed = scratchedCells[idx];
              return (
                <button
                  key={idx}
                  onClick={() => handleScratchCell(idx)}
                  className={`h-24 rounded-2xl font-black transition-all flex flex-col items-center justify-center border-2 ${
                    isRevealed
                      ? 'bg-amber-50 border-amber-400 text-amber-800 scale-100 shadow-inner'
                      : 'bg-gradient-to-tr from-slate-300 to-slate-200 hover:from-slate-200 border-slate-400 text-slate-600 shadow-md cursor-pointer active:scale-95'
                  }`}
                >
                  {isRevealed ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
                      <span className="text-base font-black">オープン</span>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-slate-400/30 flex items-center justify-center text-xs text-slate-700 font-bold mb-1">
                        ?
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">削る</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            削ったマス: {scratchedCells.filter(Boolean).length} / 3
          </div>
        </div>
      )}
    </div>
  );
};
