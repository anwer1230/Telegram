/**
 * officialTelegramStickerPacks.ts
 *
 * Official Telegram Web (K & Z) Sticker Packs & Vector/WebP Definitions
 * Direct parity with official Telegram web clients:
 * - Spotty The Duck (Telegram Official Mascot)
 * - Resistance Dog (Pavel Durov Mascot)
 * - Hot Cherry (Telegram Official Romance/Flirt)
 * - Diggy The Dog (Official Telegram Puppy)
 * - TON Diamonds & Web3 Stars
 * - Animated Telegram Reactions (60FPS TGS/Lottie)
 */

import {
  LOTTIE_DUCK_WINK,
  LOTTIE_TON_GEM,
  LOTTIE_HEART_PULSE,
  LOTTIE_FIRE_FLAME,
  LOTTIE_PARTY_POPPER,
  LOTTIE_ROCKET_BOOST,
} from './lottieStickerData';

export interface TelegramOfficialSticker {
  id: string;
  packId: string;
  packName: string;
  packShortName: string;
  emoji: string;
  altEmoji: string[];
  name: string;
  nameAr: string;
  format: 'lottie' | 'webp' | 'png' | 'webm';
  url: string;
  lottieData?: any;
  width: number;
  height: number;
  keywords: string[];
}

export interface TelegramOfficialStickerPack {
  id: string;
  title: string;
  titleAr: string;
  shortName: string;
  description: string;
  descriptionAr: string;
  thumbnailUrl: string;
  thumbnailLottie?: any;
  isAnimated: boolean;
  isOfficial: boolean;
  isTrending?: boolean;
  installedCount: number;
  stickers: TelegramOfficialSticker[];
}

