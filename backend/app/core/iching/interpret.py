"""动爻解卦规则（朱熹《易学启蒙》）。

朱熹根据动爻数量，给出了查阅卦辞/爻辞的标准规则：

    0 个动爻 → 以本卦卦辞断之（无变卦）
    1 个动爻 → 以本卦动爻爻辞断之
    2 个动爻 → 以本卦两个动爻爻辞断之，以上爻为主
    3 个动爻 → 以本卦卦辞、变卦卦辞合断之
    4 个动爻 → 以变卦两个不动爻爻辞断之，以下爻为主
    5 个动爻 → 以变卦不动爻爻辞断之
    6 个动爻：
        乾卦 → 以"用九"断之
        坤卦 → 以"用六"断之
        其余 → 以变卦卦辞断之

这套规则是占卦解卦的传统依据，写成纯函数便于单测回归。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.core.iching.hexagram import Hexagram, HexagramCast


@dataclass(frozen=True)
class Reading:
    """一次解卦结果：该参考哪些辞、原文、以及规则说明。"""

    rule: str                 # 规则名，如 "一爻动"
    references: list[str]     # 引用的辞（卦辞或爻辞原文）
    explanation: str          # 规则的文字说明


def _yao_text(hexagram: Hexagram, position: int) -> str:
    """取某爻爻辞。position 0-5 对应初到上爻。"""
    return hexagram.yao[position]


def interpret_cast(cast: HexagramCast) -> Reading:
    """根据动爻数量应用朱熹规则。"""
    moving = cast.moving
    n = len(moving)
    orig = cast.original
    changed = cast.changed

    if n == 0:
        return Reading(
            rule="无爻动",
            references=[orig.judgement],
            explanation="六爻皆静，以本卦卦辞断之。",
        )

    if n == 1:
        pos = moving[0]
        return Reading(
            rule="一爻动",
            references=[_yao_text(orig, pos)],
            explanation=f"一爻动，以本卦第{_pos_name(pos)}爻爻辞断之。",
        )

    if n == 2:
        # 两个动爻：本卦两动爻爻辞，以上爻为主
        refs = [_yao_text(orig, p) for p in sorted(moving)]
        return Reading(
            rule="二爻动",
            references=refs,
            explanation="二爻动，以本卦两动爻爻辞合断之，以上爻为主。",
        )

    if n == 3:
        refs = [orig.judgement]
        if changed is not None:
            refs.append(changed.judgement)
        return Reading(
            rule="三爻动",
            references=refs,
            explanation="三爻动，以本卦卦辞与变卦卦辞合断之。",
        )

    if n == 4:
        # 四爻动 → 变卦的两个不动爻。不动爻 = 全 6 爻去掉 4 个动爻后的 2 个
        all_pos = set(range(6))
        still = sorted(all_pos - set(moving))
        refs = []
        if changed is not None:
            refs = [_yao_text(changed, p) for p in still]
        return Reading(
            rule="四爻动",
            references=refs,
            explanation="四爻动，以变卦两不动爻爻辞断之，以下爻为主。",
        )

    if n == 5:
        # 五爻动 → 变卦的唯一不动爻
        all_pos = set(range(6))
        still = (all_pos - set(moving)).pop()
        refs = []
        if changed is not None:
            refs = [_yao_text(changed, still)]
        return Reading(
            rule="五爻动",
            references=refs,
            explanation=f"五爻动，以变卦第{_pos_name(still)}爻（不动爻）爻辞断之。",
        )

    # n == 6
    if orig.num in (1, 2) and orig.extra:
        special = "用九" if orig.num == 1 else "用六"
        return Reading(
            rule="六爻动（乾坤）",
            references=[orig.extra],
            explanation=f"六爻皆动，{orig.name[0]}卦以「{special}」断之。",
        )
    refs = [changed.judgement] if changed is not None else []
    return Reading(
        rule="六爻动",
        references=refs,
        explanation="六爻皆动，以变卦卦辞断之。",
    )


def _pos_name(position: int) -> str:
    """爻位序号 → 传统名称（初/二/三/四/五/上）。"""
    names = ["初", "二", "三", "四", "五", "上"]
    return names[position]
