import React, { useState } from 'react';
import { Store, QrCode, Sparkles, CheckCircle2, Phone, ArrowLeft, Volume2, Music } from 'lucide-react';
import { audioService } from '../services/audioService';
import { SoundTone } from '../types';

interface Props {
  onCustomerCheckIn: (codeOrPhone: string) => void;
  onExitKiosk: () => void;
  soundTone: SoundTone;
}

export const StoreKioskView: React.FC<Props> = ({
  onCustomerCheckIn,
  onExitKiosk,
  soundTone,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [mode, setMode] = useState<'WELCOME' | 'KEYPAD' | 'SUCCESS'>('WELCOME');
  const [lastGranted, setLastGranted] = useState<number>(15);

  const handleTouchCheckIn = () => {
    audioService.playTone(soundTone);
    setLastGranted(15);
    setMode('SUCCESS');
    onCustomerCheckIn('KIOSK_TOUCH');

    setTimeout(() => {
      setMode('WELCOME');
      setPhoneNumber('');
    }, 2800);
  };

  const handleKeypadPress = (num: string) => {
    if (phoneNumber.length < 11) {
      audioService.playTone('SUBTLE_PING');
      setPhoneNumber((prev) => prev + num);
    }
  };

  const handleKeypadDelete = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handlePhoneSubmit = () => {
    if (phoneNumber.length >= 8) {
      audioService.playTone(soundTone);
      setLastGranted(20);
      setMode('SUCCESS');
      onCustomerCheckIn(phoneNumber);

      setTimeout(() => {
        setMode('WELCOME');
        setPhoneNumber('');
      }, 2800);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-8 select-none">
      
      {/* Kiosk Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-900 text-xl shadow-lg">
            P
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-300 font-bold">
              店頭タッチ端末 • Kiosk Mode
            </div>
            <div className="text-lg font-bold text-white flex items-center space-x-1.5">
              <Store className="w-4 h-4 text-slate-400" />
              <span>CAFE & STORE 晴れ間 渋谷本店 入口レジ横</span>
            </div>
          </div>
        </div>

        <button
          onClick={onExitKiosk}
          className="flex items-center space-x-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-xs font-semibold text-slate-200 transition border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>会員画面に戻る</span>
        </button>
      </div>

      {/* Main Interactive Screen */}
      <div className="flex-1 flex items-center justify-center py-6">
        {mode === 'WELCOME' && (
          <div className="max-w-xl w-full text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              <Sparkles className="w-4 h-4" />
              <span>本日ご来店で +15ポイント即時プレゼント！</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              いらっしゃいませ！<br />
              画面をタッチして来店ポイントを獲得
            </h1>

            <p className="text-sm text-slate-300 max-w-md mx-auto">
              スマートフォンのアプリQRコードをかざすか、下記のボタンを1タップするだけで完了します。
            </p>

            {/* Huge Touch Targets designed for Android tablets and Windows touchscreen kiosks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
              <button
                onClick={handleTouchCheckIn}
                className="group relative p-6 bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-900 rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex flex-col items-center justify-center space-y-2 border-2 border-amber-300"
              >
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                  <Sparkles className="w-7 h-7 text-amber-600 fill-amber-500 animate-bounce" />
                </div>
                <div className="text-lg font-black tracking-wide">
                  ワンタッチ来店
                </div>
                <div className="text-xs font-bold text-amber-950/80">
                  会員証をお持ちの方はこちら
                </div>
              </button>

              <button
                onClick={() => setMode('KEYPAD')}
                className="group p-6 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-2xl backdrop-blur-md transition-all flex flex-col items-center justify-center space-y-2 border border-white/20"
              >
                <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                  <Phone className="w-7 h-7 text-slate-200" />
                </div>
                <div className="text-lg font-black tracking-wide">
                  電話番号で付与
                </div>
                <div className="text-xs text-slate-300">
                  スマホをお持ちでない方
                </div>
              </button>
            </div>

            {/* Optical scanner guidance */}
            <div className="pt-4 flex items-center justify-center space-x-2 text-xs text-slate-400">
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>端末下部のバーコードリーダーにスマホをかざしても認証できます</span>
            </div>
          </div>
        )}

        {mode === 'KEYPAD' && (
          <div className="max-w-sm w-full bg-slate-800/80 backdrop-blur-md border border-white/15 p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-white">電話番号を入力</h2>
            <p className="text-xs text-slate-400">ご登録の電話番号を入力して完了を押してください</p>

            {/* Display screen */}
            <div className="bg-slate-900 p-4 rounded-xl border border-white/10 text-2xl font-mono tracking-widest text-amber-300 min-h-[60px] flex items-center justify-center">
              {phoneNumber || '--- ---- ----'}
            </div>

            {/* 10-key NumPad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
                const isClear = key === 'C';
                const isDel = key === '⌫';
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isClear) setPhoneNumber('');
                      else if (isDel) handleKeypadDelete();
                      else handleKeypadPress(key);
                    }}
                    className={`py-4 rounded-xl font-bold text-lg transition active:scale-90 ${
                      isClear || isDel
                        ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setMode('WELCOME')}
                className="py-3 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold"
              >
                もどる
              </button>
              <button
                onClick={handlePhoneSubmit}
                disabled={phoneNumber.length < 8}
                className={`py-3 rounded-xl text-xs font-bold transition ${
                  phoneNumber.length >= 8
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 font-black'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                ポイントを受け取る
              </button>
            </div>
          </div>
        )}

        {mode === 'SUCCESS' && (
          <div className="max-w-md w-full bg-slate-800/90 border border-amber-400/40 p-8 rounded-3xl shadow-2xl text-center space-y-4 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <h2 className="text-2xl font-black text-white">
              ポイントが付与されました！
            </h2>
            <div className="text-4xl font-extrabold text-amber-300 font-sans tracking-tight">
              +{lastGranted} pt
            </div>
            <p className="text-xs text-slate-300">
              ごゆっくり店内をお楽しみください。画面は自動的に戻ります。
            </p>
          </div>
        )}
      </div>

      {/* Kiosk Footer audio test indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>チャイム音声: 作動中 (Web Audio API 合成)</span>
        </div>
        <div className="text-[11px] text-slate-500">
          PointPass Kiosk System v2.4 (ShinjirouTakata-dev)
        </div>
      </div>
    </div>
  );
};
