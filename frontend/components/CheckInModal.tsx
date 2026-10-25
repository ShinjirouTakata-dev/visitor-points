import React, { useEffect, useState } from 'react';
import { Sparkles, Check, Flame, X, Gift, MapPin, Store } from 'lucide-react';
import { audioService } from '../services/audioService';
import { SoundTone } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  earnedPoints: number;
  streakCount: number;
  soundTone: SoundTone;
}

export const CheckInModal: React.FC<Props> = ({
  isOpen,
  onClose,
  earnedPoints,
  streakCount,
  soundTone,
}) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationStep(1);
      // Play crisp pleasant store chime
      audioService.playTone(soundTone);

      const timer = setTimeout(() => {
        setAnimationStep(2);
      }, 350);

      return () => clearTimeout(timer);
    } else {
      setAnimationStep(0);
    }
  }, [isOpen, soundTone]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center overflow-hidden border border-slate-100 transform transition-all duration-300 scale-100">
        
        {/* Confetti & Glow Ambient */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-200/50 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Store Location tag */}
        <div className="inline-flex items-center space-x-1 text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-full font-semibold border border-amber-200/60 mb-4">
          <Store className="w-3.5 h-3.5 text-amber-600" />
          <span>CAFE & STORE 晴れ間 渋谷本店</span>
        </div>

        {/* Stamp Circle with smooth surge animation */}
        <div className="relative my-4 flex justify-center items-center">
          <div
            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-inner transition-all duration-500 ${
              animationStep >= 2
                ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-white scale-105 shadow-amber-300/50 shadow-lg'
                : 'bg-amber-100 text-amber-600 scale-95'
            }`}
          >
            <div className="flex items-center space-x-0.5">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
              <span className="text-3xl font-black font-sans tracking-tight">+{earnedPoints}</span>
            </div>
            <span className="text-[11px] font-bold tracking-widest mt-0.5 uppercase opacity-90">Points Get!</span>
          </div>

          {/* Stamp check mark badge */}
          <div className="absolute -bottom-1 bg-emerald-500 text-white p-1.5 rounded-full shadow-md border-2 border-white">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        {/* Heading text */}
        <h3 className="text-xl font-bold text-slate-900 mt-3 mb-1">
          ご来店ありがとうございます！
        </h3>
        <p className="text-xs text-slate-500">
          本日分の来店スタンプが押印されました
        </p>

        {/* Streak Stamp Visual Card */}
        <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700 flex items-center">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 mr-1" />
              連続来店ボーナス
            </span>
            <span className="font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full text-[11px]">
              {streakCount} 日連続中！
            </span>
          </div>

          {/* 7-day stamp streak track */}
          <div className="grid grid-cols-7 gap-1 mt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isStamped = day <= streakCount;
              const isToday = day === streakCount;
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition ${
                    isStamped
                      ? 'bg-amber-500 text-white border-amber-600 font-bold'
                      : 'bg-white text-slate-400 border-slate-200'
                  } ${isToday ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                >
                  <span className="text-[10px] leading-none mb-1 font-sans">{day}日</span>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]">
                    {isStamped ? <Check className="w-3 h-3 stroke-[3]" /> : '•'}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 text-left flex items-center space-x-1">
            <Gift className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>7日連続達成で<b className="text-slate-800">「100ptボーナス」</b>を進呈！</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
        >
          <span>ポイントを確認する</span>
        </button>
      </div>
    </div>
  );
};
