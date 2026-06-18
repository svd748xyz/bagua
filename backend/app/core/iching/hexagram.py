"""6 爻 → 本卦/变卦/动爻。

卦序说明：数据文件用文王卦序（乾=1, 坤=2 ...），与"6爻当二进制算"
的二进制序完全不同。所以查卦一律走 lines 模式查表（数据驱动），
避免卦序计算与数据文件脱节。
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass

from app.core.data import get_hexagram_by_lines, get_hexagram_by_num
from app.core.iching.coin import (
    LAO_YANG,
    LAO_YIN,
    SHAO_YIN,
    SHAO_YANG,
    Yao,
    cast_coins,
    coins_to_yao,
)


def lines_to_num(lines: list[bool]) -> int:
    """6 爻（自下而上）→ 文王卦序 1-64。

    通过查表实现：先按 lines 找到卦，再返回其文王卦序 num。
    """
    return get_hexagram_by_lines(lines)["num"]


# 别名，保持对外接口稳定
line_to_hexagram_num = lines_to_num


@dataclass(frozen=True)
class Hexagram:
    """一卦的结构化数据快照。"""

    num: int                  # 1-64
    name: str
    unicode: str
    lines: list[bool]         # 自下而上 6 爻
    judgement: str            # 卦辞
    tuan: str                 # 彖传
    image: str                # 大象传
    yao: list[str]            # 6 条爻辞
    extra: str | None = None  # 用九/用六（仅乾坤）

    @classmethod
    def from_data(cls, data: dict) -> "Hexagram":
        return cls(
            num=data["num"],
            name=data["name"],
            unicode=data["unicode"],
            lines=list(data["lines"]),
            judgement=data["judgement"],
            tuan=data["tuan"],
            image=data["image"],
            yao=list(data["yao"]),
            extra=data.get("extra"),
        )


def _hexagram_from_lines(lines: list[bool]) -> Hexagram:
    """由 6 爻阴阳查表得到卦数据，构建 Hexagram。"""
    return Hexagram.from_data(get_hexagram_by_lines(lines))


@dataclass(frozen=True)
class HexagramCast:
    """一次完整的起卦结果。"""

    original: Hexagram        # 本卦
    changed: Hexagram | None  # 变卦（无动爻时为 None）
    yaos: list[Yao]           # 自下而上 6 爻（含动/静信息）
    moving: list[int]         # 动爻位置（0-5）

    @property
    def has_change(self) -> bool:
        return self.changed is not None


def cast_hexagram(
    rng: secrets.SystemRandom | None = None,
    *,
    values: list[int] | None = None,
) -> HexagramCast:
    """完成一次金钱卦起卦。

    - 默认用 SystemRandom 随机掷币 6 次。
    - values：可选，直接给定 6 个爻值（6/7/8/9），用于测试或确定性起卦。
    """
    yaos: list[Yao] = []
    if values is not None:
        if len(values) != 6:
            raise ValueError("values 必须是 6 个爻值")
        for i, v in enumerate(values):
            yaos.append(_value_to_yao_checked(v, position=i))
    else:
        for i in range(6):
            coins = cast_coins(rng)
            yaos.append(coins_to_yao(coins, position=i))

    # 本卦：取每爻阴阳
    original_lines = [y.is_yang for y in yaos]
    original = _hexagram_from_lines(original_lines)

    # 动爻
    moving = [y.position for y in yaos if y.is_moving]

    # 变卦：动爻阴阳翻转
    if moving:
        changed_lines = list(original_lines)
        for pos in moving:
            changed_lines[pos] = not changed_lines[pos]
        changed = _hexagram_from_lines(changed_lines)
    else:
        changed = None

    return HexagramCast(original=original, changed=changed, yaos=yaos, moving=moving)


def _value_to_yao_checked(value: int, position: int = 0) -> Yao:
    if value not in (LAO_YIN, SHAO_YANG, SHAO_YIN, LAO_YANG):
        raise ValueError(f"爻值必须是 6/7/8/9，收到 {value}")
    return Yao(value=value, position=position)
