/** 八字排盘核心算法（纯前端实现） */

import { Solar, Lunar } from 'lunar-typescript';

export interface Pillar {
  gan: string;
  zhi: string;
}

export interface PillarDetail {
  gan: string;
  zhi: string;
  gan_wuxing: string;
  gan_yinyang: string;
  zhi_wuxing: string;
  zhi_yinyang: string;
  hide_gan: string[];
  shishen_gan: string;
  shishen_hide: string[];
  nayin: string;
  dishi: string;
  xun: string;
  xunkong: string;
}

export interface DaYun {
  ganzhi: string;
  shishen_gan: string;
  start_age: number;
  end_age: number;
  start_year: number;
}

export interface YunInfo {
  start_age: number;
  direction: string;
  dayun: DaYun[];
}

export interface LiuNian {
  year: number;
  ganzhi: string;
  shishen_gan: string;
  zhi: string;
  hide_gan: string[];
  shishen_hide: string[];
}

export interface ExtraPillars {
  tai_yuan: string;
  tai_yuan_nayin: string;
  ming_gong: string;
  ming_gong_nayin: string;
  shen_gong: string;
  shen_gong_nayin: string;
}

export interface BaziChart {
  pillars: Record<string, Pillar>;
  day_master: string;
  nayin: Record<string, string>;
  wuxing: Record<string, string>;
  elements: Record<string, number>;
  gender: string;
  solar_display: string;
  lunar_display: string;
  details: Record<string, PillarDetail>;
  extra: ExtraPillars;
  yun: YunInfo | null;
  liunian: LiuNian[];
  shensha: Record<string, string[]>;
  shensha_detail: Record<string, { positions: string[]; 含义?: string; 特征?: string; 查法?: string }>;
  analysis: {
    wuxing_strength?: { raw: Record<string, number>; normalized: Record<string, number>; strongest: string; weakest: string };
    wangshuai?: { score: number; level: string; month_state: string; tonggen_count: number; desheng_count: number; description: string };
    geju?: { name: string; description: string };
    yongshen?: { yongshen: string; xishen: string; jishen: string; description: string };
  };
}

// 五行映射
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const ZHI_WUXING: Record<string, string> = {
  '寅': '木', '卯': '木', '巳': '火', '午': '火', '申': '金',
  '酉': '金', '亥': '水', '子': '水', '辰': '土', '戌': '土',
  '丑': '土', '未': '土',
};

const GAN_YINYANG: Record<string, string> = {
  '甲': '阳', '丙': '阳', '戊': '阳', '庚': '阳', '壬': '阳',
  '乙': '阴', '丁': '阴', '己': '阴', '辛': '阴', '癸': '阴',
};

const ZHI_YINYANG: Record<string, string> = {
  '子': '阳', '寅': '阳', '辰': '阳', '午': '阳', '申': '阳', '戌': '阳',
  '丑': '阴', '卯': '阴', '巳': '阴', '未': '阴', '酉': '阴', '亥': '阴',
};

const WUXING_LIST = ['金', '木', '水', '火', '土'];

// 地支藏干
const ZHI_HIDE_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
  '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
  '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
};

// 十神判定
export function shishen(dayMaster: string, other: string): string {
  const me = GAN_WUXING[dayMaster];
  const otherWx = GAN_WUXING[other];
  const sameYy = GAN_YINYANG[dayMaster] === GAN_YINYANG[other];

  if (me === otherWx) return sameYy ? '比肩' : '劫财';
  if (generates(otherWx, me)) return sameYy ? '偏印' : '正印';
  if (generates(me, otherWx)) return sameYy ? '食神' : '伤官';
  if (overcomes(otherWx, me)) return sameYy ? '七杀' : '正官';
  if (overcomes(me, otherWx)) return sameYy ? '偏财' : '正财';
  return '';
}

const GENERATE: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const OVERCOME: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

function generates(a: string, b: string): boolean { return GENERATE[a] === b; }
function overcomes(a: string, b: string): boolean { return OVERCOME[a] === b; }

// 神煞
const TIAN_YI: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'], '丙': ['亥', '酉'],
  '丁': ['亥', '酉'], '壬': ['卯', '巳'], '癸': ['卯', '巳'], '辛': ['午', '寅'],
};

const WEN_CHANG: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '申', '戊': '申', '丁': '酉',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
};

const LU: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '戊': '巳', '丁': '午',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
};

