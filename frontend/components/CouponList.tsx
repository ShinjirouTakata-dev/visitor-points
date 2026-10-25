import React, { useState } from 'react';
import { CouponItem } from '../types';
import { Gift, Check, Clock, AlertCircle, Sparkles, Coffee, Percent, Utensils } from 'lucide-react';
import { audioService } from '../services/audioService';

interface Props {
  coupons: CouponItem[];
  userPoints: number;
  onRedeem: (coupon: CouponItem) => void;
}

export const CouponList: React.FC<Props> = ({ coupons, userPoints, onRedeem }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [confirmingCoupon, setConfirmingCoupon] = useState<CouponItem | null>(null);

  const categories = [
    { id: 'ALL', label: 'すべて' },
    { id: 'DRINK', label: 'ドリンク' },
    { id: 'DISCOUNT', label: '割引券' },
    { id: 'FOOD', label: 'フード' },
    { id: 'SPECIAL', label: '会員限定' },
  ];

  const filteredCoupons = coupons.filter(
    (c) => selectedCategory === 'ALL' || c.category === selectedCategory
  );

  const handleStartRedeem = (coupon: CouponItem) => {
    setConfirmingCoupon(coupon);
  };

  const handleExecuteRedeem = () => {
    if (confirmingCoupon) {
      audioService.playSuccess();
      onRedeem(confirmingCoupon);
      setConfirmingCoupon(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DRINK':
        return <Coffee className="w-3.5 h-3.5" />;
      case 'DISCOUNT':
        return <Percent className="w-3.5 h-3.5" />;
      case 'FOOD':
        return <Utensils className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Pills (Touch friendly, horizontal scrollable) */}
      <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isActive
                  ? 'bg-slate-900 text-white shadow-slate-900/10'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Coupon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredCoupons.map((coupon) => {
          const canAfford = userPoints >= coupon.pointsCost;
          const isRedeemed = coupon.isRedeemed;

          return (
            <div
              key={coupon.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${
                isRedeemed
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : canAfford
                  ? 'border-slate-200 hover:border-amber-300'
                  : 'border-slate-200 opacity-80'
              }`}
            >
              {/* Image & Badge Header */}
              <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                <img
                  src={coupon.image}
                  alt={coupon.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-[11px] font-semibold">
                  {getCategoryIcon(coupon.category)}
                  <span>{coupon.category}</span>
                </div>
                <div className="absolute bottom-2.5 right-2.5 px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-black shadow-md">
                  {coupon.pointsCost} pt
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {coupon.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {coupon.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center text-[11px] text-slate-500 space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>有効期間 {coupon.expiresInDays} 日間</span>
                  </div>

                  {isRedeemed ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      獲得済み
                    </span>
                  ) : (
                    <button
                      onClick={() => handleStartRedeem(coupon)}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>{canAfford ? '交換する' : 'ポイント不足'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal to prevent accidental clicks */}
      {confirmingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              クーポンを交換しますか？
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              <strong className="text-slate-800 font-semibold">{confirmingCoupon.title}</strong>
              <br />
              保有ポイントから <b className="text-amber-700">{confirmingCoupon.pointsCost} pt</b> を消費します。
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left mb-5 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>現在の保有ポイント:</span>
                <span className="font-bold">{userPoints} pt</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>消費ポイント:</span>
                <span className="font-bold">-{confirmingCoupon.pointsCost} pt</span>
              </div>
              <div className="flex justify-between text-slate-900 pt-1 border-t border-slate-200 font-bold">
                <span>交換後の残高:</span>
                <span>{userPoints - confirmingCoupon.pointsCost} pt</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmingCoupon(null)}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleExecuteRedeem}
                className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
              >
                交換を確定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
