"""八字排盘时间校正：夏令时还原 + 真太阳时（经度 + 均时差）。

校正流水线：
    输入公历时间 + 出生地经度
        ↓
    [Step 1] 夏令时还原：若落 1986-1991 夏令时段 → 减 1 小时 → 北京时间
        ↓
    [Step 2] 经度校正：平太阳时 = 北京时间 + 4 × (经度 − 120) 分钟
        ↓
    [Step 3] 均时差校正：真太阳时 = 平太阳时 + EoT(日期)
        ↓
    输出：用于排盘的校正时间（真太阳时）

参考：
- 中国夏令时：1986-1991，硬编码具体起止日期（不用"第几个星期日"规则，避免歧义）
- 均时差公式：B = 2π(n−81)/365，EoT = 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)（分钟）
- 命理界主流：用真太阳时排盘（经度 + 均时差），尤其出生地偏离东经120°越大越必须校正
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta


# ---------- 中国夏令时（1986-1991）----------
# 起止日期硬编码，已用日历核算星期、交叉验证多来源。
# 切换时刻：开始日凌晨2:00拨快（2→3），结束日凌晨2:00（夏令时）拨回（2→1）。
# 判定区间：[开始日 02:00, 结束日 02:00) 之间出生的时间是夏令时（需减1小时）。
# 注意结束日是"夏令时名义下的2:00"，换算到北京时间轴即 [start, end) 用 datetime 直接比较即可。
# 这里 end 用"结束日"当天的 02:00（北京时间，因为拨回发生在那个时刻）。
# 实测：资料中 end 日期是结束日（那天凌晨拨回），故夏令时区间是 [start_date 02:00, end_date 02:00)。
_CN_DST_INTERVALS: list[tuple[int, datetime, datetime]] = [
    # (年份, 开始(拨快后即为夏令时), 结束(拨回前仍是夏令时))
    (1986, datetime(1986, 5, 4, 2, 0),  datetime(1986, 9, 14, 2, 0)),
    (1987, datetime(1987, 4, 12, 2, 0), datetime(1987, 9, 13, 2, 0)),
    (1988, datetime(1988, 4, 10, 2, 0), datetime(1988, 9, 11, 2, 0)),
    (1989, datetime(1989, 4, 16, 2, 0), datetime(1989, 9, 17, 2, 0)),
    (1990, datetime(1990, 4, 15, 2, 0), datetime(1990, 9, 16, 2, 0)),
    (1991, datetime(1991, 4, 14, 2, 0), datetime(1991, 9, 15, 2, 0)),
]


def is_cn_dst(dt: datetime) -> bool:
    """判断该时刻（按夏令时名义时间，即钟面显示时间）是否落在夏令时段。

    dt 是"出生时记录的时间"（即钟面显示）。若它在某年夏令时区间内，
    说明这是被拨快过的夏令时，需减1小时还原北京时间。
    """
    for _, start, end in _CN_DST_INTERVALS:
        if start <= dt < end:
            return True
    return False


# ---------- 均时差（Equation of Time）----------
def equation_of_time(year: int, month: int, day: int) -> float:
    """均时差（分钟）。全年波动约 −14.2（2月中）到 +16.4（11月初）。

    公式：B = 2π(n−81)/365，EoT = 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)
    n 为年积日（1月1日=1）。精度约 ±0.5 分钟，足够命理用。
    """
    n = _day_of_year(year, month, day)
    b = math.radians(360 * (n - 81) / 365)
    return 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b)


def _day_of_year(year: int, month: int, day: int) -> int:
    """该日是当年的第几天（1月1日=1）。"""
    return datetime(year, month, day).timetuple().tm_yday


# ---------- 真太阳时校正 ----------
@dataclass(frozen=True)
class TimeCorrectionResult:
    """时间校正结果，记录每一步以便展示给用户。"""

    original: datetime        # 用户输入的原始时间（钟面）
    after_dst: datetime       # 夏令时还原后的北京时间
    dst_applied: bool         # 是否做了夏令时还原
    longitude_offset_min: float  # 经度校正（分钟，正=东加）
    eot_min: float            # 均时差（分钟）
    corrected: datetime       # 最终用于排盘的真太阳时
    longitude: float          # 使用的经度（东经度数）


def correct_time(
    dt: datetime,
    *,
    longitude: float = 120.0,    # 出生地东经度数；默认120=北京时间基准，不校正
    dst_assumed: bool | None = None,
) -> TimeCorrectionResult:
    """把用户输入的出生时间校正为用于排盘的真太阳时。

    参数：
        dt: 用户输入的公历出生时间（钟面显示时间）
        longitude: 出生地东经度数（如北京116.46、上海121.5、成都104.06）
        dst_assumed:
            None  = 自动判断（按 1986-1991 夏令时日期表）
            True  = 强制视为夏令时（减1小时）
            False = 强制视为非夏令时（不减）

    返回 TimeCorrectionResult，含每步中间值与最终校正时间。
    """
    # Step 1: 夏令时还原
    dst_applied = (dst_assumed if dst_assumed is not None else is_cn_dst(dt))
    after_dst = dt - timedelta(hours=1) if dst_applied else dt

    # Step 2: 经度校正（平太阳时）
    longitude_offset_min = 4.0 * (longitude - 120.0)
    mean_solar = after_dst + timedelta(minutes=longitude_offset_min)

    # Step 3: 均时差（用夏令时还原后的日期，因为跨日可能发生）
    eot = equation_of_time(after_dst.year, after_dst.month, after_dst.day)
    true_solar = mean_solar + timedelta(minutes=eot)

    return TimeCorrectionResult(
        original=dt,
        after_dst=after_dst,
        dst_applied=dst_applied,
        longitude_offset_min=longitude_offset_min,
        eot_min=eot,
        corrected=true_solar,
        longitude=longitude,
    )
