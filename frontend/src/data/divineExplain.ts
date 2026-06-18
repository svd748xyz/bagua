/** 金钱卦白话解释数据 */

export const YAO_POSITION_EXPLAIN: Record<string, string> = {
  初: "初爻代表事物的开始、萌芽阶段，处于最底层，代表基础、初心",
  二: "二爻代表事物的发展阶段，处于内卦中位，代表自身能力、内在",
  三: "三爻代表事物的转折点，处于内卦之顶，代表危险、考验",
  四: "四爻代表事物进入新阶段，处于外卦之始，代表变革、选择",
  五: "五爻代表事物的鼎盛，处于外卦中位，代表君位、成功、领导力",
  上: "上爻代表事物的终结，处于最顶层，代表极端、结果、转化",
};

export const YIN_YANG_YAO_EXPLAIN: Record<string, string> = {
  阳: "阳爻（▄▄▄▄▄）代表刚健、积极、进取、主动的力量",
  阴: "阴爻（▄▄　▄▄）代表柔顺、包容、退守、被动的力量",
};

export const MOVING_YAO_EXPLAIN: Record<string, string> = {
  老阳: "老阳是阳极将变阴的爻，代表事物发展到极致即将转化",
  老阴: "老阴是阴极将变阳的爻，代表事物发展到极致即将转化",
  少阳: "少阳是稳定的阳爻，代表事物处于上升期",
  少阴: "少阴是稳定的阴爻，代表事物处于平稳期",
};

export const HEXAGRAM_BASICS = {
  本卦: "本卦代表当前的状况、问题的本质",
  变卦: "变卦代表事物发展的趋势、未来可能的结果",
  动爻: "动爻是变化的爻，代表问题的关键所在，是解卦的重点",
};

export const ZHU_XI_RULES: Record<number, { rule: string; explain: string }> = {
  0: {
    rule: "无爻动",
    explain: "六爻都没有变化，说明事情比较稳定，以本卦卦辞来判断。这时事情可能不会有太大变化，按现有方向发展。",
  },
  1: {
    rule: "一爻动",
    explain: "只有一个爻变化，这是最清晰的卦象。以本卦动爻的爻辞来判断，动爻所在的位置就是问题的关键。",
  },
  2: {
    rule: "二爻动",
    explain: "有两个爻变化，以上方的动爻为主来判断。说明事情有两个关键因素需要考虑。",
  },
  3: {
    rule: "三爻动",
    explain: "有三个爻变化，需要结合本卦和变卦的卦辞来综合判断。说明事情比较复杂，有多个变化因素。",
  },
  4: {
    rule: "四爻动",
    explain: "有四个爻变化，以变卦中不变的两个爻来判断，以下方的为主。说明事情变化很大，需要关注不变的部分。",
  },
  5: {
    rule: "五爻动",
    explain: "有五个爻变化，以变卦中唯一不变的爻来判断。说明事情几乎全面变化，只有一个稳定的因素。",
  },
  6: {
    rule: "六爻动",
    explain: "六个爻全部变化，这是极端的情况。乾卦用'用九'，坤卦用'用六'，其他卦以变卦卦辞判断。说明事情将发生根本性的转变。",
  },
};

export function getMovingYaoExplain(label: string): string {
  if (label.includes("老阳")) return MOVING_YAO_EXPLAIN["老阳"];
  if (label.includes("老阴")) return MOVING_YAO_EXPLAIN["老阴"];
  if (label.includes("少阳")) return MOVING_YAO_EXPLAIN["少阳"];
  if (label.includes("少阴")) return MOVING_YAO_EXPLAIN["少阴"];
  return "";
}

export function getTrigramMeaning(name: string): string {
  const meanings: Record<string, string> = {
    乾: "乾为天，代表刚健、创造、领导",
    坤: "坤为地，代表包容、顺从、承载",
    震: "震为雷，代表震动、行动、奋起",
    巽: "巽为风，代表渗透、顺从、柔和",
    坎: "坎为水，代表危险、智慧、流动",
    离: "离为火，代表光明、美丽、依附",
    艮: "艮为山，代表停止、稳定、阻止",
    兑: "兑为泽，代表喜悦、沟通、润泽",
  };
  return meanings[name] || "";
}
