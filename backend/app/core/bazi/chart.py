"""八字四柱排盘（完整版）。

基于 lunar-python 的 Solar/Lunar 与 EightChar：
    - 公历/农历输入 → 四柱天干地支
    - 日主（日柱天干）
    - 地支藏干（人元：主气/中气/余气）
    - 十神（天干十神 + 藏干十神）
    - 纳音、空亡（旬空）、旬
    - 十二长生（每柱地支相对日干）
    - 胎元、命宫、身宫（三垣）
    - 大运（起运岁数、顺逆、每柱干支+年龄区间）
"""
from __future__ import annotations

from dataclasses import dataclass, field

from lunar_python import Lunar, Solar


@dataclass(frozen=True)
class Pillar:
    """一柱：天干 + 地支。"""

    gan: str  # 天干，如 "甲"
    zhi: str  # 地支，如 "子"

    def __str__(self) -> str:
        return f"{self.gan}{self.zhi}"


@dataclass(frozen=True)
class PillarDetail:
    """一柱的完整排盘信息。"""

    gan: str                  # 天干
    zhi: str                  # 地支
    gan_wuxing: str           # 天干五行（如"木"）
    gan_yinyang: str          # 天干阴阳（"阳"/"阴"）
    zhi_wuxing: str           # 地支五行（本气）
    zhi_yinyang: str          # 地支阴阳（"阳"/"阴"）
    hide_gan: list[str]       # 地支藏干（主气/中气/余气）
    shishen_gan: str          # 天干十神（相对日主）
    shishen_hide: list[str]   # 藏干十神（对应 hide_gan 顺序）
    nayin: str                # 纳音
    dishi: str                # 十二长生（地支相对日干）
    xun: str                  # 旬（如"甲子"）
    xunkong: str              # 空亡（旬空，如"戌亥"）


@dataclass(frozen=True)
class DaYunPillar:
    """一步大运。"""

    ganzhi: str       # 大运干支
    shishen_gan: str  # 大运天干十神（相对日主）
    start_age: int    # 起岁
    end_age: int      # 止岁
    start_year: int   # 起始公历年


@dataclass(frozen=True)
class YunInfo:
    """大运起运信息 + 完整排布。"""

    start_age: int              # 起运岁数
    direction: str              # "顺" / "逆"
    dayun: list[DaYunPillar]    # 各步大运


@dataclass(frozen=True)
class LiuNian:
    """一步流年。"""

    year: int          # 公历年
    ganzhi: str        # 流年干支
    shishen_gan: str   # 流年天干十神（相对日主）
    zhi: str           # 流年地支
    hide_gan: list[str]  # 流年地支藏干
    shishen_hide: list[str]  # 流年地支藏干十神


@dataclass(frozen=True)
class ExtraPillars:
    """三垣：胎元、命宫、身宫。"""

    tai_yuan: str         # 胎元
    tai_yuan_nayin: str
    ming_gong: str        # 命宫
    ming_gong_nayin: str
    shen_gong: str        # 身宫
    shen_gong_nayin: str


@dataclass(frozen=True)
class BaziChart:
    """完整的八字排盘结果。

    pillars/day_master/nayin/wuxing/gender 等保留向后兼容；
    details 是每柱的完整信息（含藏干/十神/空亡/十二长生）；
    extra 是三垣；yun 含完整大运排布；liunian 为指定年份的流年。
    """

    pillars: dict[str, Pillar]   # year/month/day/hour（向后兼容）
    day_master: str
    nayin: dict[str, str]        # 向后兼容
    wuxing: dict[str, str]       # 向后兼容
    gender: str
    solar_display: str
    lunar_display: str
    # 新增完整字段
    details: dict[str, PillarDetail]
    extra: ExtraPillars
    yun: YunInfo | None = None
    liunian: list[LiuNian] = field(default_factory=list)
    # 时间校正信息（夏令时 + 真太阳时）
    time_correction: "TimeCorrectionInfo | None" = None


@dataclass(frozen=True)
class TimeCorrectionInfo:
    """时间校正信息，展示给用户说明排盘用的是哪个时间。"""

    original_time: str          # 用户输入的原始时间
    corrected_time: str         # 校正后用于排盘的真太阳时
    dst_applied: bool           # 是否做了夏令时还原
    longitude: float            # 使用的经度
    longitude_offset_min: float # 经度校正（分钟）
    eot_min: float              # 均时差（分钟）
    applied: bool               # 是否实际做了校正（经度≠120 或夏令时）
    birthplace: str             # 出生地显示名


