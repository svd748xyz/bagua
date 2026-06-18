"""八字排盘核心算法测试。

重点：用历史已知八字做回归，验证四柱、纳音、五行统计、大运方向。
"""
from __future__ import annotations

import pytest

from app.core.bazi import build_chart, count_elements, get_nayin
from app.core.bazi.elements import shishen


# ---------- 四柱回归（历史名人） ----------

def test_chart_mao_zedong():
    """毛泽东：公历 1893-12-26 辰时（7点），男。

    公认八字：癸巳 / 甲子 / 丁酉 / 甲辰
    """
    chart = build_chart(1893, 12, 26, 7, gender="m", calendar="solar")
    assert str(chart.pillars["year"]) == "癸巳"
    assert str(chart.pillars["month"]) == "甲子"
    assert str(chart.pillars["day"]) == "丁酉"
    assert str(chart.pillars["hour"]) == "甲辰"
    assert chart.day_master == "丁"


def test_chart_nayin():
    """毛泽东八字纳音：长流水 / 海中金 / 山下火 / 覆灯火。"""
    chart = build_chart(1893, 12, 26, 7, gender="m", calendar="solar")
    assert chart.nayin["year"] == "长流水"
    assert chart.nayin["month"] == "海中金"
    assert chart.nayin["day"] == "山下火"
    assert chart.nayin["hour"] == "覆灯火"


def test_chart_yun_direction():
    """毛泽东阴年男命，大运逆排。年干癸=阴，男命逆排。"""
    chart = build_chart(1893, 12, 26, 7, gender="m", calendar="solar")
    assert chart.yun is not None
    assert chart.yun.direction == "逆"
    assert chart.yun.start_age > 0


# ---------- 农历输入 ----------

def test_chart_lunar_input():
    """农历输入也能正确排盘：光绪十九年十一月十九辰时 应等价毛的八字。"""
    # 农历 1893 年十一月十九 = 公历 1893-12-26
    chart = build_chart(1893, 11, 19, 7, gender="m", calendar="lunar")
    assert str(chart.pillars["year"]) == "癸巳"
    assert str(chart.pillars["day"]) == "丁酉"


# ---------- 五行统计 ----------

def test_count_elements_mao():
    """毛泽东八字五行统计。

    四柱：癸巳 甲子 丁酉 甲辰
    天干：癸(水) 甲(木) 丁(火) 甲(木) → 水1 木2 火1
    地支：巳(火) 子(水) 酉(金) 辰(土) → 火1 水1 金1 土1
    合计：金1 木2 水2 火2 土1
    """
    chart = build_chart(1893, 12, 26, 7, gender="m", calendar="solar")
    el = count_elements(chart)
    assert el.counts == {"金": 1, "木": 2, "水": 2, "火": 2, "土": 1}
    assert el.total == 8


def test_count_elements_total_always_8():
    """任意八字五行总数应为 8（4 天干 + 4 地支本气）。"""
    chart = build_chart(2000, 6, 15, 12, gender="f", calendar="solar")
    el = count_elements(chart)
    assert el.total == 8


# ---------- 十神 ----------

@pytest.mark.parametrize(
    "day_master,other,expected",
    [
        ("丁", "甲", "正印"),    # 甲木生丁火，阴阳异 → 正印
        ("丁", "乙", "偏印"),    # 乙木生丁火，阴阳同 → 偏印(枭神)
        ("丁", "丙", "劫财"),    # 丙火与丁火同五行，阴阳异 → 劫财
        ("丁", "丁", "比肩"),    # 同 → 比肩
        ("丁", "壬", "正官"),    # 壬水克丁火，阴阳异 → 正官（丁壬合）
        ("丁", "癸", "七杀"),    # 癸水克丁火，阴阳同 → 七杀
        ("丁", "庚", "正财"),    # 丁火克庚金，阴阳异 → 正财
        ("丁", "戊", "伤官"),    # 丁火生戊土，阴阳异 → 伤官
    ],
)
def test_shishen(day_master, other, expected):
    assert shishen(day_master, other) == expected


# ---------- 纳音表 ----------

def test_nayin_table():
    assert get_nayin("甲", "子") == "海中金"
    assert get_nayin("壬", "辰") == "长流水"
    assert get_nayin("甲", "辰") == "覆灯火"


# ---------- 边界 ----------

def test_chart_invalid_calendar():
    with pytest.raises(ValueError):
        build_chart(2000, 1, 1, 12, calendar="xxx")


def test_chart_hour_boundaries():
    """子时（23点）与早子时边界不报错。"""
    chart = build_chart(2000, 1, 1, 23, gender="m", calendar="solar")
    assert chart.pillars["hour"] is not None


