import React, { useState } from 'react';
import { MemberProfile } from '../types';
import { QrCode, Sparkles, ShieldCheck, Flame, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface Props {
  member: MemberProfile;
  onOpenFullscreenBarcode?: () => void;
}

export const MemberCard: React.FC<Props> = ({ member, onOpenFullscreenBarcode }) => {
  const [showCodeDetails, setShowCodeDetails] = useState(false);

  const getTierColor = () => {
    switch (member.tier) {
      case 'PLATINUM':
        return 'from-slate-900 via-indigo-950 to-slate-800 text-amber-200 border-indigo-500/30';
      case 'GOLD':
        return 'from-amber-600 via-amber-700 to-amber-900 text-amber-100 border-amber-400/40';
      case 'SILVER':
        return 'from-slate-600 via-slate-700 to-slate-800 text-slate-100 border-slate-400/40';
      default:
        return 'from-teal-700 via-emerald-800 to-emerald-950 text-emerald-100 border-emerald-500/30';
    }
  };

  return (
    <div className="relative w-full">
      {/* Visual membership pass card */}
      <div
        className={`w-full rounded-2xl bg-gradient-to-br ${getTierColor()} p-6 shadow-xl border relative overflow-hidden transition-all duration-300`}
      >
        {/* Subtle background glow effect */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/20 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-white text-base">
              P
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest opacity-80 font-semibold block">Store Point Pass</span>
              <span className="text-sm font-bold text-white tracking-wide">CAFE & STORE 晴れ間</span>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/20 shadow-sm">
            <Sparkles className="w-3 h-3 mr-1 text-amber-300" />
            {member.tier} 会員
          </span>
        </div>

        {/* Balance & Name Display */}
        <div className="relative z-10 mt-2 mb-6">
          <div className="text-xs font-medium opacity-80">利用可能ポイント</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-sans drop-shadow-sm">
              {member.points.toLocaleString()}
            </span>
            <span className="text-lg font-bold opacity-90">pt</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs opacity-90 pt-1 border-t border-white/15">
            <span className="font-medium text-white/90">{member.name} 様</span>
            <div className="flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>連続来店 <b>{member.consecutiveVisits}</b> 日目</span>
            </div>
          </div>
        </div>

        {/* Barcode / QR Simulation Strip */}
        <div className="relative z-10 bg-white rounded-xl p-3 shadow-md text-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>会員バーコード (店頭スキャン用)</span>
            </div>
            <button
              onClick={() => setShowCodeDetails(!showCodeDetails)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 px-1.5 py-0.5 rounded transition"
              title="コードの表示切り替え"
              aria-label="会員コード表示切り替え"
            >
              {showCodeDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{showCodeDetails ? '隠す' : '表示'}</span>
            </button>
          </div>

          {/* Barcode Graphics (pure CSS responsive bars) */}
          <div
            onClick={onOpenFullscreenBarcode}
            className="cursor-pointer group relative bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition flex flex-col items-center justify-center"
          >
            <div className="h-10 w-full flex items-center justify-center space-x-0.5 overflow-hidden px-2">
              {/* Procedural Barcode Lines */}
              {[4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 3, 1, 2, 3, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 2].map(
                (thickness, idx) => (
                  <span
                    key={idx}
                    className={`h-full bg-slate-900 rounded-xs transition-opacity ${
                      idx % 5 === 0 ? 'opacity-90' : 'opacity-100'
                    }`}
                    style={{ width: `${thickness * 2.2}px` }}
                  />
                )
              )}
            </div>
            <div className="mt-1 font-mono tracking-widest text-xs text-slate-700 font-semibold">
              {showCodeDetails ? member.memberCode : '2984 •••• •••• 9218'}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5 font-medium flex items-center space-x-1">
              <QrCode className="w-3 h-3" />
              <span>タップして拡大表示（レジ提示用）</span>
            </div>
          </div>
        </div>

        {/* Today's check-in status sticker */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/80">
          <span>累計来店回数: {member.totalVisits}回</span>
          <span className="flex items-center">
            {member.hasCheckedInToday ? (
              <span className="inline-flex items-center text-emerald-200 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-400/40">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                本日チェックイン完了
              </span>
            ) : (
              <span className="text-amber-200 font-medium">※本日はまだ来店ポイント未獲得</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
