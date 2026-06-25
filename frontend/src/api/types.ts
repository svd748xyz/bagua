// 与后端 app/schemas/models.py 对齐的类型定义。

export interface HexagramOut {
  num: number;
  name: string;
  unicode: string;
  lines: boolean[];   // 自下而上 6 爻，true=阳
  judgement: string;  // 卦辞
  tuan: string;       // 彖传
  image: string;      // 大象传
  yao: string[];      // 6 条爻辞
  extra: string | null;
}

export interface YaoOut {
  value: number;      // 6/7/8/9
  position: number;   // 0-5
  is_yang: boolean;
  is_moving: boolean;
  label: string;      // 老阴/少阳/少阴/老阳
}

export interface ReadingOut {
  rule: string;
  references: string[];
  explanation: string;
}

export interface CastResponse {
  question: string | null;
  original: HexagramOut;
  changed: HexagramOut | null;
  yaos: YaoOut[];
  moving: number[];
  reading: ReadingOut;
}

export interface PillarOut {
  gan: string;
  zhi: string;
}

/** 一柱完整排盘信息。 */
export interface PillarDetailOut {
  gan: string;
  zhi: string;
  gan_wuxing: string;
  gan_yinyang: string;      // 天干阴阳
  zhi_wuxing: string;       // 地支五行
  zhi_yinyang: string;      // 地支阴阳
  hide_gan: string[];       // 地支藏干
  shishen_gan: string;      // 天干十神
  shishen_hide: string[];   // 藏干十神
  nayin: string;
  dishi: string;            // 十二长生
  xun: string;              // 旬
  xunkong: string;          // 空亡
}

export interface DaYunOut {
  ganzhi: string;
  shishen_gan: string;
  start_age: number;
  end_age: number;
  start_year: number;
}

export interface YunOut {
  start_age: number;
  direction: string;        // 顺 / 逆
  dayun: DaYunOut[];
}

export interface LiuNianOut {
  year: number;
  ganzhi: string;
  shishen_gan: string;
  zhi: string;
  hide_gan: string[];
  shishen_hide: string[];
}

export interface ExtraPillarsOut {
  tai_yuan: string;
  tai_yuan_nayin: string;
  ming_gong: string;
  ming_gong_nayin: string;
  shen_gong: string;
  shen_gong_nayin: string;
}

export interface BaziResponse {
  pillars: { year: PillarOut; month: PillarOut; day: PillarOut; hour: PillarOut };
  day_master: string;
  nayin: Record<string, string>;
  wuxing: Record<string, string>;
  elements: Record<string, number>;
  gender: string;
  solar_display: string;
  lunar_display: string;
  details: Record<string, PillarDetailOut>;
  extra: ExtraPillarsOut;
  yun: YunOut | null;
  liunian: LiuNianOut[];
  shensha: Record<string, string[]>;
  shensha_detail: Record<string, { positions: string[]; 含义?: string; 特征?: string; 查法?: string }>;
  analysis: {
    wuxing_strength?: { raw: Record<string, number>; normalized: Record<string, number>; strongest: string; weakest: string };
    wangshuai?: { score: number; level: string; month_state: string; tonggen_count: number; desheng_count: number; description: string };
    geju?: { name: string; description: string };
    yongshen?: { yongshen: string; xishen: string; jishen: string; description: string };
  };
  time_correction?: TimeCorrectionOut | null;
}

/** 时间校正信息。 */
export interface TimeCorrectionOut {
  original_time: string;
  corrected_time: string;
  dst_applied: boolean;
  longitude: number;
  longitude_offset_min: number;
  eot_min: number;
  applied: boolean;
  birthplace: string;
}

/** 地理位置项。 */
export interface LocationItem {
  name: string;
  longitude: number;
  full_name: string;
}

/** 省/市列表。 */
export interface LocationsResponse {
  provinces: string[];
  cities: Record<string, LocationItem[]>;
}

export interface ApiError {
  error?: { code: string; message: string };
  detail?: { code: string; message: string } | string;
}