# ---------- 完整排盘字段回归（1990-01-01 午时，日主丙） ----------

def _chart90():
    return build_chart(1990, 1, 1, 12, gender="m", calendar="solar",
                       liunian_years=[2024, 2025])


def test_detail_hide_gan():
    """每柱藏干为非空列表，藏干十神数量与藏干一致。"""
    chart = _chart90()
    for key in ("year", "month", "day", "hour"):
        d = chart.details[key]
        assert len(d.hide_gan) >= 1, f"{key} 藏干不应为空"
        assert len(d.shishen_hide) == len(d.hide_gan), f"{key} 藏干十神数量不匹配"


def test_detail_day_shishen():
    """日柱天干十神应为"日主"（日干自身）；其余柱取自十神体系。"""
    chart = _chart90()
    assert chart.details["day"].shishen_gan == "日主"
    TEN = ("比肩", "劫财", "食神", "伤官", "偏财", "正财",
           "七杀", "正官", "偏印", "正印")
    for key in ("year", "month", "hour"):
        assert chart.details[key].shishen_gan in TEN, f"{key} 天干十神非法"


def test_detail_dishi_and_xunkong():
    """十二长生与空亡字段非空且合法。"""
    chart = _chart90()
    CHANGSHENG = {"长生", "沐浴", "冠带", "临官", "帝旺",
                  "衰", "病", "死", "墓", "绝", "胎", "养"}
    for key in ("year", "month", "day", "hour"):
        d = chart.details[key]
        assert d.dishi in CHANGSHENG, f"{key} 十二长生非法: {d.dishi}"
        assert d.xunkong, f"{key} 空亡为空"
        assert d.xun, f"{key} 旬为空"


def test_extra_three_pillars():
    """三垣（胎元/命宫/身宫）各为 2 字干支，纳音非空。"""
    chart = _chart90()
    for name in ("tai_yuan", "ming_gong", "shen_gong"):
        val = getattr(chart.extra, name)
        assert len(val) == 2, f"{name} 应为 2 字: {val}"
        assert val[0] in "甲乙丙丁戊己庚辛壬癸", f"{name} 天干非法"
    assert chart.extra.tai_yuan_nayin
    assert chart.extra.ming_gong_nayin
    assert chart.extra.shen_gong_nayin


def test_yun_full_dayun():
    """大运：起运岁为正，方向顺/逆，各柱年龄区间连续且每步十年。

    注：起运岁到首柱大运之间可能有 1 岁间隔（lunar-python 的实岁/虚岁差异），
    所以首柱 start_age 可能等于 start_age 或 start_age+1；之后各柱严格连续。
    """
    chart = _chart90()
    assert chart.yun is not None
    assert chart.yun.start_age > 0
    assert chart.yun.direction in ("顺", "逆")
    assert len(chart.yun.dayun) >= 4
    first = chart.yun.dayun[0]
    assert first.ganzhi and len(first.ganzhi) == 2
    assert abs(first.start_age - chart.yun.start_age) <= 1
    assert first.end_age == first.start_age + 9   # 每步十年
    prev_end = first.end_age
    for dy in chart.yun.dayun[1:]:
        assert dy.ganzhi and len(dy.ganzhi) == 2
        assert dy.start_age == prev_end + 1        # 后续各柱严格连续
        assert dy.end_age == dy.start_age + 9
        prev_end = dy.end_age


def test_liunian_shishen():
    """流年天干十神相对日主判定正确（1990-01-01 日主丙）。"""
    chart = _chart90()
    # 2024 甲辰，甲生丙（木生火），阴阳异 → 偏印
    l24 = [l for l in chart.liunian if l.year == 2024][0]
    assert l24.ganzhi == "甲辰"
    assert l24.shishen_gan == "偏印"
    # 2025 乙巳，乙生丙，阴阳同 → 正印
    l25 = [l for l in chart.liunian if l.year == 2025][0]
    assert l25.ganzhi == "乙巳"
    assert l25.shishen_gan == "正印"


def test_shensha_bing_yangren():
    """丙日主午时应带羊刃（丙羊刃在午，时支午）。"""
    from app.core.bazi import find_shensha
    chart = _chart90()
    ss = find_shensha(chart)
    assert isinstance(ss, dict)
    assert "羊刃" in ss, "丙日主午时应带羊刃(午)"


def test_shensha_mao():
    """毛泽东（丁酉日）神煞查询返回字典结构正确。"""
    from app.core.bazi import find_shensha
    chart = build_chart(1893, 12, 26, 7, gender="m", calendar="solar")
    ss = find_shensha(chart)
    assert isinstance(ss, dict)
