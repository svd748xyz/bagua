"""金钱卦起卦：硬币 → 爻象。

传统金钱卦：每次同时掷三枚铜钱，只数背面（有字一面为正，无字一面为背）。
    背面数 0 → 老阴（6，动爻，阴变阳）
    背面数 1 → 少阳（7，静爻，阳）
    背面数 2 → 少阴（8，静爻，阴）
    背面数 3 → 老阳（9，动爻，阳变阴）

用 secrets.SystemRandom 作为随机源——密码学级随机，比 random 更不可预测，
符合占卜"不可预知"的语义，也避免普通 PRNG 可被预测而作弊。
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass

# 爻的数值表示：与《周易》传统数字（6/7/8/9）一致
LAO_YIN = 6   # 老阴：动，阴
SHAO_YANG = 7  # 少阳：静，阳
SHAO_YIN = 8   # 少阴：静，阴
LAO_YANG = 9   # 老阳：动，阳


@dataclass(frozen=True)
class Coins:
    """一次掷三枚铜钱的结果。tails=True 表示背面（无字面）。"""

    c1: bool
    c2: bool
    c3: bool

    @property
    def tails(self) -> int:
        """背面数量（0-3），决定爻象。"""
        return sum((self.c1, self.c2, self.c3))


@dataclass(frozen=True)
class Yao:
    """一爻。

    value: 6/7/8/9
    is_yang: True=阳爻，False=阴爻
    is_moving: True=动爻（老阴/老阳），会发生变化
    position: 0-5，第几爻（0=初爻，5=上爻）；起卦时由调用方填入
    """

    value: int
    position: int = 0

    @property
    def is_yang(self) -> bool:
        return self.value in (SHAO_YANG, LAO_YANG)

    @property
    def is_moving(self) -> bool:
        return self.value in (LAO_YIN, LAO_YANG)

    @property
    def label(self) -> str:
        """传统爻名：老阴/少阳/少阴/老阳。"""
        return {
            LAO_YIN: "老阴",
            SHAO_YANG: "少阳",
            SHAO_YIN: "少阴",
            LAO_YANG: "老阳",
        }[self.value]


# 背面数 → 爻值 的映射（金钱卦传统规则）
_TAILS_TO_VALUE: dict[int, int] = {
    0: LAO_YIN,    # 三正（无背）→ 老阴
    1: SHAO_YANG,  # 一背 → 少阳
    2: SHAO_YIN,   # 两背 → 少阴
    3: LAO_YANG,   # 三背 → 老阳
}


def cast_coins(rng: secrets.SystemRandom | None = None) -> Coins:
    """掷一次三枚铜钱，返回正反面结果。"""
    r = rng or secrets.SystemRandom()
    return Coins(
        c1=bool(r.getrandbits(1)),
        c2=bool(r.getrandbits(1)),
        c3=bool(r.getrandbits(1)),
    )


def coins_to_yao(coins: Coins, position: int = 0) -> Yao:
    """把一次掷币结果转为一爻。"""
    value = _TAILS_TO_VALUE[coins.tails]
    return Yao(value=value, position=position)


def value_to_yao(value: int, position: int = 0) -> Yao:
    """直接用 6/7/8/9 构造一爻（供测试与确定性起卦使用）。"""
    if value not in _TAILS_TO_VALUE.values():
        raise ValueError(f"爻值必须是 6/7/8/9，收到 {value}")
    return Yao(value=value, position=position)
