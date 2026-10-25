import { GoogleGenAI } from '@google/genai';
import { MemberProfile } from '../types';

export interface ConciergeAdvice {
  greeting: string;
  recommendation: string;
  specialPerkTip: string;
  suggestedAction: string;
}

export async function fetchStoreConciergeAdvice(member: MemberProfile): Promise<ConciergeAdvice> {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return getFallbackAdvice(member);
    }

    const ai = new GoogleGenAI({ apiKey, vertexai: true });
    const prompt = `
あなたは人気カフェ＆ライフスタイル雑貨店「CAFE & STORE 晴れ間」のAI専属コンシェルジュです。
会員様（${member.name} 様、ランク: ${member.tier}会員、保有ポイント: ${member.points}pt、連続来店日数: ${member.consecutiveVisits}日目）に向けた、
今日の心温まるウェルカムメッセージ、おすすめメニュー・特典の提案、ポイント活用アドバイスを作成してください。

次の形式の純粋なJSONオブジェクトのみで返答してください。他の説明文は含めないでください。
{
  "greeting": "来店歓迎の挨拶（季節感と会員ランクを交えて1〜2文）",
  "recommendation": "おすすめ商品またはクーポン",
  "specialPerkTip": "現在のポイント数に応じた特典のアドバイス",
  "suggestedAction": "次に試すべきこと（ミニゲームや特定メニューなど）"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text?.trim() || '';
    const parsed = JSON.parse(raw);
    return {
      greeting: parsed.greeting || `${member.name} 様、ご来店ありがとうございます！`,
      recommendation: parsed.recommendation || '本日は自家焙煎ドリップコーヒーがおすすめです。',
      specialPerkTip: parsed.specialPerkTip || `現在${member.points}pt保有中です。150ptからクーポンへ交換可能です。`,
      suggestedAction: parsed.suggestedAction || '来店ミニゲームで本日の追加ポイントを獲得しましょう！',
    };
  } catch (error) {
    console.warn('Gemini API call returned fallback advice:', error);
    return getFallbackAdvice(member);
  }
}

function getFallbackAdvice(member: MemberProfile): ConciergeAdvice {
  return {
    greeting: `${member.name} 様、いつもご来店ありがとうございます！${member.tier}会員様のご来訪を心より歓迎いたします。`,
    recommendation: '本日は淹れたての「季節の自家焙煎ドリップブレンド」と焼き立てスコーンがおすすめです。',
    specialPerkTip: `現在 ${member.points} pt 保有されています。人気の「200円OFFクーポン」や「スイーツ50%割引」にすぐ交換可能です！`,
    suggestedAction: member.gamePlayedToday
      ? '本日のミニゲームは挑戦済みです！お会計時に会員バーコードをご提示ください。'
      : '「来店ミニゲーム」で最大100pt当たるスロットまたはルーレットをぜひお試しください！',
  };
}
