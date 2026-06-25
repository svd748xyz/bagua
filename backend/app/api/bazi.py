"""八字路由。

POST /api/bazi/chart  完整排盘：四柱 + 藏干 + 十神 + 纳音 + 空亡 +
    十二长生 + 胎元命宫身宫 + 大运 + 流年 + 神煞
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.bazi import build_chart, count_elements, find_shensha, find_shensha_with_desc, analyze_bazi
from app.core.bazi.birthplace import find_location, list_provinces, list_cities
from app.schemas.models import (
    BaziRequest,
    BaziResponse,
    DaYunOut,
    ExtraPillarsOut,
    LiuNianOut,
    LocationItem,
    LocationsResponse,
    PillarDetailOut,
    PillarOut,
    TimeCorrectionOut,
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


def _resolve_longitude(req: BaziRequest) -> tuple[float, str]:
    """从请求中解析出生地经度与显示名。

    优先级：longitude 直接指定 > province+city 查表 > 默认 120.0。
    """
    if req.longitude is not None:
        return req.longitude, req.birthplace or f"东经{req.longitude}°"
    if req.province and req.city:
        loc = find_location(req.province, req.city)
        if loc is not None:
            return loc.longitude, loc.full_name
    return 120.0, req.birthplace or ""


# ---------- 地理位置接口 ----------

@router.get("/bazi/locations", response_model=LocationsResponse)
def get_locations() -> LocationsResponse:
    """返回省/市列表供前端下拉框使用。"""
    provinces = list_provinces()
    cities_map: dict[str, list[LocationItem]] = {}
    for prov in provinces:
        city_names = list_cities(prov)
        items: list[LocationItem] = []
        for name in city_names:
            loc = find_location(prov, name)
            if loc is not None:
                items.append(LocationItem(name=loc.name, longitude=loc.longitude, full_name=loc.full_name))
        cities_map[prov] = items
    return LocationsResponse(provinces=provinces, cities=cities_map)


# ---------- 八字排盘接口 ----------


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

    longitude, birthplace = _resolve_longitude(req)

    chart = build_chart(
        y, m, d, h, minute,
        calendar=req.calendar, gender=req.gender,
        liunian_years=req.liunian_years,
        longitude=longitude,
        dst_assumed=req.dst_assumed,
        birthplace=birthplace,
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
        time_correction=TimeCorrectionOut(
            original_time=chart.time_correction.original_time,
            corrected_time=chart.time_correction.corrected_time,
            dst_applied=chart.time_correction.dst_applied,
            longitude=chart.time_correction.longitude,
            longitude_offset_min=chart.time_correction.longitude_offset_min,
            eot_min=chart.time_correction.eot_min,
            applied=chart.time_correction.applied,
            birthplace=chart.time_correction.birthplace,
        ) if chart.time_correction else None,
    )
