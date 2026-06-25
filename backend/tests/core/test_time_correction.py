"""时间校正（夏令时 + 真太阳时）测试。

重点：证明校正会真实改变排盘结果（时柱），而非仅做表面文章。
"""
from __future__ import annotations

from datetime import datetime

import pytest

from app.core.bazi import build_chart
from app.core.bazi.birthplace import find_location, list_provinces
from app.core.bazi.time_correction import (
    correct_time,
    equation_of_time,
    is_cn_dst,
)


# ---------- 夏令时判定 ----------

@pytest.mark.parametrize("dt,expected", [
    (datetime(1991, 6, 15, 12, 0), True),     # 夏令时中
    (datetime(1992, 6, 15, 12, 0), False),    # 已取消
    (datetime(1991, 3, 15, 12, 0), False),    # 未开始
    (datetime(1991, 12, 15, 12, 0), False),   # 已结束
    (datetime(1986, 5, 4, 2, 0), True),       # 首年开始边界
    (datetime(1986, 5, 4, 1, 59), False),     # 首年开始前一刻
    (datetime(1986, 9, 14, 1, 59), True),     # 首年结束前一刻
    (datetime(1985, 6, 15, 12, 0), False),    # 实行前
])
def test_is_cn_dst(dt, expected):
    assert is_cn_dst(dt) is expected


# ---------- 均时差 ----------

def test_eot_extremes():
    """2月中约 -14，11月初约 +16，6月、4月附近约 0。"""
    assert equation_of_time(2024, 2, 12) < -13      # 全年最小附近
    assert equation_of_time(2024, 11, 3) > 15        # 全年最大附近
    assert abs(equation_of_time(2024, 6, 15)) < 1    # 接近 0


# ---------- 完整校正：经典例子 ----------

def test_correct_dst_reduces_one_hour():
    """夏令时 3:30 → 北京时间 2:30（经典例子）。"""
    r = correct_time(datetime(1991, 7, 15, 3, 30), longitude=120.0)
    assert r.dst_applied is True
    assert r.after_dst.hour == 2
    assert r.after_dst.minute == 30


def test_correct_longitude_offset():
    """成都经度校正约 -64 分钟；乌鲁木齐约 -130 分钟。"""
    r_chengdu = correct_time(datetime(2024, 6, 15, 12, 0), longitude=104.06)
    assert -65 < r_chengdu.longitude_offset_min < -62

    r_urumqi = correct_time(datetime(2024, 6, 15, 12, 0), longitude=87.62)
    assert -131 < r_urumqi.longitude_offset_min < -128


def test_correct_dst_assumed_override():
    """dst_assumed=True 强制视为夏令时（即使年份不在区间）。"""
    r = correct_time(datetime(2024, 6, 15, 10, 0), longitude=120.0, dst_assumed=True)
    assert r.dst_applied is True
    assert r.after_dst.hour == 9


# ---------- 出生地数据库 ----------

def test_birthplace_lookup():
    """省→市查表。"""
    loc = find_location("四川", "成都")
    assert loc is not None
    assert loc.longitude == 104.06

    # 带"市"后缀也能匹配
    assert find_location("四川", "成都市").longitude == 104.06
    # 去掉"市"也能匹配
    assert find_location("北京", "北京").longitude == 116.46

    # 找不到返回 None
    assert find_location("不存在", "某市") is None


def test_birthplace_covers_all_provinces():
    """覆盖全部省级行政区。"""
    provinces = list_provinces()
    assert len(provinces) >= 34
    for must_have in ["北京", "上海", "新疆", "西藏", "台湾", "香港"]:
        assert must_have in provinces


# ---------- 核心：校正确实改变排盘结果 ----------