const YANG_REN: Record<string, string> = {
  '甲': '卯', '乙': '辰', '丙': '午', '戊': '午', '丁': '未',
  '己': '未', '庚': '酉', '辛': '戌', '壬': '子', '癸': '丑',
};

const SAN_HE: Record<string, string[]> = {
  '寅': ['寅', '午', '戌'], '午': ['寅', '午', '戌'], '戌': ['寅', '午', '戌'],
  '申': ['申', '子', '辰'], '子': ['申', '子', '辰'], '辰': ['申', '子', '辰'],
  '巳': ['巳', '酉', '丑'], '酉': ['巳', '酉', '丑'], '丑': ['巳', '酉', '丑'],
  '亥': ['亥', '卯', '未'], '卯': ['亥', '卯', '未'], '未': ['亥', '卯', '未'],
};

const CHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

function ma(zhi: string): string { return CHONG[SAN_HE[zhi][0]]; }
function taohua(zhi: string): string { return SAN_HE[zhi][1]; }
function huagai(zhi: string): string { return SAN_HE[zhi][2]; }

// 神煞解释
const SHENSHA_DESC: Record<string, { 含义: string; 特征: string; 查法: string }> = {
  '天乙贵人': { 含义: '命中最贵之神，主逢凶化吉、贵人相助', 特征: '聪明智慧、人缘好、易得长辈或贵人提携', 查法: '以日干查四柱地支' },
  '文昌': { 含义: '主聪明好学、才华出众', 特征: '利考试、学业、写作、文艺方面发展', 查法: '以日干查四柱地支' },
  '禄神': { 含义: '禄为养命之源，主衣食无忧、事业稳定', 特征: '有经济基础、工作稳定、收入有保障', 查法: '以日干查四柱地支（天干临官之地）' },
  '羊刃': { 含义: '刚烈之星，主性格刚强、做事果断', 特征: '有魄力但易冲动，宜武职或技术岗位', 查法: '以日干查四柱地支（天干帝旺之地）' },
  '驿马': { 含义: '主奔波走动、外出发展', 特征: '一生多变动、适合流动性工作或异地发展', 查法: '以年支/日支查（三合局第一字之冲）' },
  '桃花': { 含义: '主异性缘、风流才情', 特征: '人缘好、有艺术气质、异性缘佳', 查法: '以年支/日支查（三合局第二字）' },
  '华盖': { 含义: '主孤高聪明、好学不群', 特征: '有宗教/哲学/艺术倾向，喜独处思考', 查法: '以年支/日支查（三合局第三字，墓库）' },
};

function findShensha(chart: BaziChart): Record<string, string[]> {
  const dayMaster = chart.day_master;
  const yearZhi = chart.pillars['year'].zhi;
  const dayZhi = chart.pillars['day'].zhi;
  const pillarZhis: Record<string, string> = {};
  ['year', 'month', 'day', 'hour'].forEach(k => { pillarZhis[k] = chart.pillars[k].zhi; });
  const LABEL: Record<string, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };
  const result: Record<string, string[]> = {};

  function record(name: string, targetZhi: string) {
    const hits = Object.entries(pillarZhis).filter(([_, z]) => z === targetZhi).map(([k]) => LABEL[k]);
    if (hits.length > 0) {
      if (!result[name]) result[name] = [];
      result[name].push(...hits);
    }
  }

  (TIAN_YI[dayMaster] || []).forEach(z => record('天乙贵人', z));
  record('文昌', WEN_CHANG[dayMaster] || '');
  record('禄神', LU[dayMaster] || '');
  record('羊刃', YANG_REN[dayMaster] || '');

  [yearZhi, dayZhi].forEach(zhi => {
    record('驿马', ma(zhi));
    record('桃花', taohua(zhi));
    record('华盖', huagai(zhi));
  });

  return result;
}

