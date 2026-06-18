/** 导出排盘结果为 Markdown 格式，供大模型解析 */

import type { BaziResponse, CastResponse } from "../api/types";

const PILLAR_LABELS: Record<string, string> = {
  year: "年柱", month: "月柱", day: "日柱", hour: "时柱",
};
const PILLAR_ORDER = ["year", "month", "day", "hour"] as const;
const POSITION_LABEL = ["初", "二", "三", "四", "五", "上"];

/** 导出八字排盘为 Markdown */
export function exportBaziMarkdown(data: BaziResponse): string {
  const lines: string[] = [];

  // 头部说明
  lines.push(
    `# 八字排盘报告`,
    ``,
    `> 本文档由「玄机阁」生成，包含完整的八字排盘数据。`,
    `> 请基于以下信息进行命理分析，注意：排盘数据为确定性算法结果，分析解读仅供参考。`,
    ``,
    `---`,
    ``,
  );

  // 基本信息
  lines.push(
    `## 基本信息`,
    ``,
    `| 项目 | 内容 |`,
    `|------|------|`,
    `| 公历 | ${data.solar_display} |`,
    `| 农历 | ${data.lunar_display} |`,
    `| 性别 | ${data.gender === "m" ? "男" : "女"} |`,
    `| 日主 | ${data.day_master} |`,
    ``,
  );

  // 四柱八字
  lines.push(`## 四柱八字`, ``);
  lines.push(`| 柱位 | 天干 | 阴阳 | 地支 | 阴阳 | 五行 | 纳音 |`);
  lines.push(`|------|------|------|------|------|------|------|`);
  for (const key of PILLAR_ORDER) {
    const d = data.details[key];
    lines.push(`| ${PILLAR_LABELS[key]} | ${d.gan} | ${d.gan_yinyang} | ${d.zhi} | ${d.zhi_yinyang} | ${data.wuxing[key]} | ${d.nayin} |`);
  }
  lines.push(``);

  // 排盘详情
  lines.push(`## 排盘详情`, ``);
  lines.push(`| 柱位 | 天干十神 | 藏干 | 藏干十神 | 十二长生 | 旬 | 空亡 |`);
  lines.push(`|------|----------|------|----------|----------|-----|------|`);
  for (const key of PILLAR_ORDER) {
    const d = data.details[key];
    lines.push(`| ${PILLAR_LABELS[key]} | ${d.shishen_gan} | ${d.hide_gan.join(" ")} | ${d.shishen_hide.join(" ")} | ${d.dishi} | ${d.xun} | ${d.xunkong} |`);
  }
  lines.push(``);

  // 三垣
  lines.push(
    `## 三垣（暗柱）`,
    ``,
    `| 名称 | 干支 | 纳音 | 含义 |`,
    `|------|------|------|------|`,
    `| 胎元 | ${data.extra.tai_yuan} | ${data.extra.tai_yuan_nayin} | 受孕之月，看先天体质 |`,
    `| 命宫 | ${data.extra.ming_gong} | ${data.extra.ming_gong_nayin} | 先天天赋、性格 |`,
    `| 身宫 | ${data.extra.shen_gong} | ${data.extra.shen_gong_nayin} | 后天体魄、中年行运 |`,
    ``,
  );

  // 大运
  if (data.yun && data.yun.dayun.length > 0) {
    lines.push(`## 大运`, ``);
    lines.push(`起运：${data.yun.start_age} 岁，${data.yun.direction}行排布`, ``);
    lines.push(`| 大运干支 | 十神 | 起始年龄 | 结束年龄 | 起始年份 |`);
    lines.push(`|----------|------|----------|----------|----------|`);
    for (const dy of data.yun.dayun) {
      lines.push(`| ${dy.ganzhi} | ${dy.shishen_gan} | ${dy.start_age} | ${dy.end_age} | ${dy.start_year} |`);
    }
    lines.push(``);
  }

  // 流年
  if (data.liunian.length > 0) {
    lines.push(`## 流年`, ``);
    lines.push(`| 年份 | 干支 | 天干十神 | 地支藏干 |`);
    lines.push(`|------|------|----------|----------|`);
    for (const l of data.liunian) {
      lines.push(`| ${l.year} | ${l.ganzhi} | ${l.shishen_gan} | ${l.hide_gan.join(" ")} |`);
    }
    lines.push(``);
  }

  // 神煞
  const shenshaEntries = Object.entries(data.shensha_detail || {});
  if (shenshaEntries.length > 0) {
    lines.push(`## 神煞`, ``);
    for (const [name, info] of shenshaEntries) {
      lines.push(`### ${name}`);
      lines.push(`- 所在柱位：${info.positions?.join("、")}`);
      if (info.含义) lines.push(`- 含义：${info.含义}`);
      if (info.特征) lines.push(`- 特征：${info.特征}`);
      lines.push(``);
    }
  }

  // 命理分析
  if (data.analysis?.wangshuai || data.analysis?.geju || data.analysis?.yongshen) {
    lines.push(`## 命理分析`, ``);

    if (data.analysis?.wangshuai) {
      const ws = data.analysis.wangshuai;
      lines.push(`### 日主旺衰`, ``);
      lines.push(`- 综合得分：${ws.score}/100`);
      lines.push(`- 旺衰等级：${ws.level}`);
      lines.push(`- 月令状态：${ws.month_state}`);
      lines.push(`- 通根数量：${ws.tonggen_count}`);
      lines.push(`- 得生数量：${ws.desheng_count}`);
      lines.push(`- 分析说明：${ws.description}`);
      lines.push(``);
    }

    if (data.analysis?.geju) {
      const gj = data.analysis.geju;
      lines.push(`### 格局`, ``);
      lines.push(`- 格局名称：${gj.name}`);
      lines.push(`- 格局说明：${gj.description}`);
      lines.push(``);
    }

    if (data.analysis?.yongshen) {
      const ys = data.analysis.yongshen;
      lines.push(`### 用神喜忌`, ``);
      lines.push(`- 用神：${ys.yongshen}`);
      lines.push(`- 喜神：${ys.xishen}`);
      lines.push(`- 忌神：${ys.jishen}`);
      lines.push(`- 分析说明：${ys.description}`);
      lines.push(``);
    }
  }

  // 五行力量
  if (data.analysis?.wuxing_strength) {
    const ws = data.analysis.wuxing_strength;
    lines.push(`## 五行力量分析`, ``);
    lines.push(`| 五行 | 力量占比 |`);
    lines.push(`|------|----------|`);
    for (const [wx, pct] of Object.entries(ws.normalized)) {
      lines.push(`| ${wx} | ${pct}% |`);
    }
    lines.push(``);
    lines.push(`- 最旺五行：${ws.strongest}`);
    lines.push(`- 最弱五行：${ws.weakest}`);
    lines.push(``);
  }

  // 五行分布（简化版）
  lines.push(`## 五行分布（天干+地支本气）`, ``);
  lines.push(`| 五行 | 数量 |`);
  lines.push(`|------|------|`);
  for (const [wx, count] of Object.entries(data.elements)) {
    lines.push(`| ${wx} | ${count} |`);
  }
  lines.push(``);

  // 术语索引
  lines.push(
    `---`,
    ``,
    `## 术语索引`,
    ``,
    `### 十神`,
    `- 正印：异性相生，代表正统学问、长辈关爱`,
    `- 偏印（枭神）：同性相生，代表偏门学问、独特才华`,
    `- 正官：异性相克，代表正当管束、地位、事业`,
    `- 七杀（偏官）：同性相克，代表压力、竞争、刚强`,
    `- 正财：异性相克，代表正当收入、稳定财源`,
    `- 偏财：同性相克，代表意外之财、投资、人缘`,
    `- 食神：同性相生，代表才华、口福、享受`,
    `- 伤官：异性相生，代表才华外露、反叛创新`,
    `- 比肩：同性同类，代表朋友、竞争`,
    `- 劫财：异性同类，代表争夺、破耗`,
    ``,
    `### 十二长生`,
    `- 长生：万物萌发，主新生、希望`,
    `- 沐浴：万物初生沐浴，主变化、桃花`,
    `- 冠带：万物渐荣，主进取、发展`,
    `- 临官：万物秀实，主事业有成`,
    `- 帝旺：万物成熟，主鼎盛、巅峰`,
    `- 衰：万物始衰，主衰退、收敛`,
    `- 病：万物病态，主困难、挑战`,
    `- 死：万物死绝，主终结、转化`,
    `- 墓：万物收藏入库，主积蓄、归宿`,
    `- 绝：万物绝灭，主断绝、转折`,
    `- 胎：万物结胎，主孕育、潜伏`,
    `- 养：万物养育，主滋养、培养`,
    ``,
    `### 五行`,
    `- 金：主义，主刚毅果断，对应肺、大肠`,
    `- 木：仁，主生发成长，对应肝、胆`,
    `- 水：主智，主流动灵活，对应肾、膀胱`,
    `- 火：主礼，主热情文明，对应心脏、小肠`,
    `- 土：主信，主稳重诚信，对应脾、胃`,
    ``,
    `---`,
    ``,
    `> 数据来源：玄机阁 · 八卦占卜与八字排盘`,
  );

  return lines.join("\n");
}

