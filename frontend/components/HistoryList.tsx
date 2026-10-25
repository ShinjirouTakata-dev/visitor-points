import React, { useState } from 'react';
import { PointTransaction } from '../types';
import { ArrowDownLeft, ArrowUpRight, Calendar, Sparkles, Filter } from 'lucide-react';

interface Props {
  transactions: PointTransaction[];
}

export const HistoryList: React.FC<Props> = ({ transactions }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'IN') return tx.amount > 0;
    if (filterType === 'OUT') return tx.amount < 0;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">ポイント・来店履歴</h3>
          <p className="text-xs text-slate-500">直近の獲得・交換履歴</p>
        </div>

        {/* Filter buttons */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterType === 'IN' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            獲得のみ
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filterType === 'OUT' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            交換のみ
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            該当する履歴がありません
          </div>
        ) : (
          filtered.map((tx) => {
            const isGain = tx.amount > 0;
            return (
              <div key={tx.id} className="py-3.5 flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      isGain
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}
                  >
                    {isGain ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{tx.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{tx.date}</span>
                      {tx.note && <span className="text-slate-500">・{tx.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-black font-sans ${
                      isGain ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isGain ? `+${tx.amount}` : tx.amount} pt
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    残高: {tx.balanceAfter} pt
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