// 八字排盘主函数
export function buildChart(
  year: number, month: number, day: number, hour: number, minute: number = 0,
  options: { calendar?: string; gender?: string; liunian_years?: number[] } = {}
): BaziChart {
  const { calendar = 'solar', gender = 'm', liunian_years } = options;

  let solar: Solar;
  let lunar: Lunar;

  if (calendar === 'lunar') {
    lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0);
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    lunar = solar.getLunar();
  }

  const ec = lunar.getEightChar();
  const PILLAR_KEYS = ['Year', 'Month', 'Day', 'Time'];
  const PILLAR_OUT = ['year', 'month', 'day', 'hour'];

  // 构建四柱
  const pillars: Record<string, Pillar> = {};
  const details: Record<string, PillarDetail> = {};
  const nayin: Record<string, string> = {};
  const wuxing: Record<string, string> = {};

  PILLAR_OUT.forEach((out, i) => {
    const key = PILLAR_KEYS[i];
    const gan = (ec as any)[`get${key}Gan`]();
    const zhi = (ec as any)[`get${key}Zhi`]();
    pillars[out] = { gan, zhi };
    nayin[out] = (ec as any)[`get${key}NaYin`]();
    wuxing[out] = (ec as any)[`get${key}WuXing`]();

    const hideGan = ZHI_HIDE_GAN[zhi] || [];
    const dayMaster = ec.getDayGan();

    details[out] = {
      gan, zhi,
      gan_wuxing: GAN_WUXING[gan] || '',
      gan_yinyang: GAN_YINYANG[gan] || '',
      zhi_wuxing: ZHI_WUXING[zhi] || '',
      zhi_yinyang: ZHI_YINYANG[zhi] || '',
      hide_gan: hideGan,
      shishen_gan: out === 'day' ? '日主' : shishen(dayMaster, gan),
      shishen_hide: hideGan.map(h => shishen(dayMaster, h)),
      nayin: nayin[out],
      dishi: (ec as any)[`get${key}DiShi`](),
      xun: (ec as any)[`get${key}Xun`](),
      xunkong: (ec as any)[`get${key}XunKong`](),
    };
  });

  // 三垣
  const extra: ExtraPillars = {
    tai_yuan: ec.getTaiYuan(),
    tai_yuan_nayin: ec.getTaiYuanNaYin(),
    ming_gong: ec.getMingGong(),
    ming_gong_nayin: ec.getMingGongNaYin(),
    shen_gong: ec.getShenGong(),
    shen_gong_nayin: ec.getShenGongNaYin(),
  };

  // 五行统计
  const elements: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  PILLAR_OUT.forEach(k => {
    elements[GAN_WUXING[pillars[k].gan]]++;
    elements[ZHI_WUXING[pillars[k].zhi]]++;
  });

  // 大运
  const yun = buildYun(ec, gender);

  // 流年
  const years = liunian_years || defaultLiuNianYears();
  const liunian = buildLiuNian(ec, years);

  // 神煞
  const chart: BaziChart = {
    pillars, day_master: ec.getDayGan(), nayin, wuxing, elements, gender,
    solar_display: solar.toFullString(), lunar_display: lunar.toFullString(),
    details, extra, yun, liunian, shensha: {}, shensha_detail: {}, analysis: {},
  };
  chart.shensha = findShensha(chart);
  chart.shensha_detail = {};
  Object.entries(chart.shensha).forEach(([name, positions]) => {
    chart.shensha_detail[name] = { positions, ...SHENSHA_DESC[name] };
  });

  // 分析
  chart.analysis = analyzeBazi(chart);

  return chart;
}

function buildYun(ec: any, gender: string): YunInfo | null {
  try {
    const yun = ec.getYun(gender === 'm' ? 1 : 0);
    const startAge = yun.getStartYear();
    const direction = yun.isForward() ? '顺' : '逆';
    const daYunList = yun.getDaYun();
    const dayMaster = ec.getDayGan();
    const dayun: DaYun[] = [];

    for (let i = 1; i < daYunList.length; i++) {
      const d = daYunList[i];
      const gz = d.getGanZhi();
      if (!gz) continue;
      dayun.push({
        ganzhi: gz,
        shishen_gan: shishen(dayMaster, gz[0]),
        start_age: d.getStartAge(),
        end_age: d.getEndAge(),
        start_year: d.getStartYear(),
      });
    }

    return { start_age: startAge, direction, dayun };
  } catch {
    return null;
  }
}

function defaultLiuNianYears(): number[] {
  const now = new Date();
  const center = now.getFullYear();
  return Array.from({ length: 7 }, (_, i) => center - 2 + i);
}

function buildLiuNian(ec: any, years: number[]): LiuNian[] {
  const dayMaster = ec.getDayGan();
  const result: LiuNian[] = [];

  for (const y of years) {
    try {
      const ly = Lunar.fromYmdHms(y, 6, 15, 12, 0, 0);
      const gz = ly.getYearInGanZhiExact();
      const gan = gz[0];
      const zhi = gz[1];
      const hide = ZHI_HIDE_GAN[zhi] || [];
      result.push({
        year: y,
        ganzhi: gz,
        shishen_gan: shishen(dayMaster, gan),
        zhi,
        hide_gan: hide,
        shishen_hide: hide.map(h => shishen(dayMaster, h)),
      });
    } catch { /* skip */ }
  }

  return result;
}

