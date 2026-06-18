"""金钱卦核心算法测试。

重点验证：
1. 硬币→爻象映射（金钱卦传统规则）
2. 6 爻 → 卦序映射（与权威卦例对照）
3. 动爻 → 变卦
4. 朱熹动爻解卦规则
"""
from __future__ import annotations

import pytest

from app.core.iching import (
    cast_hexagram,
    interpret_cast,
    line_to_hexagram_num,
)
from app.core.iching.coin import (
    LAO_YANG,
    LAO_YIN,
    SHAO_YIN,
    SHAO_YANG,
    Coins,
    Yao,
    coins_to_yao,
)


# ---------- 硬币 → 爻象 ----------

@pytest.mark.parametrize(
    "tails,expected_value,expected_yang,expected_moving",
    [
        (0, LAO_YIN, False, True),    # 三正 → 老阴
        (1, SHAO_YANG, True, False),  # 一背 → 少阳
        (2, SHAO_YIN, False, False),  # 两背 → 少阴
        (3, LAO_YANG, True, True),    # 三背 → 老阳
    ],
)
def test_coins_to_yao(tails, expected_value, expected_yang, expected_moving):
    # 构造指定背面数的 Coins
    bools = [True] * tails + [False] * (3 - tails)
    coins = Coins(bools[0], bools[1], bools[2])
    assert coins.tails == tails
    yao = coins_to_yao(coins)
    assert yao.value == expected_value
    assert yao.is_yang is expected_yang
    assert yao.is_moving is expected_moving


# ---------- 卦序映射（权威卦例对照） ----------

def test_lines_to_num_basic_trigrams():
    # 乾：六爻皆阳 → 1
    assert line_to_hexagram_num([True] * 6) == 1
    # 坤：六爻皆阴 → 2
    assert line_to_hexagram_num([False] * 6) == 2


def test_lines_to_num_jiji_weiji():
    # 水火既济（63）：自下而上 101010（阴阳交替，阳在初三五）
    assert line_to_hexagram_num([True, False, True, False, True, False]) == 63
    # 火水未济（64）：自下而上 010101
    assert line_to_hexagram_num([False, True, False, True, False, True]) == 64


# ---------- 动爻 → 变卦 ----------

def test_cast_no_moving_lines():
    """六爻皆静：无变卦。"""
    # 全少阳 → 本卦乾，无动爻
    cast = cast_hexagram(values=[SHAO_YANG] * 6)
    assert cast.original.num == 1  # 乾
    assert cast.moving == []
    assert cast.changed is None
    assert not cast.has_change


def test_cast_qian_to_gou():
    """经典卦例：乾之姤——初九动。

    乾卦（111111）初爻动（老阳9）→ 初爻变阴 → 011111 = 姤卦（44）。
    """
    # 初爻=老阳(动)，其余少阳
    cast = cast_hexagram(values=[LAO_YANG, SHAO_YANG, SHAO_YANG,
                                  SHAO_YANG, SHAO_YANG, SHAO_YANG])
    assert cast.original.num == 1   # 本卦乾
    assert cast.moving == [0]       # 初爻动
    assert cast.changed is not None
    assert cast.changed.num == 44   # 变卦姤


def test_cast_six_moving_dry_kun():
    """六爻皆动：乾变坤（用九），坤变乾（用六）。"""
    cast = cast_hexagram(values=[LAO_YANG] * 6)  # 六老阳
    assert cast.original.num == 1
    assert cast.moving == [0, 1, 2, 3, 4, 5]
    assert cast.changed.num == 2  # 乾→坤


# ---------- 朱熹动爻规则 ----------

def test_interpret_zero_moving():
    cast = cast_hexagram(values=[SHAO_YANG] * 6)  # 全静
    reading = interpret_cast(cast)
    assert reading.rule == "无爻动"
    assert len(reading.references) == 1
    assert "元" in reading.references[0]  # 乾卦辞


def test_interpret_one_moving():
    cast = cast_hexagram(values=[LAO_YANG] + [SHAO_YANG] * 5)  # 初爻动
    reading = interpret_cast(cast)
    assert reading.rule == "一爻动"
    # 应引用乾卦初九爻辞："潜龙勿用"
    assert any("潜龙勿用" in r for r in reading.references)


def test_interpret_six_moving_qian_uses_yongjiu():
    cast = cast_hexagram(values=[LAO_YANG] * 6)  # 乾六爻动
    reading = interpret_cast(cast)
    assert "用九" in reading.rule or "乾坤" in reading.rule
    assert any("见群龙无首" in r for r in reading.references)


def test_interpret_six_moving_kun_uses_yongliu():
    cast = cast_hexagram(values=[LAO_YIN] * 6)  # 坤六爻动
    reading = interpret_cast(cast)
    assert any("利永贞" in r for r in reading.references)


def test_interpret_three_moving_uses_both_judgements():
    """三爻动：本卦卦辞 + 变卦卦辞。"""
    # 初二三老阳（动），四五上少阳 → 本卦乾，变卦……
    cast = cast_hexagram(values=[LAO_YANG, LAO_YANG, LAO_YANG,
                                  SHAO_YANG, SHAO_YANG, SHAO_YANG])
    reading = interpret_cast(cast)
    assert reading.rule == "三爻动"
    assert len(reading.references) == 2  # 本卦 + 变卦卦辞