_PILLAR_KEYS = ("Year", "Month", "Day", "Time")
_PILLAR_OUT = ("year", "month", "day", "hour")


def _pillar_from(ec, key: str) -> Pillar:
    gan = getattr(ec, f"get{key}Gan")()
    zhi = getattr(ec, f"get{key}Zhi")()
    return Pillar(gan=gan, zhi=zhi)


def _detail_from(ec, key: str) -> PillarDetail:
    """从 EightChar 取一柱的完整信息。"""
    from app.core.bazi.elements import ZHI_WUXING, GAN_YIN_YANG, ZHI_YIN_YANG
    zhi = getattr(ec, f"get{key}Zhi")()
    gan = getattr(ec, f"get{key}Gan")()
    return PillarDetail(
        gan=gan,
        zhi=zhi,
        gan_wuxing=getattr(ec, f"get{key}WuXing")(),
        gan_yinyang=GAN_YIN_YANG.get(gan, ""),
        zhi_wuxing=ZHI_WUXING.get(zhi, ""),
        zhi_yinyang=ZHI_YIN_YANG.get(zhi, ""),
        hide_gan=list(getattr(ec, f"get{key}HideGan")()),
        shishen_gan=getattr(ec, f"get{key}ShiShenGan")(),
        shishen_hide=list(getattr(ec, f"get{key}ShiShenZhi")()),
        nayin=getattr(ec, f"get{key}NaYin")(),
        dishi=getattr(ec, f"get{key}DiShi")(),
        xun=getattr(ec, f"get{key}Xun")(),
        xunkong=getattr(ec, f"get{key}XunKong")(),
    )


def build_chart(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int = 0,
    *,
    calendar: str = "solar",
    gender: str = "m",
    liunian_years: list[int] | None = None,
    longitude: float = 120.0,
    dst_assumed: bool | None = None,
    birthplace: str = "",
) -> BaziChart:
    """构建八字排盘。

    calendar: "solar"(公历) / "lunar"(农历)
    gender:   "m" / "f"，决定大运顺逆排
    liunian_years: 需要排流年的公历年份列表（默认取起运后 6 步对应的若干年）

    时间校正参数（仅对公历生效）：
        longitude:   出生地东经度数（默认 120=北京时间基准，不校正）
        dst_assumed: 夏令时处理
                     None  = 自动判断（按 1986-1991 夏令时日期表）
                     True  = 强制视为夏令时（减1小时）
                     False = 强制视为非夏令时
        birthplace:  出生地显示名（仅记录用，实际校正用 longitude）

    校正流水线：夏令时还原 → 经度校正 → 均时差 → 得到真太阳时，用于排盘。
    """
    from datetime import datetime
    from app.core.bazi.time_correction import correct_time, is_cn_dst

    if calendar == "solar":
        # 判断是否需要做时间校正
        need_correction = (
            abs(longitude - 120.0) > 0.001      # 出生地不在北京时间基准经线
            or (dst_assumed is True)              # 用户明确说"是夏令时"
            or (dst_assumed is None and is_cn_dst(datetime(year, month, day, hour, minute)))
            # ↑ 默认自动判定，日期落在夏令时区间则校正
        )
        if need_correction:
            original = datetime(year, month, day, hour, minute, 0)
            correction = correct_time(original, longitude=longitude, dst_assumed=dst_assumed)
            c = correction.corrected
            solar = Solar.fromYmdHms(c.year, c.month, c.day, c.hour, c.minute, c.second)
        else:
            correction = None
            solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
        lunar = solar.getLunar()
    elif calendar == "lunar":
        # 农历：不做夏令时/真太阳时校正（农历输入本身已是确定时间）
        correction = None
        lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0)
        solar = lunar.getSolar()
    else:
        raise ValueError(f"calendar 必须是 solar/lunar，收到 {calendar}")

    ec = lunar.getEightChar()

    # 向后兼容字段
    pillars = {k: _pillar_from(ec, k) for k in _PILLAR_KEYS}
    pillar_map = dict(zip(_PILLAR_OUT, pillars.values()))
    nayin = {out: getattr(ec, f"get{pk}NaYin")() for out, pk in zip(_PILLAR_OUT, _PILLAR_KEYS)}
    wuxing = {out: getattr(ec, f"get{pk}WuXing")() for out, pk in zip(_PILLAR_OUT, _PILLAR_KEYS)}

    # 每柱完整信息
    details = {out: _detail_from(ec, pk) for out, pk in zip(_PILLAR_OUT, _PILLAR_KEYS)}

    # 三垣
    extra = ExtraPillars(
        tai_yuan=ec.getTaiYuan(),
        tai_yuan_nayin=ec.getTaiYuanNaYin(),
        ming_gong=ec.getMingGong(),
        ming_gong_nayin=ec.getMingGongNaYin(),
        shen_gong=ec.getShenGong(),
        shen_gong_nayin=ec.getShenGongNaYin(),
    )

    # 大运
    yun = _build_yun(ec, gender)

    # 流年
    if liunian_years is None:
        liunian_years = _default_liunian_years(yun)
    liunian = _build_liunian(ec, lunar, liunian_years)

    # 构造时间校正信息（公历且确实校正时才有）
    time_correction_info: TimeCorrectionInfo | None = None
    if correction is not None:
        applied = correction.dst_applied or abs(correction.longitude_offset_min) > 0.01
        time_correction_info = TimeCorrectionInfo(
            original_time=correction.original.strftime("%Y-%m-%d %H:%M:%S"),
            corrected_time=correction.corrected.strftime("%Y-%m-%d %H:%M:%S"),
            dst_applied=correction.dst_applied,
            longitude=correction.longitude,
            longitude_offset_min=correction.longitude_offset_min,
            eot_min=correction.eot_min,
            applied=applied,
            birthplace=birthplace,
        )

    return BaziChart(
        pillars=pillar_map,
        day_master=pillars["Day"].gan,
        nayin=nayin,
        wuxing=wuxing,
        gender=gender,
        solar_display=solar.toString(),
        lunar_display=lunar.toString(),
        details=details,
        extra=extra,
        yun=yun,
        liunian=liunian,
        time_correction=time_correction_info,
    )