// 五行力量分析
function analyzeWuxingStrength(chart: BaziChart) {
  const scores: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  const monthZhi = chart.pillars['month'].zhi;

  const MONTH_STATE: Record<string, Record<string, string>> = {
    '木': { '寅': '旺', '卯': '旺', '辰': '休', '巳': '死', '午': '死', '未': '囚', '申': '囚', '酉': '囚', '戌': '休', '亥': '相', '子': '相', '丑': '休' },
    '火': { '寅': '相', '卯': '相', '辰': '死', '巳': '旺', '午': '旺', '未': '休', '申': '死', '酉': '死', '戌': '囚', '亥': '囚', '子': '囚', '丑': '死' },
    '土': { '寅': '死', '卯': '死', '辰': '旺', '巳': '相', '午': '相', '未': '旺', '申': '休', '酉': '休', '戌': '旺', '亥': '死', '子': '死', '丑': '旺' },
    '金': { '寅': '囚', '卯': '囚', '辰': '相', '巳': '休', '午': '休', '未': '相', '申': '旺', '酉': '旺', '戌': '相', '亥': '死', '子': '死', '丑': '相' },
    '水': { '寅': '休', '卯': '休', '辰': '死', '巳': '囚', '午': '囚', '未': '死', '申': '相', '酉': '相', '戌': '死', '亥': '旺', '子': '旺', '丑': '死' },
  };

  const HIDE_STRENGTH: Record<string, Record<string, number>> = {
    '子': { '癸': 1.0 }, '丑': { '己': 1.0, '癸': 0.6, '辛': 0.3 },
    '寅': { '甲': 1.0, '丙': 0.6, '戊': 0.3 }, '卯': { '乙': 1.0 },
    '辰': { '戊': 1.0, '乙': 0.6, '癸': 0.3 }, '巳': { '丙': 1.0, '庚': 0.6, '戊': 0.3 },
    '午': { '丁': 1.0, '己': 0.6 }, '未': { '己': 1.0, '丁': 0.6, '乙': 0.3 },
    '申': { '庚': 1.0, '壬': 0.6, '戊': 0.3 }, '酉': { '辛': 1.0 },
    '戌': { '戊': 1.0, '辛': 0.6, '丁': 0.3 }, '亥': { '壬': 1.0, '甲': 0.6 },
  };

  ['year', 'month', 'day', 'hour'].forEach(key => {
    const p = chart.pillars[key];
    const ganWx = GAN_WUXING[p.gan];
    let ganScore = 1.0;
    const state = MONTH_STATE[ganWx]?.[monthZhi];
    if (state === '旺') ganScore = 1.5;
    else if (state === '相') ganScore = 1.2;
    scores[ganWx] += ganScore;

    const hideStr = HIDE_STRENGTH[p.zhi] || {};
    Object.entries(hideStr).forEach(([hgan, str]) => {
      const hganWx = GAN_WUXING[hgan];
      if (hganWx) scores[hganWx] += str;
    });
  });

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const normalized: Record<string, number> = {};
  WUXING_LIST.forEach(wx => { normalized[wx] = Math.round(scores[wx] / total * 100); });
  const strongest = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const weakest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];

  return { raw: { ...scores }, normalized, strongest, weakest };
}

