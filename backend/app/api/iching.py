"""金钱卦路由。

POST /api/divine/cast       一次完整起卦（后端掷币，含解卦）
GET  /api/divine/hexagram/{num}  查询单卦详情（1-64）
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path

from app.core.data import get_hexagram_by_num
from app.core.iching import cast_hexagram, interpret_cast
from app.schemas.models import (
    CastRequest,
    CastResponse,
    HexagramOut,
    ReadingOut,
    YaoOut,
)

router = APIRouter()


def _hexagram_to_out(h) -> HexagramOut:
    return HexagramOut(
        num=h.num,
        name=h.name,
        unicode=h.unicode,
        lines=h.lines,
        judgement=h.judgement,
        tuan=h.tuan,
        image=h.image,
        yao=h.yao,
        extra=h.extra,
    )


@router.post("/divine/cast", response_model=CastResponse)
def divine_cast(req: CastRequest) -> CastResponse:
    """起卦：后端用 SystemRandom 掷币 6 次，返回本卦/变卦/动爻/解卦。"""
    cast = cast_hexagram()
    reading = interpret_cast(cast)
    changed_out = _hexagram_to_out(cast.changed) if cast.changed is not None else None
    return CastResponse(
        question=req.question,
        original=_hexagram_to_out(cast.original),
        changed=changed_out,
        yaos=[
            YaoOut(value=y.value, position=y.position,
                   is_yang=y.is_yang, is_moving=y.is_moving, label=y.label)
            for y in cast.yaos
        ],
        moving=cast.moving,
        reading=ReadingOut(
            rule=reading.rule,
            references=reading.references,
            explanation=reading.explanation,
        ),
    )


@router.get("/divine/hexagram/{num}", response_model=HexagramOut)
def get_hexagram(
    num: int = Path(..., ge=1, le=64, description="文王卦序 1-64"),
) -> HexagramOut:
    """查询单卦详情（卦辞/彖传/大象传/六爻辞）。"""
    try:
        data = get_hexagram_by_num(num)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return HexagramOut(**data)