def _build_yun(ec, gender: str) -> YunInfo | None:
    """构建完整大运排布。"""
    from app.core.bazi.elements import shishen
    try:
        yun = ec.getYun(1 if gender == "m" else 0)
        start_age = yun.getStartYear()
        direction = "顺" if yun.isForward() else "逆"
        da_yun_list = yun.getDaYun()
        day_master = ec.getDayGan()
        dayun: list[DaYunPillar] = []
        # 索引 0 是占位（干支为空），真正的首柱大运在索引 1
        for d in da_yun_list[1:]:
            gz = d.getGanZhi()
            if not gz:
                continue
            dy_gan = gz[0] if len(gz) >= 1 else ""
            dayun.append(DaYunPillar(
                ganzhi=gz,
                shishen_gan=shishen(day_master, dy_gan) if dy_gan else "",
                start_age=d.getStartAge(),
                end_age=d.getEndAge(),
                start_year=d.getStartYear(),
            ))
        return YunInfo(start_age=start_age, direction=direction, dayun=dayun)
    except Exception:
        return None


def _default_liunian_years(yun: YunInfo | None) -> list[int]:
    """默认流年：取当前年份及前后若干年。"""
    from datetime import date
    today = date.today()
    center = today.year
    return list(range(center - 2, center + 5))


def _build_liunian(ec, lunar, years: list[int]) -> list[LiuNian]:
    """构建指定年份的流年。用日干十神判定规则计算流年天干十神。"""
    from app.core.bazi.elements import shishen
    from app.core.bazi.shensha import ZHI_HIDE_GAN
    day_master = ec.getDayGan()
    result: list[LiuNian] = []
    # 年柱地支从农历年取，天干用六十甲子推
    for y in years:
        try:
            ly = Lunar.fromYmdHms(y, 6, 15, 12, 0, 0)  # 取年中稳定点
            gz = ly.getYearInGanZhiExact()
            gan = gz[0]
            zhi = gz[1] if len(gz) >= 2 else ""
            hide = ZHI_HIDE_GAN.get(zhi, [])
            shishen_hide = [shishen(day_master, h) for h in hide]
            result.append(LiuNian(
                year=y,
                ganzhi=gz,
                shishen_gan=shishen(day_master, gan),
                zhi=zhi,
                hide_gan=hide,
                shishen_hide=shishen_hide,
            ))
        except Exception:
            continue
    return result