// 日主旺衰分析
function analyzeWangshuai(chart: BaziChart) {
  const dayMaster = chart.day_master;
  const dmWx = GAN_WUXING[dayMaster];
  const monthZhi = chart.pillars['month'].zhi;

  const MONTH_STATE: Record<string, Record<string, string>> = {
    '木': { '寅': '旺', '卯': '旺', '亥': '相', '子': '相' },
    '火': { '巳': '旺', '午': '旺', '寅': '相', '卯': '相' },
    '土': { '辰': '旺', '戌': '旺', '丑': '旺', '未': '旺', '巳': '相', '午': '相' },
    '金': { '申': '旺', '酉': '旺', '辰': '相', '戌': '相', '丑': '相', '未': '相' },
    '水': { '亥': '旺', '子': '旺', '申': '相', '酉': '相' },
  };

  const monthState = MONTH_STATE[dmWx]?.[monthZhi] || '休';
  const monthScore = { '旺': 40, '相': 30, '休': 10, '囚': 0, '死': -10 }[monthState] || 10;

  let tonggenCount = 0;
  ['year', 'month', 'day', 'hour'].forEach(k => {
    const zhi = chart.pillars[k].zhi;
    (ZHI_HIDE_GAN[zhi] || []).forEach(h => { if (GAN_WUXING[h] === dmWx) tonggenCount++; });
  });

  const shengWo = Object.entries(GENERATE).filter(([_, v]) => v === dmWx).map(([k]) => k);
  let deshengCount = 0;
  ['year', 'month', 'day', 'hour'].forEach(k => {
    if (shengWo.includes(GAN_WUXING[chart.pillars[k].gan])) deshengCount++;
    (ZHI_HIDE_GAN[chart.pillars[k].zhi] || []).forEach(h => { if (shengWo.includes(GAN_WUXING[h])) deshengCount++; });
  });

  const score = Math.max(0, Math.min(100, 50 + monthScore + Math.min(tonggenCount * 10, 30) + Math.min(deshengCount * 5, 20)));
  let level = score >= 75 ? '偏旺' : score >= 60 ? '中和偏旺' : score >= 45 ? '中和' : score >= 30 ? '中和偏弱' : '偏弱';
  if (score >= 90) level = '极旺';
  if (score <= 10) level = '极弱';

  const desc = `日主${dayMaster}（${dmWx}），生于${monthZhi}月，月令${monthState}。综合评定：${level}。`;

  return { score, level, month_state: monthState, tonggen_count: tonggenCount, desheng_count: deshengCount, description: desc };
}

// 格局分析
function analyzeGeju(chart: BaziChart) {
  const dayMaster = chart.day_master;
  const monthZhi = chart.pillars['month'].zhi;
  const monthHide = ZHI_HIDE_GAN[monthZhi] || [];
  const allGans = ['year', 'month', 'day', 'hour'].map(k => chart.pillars[k].gan);

  for (const hgan of monthHide) {
    if (hgan === dayMaster) continue;
    if (allGans.includes(hgan)) {
      const ss = shishen(dayMaster, hgan);
      return { name: `${ss}格`, description: `月令${monthZhi}藏${monthHide.join(' ')}，${hgan}透干，取${ss}格` };
    }
  }

  const mainGan = monthHide[0];
  if (mainGan === dayMaster) return { name: '建禄格', description: `月令${monthZhi}为日主之禄，取建禄格` };
  const ss = shishen(dayMaster, mainGan);
  return { name: `${ss}格（本气）`, description: `月令${monthZhi}藏干不透，以本气${mainGan}取${ss}格` };
}

// 用神分析
function analyzeYongshen(chart: BaziChart, wangshuai: any) {
  const dmWx = GAN_WUXING[chart.day_master];
  const monthZhi = chart.pillars['month'].zhi;
  const keWo = Object.entries(OVERCOME).filter(([_, v]) => v === dmWx).map(([k]) => k);
  const shengWo = Object.entries(GENERATE).filter(([_, v]) => v === dmWx).map(([k]) => k);

  if (wangshuai.score >= 60) {
    const yongshen = keWo[0] || GENERATE[dmWx];
    return { yongshen, xishen: OVERCOME[dmWx], jishen: shengWo[0] || dmWx, description: `日主偏旺，取${yongshen}为用神克制。` };
  } else if (wangshuai.score <= 40) {
    const yongshen = shengWo[0] || dmWx;
    return { yongshen, xishen: dmWx, jishen: keWo[0] || GENERATE[dmWx], description: `日主偏弱，取${yongshen}为用神生扶。` };
  } else {
    if (['巳', '午', '未'].includes(monthZhi)) return { yongshen: '水', xishen: '金', jishen: '火', description: '日主中和，生于夏季，取水为调候用神。' };
    if (['亥', '子', '丑'].includes(monthZhi)) return { yongshen: '火', xishen: '木', jishen: '水', description: '日主中和，生于冬季，取火为调候用神。' };
    return { yongshen: OVERCOME[dmWx], xishen: shengWo[0] || '木', jishen: keWo[0] || '水', description: '日主中和，取平衡用神。' };
  }
}

function analyzeBazi(chart: BaziChart) {
  const wuxing_strength = analyzeWuxingStrength(chart);
  const wangshuai = analyzeWangshuai(chart);
  const geju = analyzeGeju(chart);
  const yongshen = analyzeYongshen(chart, wangshuai);
  return { wuxing_strength, wangshuai, geju, yongshen };
}