/** 导出金钱卦为 Markdown */
export function exportDivineMarkdown(data: CastResponse): string {
  const lines: string[] = [];

  // 头部说明
  lines.push(
    `# 金钱卦占卜报告`,
    ``,
    `> 本文档由「玄机阁」生成，包含完整的金钱卦起卦数据。`,
    `> 请基于以下信息进行卦象分析。本卦代表当前状况，变卦代表发展趋势，动爻是问题关键。`,
    ``,
    `---`,
    ``,
  );

  // 基本信息
  lines.push(`## 基本信息`, ``);
  if (data.question) {
    lines.push(`- 所问之事：${data.question}`);
  }
  lines.push(``);

  // 卦象总览
  lines.push(`## 卦象总览`, ``);
  lines.push(`| 项目 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 本卦 | ${data.original.name}（${data.original.unicode}） |`);
  if (data.changed) {
    lines.push(`| 变卦 | ${data.changed.name}（${data.changed.unicode}） |`);
  }
  if (data.moving.length > 0) {
    lines.push(`| 动爻 | ${data.moving.map((m) => POSITION_LABEL[m]).join("、")}爻 |`);
  }
  lines.push(``);

  // 六爻详情
  lines.push(`## 六爻详情`, ``);
  lines.push(`| 爻位 | 爻象 | 阴阳 | 动静 | 爻辞 |`);
  lines.push(`|------|------|------|------|------|`);
  for (const yao of [...data.yaos].reverse()) {
    const symbol = yao.is_yang ? "▄▄▄▄▄" : "▄▄　▄▄";
    const yinyang = yao.is_yang ? "阳" : "阴";
    const moving = yao.is_moving ? "动" : "静";
    const yaoText = data.original.yao[yao.position];
    lines.push(`| ${POSITION_LABEL[yao.position]}爻 | ${symbol} | ${yinyang} | ${moving} | ${yaoText} |`);
  }
  lines.push(``);

  // 解卦
  lines.push(`## 解卦（朱熹动爻法）`, ``);
  lines.push(`- 规则：${data.reading.rule}`);
  lines.push(`- 说明：${data.reading.explanation}`);
  lines.push(``);
  if (data.reading.references.length > 0) {
    lines.push(`### 参考辞`, ``);
    for (const ref of data.reading.references) {
      lines.push(`> ${ref}`, ``);
    }
  }

  // 本卦详情
  lines.push(`## 本卦：${data.original.name}`, ``);
  lines.push(`### 卦辞`, ``);
  lines.push(`> ${data.original.judgement}`, ``);
  lines.push(`### 彖传`, ``);
  lines.push(`> ${data.original.tuan}`, ``);
  lines.push(`### 大象传`, ``);
  lines.push(`> ${data.original.image}`, ``);
  lines.push(`### 六爻辞`, ``);
  for (const yaoText of data.original.yao) {
    lines.push(`- ${yaoText}`);
  }
  lines.push(``);

  // 变卦详情
  if (data.changed) {
    lines.push(`## 变卦：${data.changed.name}`, ``);
    lines.push(`### 卦辞`, ``);
    lines.push(`> ${data.changed.judgement}`, ``);
    lines.push(`### 彖传`, ``);
    lines.push(`> ${data.changed.tuan}`, ``);
    lines.push(`### 大象传`, ``);
    lines.push(`> ${data.changed.image}`, ``);
    lines.push(`### 六爻辞`, ``);
    for (const yaoText of data.changed.yao) {
      lines.push(`- ${yaoText}`);
    }
    lines.push(``);
  }

  // 动爻解释
  lines.push(`## 动爻解释`, ``);
  const movingCount = data.moving.length;
  const movingRules: Record<number, string> = {
    0: "六爻皆静，以本卦卦辞断之。事情比较稳定，按现有方向发展。",
    1: "一爻动，以本卦动爻爻辞断之。这是最清晰的卦象，动爻位置是问题关键。",
    2: "二爻动，以本卦两动爻爻辞合断，以上爻为主。有两个关键因素需要考虑。",
    3: "三爻动，以本卦卦辞与变卦卦辞合断。事情比较复杂，有多个变化因素。",
    4: "四爻动，以变卦两不动爻爻辞断，以下爻为主。事情变化很大，需关注不变的部分。",
    5: "五爻动，以变卦不动爻爻辞断。事情几乎全面变化，只有一个稳定因素。",
    6: "六爻皆动，乾卦用九、坤卦用六，其余以变卦卦辞断。事情将发生根本性转变。",
  };
  lines.push(movingRules[movingCount] || "");
  lines.push(``);

  // 术语索引
  lines.push(
    `---`,
    ``,
    `## 术语索引`,
    ``,
    `### 爻位含义`,
    `- 初爻：事物开始、萌芽阶段，代表基础、初心`,
    `- 二爻：事物发展阶段，代表自身能力、内在`,
    `- 三爻：事物转折点，代表危险、考验`,
    `- 四爻：事物进入新阶段，代表变革、选择`,
    `- 五爻：事物鼎盛期，代表成功、领导力`,
    `- 上爻：事物终结，代表极端、结果、转化`,
    ``,
    `### 阴阳爻`,
    `- 阳爻（▄▄▄▄▄）：刚健、积极、进取、主动`,
    `- 阴爻（▄▄　▄▄）：柔顺、包容、退守、被动`,
    ``,
    `### 动静`,
    `- 少阳/少阴：稳定不变的爻`,
    `- 老阳/老阴：将要变化的爻，是动爻`,
    ``,
    `---`,
    ``,
    `> 数据来源：玄机阁 · 八卦占卜与八字排盘`,
  );

  return lines.join("\n");
}

/** 下载为 .md 文件 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