def test_correction_changes_hour_pillar_urumqi():
    """乌鲁木齐经度差约2小时，会改变时柱。

    北京时间 2024-06-15 09:00 在乌鲁木齐：
      经度校正 -130 分钟 → 6:50 附近 → 卯时（5-7点）
    而不校正（按北京时间）9:00 → 巳时（9-11点）。
    两者的时柱地支不同。
    """
    # 不校正（默认经度120）
    chart_no = build_chart(2024, 6, 15, 9, 0, gender="m", calendar="solar",
                           longitude=120.0)
    # 校正（乌鲁木齐）
    chart_yes = build_chart(2024, 6, 15, 9, 0, gender="m", calendar="solar",
                            longitude=87.62, birthplace="新疆乌鲁木齐")

    zhi_no = chart_no.pillars["hour"].zhi
    zhi_yes = chart_yes.pillars["hour"].zhi
    # 时柱地支应不同（校正使其跨时辰）
    assert zhi_no != zhi_yes, (
        f"校正未改变时柱地支：不校正={zhi_no} 校正后={zhi_yes}"
    )
    # 校正信息记录正确
    assert chart_yes.time_correction is not None
    assert chart_yes.time_correction.applied is True
    assert chart_yes.time_correction.longitude == 87.62


def test_dst_changes_corrected_time():
    """夏令时还原确实改变了用于排盘的时间（减1小时）。

    夏令时单独减1小时，由于时辰宽2小时，不一定跨越时辰边界；
    但它确实改变了排盘所用的时刻。这里验证校正后时间差约1小时。
    """
    from datetime import datetime

    chart_dst = build_chart(1991, 7, 15, 10, 30, gender="m", calendar="solar",
                            dst_assumed=True)
    # dst_assumed=False + longitude=120：不触发校正流水线，time_correction 为 None；
    # 此时排盘直接用原始时间，用原始时间对比即可
    original = datetime(1991, 7, 15, 10, 30, 0)

    t_dst = datetime.strptime(chart_dst.time_correction.corrected_time, "%Y-%m-%d %H:%M:%S")
    diff_min = (original - t_dst).total_seconds() / 60
    # 还原比原始早约60分钟（减1小时 + 微小均时差）
    assert 55 < diff_min < 68, (
        f"夏令时还原时间差应为约60分钟，实际{diff_min}（原始{original} → 校正后{t_dst}）"
    )


def test_dst_plus_longitude_cross_hour_pillar():
    """夏令时 + 经度校正组合，可跨越时辰边界。

    乌鲁木齐（87.62°）1991夏令时 11:30 出生：
      - 不做任何校正：11:30（午时 11-13点）
      - 仅夏令时还原：10:30（巳时 9-11点）—— 已跨时辰
      - 夏令时+经度：10:30 - 130分 ≈ 8:20（辰时 7-9点）
    """
    # 不校正
    chart_none = build_chart(1991, 7, 15, 11, 30, gender="m", calendar="solar",
                             longitude=120.0, dst_assumed=False)
    # 仅夏令时
    chart_dst = build_chart(1991, 7, 15, 11, 30, gender="m", calendar="solar",
                            longitude=120.0, dst_assumed=True)
    # 夏令时 + 经度
    chart_full = build_chart(1991, 7, 15, 11, 30, gender="m", calendar="solar",
                             longitude=87.62, dst_assumed=True, birthplace="新疆乌鲁木齐")

    z_none = chart_none.pillars["hour"].zhi
    z_dst = chart_dst.pillars["hour"].zhi
    z_full = chart_full.pillars["hour"].zhi
    # 午(11-13) → 巳(9-11)：夏令时还原跨越
    assert z_none != z_dst, f"夏令时还原应跨时辰：{z_none} vs {z_dst}"
    # 巳 → 辰：再加经度校正再跨
    assert z_dst != z_full, f"经度校正应再跨时辰：{z_dst} vs {z_full}"


def test_no_correction_keeps_original_pillar():
    """经度120 + 非夏令时年份：排盘结果应与原始时间一致（仅均时差微调）。"""
    # 2023年非夏令时，经度120
    chart = build_chart(2023, 6, 15, 12, 0, gender="m", calendar="solar",
                        longitude=120.0)
    # 时柱应仍是午时附近（12:00 - 微小均时差，仍在午时 11-13点）
    assert chart.pillars["hour"].zhi == "午"


def test_correction_info_recorded():
    """校正信息完整记录。"""
    chart = build_chart(1991, 7, 15, 10, 0, gender="m", calendar="solar",
                        longitude=104.06, birthplace="四川成都")
    tc = chart.time_correction
    assert tc is not None
    assert tc.dst_applied is True
    assert "1991-07-15" in tc.original_time
    assert tc.longitude == 104.06
    assert tc.birthplace == "四川成都"
    assert tc.applied is True
