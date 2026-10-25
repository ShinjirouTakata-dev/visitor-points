import React from 'react';
import { X, Smartphone, SunMedium, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memberCode: string;
  memberName: string;
}

export const BarcodeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  memberCode,
  memberName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Top Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-amber-700 bg-amber-50 py-1 px-3 rounded-full w-fit mx-auto mb-4 border border-amber-200">
          <SunMedium className="w-3.5 h-3.5" />
          <span>画面の明るさを最大にしてレジにご提示ください</span>
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          会員証バーコード
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-6">
          {memberName} 様（有効期限: 無期限）
        </p>

        {/* High contrast barcode for POS scanner */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-inner flex flex-col items-center">
          <div className="h-24 w-full flex items-center justify-center space-x-1 overflow-hidden px-2">
            {[4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 3, 1, 2, 3, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 2, 4, 2, 1, 3].map(
              (thickness, idx) => (
                <span
                  key={idx}
                  className="h-full bg-black rounded-xs inline-block"
                  style={{ width: `${thickness * 2.8}px` }}
                />
              )
            )}
          </div>
          <div className="mt-3 font-mono text-base font-bold text-black tracking-widest">
            {memberCode}
          </div>
        </div>

        {/* QR Alternative for Optical Readers */}
        <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-left text-xs text-slate-600">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <QrCode className="w-6 h-6 text-slate-800" />
            </div>
            <div>
              <div className="font-bold text-slate-800">QRコード決済・読み取り併用</div>
              <div className="text-[11px] text-slate-500">店舗セルフレジのカメラにも直接かざせます</div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 active:scale-[0.99] transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
