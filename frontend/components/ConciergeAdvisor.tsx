import React, { useState, useEffect } from 'react';
import { MemberProfile } from '../types';
import { fetchStoreConciergeAdvice, ConciergeAdvice } from '../services/geminiService';
import { Sparkles, Bot, RefreshCw, Lightbulb, Coffee, ShoppingBag, ArrowRight } from 'lucide-react';

interface Props {
  member: MemberProfile;
  onNavigateCoupons: () => void;
  onNavigateGames: () => void;
}

export const ConciergeAdvisor: React.FC<Props> = ({
  member,
  onNavigateCoupons,
  onNavigateGames,
}) => {
  const [advice, setAdvice] = useState<ConciergeAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAdvice = async () => {
    setIsLoading(true);
    const result = await fetchStoreConciergeAdvice(member);
    setAdvice(result);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdvice();
  }, [member.points, member.consecutiveVisits]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Concierge Greeting Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-indigo-700/60 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3 h-3" />
                <span>Gemini API 店舗AIコンシェルジュ</span>
              </div>
              <h3 className="text-base font-bold text-white">晴れ間 AI アシスタント</h3>
            </div>
          </div>

          <button
            onClick={loadAdvice}
            disabled={isLoading}
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 rounded-xl transition flex items-center space-x-1 text-xs border border-white/10"
            title="最新の提案を再生成"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">再生成</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-300">会員ステータスとおすすめ特典を分析中...</p>
          </div>
        ) : (
          advice && (
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-xs sm:text-sm leading-relaxed text-slate-100">
                {advice.greeting}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center space-x-1">
                    <Coffee className="w-3.5 h-3.5" />
                    <span>おすすめピックアップ</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {advice.recommendation}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center space-x-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>ポイント活用アドバイス</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {advice.specialPerkTip}
                  </p>
                </div>
              </div>

              {/* Action shortcut banner */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onNavigateCoupons}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-900 font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>おすすめクーポンを交換する</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onNavigateGames}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/15 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition border border-white/20"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>ミニゲームでポイントを貯める</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
