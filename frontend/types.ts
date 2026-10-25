export type MemberTier = 'REGULAR' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type MiniGameType = 'SLOT' | 'ROULETTE' | 'SCRATCH';

export interface MemberProfile {
  id: string;
  name: string;
  memberCode: string;
  points: number;
  tier: MemberTier;
  consecutiveVisits: number;
  totalVisits: number;
  lastVisitDate: string | null;
  hasCheckedInToday: boolean;
  gamePlayedToday: boolean;
}

export interface PointTransaction {
  id: string;
  timestamp: number;
  date: string;
  memberCode: string;
  title: string;
  type: 'CHECK_IN' | 'BONUS' | 'GAME_WIN' | 'ADMIN_ADJUST';
  amount: number;
  balanceAfter: number;
  note?: string;
}

export type SoundTone = 'MELODIC_CHIME' | 'RETAIL_BELL' | 'MARIMBA' | 'SUBTLE_PING' | 'MUTE';

export type ApiEnvironment = 'LOCAL' | 'PRODUCTION';

export interface ApiConnectionConfig {
  environment: ApiEnvironment;
  localHost: string;
  localPort: number;
  productionIp: string;
  productionPort: number;
  inquiryEndpoint: string;
  correctionEndpoint: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface PrizeRankTierConfig {
  rank: 1 | 2 | 3 | 4 | 5;
  name: string;
  points: number;
  probabilityPercent: number;
  dailyMaxQuota: number;
  awardedTodayCount: number;
}

export interface MissPrizeConfig {
  points: number;
  probabilityPercent: number;
}

export interface LotteryRankSettings {
  maxRanksEnabled: 1 | 2 | 3 | 4 | 5;
  tiers: PrizeRankTierConfig[];
  missPrize: MissPrizeConfig;
  lastQuotaResetDate: string;
}

export interface StoreAdminSettings {
  // Application branding
  appTitle: string;             // 例: "とくとくタッチ"
  appSubtitle: string;          // 例: "TEC MART / MEMBER BENEFITS"
  appIconText: string;          // 例: "TEC" または "P"
  appIconBgColor: string;       // 例: "bg-white", "bg-amber-500"

  storeId: string;
  storeName: string;            // 例: "高田店"
  terminalId: string;
  adminPin: string;

  // Business Hours (営業時間の開始と終了)
  businessHoursStart: string;   // 例: "09:00"
  businessHoursEnd: string;     // 例: "22:00"

  // Display and auto-reset configs
  showMemberName: boolean;       // 会員名の表示/非表示切り替え
  autoResetSeconds: number;     // 完了後TOPへ戻る秒数 (N秒)

  // API Backend connection settings
  apiConfig: ApiConnectionConfig;

  // Grade/Lottery settings (1等〜5等およびハズレ)
  lotterySettings: LotteryRankSettings;

  // Sound and BGM parameters
  soundTone: SoundTone;
  soundVolume: number;
  bgmEnabled: boolean;

  // 確定アナウンス3分割: 固定パートのWAVファイル差し替え設定 (未指定時は日本語AI音声合成)
  congratsAudioUrl: string;     // パート1: 「おめでとうございます！」WAV/MP3 URL
  thanksAudioUrl: string;       // パート3: 「ご来店ありがとうございます。」WAV/MP3 URL
}

// Flow steps: IDLE_WELCOME is the main standby kiosk screen
export type VisitorFlowStep =
  | 'IDLE_WELCOME'    // 待ち受け待機画面 (添付の美麗なデザイン)
  | 'SCAN_WAITING'    // カメラ起動・バーコード読み取り画面
  | 'INQUIRY_LOADING' // 会員照会通信中
  | 'GAME_SELECTION'  // 保有ポイント表示 & ゲーム選択
  | 'AWARD_RESULT';   // 現在pt → 付与pt → 合計pt の結果表示 & N秒カウントダウン

export interface HourlyParticipantStat {
  hour: string; // e.g. "09時", "10時"
  count: number;
}
