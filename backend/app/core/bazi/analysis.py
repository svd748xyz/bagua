"""八字进阶分析：五行强弱、日主旺衰、格局、用神喜忌。

这部分属于"进阶解析"，业界存在一定分歧，但基本框架（月令为纲、通根得助）是共识。
算法基于传统命理学的量化方法，提供参考性判断。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.core.bazi.chart import BaziChart, Pillar
from app.core.bazi.elements import (
    GAN_WUXING,
    GAN_YIN_YANG,
    ZHI_WUXING,
    WUXING_LIST,
    _GENERATE,
    _OVERCOME,
)


# ---------- 地支藏干力量表 ----------

# 地支藏干的力量分配：主气1.0、中气0.6、余气0.3
_ZHI_HIDE_STRENGTH: dict[str, dict[str, float]] = {
    "子": {"癸": 1.0},
    "丑": {"己": 1.0, "癸": 0.6, "辛": 0.3},
    "寅": {"甲": 1.0, "丙": 0.6, "戊": 0.3},
    "卯": {"乙": 1.0},
    "辰": {"戊": 1.0, "乙": 0.6, "癸": 0.3},
    "巳": {"丙": 1.0, "庚": 0.6, "戊": 0.3},
    "午": {"丁": 1.0, "己": 0.6},
    "未": {"己": 1.0, "丁": 0.6, "乙": 0.3},
    "申": {"庚": 1.0, "壬": 0.6, "戊": 0.3},
    "酉": {"辛": 1.0},
    "戌": {"戊": 1.0, "辛": 0.6, "丁": 0.3},
    "亥": {"壬": 1.0, "甲": 0.6},
}


# ---------- 月令旺相休囚死 ----------

# 每个五行在十二个月（地支）的状态
# 旺=当令最旺, 相=得生次旺, 休=休息, 囚=被克受制, 死=克令无气
_MONTH_STATE: dict[str, dict[str, str]] = {
    "木": {"寅": "旺", "卯": "旺", "辰": "休", "巳": "死", "午": "死",
           "未": "囚", "申": "囚", "酉": "囚", "戌": "休", "亥": "相", "子": "相", "丑": "休"},
    "火": {"寅": "相", "卯": "相", "辰": "死", "巳": "旺", "午": "旺",
           "未": "休", "申": "死", "酉": "死", "戌": "囚", "亥": "囚", "子": "囚", "丑": "死"},
    "土": {"寅": "死", "卯": "死", "辰": "旺", "巳": "相", "午": "相",
           "未": "旺", "申": "休", "酉": "休", "戌": "旺", "亥": "死", "子": "死", "丑": "旺"},
    "金": {"寅": "囚", "卯": "囚", "辰": "相", "巳": "休", "午": "休",
           "未": "相", "申": "旺", "酉": "旺", "戌": "相", "亥": "死", "子": "死", "丑": "相"},
    "水": {"寅": "休", "卯": "休", "辰": "死", "巳": "囚", "午": "囚",
           "未": "死", "申": "相", "酉": "相", "戌": "死", "亥": "旺", "子": "旺", "丑": "死"},
}


@dataclass(frozen=True)
class WuXingStrength:
    """五行力量分析结果。"""

    raw: dict[str, float]       # 各五行原始力量值
    normalized: dict[str, int]  # 归一化为百分比
    strongest: str              # 最旺的五行
    weakest: str                # 最弱的五行


@dataclass(frozen=True)
class RiZhuWangShuai:
    """日主旺衰分析结果。"""

    score: int                  # 综合得分（0-100）
    level: str                  # "偏旺" / "偏弱" / "中和" / "极旺" / "极弱"
    month_state: str            # 月令状态（旺/相/休/囚/死）
    tonggen_count: int          # 通根数量
    desheng_count: int          # 得生数量
    description: str            # 文字说明


@dataclass(frozen=True)
class GeJu:
    """格局分析结果。"""

    name: str                   # 格局名称
    description: str            # 格局说明


@dataclass(frozen=True)
class YongShen:
    """用神分析结果。"""

    yongshen: str               # 用神五行
    xishen: str                 # 喜神五行
    jishen: str                 # 忌神五行
    description: str            # 分析说明


def analyze_wuxing_strength(chart: BaziChart) -> WuXingStrength:
    """分析八字五行力量。

    计算方法：
    - 天干：1.0 分（得月令加 0.5）
    - 地支：按藏干力量分配（主气1.0、中气0.6、余气0.3）
    """
    scores: dict[str, float] = {w: 0.0 for w in WUXING_LIST}
    month_zhi = chart.pillars["month"].zhi

    for key in ("year", "month", "day", "hour"):
        p: Pillar = chart.pillars[key]
        # 天干力量
        gan_wx = GAN_WUXING[p.gan]
        gan_score = 1.0
        # 得月令加成
        if _MONTH_STATE.get(gan_wx, {}).get(month_zhi) == "旺":
            gan_score = 1.5
        elif _MONTH_STATE.get(gan_wx, {}).get(month_zhi) == "相":
            gan_score = 1.2
        scores[gan_wx] += gan_score

        # 地支藏干力量
        zhi = p.zhi
        hide_strength = _ZHI_HIDE_STRENGTH.get(zhi, {})
        for hgan, strength in hide_strength.items():
            hgan_wx = GAN_WUXING.get(hgan, "")
            if hgan_wx:
                scores[hgan_wx] += strength

    # 归一化为百分比
    total = sum(scores.values())
    if total == 0:
        normalized = {w: 20 for w in WUXING_LIST}
    else:
        normalized = {w: round(scores[w] / total * 100) for w in WUXING_LIST}

    strongest = max(scores, key=lambda k: scores[k])
    weakest = min(scores, key=lambda k: scores[k])

    return WuXingStrength(
        raw={k: round(v, 1) for k, v in scores.items()},
        normalized=normalized,
        strongest=strongest,
        weakest=weakest,
    )


def analyze_rizhu_wangshuai(chart: BaziChart) -> RiZhuWangShuai:
    """分析日主旺衰。

    综合考虑：
    1. 月令状态（最重要，占 40%）
    2. 通根（地支中有日主同五行的根，占 30%）
    3. 得生（天干地支中有生日主的五行，占 20%）
    4. 得助（天干中有与日主同五行的，占 10%）
    """
    day_master = chart.day_master
    dm_wx = GAN_WUXING[day_master]
    month_zhi = chart.pillars["month"].zhi

    # 1. 月令状态
    month_state = _MONTH_STATE.get(dm_wx, {}).get(month_zhi, "休")
    month_score = {"旺": 40, "相": 30, "休": 10, "囚": 0, "死": -10}.get(month_state, 10)

    # 2. 通根：地支藏干中有日主同五行
    tonggen_count = 0
    for key in ("year", "month", "day", "hour"):
        zhi = chart.pillars[key].zhi
        hide_strength = _ZHI_HIDE_STRENGTH.get(zhi, {})
        for hgan in hide_strength:
            if GAN_WUXING.get(hgan) == dm_wx:
                tonggen_count += 1
    tonggen_score = min(tonggen_count * 10, 30)

    # 3. 得生：有生日主的五行（生我者=印）
    sheng_wo = {k for k, v in _GENERATE.items() if v == dm_wx}
    desheng_count = 0
    for key in ("year", "month", "day", "hour"):
        p = chart.pillars[key]
        if GAN_WUXING.get(p.gan) in sheng_wo:
            desheng_count += 1
        zhi = p.zhi
        hide_strength = _ZHI_HIDE_STRENGTH.get(zhi, {})
        for hgan in hide_strength:
            if GAN_WUXING.get(hgan) in sheng_wo:
                desheng_count += 1
    desheng_score = min(desheng_count * 5, 20)

    # 4. 得助：天干中有与日主同五行
    dehelp_count = 0
    for key in ("year", "month", "hour"):  # 日柱自身不算
        if GAN_WUXING.get(chart.pillars[key].gan) == dm_wx:
            dehelp_count += 1
    dehelp_score = min(dehelp_count * 5, 10)

    # 综合得分
    score = 50 + month_score + tonggen_score + desheng_score + dehelp_score
    score = max(0, min(100, score))

    # 判断旺衰等级
    if score >= 75:
        level = "偏旺"
    elif score >= 60:
        level = "中和偏旺"
    elif score >= 45:
        level = "中和"
    elif score >= 30:
        level = "中和偏弱"
    else:
        level = "偏弱"

    # 极端情况
    if score >= 90:
        level = "极旺"
    elif score <= 10:
        level = "极弱"

    desc_parts = []
    desc_parts.append(f"日主{day_master}（{dm_wx}），生于{month_zhi}月，月令{month_state}")
    if tonggen_count > 0:
        desc_parts.append(f"地支有{tonggen_count}个根")
    if desheng_count > 0:
        desc_parts.append(f"得{desheng_count}处生扶")
    if dehelp_count > 0:
        desc_parts.append(f"天干有{dehelp_count}个同类")

    return RiZhuWangShuai(
        score=score,
        level=level,
        month_state=month_state,
        tonggen_count=tonggen_count,
        desheng_count=desheng_count,
        description="，".join(desc_parts) + f"。综合评定：{level}。",
    )


def analyze_geju(chart: BaziChart) -> GeJu:
    """分析八字格局。

    以月令透干取格（传统子平格局法）：
    - 月令本气透干 → 正格（正官格、七杀格、正印格、偏印格、食神格、伤官格、正财格、偏财格）
    - 月令本气不透 → 看中气、余气
    - 都不透 → 以月令本气取格
    """
    day_master = chart.day_master
    dm_wx = GAN_WUXING[day_master]
    month_zhi = chart.pillars["month"].zhi

    # 月令藏干
    from app.core.bazi.shensha import ZHI_HIDE_GAN
    month_hide = ZHI_HIDE_GAN.get(month_zhi, [])
    if not month_hide:
        return GeJu(name="未知格局", description="无法判断月令藏干")

    # 找月令透干：月令藏干在四柱天干中出现
    all_gans = [chart.pillars[k].gan for k in ("year", "month", "day", "hour")]

    # 按主气、中气、余气顺序查找透干
    from app.core.bazi.elements import shishen
    for hgan in month_hide:
        # 排除日干自身
        if hgan == day_master:
            continue
        if hgan in all_gans:
            ss = shishen(day_master, hgan)
            return GeJu(name=f"{ss}格", description=f"月令{month_zhi}藏{month_hide}，主气{month_hide[0]}透干，取{ss}格")

    # 都不透，以月令本气取格
    main_gan = month_hide[0]
    if main_gan == day_master:
        # 月令本气为日主自身，取建禄格
        return GeJu(name="建禄格", description=f"月令{month_zhi}为日主{day_master}之禄，取建禄格")

    ss = shishen(day_master, main_gan)
    return GeJu(name=f"{ss}格（本气）", description=f"月令{month_zhi}藏干不透，以本气{main_gan}取{ss}格")


def analyze_yongshen(chart: BaziChart, wangshuai: RiZhuWangShuai) -> YongShen:
    """分析用神喜忌。

    基本原则：
    - 日主偏旺：取克泄耗为用神（官杀、食伤、财），生扶为忌神（印、比劫）
    - 日主偏弱：取生扶为用神（印、比劫），克泄耗为忌神（官杀、食伤、财）
    - 日主中和：取调候用神（需结合季节）
    """
    day_master = chart.day_master
    dm_wx = GAN_WUXING[day_master]
    month_zhi = chart.pillars["month"].zhi

    # 我克者=财, 克我者=官杀, 我生者=食伤, 生我者=印, 同我者=比劫
    wo_ke = _GENERATE.get(dm_wx, "")  # 我克（财）
    ke_wo = {k for k, v in _OVERCOME.items() if v == dm_wx}  # 克我（官杀）
    wo_sheng = _OVERCOME.get(dm_wx, "")  # 我生（食伤）
    sheng_wo = {k for k, v in _GENERATE.items() if v == dm_wx}  # 生我（印）

    if wangshuai.score >= 60:
        # 偏旺：用克泄耗
        yongshen = list(ke_wo)[0] if ke_wo else wo_sheng  # 优先用官杀
        xishen = wo_ke  # 喜财（财生官杀）
        jishen = list(sheng_wo)[0] if sheng_wo else dm_wx  # 忌印
        desc = f"日主{day_master}（{dm_wx}）偏旺，取{yongshen}（官杀/食伤）为用神克制，{xishen}（财）为喜神生助用神，忌{jishen}（印/比劫）生扶。"
    elif wangshuai.score <= 40:
        # 偏弱：用生扶
        yongshen = list(sheng_wo)[0] if sheng_wo else dm_wx  # 优先用印
        xishen = dm_wx  # 喜比劫
        jishen = list(ke_wo)[0] if ke_wo else wo_sheng  # 忌官杀
        desc = f"日主{day_master}（{dm_wx}）偏弱，取{yongshen}（印）为用神生扶，{dm_wx}（比劫）为喜神帮助，忌{jishen}（官杀/食伤）克泄。"
    else:
        # 中和：取调候用神
        # 夏天（巳午未）用水润，冬天（亥子丑）用火暖
        if month_zhi in ("巳", "午", "未"):
            yongshen = "水"
            xishen = "金"
            jishen = "火"
            desc = f"日主{day_master}（{dm_wx}）中和，生于夏季（{month_zhi}月），取水为调候用神润泽命局。"
        elif month_zhi in ("亥", "子", "丑"):
            yongshen = "火"
            xishen = "木"
            jishen = "水"
            desc = f"日主{day_master}（{dm_wx}）中和，生于冬季（{month_zhi}月），取火为调候用神温暖命局。"
        else:
            yongshen = wo_ke if wo_ke else "金"
            xishen = list(sheng_wo)[0] if sheng_wo else "木"
            jishen = list(ke_wo)[0] if ke_wo else "水"
            desc = f"日主{day_master}（{dm_wx}）中和，取平衡用神。"

    return YongShen(
        yongshen=yongshen,
        xishen=xishen,
        jishen=jishen,
        description=desc,
    )


@dataclass(frozen=True)
class BaziAnalysis:
    """八字进阶分析汇总。"""

    wuxing_strength: WuXingStrength
    wangshuai: RiZhuWangShuai
    geju: GeJu
    yongshen: YongShen


def analyze_bazi(chart: BaziChart) -> BaziAnalysis:
    """执行完整的八字进阶分析。"""
    ws = analyze_wuxing_strength(chart)
    wshuai = analyze_rizhu_wangshuai(chart)
    gj = analyze_geju(chart)
    ys = analyze_yongshen(chart, wshuai)
    return BaziAnalysis(
        wuxing_strength=ws,
        wangshuai=wshuai,
        geju=gj,
        yongshen=ys,
    )
