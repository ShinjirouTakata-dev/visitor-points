import React from 'react';
import { StoreAdminSettings, PointTransaction } from '../types';
import { getHourlyParticipants } from '../services/mockData';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  ShoppingBag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface Props {
  settings: StoreAdminSettings;
  history: PointTransaction[];
  onStartGame: () => void;
}

export const IdleWelcomeScreen: React.FC<Props> = ({
  settings,
  history,
  onStartGame,
}) => {
  // Compute Today's participant total
  const todayStr = new Date().toISOString().split('T')[0];
  const todayParticipantsCount = history.filter((tx) => {
    const d = tx.timestamp ? new Date(tx.timestamp) : new Date(tx.date);
    return d.toISOString().split('T')[0] === todayStr;
  }).length;

  const nextChallengerNumber = todayParticipantsCount + 1;

  // Hourly distribution bounded by business hours
  const hourlyData = getHourlyParticipants(
    history,
    settings.businessHoursStart,
    settings.businessHoursEnd
  );

  const topPrize =
    settings.lotterySettings.tiers.find((t) => t.rank === 1)?.points || 500;

  return (
    <div className="w-full max-w-6xl mx-auto py-2 sm:py-4 animate-fade-in">
      {/* 2-Block Clean Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
        
        {/* LEFT BLOCK: 「レジ待ち時間に、運試し。」訴求 ＋ 時間帯別グラフ埋め込み */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#161730] via-[#1c1d3b] to-[#121324] border border-[#2c2d54] p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-hidden min-h-[520px]">
          {/* Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Catchphrase Header */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-widest text-amber-300 border border-amber-400/30 bg-amber-400/10">
                <ShoppingBag className="w-3 h-3 mr-1 text-amber-400" />
                お会計待ちの特別チャンス
              </span>
              <span className="text-[10px] text-[#8e8fae] font-semibold tracking-wider uppercase">
                TODAY&apos;S BONUS
              </span>
            </div>

            {/* 目立たせたキャプション */}
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              レジ待ち時間に、<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 drop-shadow-sm">
                運試し。
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#9b9cb7] mt-3 leading-relaxed">
              お会計の順番をお待ちの間にサクッとタッチ！<br className="hidden sm:inline" />
              本日だけのお得な来店ポイントをその場でゲットできます。
            </p>
          </div>

          {/* Embedded Hourly Participant Bar Chart (カードイラストをカットし、ここに常時表示) */}
          <div className="my-4 p-4 rounded-2xl bg-[#14152a]/90 border border-[#2b2d52] shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center space-x-1.5 text-slate-300 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>時間帯別の参加状況 ({settings.businessHoursStart} 〜 {settings.businessHoursEnd})</span>
              </div>
              <span className="text-[11px] text-amber-300 font-mono font-bold">
                本日累計: {todayParticipantsCount}名
              </span>
            </div>

            <div className="h-28 sm:h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 8, right: 6, left: -24, bottom: -4 }}>
                  <XAxis
                    dataKey="hour"
                    stroke="#64668f"
                    fontSize={10}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#64668f"
                    fontSize={10}
                    allowDecimals={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1b1c3a',
                      borderColor: '#373966',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '11px',
                      padding: '4px 8px',
                    }}
                    labelStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val} 名`, '参加数']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#fbbf24"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="pt-3 border-t border-[#2d2e52] flex items-center justify-between text-left">
            <div>
              <div className="text-base sm:text-lg font-black text-white font-sans">
                1日1回
              </div>
              <div className="text-[11px] text-[#8e8fae]">レジ前限定チャレンジ</div>
            </div>

            <div className="text-right">
              <div className="text-base sm:text-lg font-black text-amber-400 font-sans">
                最大{topPrize}pt
              </div>
              <div className="text-[11px] text-[#8e8fae]">当選チャンス</div>
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: 「来店ポイントを受け取ろう」＋ 金貨バッジ ＋ 参加順表示 ＋ ゲーム開始ボタン */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#161730] via-[#1c1d3b] to-[#141527] border border-[#2c2d54] p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-hidden min-h-[520px]">
          
          {/* Top Badges */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-widest text-[#9d9eb8] uppercase">
              MEMBER GAME
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30">
              本日のチャンス
            </span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              来店ポイントを<br />
              受け取ろう
            </h2>
          </div>

          {/* Central Golden Coin Badge */}
          <div className="my-4 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#d97706] via-[#f59e0b] to-[#fcd34d] p-1.5 shadow-[0_0_35px_rgba(245,158,11,0.35)] flex items-center justify-center border-2 border-amber-300">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-slate-900 shadow-inner">
                <Sparkles className="w-12 h-12 text-slate-900 fill-slate-900" />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white mt-4">
              今日のポイントを<br className="sm:hidden" />ゲームでゲット！
            </h3>
            <p className="text-xs text-[#9b9cb7] mt-1 max-w-xs leading-relaxed">
              会員証をご用意のうえ、ボタンをタッチしてください。<br />
              レジをお待ちの間に楽しくチャレンジできます。
            </p>
          </div>

          {/* Participant Counter Badge (自分が何番目のトライになるか明示) */}
          <div className="mb-4 bg-[#1f2042] border border-[#353763] rounded-2xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-[#a8a9c7]">
              <Users className="w-4 h-4 text-amber-400" />
              <span>本日の参加総数: <b className="text-white font-mono text-sm">{todayParticipantsCount}</b> 名</span>
            </div>
            <div className="text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
              あなたが本日 <b className="font-mono text-sm">{nextChallengerNumber}</b> 番目！
            </div>
          </div>

          {/* Action Button: 「ゲームを始める →」 */}
          <div>
            <button
              onClick={onStartGame}
              className="w-full py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] hover:from-[#fbbf24] hover:to-[#f59e0b] active:scale-[0.98] text-slate-950 font-black text-base sm:text-lg tracking-wider transition-all shadow-[0_8px_25px_rgba(245,158,11,0.3)] flex items-center justify-center space-x-2 group cursor-pointer"
            >
              <span>ゲームを始める</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Indicator Dots */}
            <div className="flex items-center justify-center space-x-1.5 mt-4">
              <span className="w-4 h-1.5 rounded-full bg-[#f43f5e]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d3e66]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d3e66]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d3e66]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d3e66]" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
