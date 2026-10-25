import {
  MemberProfile,
  PointTransaction,
  StoreAdminSettings,
  LotteryRankSettings,
  HourlyParticipantStat,
} from '../types';

const STORAGE_KEYS = {
  MEMBER: 'vp_member_state_v9',
  HISTORY: 'vp_history_state_v9',
  SETTINGS: 'vp_settings_state_v9',
};

const TODAY_STR = new Date().toISOString().split('T')[0];
const RETENTION_MS = 100 * 24 * 60 * 60 * 1000; // 100 Days Retention

export const DEFAULT_LOTTERY_SETTINGS: LotteryRankSettings = {
  maxRanksEnabled: 3,
  lastQuotaResetDate: TODAY_STR,
  missPrize: {
    points: 1,
    probabilityPercent: 30,
  },
  tiers: [
    {
      rank: 1,
      name: '1等（特賞）',
      points: 500,
      probabilityPercent: 5,
      dailyMaxQuota: 5,
      awardedTodayCount: 1,
    },
    {
      rank: 2,
      name: '2等',
      points: 100,
      probabilityPercent: 15,
      dailyMaxQuota: 20,
      awardedTodayCount: 4,
    },
    {
      rank: 3,
      name: '3等',
      points: 30,
      probabilityPercent: 35,
      dailyMaxQuota: 50,
      awardedTodayCount: 12,
    },
    {
      rank: 4,
      name: '4等',
      points: 10,
      probabilityPercent: 15,
      dailyMaxQuota: 100,
      awardedTodayCount: 0,
    },
    {
      rank: 5,
      name: '5等',
      points: 5,
      probabilityPercent: 5,
      dailyMaxQuota: 200,
      awardedTodayCount: 0,
    },
  ],
};

export const DEFAULT_SETTINGS: StoreAdminSettings = {
  appTitle: 'とくとくタッチ',
  appSubtitle: 'TEC MART / MEMBER BENEFITS',
  appIconText: 'TEC',
  appIconBgColor: 'bg-white',

  storeId: 'ST-0082',
  storeName: '高田店',
  terminalId: 'POS-TERM-01',
  adminPin: '5963',

  businessHoursStart: '09:00',
  businessHoursEnd: '22:00',

  showMemberName: false,
  autoResetSeconds: 10,

  // 確定アナウンスのWAV置き換え用設定（デフォルト空文字＝高音質AI音声合成）
  congratsAudioUrl: '',
  thanksAudioUrl: '',

  apiConfig: {
    environment: 'LOCAL',
    localHost: '127.0.0.1',
    localPort: 8000,
    productionIp: '192.168.1.100',
    productionPort: 8080,
    inquiryEndpoint: '/api/v1/points/inquire',
    correctionEndpoint: '/api/v1/points/adjust',
    timeoutMs: 4000,
  },

  lotterySettings: DEFAULT_LOTTERY_SETTINGS,

  soundTone: 'MELODIC_CHIME',
  soundVolume: 0.6,
  bgmEnabled: false,
};

const DEFAULT_MEMBER: MemberProfile = {
  id: 'usr_84920',
  name: '高田 真次郎',
  memberCode: '298471049218',
  points: 480,
  tier: 'GOLD',
  consecutiveVisits: 4,
  totalVisits: 28,
  lastVisitDate: TODAY_STR,
  hasCheckedInToday: false,
  gamePlayedToday: false,
};

// Seed realistic participant activity across today's operating hours
const getInitialHistory = (): PointTransaction[] => {
  const baseTimestamp = new Date();
  baseTimestamp.setHours(9, 30, 0, 0);

  return [
    {
      id: 'tx_seed_1',
      timestamp: baseTimestamp.getTime() + 15 * 60000,
      date: `${TODAY_STR} 09:45`,
      memberCode: '4901234001',
      title: '来店スロット (3等)',
      type: 'GAME_WIN',
      amount: 30,
      balanceAfter: 230,
      note: '高田店',
    },
    {
      id: 'tx_seed_2',
      timestamp: baseTimestamp.getTime() + 75 * 60000,
      date: `${TODAY_STR} 10:45`,
      memberCode: '4901234002',
      title: '来店ルーレット (2等)',
      type: 'GAME_WIN',
      amount: 100,
      balanceAfter: 610,
      note: '高田店',
    },
    {
      id: 'tx_seed_3',
      timestamp: baseTimestamp.getTime() + 140 * 60000,
      date: `${TODAY_STR} 11:50`,
      memberCode: '4901234003',
      title: '来店スクラッチ (3等)',
      type: 'GAME_WIN',
      amount: 30,
      balanceAfter: 180,
      note: '高田店',
    },
    {
      id: 'tx_seed_4',
      timestamp: baseTimestamp.getTime() + 200 * 60000,
      date: `${TODAY_STR} 12:50`,
      memberCode: '4901234004',
      title: '来店スロット (1等特賞)',
      type: 'GAME_WIN',
      amount: 500,
      balanceAfter: 980,
      note: '高田店',
    },
    {
      id: 'tx_seed_5',
      timestamp: baseTimestamp.getTime() + 270 * 60000,
      date: `${TODAY_STR} 14:00`,
      memberCode: '4901234005',
      title: '来店ルーレット (3等)',
      type: 'GAME_WIN',
      amount: 30,
      balanceAfter: 140,
      note: '高田店',
    },
    {
      id: 'tx_seed_6',
      timestamp: baseTimestamp.getTime() + 350 * 60000,
      date: `${TODAY_STR} 15:20`,
      memberCode: '4901234006',
      title: '来店スロット (参加賞)',
      type: 'GAME_WIN',
      amount: 1,
      balanceAfter: 420,
      note: '高田店',
    },
  ];
};

