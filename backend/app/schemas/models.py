"""API 请求与响应模型。

与 core/ 的 dataclass 对应，但用 Pydantic 以获得 JSON 校验与 OpenAPI 文档。
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ---------- 金钱卦 ----------

class CastRequest(BaseModel):
    question: str | None = Field(default=None, description="所占问的事（可选，仅记录用）")


class HexagramOut(BaseModel):
    num: int
    name: str
    unicode: str
    lines: list[bool]          # 自下而上 6 爻
    judgement: str
    tuan: str
    image: str
    yao: list[str]
    extra: str | None = None

    model_config = ConfigDict(from_attributes=True)


class YaoOut(BaseModel):
    value: int                 # 6/7/8/9
    position: int              # 0-5
    is_yang: bool
    is_moving: bool
    label: str                 # 老阴/少阳/少阴/老阳


class ReadingOut(BaseModel):
    rule: str
    references: list[str]
    explanation: str


class CastResponse(BaseModel):
    question: str | None
    original: HexagramOut
    changed: HexagramOut | None
    yaos: list[YaoOut]
    moving: list[int]
    reading: ReadingOut


# ---------- 八字 ----------

class BaziRequest(BaseModel):
    date: str = Field(..., description="日期 YYYY-MM-DD（公历或农历）")
    time: str = Field(..., description="时间 HH:MM，24 小时制")
    calendar: str = Field(default="solar", description="solar(公历) / lunar(农历)")
    gender: str = Field(default="m", description="m / f")
    liunian_years: list[int] | None = Field(
        default=None, description="需要排流年的公历年份，留空则默认取当前年前后若干年"
    )
    # 时间校正参数
    province: str | None = Field(default=None, description="出生地省/直辖市")
    city: str | None = Field(default=None, description="出生地市/区")
    longitude: float | None = Field(default=None, description="出生地东经度数（自动根据省/市查，也可手动指定）")
    dst_assumed: bool | None = Field(
        default=None,
        description="夏令时：null=自动判定 / true=是夏令时(减1小时) / false=不是"
    )
    birthplace: str = Field(default="", description="出生地显示名（仅记录用）")


class PillarOut(BaseModel):
    gan: str
    zhi: str

    def __str__(self) -> str:
        return f"{self.gan}{self.zhi}"


class PillarDetailOut(BaseModel):
    """一柱完整排盘信息。"""

    gan: str                  # 天干
    zhi: str                  # 地支
    gan_wuxing: str           # 天干五行
    gan_yinyang: str          # 天干阴阳
    zhi_wuxing: str           # 地支五行
    zhi_yinyang: str          # 地支阴阳
    hide_gan: list[str]       # 地支藏干
    shishen_gan: str          # 天干十神
    shishen_hide: list[str]   # 藏干十神
    nayin: str                # 纳音
    dishi: str                # 十二长生
    xun: str                  # 旬
    xunkong: str              # 空亡


class DaYunOut(BaseModel):
    ganzhi: str
    shishen_gan: str
    start_age: int
    end_age: int
    start_year: int


class YunOut(BaseModel):
    start_age: int
    direction: str            # 顺 / 逆
    dayun: list[DaYunOut]


class LiuNianOut(BaseModel):
    year: int
    ganzhi: str
    shishen_gan: str
    zhi: str
    hide_gan: list[str]
    shishen_hide: list[str]


class ExtraPillarsOut(BaseModel):
    tai_yuan: str
    tai_yuan_nayin: str
    ming_gong: str
    ming_gong_nayin: str
    shen_gong: str
    shen_gong_nayin: str


class TimeCorrectionOut(BaseModel):
    """时间校正信息。"""
    original_time: str          # 用户输入的原始时间
    corrected_time: str         # 校正后用于排盘的真太阳时
    dst_applied: bool           # 是否做了夏令时还原
    longitude: float            # 使用的经度
    longitude_offset_min: float # 经度校正（分钟）
    eot_min: float              # 均时差（分钟）
    applied: bool               # 是否实际做了校正
    birthplace: str             # 出生地显示名


class LocationItem(BaseModel):
    """一个地理位置。"""
    name: str          # 地名
    longitude: float   # 东经度数
    full_name: str     # 完整名（如"四川成都"）


class LocationsResponse(BaseModel):
    """省/市列表响应。"""
    provinces: list[str]                           # 省名列表
    cities: dict[str, list[LocationItem]]          # 省 → 市列表


class BaziResponse(BaseModel):
    pillars: dict[str, PillarOut]               # year/month/day/hour（向后兼容）
    day_master: str
    nayin: dict[str, str]                       # 向后兼容
    wuxing: dict[str, str]                      # 向后兼容
    elements: dict[str, int]                    # 五行计数
    gender: str
    solar_display: str
    lunar_display: str
    # 新增完整字段
    details: dict[str, PillarDetailOut]         # year/month/day/hour → 每柱完整信息
    extra: ExtraPillarsOut                      # 三垣
    yun: YunOut | None = None                   # 完整大运
    liunian: list[LiuNianOut]                   # 流年
    shensha: dict[str, list[str]]               # 神煞（向后兼容）
    shensha_detail: dict[str, dict] = {}        # 神煞详细（含含义解释）
    # 进阶分析
    analysis: dict = {}                         # 五行强弱、日主旺衰、格局、用神喜忌
    # 时间校正
    time_correction: TimeCorrectionOut | None = None


# ---------- 通用 ----------

class ErrorResponse(BaseModel):
    error: dict[str, str]           # {"code": ..., "message": ...}
