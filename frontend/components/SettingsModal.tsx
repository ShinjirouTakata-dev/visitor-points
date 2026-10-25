import React, { useState } from 'react';
import { X, Volume2, VolumeX, RotateCcw, Monitor, Smartphone, Play, Music, Store, KeyRound, Check } from 'lucide-react';
import { audioService } from '../services/audioService';
import { AppSettings, SoundTone } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetData,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeId, setStoreId] = useState(settings.storeId);
  const [volume, setVolume] = useState(settings.soundVolume);
  const [soundTone, setSoundTone] = useState<SoundTone>(settings.soundTone);
  const [bgmEnabled, setBgmEnabled] = useState(settings.bgmEnabled);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const toneOptions: { id: SoundTone; label: string; desc: string }[] = [
    { id: 'MELODIC_CHIME', label: 'リテールウェルカム（推奨）', desc: '和音の広がりが心地よい日本の店舗チャイム' },
    { id: 'RETAIL_BELL', label: 'カウンターベル', desc: '澄み渡るフロントデスクのベル音' },
    { id: 'MARIMBA', label: 'ナチュラルマリンバ', desc: 'カフェにぴったりの木製マリンバ' },
    { id: 'SUBTLE_PING', label: 'ミニマルピン', desc: '控えめな単音通知音' },
    { id: 'MUTE', label: '消音 (ミュート)', desc: '音を鳴らさない' },
  ];

  const handlePreviewTone = (tone: SoundTone) => {
    setSoundTone(tone);
    if (tone !== 'MUTE') {
      audioService.playTone(tone);
    }
  };

  const handleBgmToggle = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    audioService.toggleBgm(next);
  };

  const handleSave = () => {
    const updated: AppSettings = {
      ...settings,
      storeName,
      storeId,
      soundVolume: volume,
      soundTone,
      bgmEnabled,
    };
    audioService.setVolume(volume);
    onUpdateSettings(updated);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">システム & 店舗設定</h3>
            <p className="text-xs text-slate-500">店舗ID・BGM・効果音・端末の最適化</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Store Configuration */}
        <div className="py-4 space-y-3">
          <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
            <Store className="w-4 h-4 text-amber-600" />
            <span>店舗情報設定</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">店舗名称</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">店舗端末ID</label>
              <input
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Audio & BGM */}
        <div className="py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Music className="w-4 h-4 text-amber-600" />
              <span>店内環境BGM（穏やかなWeb Audioシンセ）</span>
            </div>
            <button
              onClick={handleBgmToggle}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                bgmEnabled
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{bgmEnabled ? 'BGM再生中' : 'BGM停止中'}</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-700 mt-3">来店チャイム・効果音</div>
          <div className="space-y-1.5">
            {toneOptions.map((opt) => {
              const isSelected = soundTone === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handlePreviewTone(opt.id)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewTone(opt.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-200 text-slate-700 transition"
                    title="試聴"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Volume Control */}
          <div className="pt-2">
            <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
              <span className="flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                <span>音量レベル</span>
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                audioService.setVolume(val);
              }}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Section 3: Reset Demo Data */}
        <div className="py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('来店データ、ゲーム獲得履歴、設定をすべて初期状態にリセットしますか？')) {
                onResetData();
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 px-2 py-1 rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>PoCデータの初期化</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              閉じる
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center space-x-1 shadow-md"
            >
              {isSavedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
              <span>{isSavedNotice ? '保存完了' : '設定を保存'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
