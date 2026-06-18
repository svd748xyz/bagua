"""五行统计与十神关系。

五行：金 木 水 火 土
天干→五行：甲乙木 / 丙丁火 / 戊己土 / 庚辛金 / 壬癸水
地支→五行（本气）：寅卯木 / 巳午火 / 申酉金 / 亥子水 / 辰戌丑未土

十神：以日主为基准，根据其他干支与日主的生克关系判定
    生我=印（正印/偏印=枭神）
    我生=食伤（食神/伤官）
    克我=官杀（正官/七杀）
    我克=财（正财/偏财）
    同我=比劫（比肩/劫财）
阴阳相同=偏，阴阳相异=正。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.core.bazi.chart import BaziChart, Pillar

GAN_WUXING: dict[str, str] = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水",
}

ZHI_WUXING: dict[str, str] = {
    "寅": "木", "卯": "木",
    "巳": "火", "午": "火",
    "申": "金", "酉": "金",
    "亥": "水", "子": "水",
    "辰": "土", "戌": "土", "丑": "土", "未": "土",
}

GAN_YIN_YANG: dict[str, str] = {
    "甲": "阳", "丙": "阳", "戊": "阳", "庚": "阳", "壬": "阳",
    "乙": "阴", "丁": "阴", "己": "阴", "辛": "阴", "癸": "阴",
}

ZHI_YIN_YANG: dict[str, str] = {
    "子": "阳", "寅": "阳", "辰": "阳", "午": "阳", "申": "阳", "戌": "阳",
    "丑": "阴", "卯": "阴", "巳": "阴", "未": "阴", "酉": "阴", "亥": "阴",
}

WUXING_LIST = ["金", "木", "水", "火", "土"]


@dataclass(frozen=True)
class Elements:
    """五行计数（仅按天干+地支本气，简化版，足够 MVP 展示）。"""

    counts: dict[str, int]   # {"金":2,"木":1,...}
    total: int               # 总数（应为 8：4干+4支）

    def strongest(self) -> str:
        """最旺的五行。"""
        return max(self.counts.items(), key=lambda kv: kv[1])[0]


def count_elements(chart: BaziChart) -> Elements:
    """统计八字四柱的五行（天干 + 地支本气）。"""
    counts = {w: 0 for w in WUXING_LIST}
    for key in ("year", "month", "day", "hour"):
        pillar: Pillar = chart.pillars[key]
        counts[GAN_WUXING[pillar.gan]] += 1
        counts[ZHI_WUXING[pillar.zhi]] += 1
    total = sum(counts.values())
    return Elements(counts=counts, total=total)


# 十神判定：返回该天干相对日主的关系名
def shishen(day_master: str, other_gan: str) -> str:
    """计算 other_gan 相对日主 day_master 的十神。"""
    me = GAN_WUXING[day_master]
    other = GAN_WUXING[other_gan]
    same_yy = GAN_YIN_YANG[day_master] == GAN_YIN_YANG[other_gan]

    if me == other:
        return "比肩" if same_yy else "劫财"
    # 生我
    if _generates(other, me):
        return "偏印" if same_yy else "正印"
    # 我生
    if _generates(me, other):
        return "食神" if same_yy else "伤官"
    # 克我
    if _overcomes(other, me):
        return "七杀" if same_yy else "正官"
    # 我克
    if _overcomes(me, other):
        return "偏财" if same_yy else "正财"
    raise ValueError(f"无法判定十神：{day_master} vs {other_gan}")


# 五行相生：木生火 火生土 土生金 金生水 水生木
_GENERATE: dict[str, str] = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
# 五行相克：木克土 土克水 水克火 火克金 金克木
_OVERCOME: dict[str, str] = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}


def _generates(a: str, b: str) -> bool:
    """a 是否生 b。"""
    return _GENERATE.get(a) == b


def _overcomes(a: str, b: str) -> bool:
    """a 是否克 b。"""
    return _OVERCOME.get(a) == b