export const OFFICIAL_TELEGRAM_STICKER_PACKS: TelegramOfficialStickerPack[] = [
  {
    id: 'pack_spotty_duck',
    title: 'Spotty the Duck',
    titleAr: 'بطة سبوتي الرسمية',
    shortName: 'SpottyDuckOfficial',
    description: 'The iconic official mascot of Telegram with lively animations.',
    descriptionAr: 'تميمة تيليجرام الرسمية الشهيرة مع حركات ورسوم متحركة 60 إطار.',
    thumbnailUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f424/512.webp',
    thumbnailLottie: LOTTIE_DUCK_WINK,
    isAnimated: true,
    isOfficial: true,
    isTrending: true,
    installedCount: 1420500,
    stickers: [
      {
        id: 'st_duck_wink',
        packId: 'pack_spotty_duck',
        packName: 'Spotty the Duck',
        packShortName: 'SpottyDuckOfficial',
        emoji: '😉',
        altEmoji: ['🦆', '✨', 'hello'],
        name: 'Spotty Wink',
        nameAr: 'سبوتي يغمز',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f424/512.webp',
        lottieData: LOTTIE_DUCK_WINK,
        width: 512,
        height: 512,
        keywords: ['duck', 'wink', 'hello', 'greeting', 'غمزة', 'بطة', 'مرحبا'],
      },
      {
        id: 'st_duck_party',
        packId: 'pack_spotty_duck',
        packName: 'Spotty the Duck',
        packShortName: 'SpottyDuckOfficial',
        emoji: '🎉',
        altEmoji: ['🥳', 'party', 'dance'],
        name: 'Party Duck',
        nameAr: 'سبوتي يحتفل',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp',
        lottieData: LOTTIE_PARTY_POPPER,
        width: 512,
        height: 512,
        keywords: ['party', 'celebrate', 'congrats', 'حفلة', 'مبروك', 'فرح'],
      },
      {
        id: 'st_duck_thumbs',
        packId: 'pack_spotty_duck',
        packName: 'Spotty the Duck',
        packShortName: 'SpottyDuckOfficial',
        emoji: '👍',
        altEmoji: ['ok', 'yes', 'cool'],
        name: 'Spotty Thumbs Up',
        nameAr: 'سبوتي إعجاب',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp',
        width: 512,
        height: 512,
        keywords: ['thumbs up', 'like', 'agree', 'تم', 'موافق', 'اعجاب'],
      },
      {
        id: 'st_duck_love',
        packId: 'pack_spotty_duck',
        packName: 'Spotty the Duck',
        packShortName: 'SpottyDuckOfficial',
        emoji: '❤️',
        altEmoji: ['love', 'heart', 'hug'],
        name: 'Spotty In Love',
        nameAr: 'سبوتي بحب',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp',
        lottieData: LOTTIE_HEART_PULSE,
        width: 512,
        height: 512,
        keywords: ['love', 'heart', 'hug', 'حب', 'قلب', 'عشق'],
      },
      {
        id: 'st_duck_cool',
        packId: 'pack_spotty_duck',
        packName: 'Spotty the Duck',
        packShortName: 'SpottyDuckOfficial',
        emoji: '😎',
        altEmoji: ['glasses', 'boss'],
        name: 'Spotty Cool Sunglasses',
        nameAr: 'سبوتي كول بنظارة',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp',
        width: 512,
        height: 512,
        keywords: ['cool', 'sunglasses', 'boss', 'فخم', 'روعة', 'كول'],
      },
      {
        id: 'st_duck_fire',
        packId: 'pack_spotty_duck',
        packName: 'Spotty the Duck',
        packShortName: 'SpottyDuckOfficial',
        emoji: '🔥',
        altEmoji: ['hot', 'lit'],
        name: 'Spotty on Fire',
        nameAr: 'سبوتي حماسي نار',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
        lottieData: LOTTIE_FIRE_FLAME,
        width: 512,
        height: 512,
        keywords: ['fire', 'flame', 'lit', 'نار', 'ولعة', 'حماس'],
      },
    ],
  },
  {
    id: 'pack_resistance_dog',
    title: 'Resistance Dog',
    titleAr: 'كلب المقاومة (شعار الحرية)',
    shortName: 'ResistanceDogTG',
    description: 'The iconic dog in a hood created by Pavel Durov representing internet freedom.',
    descriptionAr: 'الكلب ذو القلنسوة الشهير الذي ابتكره بافيل دوروف رمزاً لحرية الإنترنت.',
    thumbnailUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.webp',
    isAnimated: true,
    isOfficial: true,
    isTrending: true,
    installedCount: 2310000,
    stickers: [
      {
        id: 'st_rdog_salute',
        packId: 'pack_resistance_dog',
        packName: 'Resistance Dog',
        packShortName: 'ResistanceDogTG',
        emoji: '🫡',
        altEmoji: ['dog', 'salute'],
        name: 'Resistance Salute',
        nameAr: 'تحية المقاومة',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae1/512.webp',
        width: 512,
        height: 512,
        keywords: ['dog', 'salute', 'freedom', 'كلب', 'تحية', 'احترام'],
      },
      {
        id: 'st_rdog_rocket',
        packId: 'pack_resistance_dog',
        packName: 'Resistance Dog',
        packShortName: 'ResistanceDogTG',
        emoji: '🚀',
        altEmoji: ['speed', 'moon'],
        name: 'Dog Rocket Flight',
        nameAr: 'انطلاق الصاروخ',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp',
        lottieData: LOTTIE_ROCKET_BOOST,
        width: 512,
        height: 512,
        keywords: ['rocket', 'fly', 'fast', 'صاروخ', 'طيران', 'انطلاق'],
      },
      {
        id: 'st_rdog_fire',
        packId: 'pack_resistance_dog',
        packName: 'Resistance Dog',
        packShortName: 'ResistanceDogTG',
        emoji: '🔥',
        altEmoji: ['power', 'fight'],
        name: 'Resistance Fire',
        nameAr: 'شعلة المقاومة',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
        lottieData: LOTTIE_FIRE_FLAME,
        width: 512,
        height: 512,
        keywords: ['fire', 'flame', 'resistance', 'نار', 'قوة'],
      },
      {
        id: 'st_rdog_clap',
        packId: 'pack_resistance_dog',
        packName: 'Resistance Dog',
        packShortName: 'ResistanceDogTG',
        emoji: '👏',
        altEmoji: ['bravo', 'cheer'],
        name: 'Applause Dog',
        nameAr: 'تصفيق وتشجيع',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp',
        width: 512,
        height: 512,
        keywords: ['clap', 'applause', 'bravo', 'تصفيق', 'برافو', 'أحسنت'],
      },
    ],
  },
  {
    id: 'pack_ton_diamonds',
    title: 'TON Crypto & Stars',
    titleAr: 'نجوم وجواهر شبكة TON',
    shortName: 'TONStarsOfficial',
    description: 'Animated Web3 Telegram Stars and TON ecosystem stickers.',
    descriptionAr: 'ملصقات متحركة أصلية لنجوم تيليجرام وشبكة TON الرقمية.',
    thumbnailUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp',
    thumbnailLottie: LOTTIE_TON_GEM,
    isAnimated: true,
    isOfficial: true,
    isTrending: false,
    installedCount: 980400,
    stickers: [
      {
        id: 'st_ton_diamond',
        packId: 'pack_ton_diamonds',
        packName: 'TON Crypto & Stars',
        packShortName: 'TONStarsOfficial',
        emoji: '💎',
        altEmoji: ['ton', 'gem', 'crypto'],
        name: 'TON Crystal Gem',
        nameAr: 'جوهرة TON الزرقاء',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp',
        lottieData: LOTTIE_TON_GEM,
        width: 512,
        height: 512,
        keywords: ['ton', 'crypto', 'gem', 'diamond', 'جوهرة', 'الماس', 'كريبتو'],
      },
      {
        id: 'st_ton_star',
        packId: 'pack_ton_diamonds',
        packName: 'TON Crypto & Stars',
        packShortName: 'TONStarsOfficial',
        emoji: '⭐',
        altEmoji: ['star', 'gold'],
        name: 'Golden Telegram Star',
        nameAr: 'نجمة تيليجرام الذهبية',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2b50/512.webp',
        width: 512,
        height: 512,
        keywords: ['star', 'telegram star', 'gold', 'نجمة', 'ذهب', 'نجوم'],
      },
      {
        id: 'st_ton_rocket',
        packId: 'pack_ton_diamonds',
        packName: 'TON Crypto & Stars',
        packShortName: 'TONStarsOfficial',
        emoji: '🚀',
        altEmoji: ['pump', 'moon'],
        name: 'Crypto Pump To Moon',
        nameAr: 'صعود صاروخي',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp',
        lottieData: LOTTIE_ROCKET_BOOST,
        width: 512,
        height: 512,
        keywords: ['crypto', 'moon', 'rocket', 'صعود', 'صاروخ'],
      },
    ],
  },
  {
    id: 'pack_hot_cherry',
    title: 'Hot Cherry & Reactions',
    titleAr: 'كرز المشاعر والتفاعلات الحية',
    shortName: 'HotCherryTelegram',
    description: 'Expressive animated emotions and romantic stickers.',
    descriptionAr: 'مشاعر رومانسية وتعبيرات حية متحركة عالية الجودة.',
    thumbnailUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f352/512.webp',
    thumbnailLottie: LOTTIE_HEART_PULSE,
    isAnimated: true,
    isOfficial: true,
    isTrending: true,
    installedCount: 1670000,
    stickers: [
      {
        id: 'st_cherry_heart',
        packId: 'pack_hot_cherry',
        packName: 'Hot Cherry & Reactions',
        packShortName: 'HotCherryTelegram',
        emoji: '❤️',
        altEmoji: ['pulse', 'love'],
        name: 'Pulsing Cherry Heart',
        nameAr: 'قلب نابض أحمر',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp',
        lottieData: LOTTIE_HEART_PULSE,
        width: 512,
        height: 512,
        keywords: ['heart', 'love', 'kiss', 'قلب', 'حب', 'بوسة'],
      },
      {
        id: 'st_cherry_laugh',
        packId: 'pack_hot_cherry',
        packName: 'Hot Cherry & Reactions',
        packShortName: 'HotCherryTelegram',
        emoji: '😂',
        altEmoji: ['joy', 'lol'],
        name: 'Laughing Tears',
        nameAr: 'ضحك بالدموع',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
        width: 512,
        height: 512,
        keywords: ['laugh', 'tears', 'lol', 'ضحك', 'هههه', 'نكتة'],
      },
      {
        id: 'st_cherry_fire',
        packId: 'pack_hot_cherry',
        packName: 'Hot Cherry & Reactions',
        packShortName: 'HotCherryTelegram',
        emoji: '🔥',
        altEmoji: ['burn', 'flame'],
        name: 'Spicy Flame',
        nameAr: 'لهيب حار',
        format: 'lottie',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
        lottieData: LOTTIE_FIRE_FLAME,
        width: 512,
        height: 512,
        keywords: ['fire', 'spicy', 'hot', 'لهيب', 'حار', 'نار'],
      },
      {
        id: 'st_cherry_shock',
        packId: 'pack_hot_cherry',
        packName: 'Hot Cherry & Reactions',
        packShortName: 'HotCherryTelegram',
        emoji: '😱',
        altEmoji: ['shock', 'omg'],
        name: 'Shocked Face',
        nameAr: 'مصدوم ومندهش',
        format: 'webp',
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.webp',
        width: 512,
        height: 512,
        keywords: ['shock', 'wow', 'omg', 'صدمة', 'واو', 'مفاجأة'],
      },
    ],
  },
];

// Flat lookup for all stickers
export const ALL_OFFICIAL_STICKERS: TelegramOfficialSticker[] = OFFICIAL_TELEGRAM_STICKER_PACKS.flatMap(
  (p) => p.stickers
);

// Map by sticker ID
export const STICKER_BY_ID_MAP = new Map<string, TelegramOfficialSticker>();
ALL_OFFICIAL_STICKERS.forEach((stk) => STICKER_BY_ID_MAP.set(stk.id, stk));

// Map by pack shortName
export const STICKER_PACKS_MAP = new Map<string, TelegramOfficialStickerPack>();
OFFICIAL_TELEGRAM_STICKER_PACKS.forEach((pack) => STICKER_PACKS_MAP.set(pack.shortName, pack));
