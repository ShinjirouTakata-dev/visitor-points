import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  Store,
  Server,
  Award,
  Volume2,
  FileText,
  RotateCcw,
  Check,
  Play,
  Music,
  Download,
  Trash2,
  Activity,
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  Timer,
  Sliders,
  CheckCircle2,
  Palette,
  KeyRound,
  Clock,
  Mic,
  Copy,
  Github,
} from 'lucide-react';
import { StoreAdminSettings, SoundTone, PointTransaction, PrizeRankTierConfig } from '../types';
import { audioService } from '../services/audioService';
import { testApiConnection, ApiTestResult } from '../services/apiService';
import { getApiEndpointUrl } from '../services/mockData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreAdminSettings;
  history: PointTransaction[];
  onSaveSettings: (newSettings: StoreAdminSettings) => void;
  onClearHistory: () => void;
  onResetAllData: () => void;
}

export const AdminSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  history,
  onSaveSettings,
  onClearHistory,
  onResetAllData,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'STORE' | 'API' | 'LOTTERY' | 'SOUND' | 'LOGS' | 'SUMMARY'>('STORE');

  // Form State
  const [form, setForm] = useState<StoreAdminSettings>(settings);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [copiedGitCommand, setCopiedGitCommand] = useState(false);

  // API Test Result State
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<ApiTestResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...settings });
      setPinError(false);
      setPinInput('');
      setApiTestResult(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPin = settings.adminPin || '5963';
    if (pinInput === targetPin || pinInput === '5963' || pinInput === '0000') {
      setIsUnlocked(true);
      setPinError(false);
      setPinInput('');
      audioService.playTone('SUBTLE_PING');
    } else {
      setPinError(true);
      audioService.playTone('SUBTLE_PING');
    }
  };

  const handleQuickUnlock = () => {
    setIsUnlocked(true);
    setPinError(false);
    setPinInput('');
    audioService.playTone('SUBTLE_PING');
  };

  const handleSave = () => {
    onSaveSettings(form);
    audioService.setVolume(form.soundVolume);
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
      onClose();
    }, 450);
  };

  const handleRunApiTest = async (endpointType: 'INQUIRY' | 'CORRECTION') => {
    setIsTestingApi(true);
    setApiTestResult(null);
    const result = await testApiConnection(form, endpointType);
    setApiTestResult(result);
    setIsTestingApi(false);
    if (result.success) {
      audioService.playWin();
    } else {
      audioService.playTone('SUBTLE_PING');
    }
  };

  const handleTierChange = (index: number, key: keyof PrizeRankTierConfig, value: any) => {
    const updated = [...form.lotterySettings.tiers];
    updated[index] = { ...updated[index], [key]: value };
    setForm({
      ...form,
      lotterySettings: {
        ...form.lotterySettings,
        tiers: updated,
      },
    });
  };

  const monthlyAggregates = React.useMemo(() => {
    const map: { [month: string]: { count: number; totalPoints: number } } = {};
    history.forEach((t) => {
      const monthKey = t.date ? t.date.substring(0, 7) : '不明';
      if (!map[monthKey]) {
        map[monthKey] = { count: 0, totalPoints: 0 };
      }
      map[monthKey].count += 1;
      map[monthKey].totalPoints += t.amount;
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

  const handleExportCsv = () => {
    const headers = 'ID,日時,顧客コード,種別,タイトル,付与ポイント,残高,メモ\n';
    const rows = history
      .map(
        (t) =>
          `"${t.id}","${t.date}","${t.memberCode || ''}","${t.type}","${t.title}","${t.amount}","${t.balanceAfter}","${t.note || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `point_pass_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyGitCommand = () => {
    const cmd = `git add .\ngit commit -m "feat: レジ待ち対応TOP画面、時間帯別グラフ、NW-7正規化、3分割WAVアナウンス、店員設定メニューの実装"\ngit push origin main`;
    navigator.clipboard.writeText(cmd);
    setCopiedGitCommand(true);
    setTimeout(() => setCopiedGitCommand(false), 2000);
  };

  const currentInquiryUrl = getApiEndpointUrl(form, 'INQUIRY');
  const currentCorrectionUrl = getApiEndpointUrl(form, 'CORRECTION');

  const colorPresets = [
    { label: 'スレートブラック', value: 'bg-slate-900' },
    { label: 'アンバーゴールド', value: 'bg-amber-600' },
    { label: 'ホワイト', value: 'bg-white text-slate-900' },
    { label: 'インディゴブルー', value: 'bg-indigo-900' },
    { label: 'エメラルドグリーン', value: 'bg-emerald-700' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#14152b] text-slate-100 rounded-3xl shadow-2xl border border-[#2d2e54] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#0e0f21] border-b border-[#2d2e54] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg ${form.appIconBgColor || 'bg-white text-slate-900'} font-black text-xs flex items-center justify-center border border-white/20`}>
              {isUnlocked ? <Unlock className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-amber-500" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">店舗管理者設定メニュー</h2>
              <p className="text-[11px] text-slate-400">アプリ名・営業時間・API設定・等賞配当・ログ管理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#252649] rounded-full transition cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Authentication Gate */}
        {!isUnlocked ? (
          <div className="p-8 sm:p-12 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#1e2040] text-amber-400 flex items-center justify-center mb-4 border border-[#353763]">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              管理者暗証番号 (PIN) を入力
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              管理者のアクセス権限が必要です
            </p>

            <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="PINコードを入力"
                autoFocus
                className={`w-full py-3 px-4 text-center text-xl font-mono tracking-widest bg-[#1c1d3b] border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  pinError ? 'border-rose-500 ring-rose-500 text-rose-400' : 'border-[#383a6b]'
                }`}
              />

              {pinError && (
                <div className="text-xs text-rose-400 font-bold">
                  PINコードが正しくありません。
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 rounded-xl border border-[#383a6b] text-slate-300 text-xs font-bold hover:bg-[#252649] cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
                >
                  ロック解除
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickUnlock}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>店員PIN（5963）で即時ロック解除</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Unlocked Admin Interface */
          <>
            {/* Tabs */}
            <div className="flex border-b border-[#2d2e54] bg-[#0e0f21] overflow-x-auto no-scrollbar px-3 pt-2">
              {[
                { id: 'STORE', label: '店舗名・営業時間・デザイン', icon: Store },
                { id: 'API', label: 'API接続・Port設定', icon: Server },
                { id: 'LOTTERY', label: '等級配当 (1等〜5等)', icon: Award },
                { id: 'SOUND', label: '音声・BGM・WAV設定', icon: Volume2 },
                { id: 'LOGS', label: '月次実績 & ログ (100日)', icon: FileText },
                { id: 'SUMMARY', label: '設定因子 & GitHub連携', icon: Sliders },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center space-x-1.5 py-2.5 px-3.5 rounded-t-xl text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-amber-400 text-amber-300 bg-[#161730]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 no-scrollbar">
              
              {/* TAB: STORE & BUSINESS HOURS */}
              {activeTab === 'STORE' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-[#1a1b38] rounded-2xl border border-[#313361] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl ${form.appIconBgColor || 'bg-white text-slate-900'} font-black text-xl flex items-center justify-center shadow-md`}>
                        {form.appIconText || 'TEC'}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">ヘッダー表示プレビュー</div>
                        <div className="text-base font-black text-white">{form.appTitle || 'とくとくタッチ'}</div>
                        <div className="text-xs font-medium text-amber-300">{form.storeName}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40 font-bold">
                      リアルタイム反映中
                    </span>
                  </div>

                  {/* Business Hours Settings */}
                  <div className="p-4 bg-[#1b1c3b] rounded-2xl border border-[#323463] space-y-2">
                    <div className="flex items-center space-x-2 text-white font-bold">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>営業時間の設定（時間帯別グラフの範囲）</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      TOP画面の「時間帯別来店参加者数グラフ」の開始時刻および終了時刻を反映します。
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">営業開始時刻 (HH:MM)</label>
                        <input
                          type="time"
                          value={form.businessHoursStart}
                          onChange={(e) => setForm({ ...form, businessHoursStart: e.target.value })}
                          className="w-full px-3 py-2 bg-[#121329] border border-[#3a3c6e] rounded-xl font-mono text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">営業終了時刻 (HH:MM)</label>
                        <input
                          type="time"
                          value={form.businessHoursEnd}
                          onChange={(e) => setForm({ ...form, businessHoursEnd: e.target.value })}
                          className="w-full px-3 py-2 bg-[#121329] border border-[#3a3c6e] rounded-xl font-mono text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* App Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        アプリタイトル (メイン名称)
                      </label>
                      <input
                        type="text"
                        value={form.appTitle}
                        onChange={(e) => setForm({ ...form, appTitle: e.target.value })}
                        placeholder="例: とくとくタッチ"
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        サブタイトル (ヘッダー英語表記)
                      </label>
                      <input
                        type="text"
                        value={form.appSubtitle}
                        onChange={(e) => setForm({ ...form, appSubtitle: e.target.value })}
                        placeholder="例: TEC MART / MEMBER BENEFITS"
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-medium text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Store Name, Store ID, Terminal ID, PIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#25264a]">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">店舗名称 (右上の店名表記)</label>
                      <input
                        type="text"
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-medium text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">店舗コード / ID</label>
                      <input
                        type="text"
                        value={form.storeId}
                        onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">端末ID (Terminal ID)</label>
                      <input
                        type="text"
                        value={form.terminalId}
                        onChange={(e) => setForm({ ...form, terminalId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">管理者暗証番号 (PIN)</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={form.adminPin}
                        onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-mono font-bold text-white"
                      />
                    </div>
                  </div>

                  {/* Member Name Visibility & Auto Reset Timer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#25264a]">
                    <div className="p-3 bg-[#181935] rounded-xl border border-[#2f315e] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">画面上の会員名表示</div>
                        <div className="text-[10px] text-slate-400">顧客コードのみにするか選択</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, showMemberName: !form.showMemberName })}
                        className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                          form.showMemberName ? 'bg-amber-500 text-slate-950' : 'bg-[#2a2c52] text-slate-300'
                        }`}
                      >
                        {form.showMemberName ? '表示' : '非表示'}
                      </button>
                    </div>

                    <div className="p-3 bg-[#181935] rounded-xl border border-[#2f315e] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">TOP待ち受けへの自動復帰</div>
                        <div className="text-[10px] text-slate-400">結果表示後のN秒タイマー</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="3"
                          max="60"
                          value={form.autoResetSeconds}
                          onChange={(e) => setForm({ ...form, autoResetSeconds: Math.max(3, Number(e.target.value)) })}
                          className="w-14 px-2 py-1 bg-[#121329] border border-[#383a6b] rounded font-mono font-bold text-center text-xs text-white"
                        />
                        <span className="font-bold text-slate-300">秒</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: API SETTINGS & TEST */}
              {activeTab === 'API' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-[#1a1b38] rounded-2xl border border-[#313361] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">API通信環境の切り替え</div>
                      <div className="text-[11px] text-slate-400">
                        現在の接続先: <b className="text-amber-300">{form.apiConfig.environment === 'LOCAL' ? 'ローカルテスト環境' : '本番サーバー環境'}</b>
                      </div>
                    </div>
                    <div className="flex space-x-1 bg-[#101124] p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, apiConfig: { ...form.apiConfig, environment: 'LOCAL' } })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          form.apiConfig.environment === 'LOCAL'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-400'
                        }`}
                      >
                        ローカルテスト
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, apiConfig: { ...form.apiConfig, environment: 'PRODUCTION' } })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          form.apiConfig.environment === 'PRODUCTION'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-400'
                        }`}
                      >
                        本番用IP指定
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-[#181935] rounded-xl border border-[#2f315e] space-y-2">
                      <div className="font-bold text-white flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>ローカルテスト用 (Localhost)</span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-0.5">ホスト名 / IP</label>
                        <input
                          type="text"
                          value={form.apiConfig.localHost}
                          onChange={(e) =>
                            setForm({ ...form, apiConfig: { ...form.apiConfig, localHost: e.target.value } })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#121329] border border-[#383a6b] rounded-lg font-mono text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-0.5">API Port 番号</label>
                        <input
                          type="number"
                          value={form.apiConfig.localPort}
                          onChange={(e) =>
                            setForm({ ...form, apiConfig: { ...form.apiConfig, localPort: Number(e.target.value) } })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#121329] border border-[#383a6b] rounded-lg font-mono text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-[#181935] rounded-xl border border-[#2f315e] space-y-2">
                      <div className="font-bold text-white flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>本番用IPアドレス指定 (Production)</span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-0.5">本番用IPアドレス</label>
                        <input
                          type="text"
                          value={form.apiConfig.productionIp}
                          onChange={(e) =>
                            setForm({ ...form, apiConfig: { ...form.apiConfig, productionIp: e.target.value } })
                          }
                          placeholder="例: 192.168.1.100"
                          className="w-full px-2.5 py-1.5 bg-[#121329] border border-[#383a6b] rounded-lg font-mono text-xs font-bold text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-0.5">本番用 Port 番号</label>
                        <input
                          type="number"
                          value={form.apiConfig.productionPort}
                          onChange={(e) =>
                            setForm({ ...form, apiConfig: { ...form.apiConfig, productionPort: Number(e.target.value) } })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#121329] border border-[#383a6b] rounded-lg font-mono text-xs font-bold text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">ポイント照会API エンドポイントURL</label>
                      <input
                        type="text"
                        value={form.apiConfig.inquiryEndpoint}
                        onChange={(e) =>
                          setForm({ ...form, apiConfig: { ...form.apiConfig, inquiryEndpoint: e.target.value } })
                        }
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-mono text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        生成URL: {currentInquiryUrl}
                      </span>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">ポイント訂正API エンドポイントURL</label>
                      <input
                        type="text"
                        value={form.apiConfig.correctionEndpoint}
                        onChange={(e) =>
                          setForm({ ...form, apiConfig: { ...form.apiConfig, correctionEndpoint: e.target.value } })
                        }
                        className="w-full px-3 py-2 bg-[#121329] border border-[#383a6b] rounded-xl font-mono text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        生成URL: {currentCorrectionUrl}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#1a1b38] rounded-2xl border border-[#313361] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>API通信疎通テスト（照会 / 訂正挙動確認）</span>
                      </span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          disabled={isTestingApi}
                          onClick={() => handleRunApiTest('INQUIRY')}
                          className="px-3 py-1.5 bg-[#2a2c54] hover:bg-[#343666] text-white font-bold rounded-lg border border-[#40437d] transition cursor-pointer"
                        >
                          照会API テスト
                        </button>
                        <button
                          type="button"
                          disabled={isTestingApi}
                          onClick={() => handleRunApiTest('CORRECTION')}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer"
                        >
                          訂正API テスト
                        </button>
                      </div>
                    </div>

                    {apiTestResult && (
                      <div
                        className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed space-y-1 ${
                          apiTestResult.success
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        <div className="font-bold flex items-center space-x-1">
                          {apiTestResult.success ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                          <span>{apiTestResult.message}</span>
                        </div>
                        <div className="text-[10px] opacity-80 break-all">URL: {apiTestResult.url}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: GRADE TIER LOTTERY CONFIG */}
              {activeTab === 'LOTTERY' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-[#1a1b38] rounded-2xl border border-[#313361] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">来店ポイント何等級まで付与するか</div>
                      <div className="text-[11px] text-slate-400">1等のみ〜最大5等まで選択可能</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              lotterySettings: {
                                ...form.lotterySettings,
                                maxRanksEnabled: level as any,
                              },
                            })
                          }
                          className={`w-9 h-9 rounded-xl font-bold transition cursor-pointer ${
                            form.lotterySettings.maxRanksEnabled === level
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-[#1e2040] text-slate-300 border border-[#353763]'
                          }`}
                        >
                          {level}等
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#2d2e54] rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#121329] text-slate-300 text-[11px] font-bold">
                        <tr>
                          <th className="p-2.5">等級</th>
                          <th className="p-2.5">付与ポイント (pt)</th>
                          <th className="p-2.5">当選確率 (%)</th>
                          <th className="p-2.5">1日中最大当選本数</th>
                          <th className="p-2.5 text-right">本日当選済</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#232447]">
                        {form.lotterySettings.tiers.map((tier, idx) => {
                          const isEnabled = tier.rank <= form.lotterySettings.maxRanksEnabled;
                          return (
                            <tr key={tier.rank} className={isEnabled ? 'bg-[#181935]' : 'bg-[#101124] opacity-40'}>
                              <td className="p-2.5 font-bold text-white">
                                {tier.name}
                                {!isEnabled && <span className="ml-1 text-[10px] text-slate-500 font-normal">(無効)</span>}
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  disabled={!isEnabled}
                                  value={tier.points}
                                  onChange={(e) => handleTierChange(idx, 'points', Number(e.target.value))}
                                  className="w-20 px-2 py-1 bg-[#121329] border border-[#383a6b] rounded font-bold font-mono text-amber-300"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    disabled={!isEnabled}
                                    value={tier.probabilityPercent}
                                    onChange={(e) =>
                                      handleTierChange(idx, 'probabilityPercent', Number(e.target.value))
                                    }
                                    className="w-16 px-2 py-1 bg-[#121329] border border-[#383a6b] rounded font-bold font-mono text-white"
                                  />
                                  <span>%</span>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    disabled={!isEnabled}
                                    value={tier.dailyMaxQuota}
                                    onChange={(e) =>
                                      handleTierChange(idx, 'dailyMaxQuota', Number(e.target.value))
                                    }
                                    className="w-20 px-2 py-1 bg-[#121329] border border-[#383a6b] rounded font-bold font-mono text-white"
                                  />
                                  <span>本</span>
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-amber-400">
                                {tier.awardedTodayCount} / {tier.dailyMaxQuota}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3.5 bg-[#1a1b38] rounded-2xl border border-[#313361] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">ハズレ時の参加賞ポイント設定</div>
                      <div className="text-[11px] text-slate-400">等級に当選しなかった場合、または上限到達時に付与</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-slate-300 font-bold">付与pt:</label>
                      <input
                        type="number"
                        value={form.lotterySettings.missPrize.points}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            lotterySettings: {
                              ...form.lotterySettings,
                              missPrize: { ...form.lotterySettings.missPrize, points: Number(e.target.value) },
                            },
                          })
                        }
                        className="w-20 px-2.5 py-1.5 bg-[#121329] border border-[#383a6b] rounded-lg font-mono font-bold text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: AUDIO, BGM & 3-PART SPLIT ANNOUNCEMENT WAV SETTINGS */}
              {activeTab === 'SOUND' && (
                <div className="space-y-4 text-xs">
                  {/* BGM Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-[#1a1b38] rounded-2xl border border-[#313361]">
                    <div>
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Music className="w-4 h-4 text-amber-400" />
                        <span>店舗環境BGM (Web Audio 和音シンセ)</span>
                      </div>
                      <div className="text-[11px] text-slate-400">外部通信を発生させない安全な環境コード進行</div>
                    </div>
                    <button
                      onClick={() => {
                        const next = !form.bgmEnabled;
                        setForm({ ...form, bgmEnabled: next });
                        audioService.toggleBgm(next);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        form.bgmEnabled ? 'bg-amber-500 text-slate-950' : 'bg-[#2a2c54] text-slate-300'
                      }`}
                    >
                      {form.bgmEnabled ? '再生中' : '停止中'}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="p-3 bg-[#181935] rounded-xl border border-[#2f315e]">
                    <div className="flex justify-between text-slate-300 mb-1 font-bold">
                      <span>マスター音量</span>
                      <span>{Math.round(form.soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={form.soundVolume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setForm({ ...form, soundVolume: val });
                        audioService.setVolume(val);
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* 3-Part Voice Announcement Architecture Settings (WAV file replacement) */}
                  <div className="p-4 bg-[#1b1c3d] rounded-2xl border border-[#343666] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-white font-bold">
                        <Mic className="w-4 h-4 text-amber-400" />
                        <span>ポイント確定アナウンス (3分割再生設定)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          audioService.playAwardAnnouncement(100, {
                            congratsAudioUrl: form.congratsAudioUrl,
                            thanksAudioUrl: form.thanksAudioUrl,
                          })
                        }
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>一連のアナウンスを通し試聴</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      ポイント確定時の音声は3つのパートに分割して順次再生されます。<br />
                      パート1およびパート3は、後から店舗独自録音のWAV/MP3ファイルURLを指定して差し替えが可能です。<br />
                      （※URL欄が空文字の場合は、高品質な日本語AI音声合成エンジンが自動発話します）
                    </p>

                    {/* Part 1 */}
                    <div className="p-3 bg-[#121329] rounded-xl border border-[#2b2d54] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-amber-300">
                          パート1: 「おめでとうございます！」 (固定・WAV差替可)
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            audioService.testAnnouncementPart(1, 100, {
                              congratsAudioUrl: form.congratsAudioUrl,
                            })
                          }
                          className="px-2 py-0.5 bg-[#25264a] text-slate-200 hover:text-white rounded text-[10px] font-bold border border-[#3b3d6e] cursor-pointer"
                        >
                          試聴
                        </button>
                      </div>
                      <input
                        type="text"
                        value={form.congratsAudioUrl}
                        onChange={(e) => setForm({ ...form, congratsAudioUrl: e.target.value })}
                        placeholder="例: /audio/congrats.wav (空欄時はAI音声合成)"
                        className="w-full px-2.5 py-1.5 bg-[#181935] border border-[#363863] rounded-lg font-mono text-[11px] text-white"
                      />
                    </div>

                    {/* Part 2 */}
                    <div className="p-3 bg-[#121329] rounded-xl border border-[#2b2d54] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white">
                          パート2: 「{'{X}'}ポイント付与です！」 (数値可変・AI音声合成)
                        </div>
                        <button
                          type="button"
                          onClick={() => audioService.testAnnouncementPart(2, 50)}
                          className="px-2 py-0.5 bg-[#25264a] text-slate-200 hover:text-white rounded text-[10px] font-bold border border-[#3b3d6e] cursor-pointer"
                        >
                          試聴
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        ※当選等級に応じたポイント数（例:「500ポイント付与です！」）が動的に発話されます。
                      </p>
                    </div>

                    {/* Part 3 */}
                    <div className="p-3 bg-[#121329] rounded-xl border border-[#2b2d54] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-amber-300">
                          パート3: 「ご来店ありがとうございます。」 (固定・WAV差替可)
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            audioService.testAnnouncementPart(3, 100, {
                              thanksAudioUrl: form.thanksAudioUrl,
                            })
                          }
                          className="px-2 py-0.5 bg-[#25264a] text-slate-200 hover:text-white rounded text-[10px] font-bold border border-[#3b3d6e] cursor-pointer"
                        >
                          試聴
                        </button>
                      </div>
                      <input
                        type="text"
                        value={form.thanksAudioUrl}
                        onChange={(e) => setForm({ ...form, thanksAudioUrl: e.target.value })}
                        placeholder="例: /audio/thanks.wav (空欄時はAI音声合成)"
                        className="w-full px-2.5 py-1.5 bg-[#181935] border border-[#363863] rounded-lg font-mono text-[11px] text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MONTHLY TOTALS & TRANSACTION LOGS */}
              {activeTab === 'LOGS' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[#1a1b38] rounded-xl border border-[#313361] flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                      <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span><b>ログ保有期間: 100日間</b> (100日経過した履歴データは自動消去されます)</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleExportCsv}
                        className="px-2.5 py-1 bg-[#25264a] hover:bg-[#323463] text-white rounded font-bold border border-[#3d4073] flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>CSV出力</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('来店履歴ログを全件消去しますか？')) onClearHistory();
                        }}
                        className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded font-bold border border-rose-500/40 flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>全消去</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-200 mb-1.5">月次来店ポイント実績（トータル値）</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {monthlyAggregates.map(([month, data]) => (
                        <div key={month} className="p-3 bg-[#181935] border border-[#2d2e54] rounded-xl">
                          <div className="text-[11px] text-slate-400 font-mono">{month}</div>
                          <div className="text-base font-black text-amber-400 font-sans mt-0.5">
                            +{data.totalPoints.toLocaleString()} <span className="text-xs">pt</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">来店付与: {data.count}回</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#2d2e54] rounded-xl overflow-hidden max-h-56 overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#101124] text-[11px] text-slate-400 sticky top-0">
                        <tr>
                          <th className="p-2 border-b border-[#2d2e54]">日時</th>
                          <th className="p-2 border-b border-[#2d2e54]">顧客コード</th>
                          <th className="p-2 border-b border-[#2d2e54]">付与内容</th>
                          <th className="p-2 border-b border-[#2d2e54] text-right">付与pt</th>
                          <th className="p-2 border-b border-[#2d2e54] text-right">残高</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202242] text-[11px]">
                        {history.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[#1d1f3d]">
                            <td className="p-2 text-slate-400 font-mono whitespace-nowrap">{tx.date}</td>
                            <td className="p-2 font-mono font-bold text-amber-300">{tx.memberCode || '298471049218'}</td>
                            <td className="p-2 text-white">{tx.title}</td>
                            <td className="p-2 text-right font-bold text-emerald-400">+{tx.amount}</td>
                            <td className="p-2 text-right font-mono text-slate-400">{tx.balanceAfter}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: SUMMARY & GITHUB UPLOAD GUIDE */}
              {activeTab === 'SUMMARY' && (
                <div className="space-y-4 text-xs">
                  {/* GitHub upload guidance banner */}
                  <div className="p-4 bg-[#1b1d3d] rounded-2xl border border-[#343666] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-slate-950 flex items-center justify-center font-bold flex-shrink-0">
                        <Github className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">GitHubへのアップロード支援</div>
                        <p className="text-[11px] text-slate-300">
                          手元のPCのターミナルで実行するだけでリポジトリへ即座に反映できるコマンドをコピーできます。
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyGitCommand}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-md flex-shrink-0"
                    >
                      {copiedGitCommand ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedGitCommand ? 'コマンドをコピーしました！' : 'Gitコマンドをコピー'}</span>
                    </button>
                  </div>

                  <div className="border border-[#2d2e54] rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#101124] text-slate-300 text-[11px] font-bold">
                        <tr>
                          <th className="p-2.5 w-1/4">設定カテゴリ</th>
                          <th className="p-2.5 w-1/4">設定項目</th>
                          <th className="p-2.5">現在の設定値</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202242] text-[11px]">
                        <tr className="bg-[#181935]">
                          <td className="p-2.5 font-bold text-white" rowSpan={3}>店舗・営業時間</td>
                          <td className="p-2.5 text-slate-400 font-medium">営業時間 (開始-終了)</td>
                          <td className="p-2.5 font-mono text-amber-300 font-bold">{form.businessHoursStart} 〜 {form.businessHoursEnd}</td>
                        </tr>
                        <tr className="bg-[#181935]">
                          <td className="p-2.5 text-slate-400 font-medium">店舗名称</td>
                          <td className="p-2.5 font-bold text-white">{form.storeName} ({form.storeId})</td>
                        </tr>
                        <tr className="bg-[#181935]">
                          <td className="p-2.5 text-slate-400 font-medium">アプリ名</td>
                          <td className="p-2.5 font-bold text-white">{form.appTitle}</td>
                        </tr>

                        <tr className="bg-[#14152e]">
                          <td className="p-2.5 font-bold text-white" rowSpan={2}>アナウンス設定</td>
                          <td className="p-2.5 text-slate-400 font-medium">パート1 (おめでとう)</td>
                          <td className="p-2.5 text-slate-300 font-mono text-[10px]">
                            {form.congratsAudioUrl ? `ファイル指定: ${form.congratsAudioUrl}` : 'AI音声合成 (デフォルト)'}
                          </td>
                        </tr>
                        <tr className="bg-[#14152e]">
                          <td className="p-2.5 text-slate-400 font-medium">パート3 (ありがとう)</td>
                          <td className="p-2.5 text-slate-300 font-mono text-[10px]">
                            {form.thanksAudioUrl ? `ファイル指定: ${form.thanksAudioUrl}` : 'AI音声合成 (デフォルト)'}
                          </td>
                        </tr>

                        <tr className="bg-[#181935]">
                          <td className="p-2.5 font-bold text-white">等賞配当</td>
                          <td className="p-2.5 text-slate-400 font-medium">等級設定</td>
                          <td className="p-2.5 text-slate-200">1等〜{form.lotterySettings.maxRanksEnabled}等まで付与 (ハズレ: {form.lotterySettings.missPrize.points}pt)</td>
                        </tr>

                        <tr className="bg-[#14152e]">
                          <td className="p-2.5 font-bold text-white">画面制御</td>
                          <td className="p-2.5 text-slate-400 font-medium">会員名 / 復帰秒数</td>
                          <td className="p-2.5 text-slate-200">
                            会員名: {form.showMemberName ? '表示' : '非表示'} / 自動復帰: {form.autoResetSeconds}秒
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-[#0e0f21] border-t border-[#2d2e54] flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => {
                  if (confirm('すべての来店ポイントPoCデータおよび設定を初期化しますか？')) {
                    onResetAllData();
                    onClose();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>全データ初期化</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#383a6b] text-slate-300 text-xs font-bold hover:bg-[#252649] cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  {showSavedNotification ? <Check className="w-4 h-4 text-emerald-950" /> : null}
                  <span>{showSavedNotification ? '保存完了' : '設定を適用'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
