/** 时间校正：夏令时还原 + 真太阳时（前端纯 TypeScript 实现）。 */

/** 时间校正结果 */
export interface TimeCorrectionResult {
  original: Date;
  afterDst: Date;
  dstApplied: boolean;
  longitudeOffsetMin: number;
  eotMin: number;
  corrected: Date;
  longitude: number;
}

/** 中国夏令时 1986-1991 起止日期（硬编码，不用"第几个星期日"规则） */
const CN_DST: [number, string, string][] = [
  [1986, "05-04", "09-14"],
  [1987, "04-12", "09-13"],
  [1988, "04-10", "09-11"],
  [1989, "04-16", "09-17"],
  [1990, "04-15", "09-16"],
  [1991, "04-14", "09-15"],
];

function isCnDst(dt: Date): boolean {
  for (const [year, start, end] of CN_DST) {
    const begin = new Date(`${year}-${start}T02:00:00`);
    const finish = new Date(`${year}-${end}T02:00:00`);
    if (dt >= begin && dt < finish) return true;
  }
  return false;
}

/** 均时差（分钟）。公式：B=2π(n-81)/365, EoT=9.87sin(2B)-7.53cos(B)-1.5sin(B) */
function equationOfTime(year: number, month: number, day: number): number {
  const n = dayOfYear(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 365;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function dayOfYear(year: number, month: number, day: number): number {
  const start = new Date(year, 0, 1);
  const target = new Date(year, month - 1, day);
  return Math.round((target.getTime() - start.getTime()) / 86400000) + 1;
}

export function correctTime(
  dt: Date,
  longitude: number = 120,
  dstAssumed: boolean | null = null,
): TimeCorrectionResult {
  // Step 1: 夏令时还原
  const dstApplied = dstAssumed ?? isCnDst(dt);
  const afterDst = dstApplied ? new Date(dt.getTime() - 3600000) : new Date(dt);

  // Step 2: 经度校正
  const longitudeOffsetMin = 4 * (longitude - 120);
  const meanSolar = new Date(afterDst.getTime() + longitudeOffsetMin * 60000);

  // Step 3: 均时差
  const eot = equationOfTime(afterDst.getFullYear(), afterDst.getMonth() + 1, afterDst.getDate());
  const corrected = new Date(meanSolar.getTime() + eot * 60000);

  return {
    original: dt,
    afterDst,
    dstApplied,
    longitudeOffsetMin,
    eotMin: eot,
    corrected,
    longitude,
  };
}
