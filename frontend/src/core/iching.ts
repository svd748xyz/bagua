/** 金钱卦核心算法（纯前端实现） */

// @ts-ignore
import hexagramData from './64hexagrams.json';

export interface Hexagram {
  num: number;
  name: string;
  unicode: string;
  lines: boolean[];
  lower_trigram: string;
  upper_trigram: string;
  judgement: string;
  tuan: string;
  image: string;
  yao: string[];
  extra?: string;
}

export interface YaoResult {
  value: number;      // 6/7/8/9
  position: number;   // 0-5
  is_yang: boolean;
  is_moving: boolean;
  label: string;
}

export interface CastResult {
  question: string | null;
  original: Hexagram;
  changed: Hexagram | null;
  yaos: YaoResult[];
  moving: number[];
  reading: Reading;
}

export interface Reading {
  rule: string;
  references: string[];
  explanation: string;
}

const hexagrams: Hexagram[] = hexagramData.hexagrams;

/** 投掷三枚硬币，返回背面数（0-3） */
function castCoins(): number {
  let count = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.random() < 0.5) count++;
  }
  return count;
}

/** 背面数 → 爻值 */
function backsToValue(backs: number): number {
  // 0背=老阴(6), 1背=少阳(7), 2背=少阴(8), 3背=老阳(9)
  return [6, 7, 8, 9][backs];
}

/** 爻值是否为阳 */
function isYang(value: number): boolean {
  return value === 7 || value === 9;
}

/** 爻值是否为动爻 */
function isMoving(value: number): boolean {
  return value === 6 || value === 9;
}

/** 爻值标签 */
function yaoLabel(value: number): string {
  const labels: Record<number, string> = {
    6: '老阴（六）',
    7: '少阳（七）',
    8: '少阴（八）',
    9: '老阳（九）',
  };
  return labels[value] || '';
}

/** 根据六爻查找卦 */
function findHexagram(lines: boolean[]): Hexagram | undefined {
  return hexagrams.find(h =>
    h.lines.length === 6 &&
    h.lines.every((l, i) => l === lines[i])
  );
}

/** 动爻翻转 */
function flipLines(lines: boolean[], moving: number[]): boolean[] {
  return lines.map((l, i) => moving.includes(i) ? !l : l);
}

/** 解卦（朱熹动爻法） */
function interpretCast(original: Hexagram, changed: Hexagram | null, moving: number[]): Reading {
  const n = moving.length;

  if (n === 0) {
    return {
      rule: '无爻动',
      references: [original.judgement],
      explanation: '六爻皆静，以本卦卦辞断之。',
    };
  }

  if (n === 1) {
    const pos = moving[0];
    return {
      rule: '一爻动',
      references: [original.yao[pos]],
      explanation: `一爻动，以本卦第${posName(pos)}爻爻辞断之。`,
    };
  }

  if (n === 2) {
    const sorted = [...moving].sort();
    const refs = sorted.map(p => original.yao[p]);
    return {
      rule: '二爻动',
      references: refs,
      explanation: '二爻动，以本卦两动爻爻辞合断之，以上爻为主。',
    };
  }

  if (n === 3) {
    const refs = [original.judgement];
    if (changed) refs.push(changed.judgement);
    return {
      rule: '三爻动',
      references: refs,
      explanation: '三爻动，以本卦卦辞与变卦卦辞合断之。',
    };
  }

  if (n === 4) {
    const allPos = new Set([0, 1, 2, 3, 4, 5]);
    moving.forEach(p => allPos.delete(p));
    const still = [...allPos].sort();
    const refs = changed ? still.map(p => changed.yao[p]) : [];
    return {
      rule: '四爻动',
      references: refs,
      explanation: '四爻动，以变卦两不动爻爻辞断之，以下爻为主。',
    };
  }

  if (n === 5) {
    const allPos = new Set([0, 1, 2, 3, 4, 5]);
    moving.forEach(p => allPos.delete(p));
    const still = [...allPos][0];
    const refs = changed ? [changed.yao[still]] : [];
    return {
      rule: '五爻动',
      references: refs,
      explanation: `五爻动，以变卦第${posName(still)}爻（不动爻）爻辞断之。`,
    };
  }

  // n === 6
  if (original.num === 1 && original.extra) {
    return {
      rule: '六爻动（乾）',
      references: [original.extra],
      explanation: '六爻皆动，乾卦以「用九」断之。',
    };
  }
  if (original.num === 2 && original.extra) {
    return {
      rule: '六爻动（坤）',
      references: [original.extra],
      explanation: '六爻皆动，坤卦以「用六」断之。',
    };
  }
  const refs = changed ? [changed.judgement] : [];
  return {
    rule: '六爻动',
    references: refs,
    explanation: '六爻皆动，以变卦卦辞断之。',
  };
}

function posName(pos: number): string {
  return ['初', '二', '三', '四', '五', '上'][pos];
}

/** 起卦主函数 */
export function divineCast(question?: string): CastResult {
  // 投掷六次
  const values: number[] = [];
  for (let i = 0; i < 6; i++) {
    values.push(backsToValue(castCoins()));
  }

  // 构建爻象
  const yaos: YaoResult[] = values.map((v, i) => ({
    value: v,
    position: i,
    is_yang: isYang(v),
    is_moving: isMoving(v),
    label: yaoLabel(v),
  }));

  // 本卦爻线
  const originalLines = values.map(v => isYang(v));
  const moving = yaos.filter(y => y.is_moving).map(y => y.position);

  // 查找本卦
  const original = findHexagram(originalLines);
  if (!original) {
    throw new Error('无法识别本卦');
  }

  // 变卦
  let changed: Hexagram | null = null;
  if (moving.length > 0 && moving.length < 6) {
    const changedLines = flipLines(originalLines, moving);
    changed = findHexagram(changedLines) || null;
  } else if (moving.length === 6) {
    const changedLines = originalLines.map(l => !l);
    changed = findHexagram(changedLines) || null;
  }

  // 解卦
  const reading = interpretCast(original, changed, moving);

  return {
    question: question || null,
    original,
    changed,
    yaos,
    moving,
    reading,
  };
}

/** 查询单卦详情 */
export function getHexagram(num: number): Hexagram | undefined {
  return hexagrams.find(h => h.num === num);
}
