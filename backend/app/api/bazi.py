"""八字路由。

POST /api/bazi/chart  完整排盘：四柱 + 藏干 + 十神 + 纳音 + 空亡 +
    十二长生 + 胎元命宫身宫 + 大运 + 流年 + 神煞
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.bazi import build_chart, count_elements, find_shensha, find_shensha_with_desc, analyze_bazi
from app.schemas.models import (
    BaziRequest,
    BaziResponse,
    DaYunOut,
    ExtraPillarsOut,
    LiuNianOut,
    PillarDetailOut,
    PillarOut,
    YunOut,
)

router = APIRouter()


def _parse_date_time(date: str, time: str) -> tuple[int, int, int, int, int]:
    """解析 'YYYY-MM-DD' 和 'HH:MM'。失败抛 400。"""
    try:
        y_s, m_s, d_s = date.split("-")
        h_s, min_s = time.split(":")
        return int(y_s), int(m_s), int(d_s), int(h_s), int(min_s)
    except (ValueError, AttributeError) as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_DATETIME", "message": f"日期或时间格式错误：{e}"},
        )


def _validate_calendar_gender(calendar: str, gender: str) -> None:
    if calendar not in ("solar", "lunar"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_CALENDAR", "message": "calendar 必须是 solar 或 lunar"},
        )
    if gender not in ("m", "f"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_GENDER", "message": "gender 必须是 m 或 f"},
        )


@router.post("/bazi/chart", response_model=BaziResponse)
def bazi_chart(req: BaziRequest) -> BaziResponse:
    """八字完整排盘。"""
    _validate_calendar_gender(req.calendar, req.gender)
    y, m, d, h, minute = _parse_date_time(req.date, req.time)
    if not (1800 <= y <= 2200):
        raise HTTPException(
            status_code=400,
            detail={"code": "YEAR_OUT_OF_RANGE", "message": "年份需在 1800-2200 之间"},
        )

    chart = build_chart(
        y, m, d, h, minute,
        calendar=req.calendar, gender=req.gender,
        liunian_years=req.liunian_years,
    )
    elements = count_elements(chart)
    analysis = analyze_bazi(chart)

    # 每柱完整信息
    details = {
        k: PillarDetailOut(
            gan=p.gan, zhi=p.zhi, gan_wuxing=p.gan_wuxing,
            gan_yinyang=p.gan_yinyang, zhi_wuxing=p.zhi_wuxing,
            zhi_yinyang=p.zhi_yinyang,
            hide_gan=p.hide_gan, shishen_gan=p.shishen_gan,
            shishen_hide=p.shishen_hide, nayin=p.nayin,
            dishi=p.dishi, xun=p.xun, xunkong=p.xunkong,
        )
        for k, p in chart.details.items()
    }

    # 大运完整排布
    yun_out = None
    if chart.yun is not None:
        yun_out = YunOut(
            start_age=chart.yun.start_age,
            direction=chart.yun.direction,
            dayun=[
                DaYunOut(ganzhi=dy.ganzhi, shishen_gan=dy.shishen_gan,
                         start_age=dy.start_age,
                         end_age=dy.end_age, start_year=dy.start_year)
                for dy in chart.yun.dayun
            ],
        )

    return BaziResponse(
        pillars={
            k: PillarOut(gan=p.gan, zhi=p.zhi)
            for k, p in chart.pillars.items()
        },
        day_master=chart.day_master,
        nayin=chart.nayin,
        wuxing=chart.wuxing,
        elements=elements.counts,
        gender=chart.gender,
        solar_display=chart.solar_display,
        lunar_display=chart.lunar_display,
        details=details,
        extra=ExtraPillarsOut(
            tai_yuan=chart.extra.tai_yuan,
            tai_yuan_nayin=chart.extra.tai_yuan_nayin,
            ming_gong=chart.extra.ming_gong,
            ming_gong_nayin=chart.extra.ming_gong_nayin,
            shen_gong=chart.extra.shen_gong,
            shen_gong_nayin=chart.extra.shen_gong_nayin,
        ),
        yun=yun_out,
        liunian=[
            LiuNianOut(year=l.year, ganzhi=l.ganzhi, shishen_gan=l.shishen_gan,
                       zhi=l.zhi, hide_gan=l.hide_gan, shishen_hide=l.shishen_hide)
            for l in chart.liunian
        ],
        shensha=find_shensha(chart),
        shensha_detail=find_shensha_with_desc(chart),
        analysis={
            "wuxing_strength": {
                "raw": analysis.wuxing_strength.raw,
                "normalized": analysis.wuxing_strength.normalized,
                "strongest": analysis.wuxing_strength.strongest,
                "weakest": analysis.wuxing_strength.weakest,
            },
            "wangshuai": {
                "score": analysis.wangshuai.score,
                "level": analysis.wangshuai.level,
                "month_state": analysis.wangshuai.month_state,
                "tonggen_count": analysis.wangshuai.tonggen_count,
                "desheng_count": analysis.wangshuai.desheng_count,
                "description": analysis.wangshuai.description,
            },
            "geju": {
                "name": analysis.geju.name,
                "description": analysis.geju.description,
            },
            "yongshen": {
                "yongshen": analysis.yongshen.yongshen,
                "xishen": analysis.yongshen.xishen,
                "jishen": analysis.yongshen.jishen,
                "description": analysis.yongshen.description,
            },
        },
    )
