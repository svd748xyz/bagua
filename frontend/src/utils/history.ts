/** 本地历史记录管理 */

const HISTORY_KEY = "bagua_history";
const MAX_HISTORY = 20;

export interface HistoryItem {
  id: string;
  type: "divine" | "bazi";
  title: string;
  time: number; // timestamp
  data: unknown;
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistory(item: Omit<HistoryItem, "id" | "time">): void {
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
  };
  history.unshift(newItem);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function deleteHistory(id: string): void {
  const history = getHistory().filter((h) => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

/** 复制文本到剪贴板 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

/** 格式化八字结果为可分享文本 */
export function formatBaziForShare(data: import("../api/types").BaziResponse): string {
  const lines: string[] = [
    `【玄机阁 · 八字排盘】`,
    ``,
    `公历：${data.solar_display}`,
    `农历：${data.lunar_display}`,
    ``,
    `四柱：${Object.values(data.pillars).map((p) => `${p.gan}${p.zhi}`).join(" / ")}`,
    `日主：${data.day_master}`,
    ``,
  ];

  if (data.analysis?.wangshuai) {
    lines.push(`旺衰：${data.analysis.wangshuai.level}（${data.analysis.wangshuai.score}分）`);
  }
  if (data.analysis?.geju) {
    lines.push(`格局：${data.analysis.geju.name}`);
  }
  if (data.analysis?.yongshen) {
    lines.push(`用神：${data.analysis.yongshen.yongshen}  喜神：${data.analysis.yongshen.xishen}  忌神：${data.analysis.yongshen.jishen}`);
  }

  lines.push(``, `— 玄机阁 · 八卦占卜与八字排盘 —`);
  return lines.join("\n");
}

/** 格式化占卜结果为可分享文本 */
export function formatDivineForShare(data: import("../api/types").CastResponse): string {
  const lines: string[] = [
    `【玄机阁 · 金钱卦】`,
    ``,
  ];

  if (data.question) {
    lines.push(`问：${data.question}`, ``);
  }

  lines.push(`本卦：${data.original.name}（${data.original.unicode}）`);
  if (data.changed) {
    lines.push(`变卦：${data.changed.name}（${data.changed.unicode}）`);
  }
  if (data.moving.length > 0) {
    const pos = ["初", "二", "三", "四", "五", "上"];
    lines.push(`动爻：${data.moving.map((m) => pos[m]).join("、")}爻`);
  }

  lines.push(``, `解卦：${data.reading.explanation}`);
  if (data.reading.references.length > 0) {
    lines.push(``, `参考：`);
    data.reading.references.forEach((r) => lines.push(`· ${r}`));
  }

  lines.push(``, `— 玄机阁 · 八卦占卜与八字排盘 —`);
  return lines.join("\n");
}
