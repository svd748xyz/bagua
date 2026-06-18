"""64 卦等静态数据加载。

卦序说明：数据文件采用文王卦序（传统卦序），乾=1, 坤=2, 屯=3 ...
这是用户认知里的"第几卦"。二进制序（把6爻当二进制算）与文王序
完全不同，因此查卦一律走 lines 模式查表，不做二进制计算。
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).parent


@lru_cache
def load_hexagrams() -> list[dict]:
    """加载 64 卦数据，返回按 num(文王卦序) 排序的列表。"""
    with (_DATA_DIR / "64hexagrams.json").open(encoding="utf-8") as f:
        data = json.load(f)
    # 兼容两种结构：数组 或 {"hexagrams": [...]}
    if isinstance(data, dict) and "hexagrams" in data:
        data = data["hexagrams"]
    return sorted(data, key=lambda h: h["num"])


def get_hexagram_by_num(num: int) -> dict:
    """按文王卦序编号 1-64 取单卦数据。"""
    if not 1 <= num <= 64:
        raise ValueError(f"卦编号必须在 1-64 之间，收到 {num}")
    data = load_hexagrams()
    return data[num - 1]


@lru_cache
def _lines_index() -> dict[tuple[bool, ...], dict]:
    """构建 lines 元组 → 卦数据 的查表索引。

    lines 顺序：自下而上 6 爻（lines[0]=初爻）。
    数据驱动，保证 lines 与卦序永不脱节。
    """
    return {tuple(h["lines"]): h for h in load_hexagrams()}


def get_hexagram_by_lines(lines: list[bool]) -> dict:
    """按 6 爻阴阳（自下而上）查卦。阳=True，阴=False。"""
    if len(lines) != 6:
        raise ValueError("必须是 6 爻")
    index = _lines_index()
    key = tuple(bool(x) for x in lines)
    if key not in index:
        raise KeyError(f"找不到对应卦象：{lines}")
    return index[key]
