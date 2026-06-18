# 玄机阁 · 八卦占卜与八字排盘

传统文化研究用 Web 应用，提供金钱卦起卦与八字四柱排盘两大功能。

> 本站仅供文化研究参考，命理无定论，请理性看待。

## 功能

- **金钱卦**：模拟三枚铜钱摇六次，得本卦与变卦，按朱熹《易学启蒙》动爻法解卦。含 64 卦卦辞、彖传、大象传、六爻辞。
- **八字排盘**：输入公历/农历生辰，排出完整四柱八字——含日主、天干/藏干十神、地支藏干（人元）、纳音、空亡、十二长生、三垣（胎元/命宫/身宫）、六亲宫位、完整大运时间轴（起运岁+每柱干支+年龄区间）、流年、常用神煞（天乙贵人/文昌/禄神/羊刃/驿马/桃花/华盖）、五行分布。

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.11+ / FastAPI / Pydantic / lunar-python |
| 前端 | React 18 + Vite + TypeScript + Framer Motion |
| 架构 | 分层单仓，命理核心为纯函数模块（无 IO，可独立单测） |

## 目录结构

```
bagua/
├── backend/
│   ├── app/
│   │   ├── core/          # ★ 命理核心算法（纯函数）
│   │   │   ├── iching/    # 金钱卦：硬币→爻象→本卦/变卦/动爻→朱熹解卦
│   │   │   ├── bazi/      # 八字：四柱排盘/五行/十神/纳音
│   │   │   └── data/      # 64卦数据 JSON
│   │   ├── api/           # FastAPI 路由（薄层）
│   │   └── schemas/       # Pydantic 请求/响应模型
│   ├── scripts/build_hexagrams.py  # 64卦数据生成器（含自检）
│   └── tests/             # 单元测试 + API 集成测试
├── frontend/
│   └── src/{pages,features,components,api,styles}
├── dev.bat                # Windows 一键启动前后端
└── README.md
```

## 快速开始

### 1. 后端

```bash
cd backend
py -m pip install -e ".[dev]"          # 安装依赖
py scripts\build_hexagrams.py          # （可选）重新生成 64 卦数据
py -m uvicorn app.main:app --reload --port 8000
```

健康检查：`GET http://127.0.0.1:8000/api/health`

### 2. 前端

```bash
cd frontend
npm install                            # 若 npm 配置了 omit=dev，改用 npm install --include=dev
npm run dev
```

浏览器访问 `http://127.0.0.1:5173`（前端经 Vite proxy 转发 `/api` 到后端）。

### 一键启动（Windows）

双击 `dev.bat`，会在两个新窗口分别启动前后端。

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/divine/cast` | 起卦（后端掷币，返回本卦/变卦/动爻/解卦） |
| GET  | `/api/divine/hexagram/{num}` | 查询单卦详情（1-64） |
| POST | `/api/bazi/chart` | 八字排盘 |
| GET  | `/api/health` | 健康检查 |

## 测试

```bash
cd backend
py -m pytest              # 50 个测试：iching + bazi（含完整排盘）+ API 集成
```

测试含历史回归用例（如毛泽东 1893-12-26 辰时八字、经典卦例乾之姤、完整排盘字段校验等）。

## 设计要点

- **核心算法纯函数化**：`app/core/` 不依赖 FastAPI/网络，可命令行直接 import 验证。
- **起卦由后端生成**：用 `secrets.SystemRandom` 生成随机，前端不传硬币结果，保证公正性。
- **64 卦数据驱动**：lines 由语义化卦名查表组合（见 `build_hexagrams.py`），唯一性自检。
- **朱熹动爻法**：解卦规则按 0~6 个动爻分别取辞，写成纯函数可单测。

## 后续规划（第二期）

- 可插拔 LLM 层（Protocol 抽象），接入个性化解读（SSE 流式）
- 大运逐年排布、流年
- 视觉打磨（更丰富的中式点缀）

## 云部署

### 后端 → Railway

1. 注册 [railway.app](https://railway.app)
2. 创建新项目 → Deploy from GitHub repo
3. 选择 `backend` 目录
4. 设置环境变量：
   - `PORT` = `8000`
   - `cors_origins` = `https://你的前端域名.vercel.app`
5. 自动生成公网 API 地址

### 前端 → Vercel

1. 注册 [vercel.com](https://vercel.com)
2. 创建新项目 → Import Git Repository
3. 选择 `frontend` 目录
4. 修改 `vercel.json` 中的后端地址为 Railway 提供的地址
5. 自动生成公网链接
