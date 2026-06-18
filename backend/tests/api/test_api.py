"""API 集成测试：用 FastAPI TestClient 走完整 HTTP 流程。"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------- 健康检查 ----------

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- 金钱卦 ----------

def test_divine_cast_full_flow():
    """起卦接口返回完整结构：本卦/变卦/动爻/解卦。"""
    r = client.post("/api/divine/cast", json={"question": "今年事业如何？"})
    assert r.status_code == 200
    data = r.json()
    assert data["question"] == "今年事业如何？"

    orig = data["original"]
    assert 1 <= orig["num"] <= 64
    assert len(orig["lines"]) == 6
    assert orig["name"]
    assert len(orig["yao"]) == 6

    # 动爻时才有变卦
    if data["moving"]:
        assert data["changed"] is not None
    else:
        assert data["changed"] is None

    # yaos 信息完整
    assert len(data["yaos"]) == 6
    for y in data["yaos"]:
        assert y["value"] in (6, 7, 8, 9)
        assert y["label"] in ("老阴", "少阳", "少阴", "老阳")

    # 解卦规则存在
    assert data["reading"]["rule"]
    assert isinstance(data["reading"]["references"], list)


def test_divine_cast_no_question():
    """不传问题也能起卦。"""
    r = client.post("/api/divine/cast", json={})
    assert r.status_code == 200
    assert r.json()["question"] is None


def test_get_hexagram_qian():
    """查询乾卦详情。"""
    r = client.get("/api/divine/hexagram/1")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "乾为天"
    assert data["lines"] == [True] * 6
    assert "元" in data["judgement"]
    assert data["extra"] == "用九：见群龙无首，吉。"


def test_get_hexagram_out_of_range():
    """卦序超界返回 422（路径参数校验）。"""
    r = client.get("/api/divine/hexagram/99")
    assert r.status_code == 422


# ---------- 八字 ----------

def test_bazi_chart_mao():
    """毛泽东八字：1893-12-26 07:00 男。"""
    r = client.post("/api/bazi/chart", json={
        "date": "1893-12-26", "time": "07:00",
        "calendar": "solar", "gender": "m",
    })
    assert r.status_code == 200
    data = r.json()
    assert str_pillar(data["pillars"]["year"]) == "癸巳"
    assert str_pillar(data["pillars"]["day"]) == "丁酉"
    assert data["day_master"] == "丁"
    assert data["nayin"]["year"] == "长流水"
    assert data["elements"]["木"] == 2
    assert data["yun"]["direction"] == "逆"
    assert "1893" in data["solar_display"]


def str_pillar(p: dict) -> str:
    return f"{p['gan']}{p['zhi']}"


def test_bazi_invalid_calendar():
    r = client.post("/api/bazi/chart", json={
        "date": "2000-01-01", "time": "12:00",
        "calendar": "julian", "gender": "m",
    })
    assert r.status_code == 400
    body = r.json()
    assert body["detail"]["code"] == "INVALID_CALENDAR"


def test_bazi_invalid_datetime():
    r = client.post("/api/bazi/chart", json={
        "date": "not-a-date", "time": "12:00",
        "calendar": "solar", "gender": "m",
    })
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "INVALID_DATETIME"


def test_bazi_year_out_of_range():
    r = client.post("/api/bazi/chart", json={
        "date": "1000-01-01", "time": "12:00",
        "calendar": "solar", "gender": "m",
    })
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "YEAR_OUT_OF_RANGE"


def test_bazi_default_calendar_gender():
    """calendar/gender 有默认值。"""
    r = client.post("/api/bazi/chart", json={
        "date": "2000-06-15", "time": "12:00",
    })
    assert r.status_code == 200


def test_bazi_full_detail_fields():
    """完整排盘响应含 details/extra/yun.dayun/liunian/shensha。"""
    r = client.post("/api/bazi/chart", json={
        "date": "1990-01-01", "time": "12:00",
        "calendar": "solar", "gender": "m",
        "liunian_years": [2024, 2025],
    })
    assert r.status_code == 200
    data = r.json()

    # details：每柱含藏干/十神/纳音/空亡/十二长生
    d = data["details"]["day"]
    assert d["gan"] == "丙"
    assert len(d["hide_gan"]) >= 1
    assert len(d["shishen_hide"]) == len(d["hide_gan"])
    assert d["shishen_gan"] == "日主"
    assert d["nayin"]
    assert d["dishi"] in ("长生", "沐浴", "冠带", "临官", "帝旺",
                          "衰", "病", "死", "墓", "绝", "胎", "养")
    assert d["xunkong"]

    # 三垣
    assert len(data["extra"]["tai_yuan"]) == 2
    assert data["extra"]["tai_yuan_nayin"]

    # 完整大运
    assert data["yun"]["direction"] in ("顺", "逆")
    assert len(data["yun"]["dayun"]) >= 4
    assert data["yun"]["dayun"][0]["ganzhi"]

    # 流年
    l24 = [l for l in data["liunian"] if l["year"] == 2024][0]
    assert l24["ganzhi"] == "甲辰"
    assert l24["shishen_gan"] == "偏印"

    # 神煞
    assert isinstance(data["shensha"], dict)
    assert "羊刃" in data["shensha"]   # 丙日午时