export function normalizeBarcode(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  const nw7StartStopPattern = /^[A-Da-d*TNEtne](.*)[A-Da-d*TNEtne]$/;
  const match = cleaned.match(nw7StartStopPattern);
  if (match && match[1]) {
    cleaned = match[1];
  }
  return cleaned.replace(/[-\s]/g, '');
}

export function loadMemberData(): MemberProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBER);
    if (raw) return { ...DEFAULT_MEMBER, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_MEMBER;
}

export function saveMemberData(data: MemberProfile) {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBER, JSON.stringify(data));
  } catch {}
}

export function loadHistoryData(): PointTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) {
      const parsed: PointTransaction[] = JSON.parse(raw);
      const cutoffTime = Date.now() - RETENTION_MS;
      return parsed.filter((t) => {
        const time = t.timestamp || new Date(t.date).getTime() || Date.now();
        return time >= cutoffTime;
      });
    }
  } catch {}
  return getInitialHistory();
}

export function saveHistoryData(data: PointTransaction[]) {
  try {
    const cutoffTime = Date.now() - RETENTION_MS;
    const cleanList = data.filter((t) => (t.timestamp || Date.now()) >= cutoffTime);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(cleanList));
  } catch {}
}

export function loadSettingsData(): StoreAdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        businessHoursStart: parsed.businessHoursStart || DEFAULT_SETTINGS.businessHoursStart,
        businessHoursEnd: parsed.businessHoursEnd || DEFAULT_SETTINGS.businessHoursEnd,
        appSubtitle: parsed.appSubtitle || DEFAULT_SETTINGS.appSubtitle,
        appTitle: parsed.appTitle || DEFAULT_SETTINGS.appTitle,
        appIconText: parsed.appIconText || DEFAULT_SETTINGS.appIconText,
        appIconBgColor: parsed.appIconBgColor || DEFAULT_SETTINGS.appIconBgColor,
        congratsAudioUrl: parsed.congratsAudioUrl ?? DEFAULT_SETTINGS.congratsAudioUrl,
        thanksAudioUrl: parsed.thanksAudioUrl ?? DEFAULT_SETTINGS.thanksAudioUrl,
        apiConfig: {
          ...DEFAULT_SETTINGS.apiConfig,
          ...(parsed.apiConfig || {}),
        },
        lotterySettings: {
          ...DEFAULT_LOTTERY_SETTINGS,
          ...(parsed.lotterySettings || {}),
          tiers: parsed.lotterySettings?.tiers || DEFAULT_LOTTERY_SETTINGS.tiers,
        },
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettingsData(data: StoreAdminSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
  } catch {}
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEYS.MEMBER);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

export function getApiEndpointUrl(settings: StoreAdminSettings, endpointType: 'INQUIRY' | 'CORRECTION'): string {
  if (!settings || !settings.apiConfig) {
    return 'http://127.0.0.1:8000/api/v1/points/inquire';
  }
  const { apiConfig } = settings;
  const isLocal = apiConfig.environment === 'LOCAL';
  const host = isLocal ? (apiConfig.localHost || '127.0.0.1') : (apiConfig.productionIp || '192.168.1.100');
  const port = isLocal ? (apiConfig.localPort || 8000) : (apiConfig.productionPort || 8080);
  const path = endpointType === 'INQUIRY'
    ? (apiConfig.inquiryEndpoint || '/api/v1/points/inquire')
    : (apiConfig.correctionEndpoint || '/api/v1/points/adjust');

  const protocol = port === 443 ? 'https' : 'http';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}://${host}:${port}${cleanPath}`;
}

export function getHourlyParticipants(
  history: PointTransaction[],
  startTimeStr: string = '09:00',
  endTimeStr: string = '22:00'
): HourlyParticipantStat[] {
  const startHour = parseInt(startTimeStr.split(':')[0], 10) || 9;
  const endHour = parseInt(endTimeStr.split(':')[0], 10) || 22;

  const hoursList: HourlyParticipantStat[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const label = `${String(h).padStart(2, '0')}時`;
    hoursList.push({ hour: label, count: 0 });
  }

  const todayPrefix = new Date().toISOString().split('T')[0];

  history.forEach((tx) => {
    const dateObj = tx.timestamp ? new Date(tx.timestamp) : new Date(tx.date);
    const txDateStr = dateObj.toISOString().split('T')[0];
    if (txDateStr === todayPrefix) {
      const txHour = dateObj.getHours();
      if (txHour >= startHour && txHour <= endHour) {
        const index = txHour - startHour;
        if (hoursList[index]) {
          hoursList[index].count += 1;
        }
      }
    }
  });

  return hoursList;
}
