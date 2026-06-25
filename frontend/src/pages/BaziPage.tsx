import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { baziChart, errorMessage, fetchLocations } from "../api/client";
import type { BaziResponse, PillarDetailOut, LocationsResponse } from "../api/types";
import {
  SHISHEN_EXPLAIN,
  WUXING_EXPLAIN,
  CHANGSHENG_EXPLAIN,
  SHENSHA_EXPLAIN,
  GEJU_EXPLAIN,
  YINYANG_EXPLAIN,
} from "../data/baziExplain";
import { addHistory, copyToClipboard, formatBaziForShare } from "../utils/history";
import { exportBaziMarkdown, downloadMarkdown } from "../utils/export";

const PILLAR_LABELS: Record<string, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
};
const PILLAR_ORDER = ["year", "month", "day", "hour"] as const;
const RELATION_LABELS: Record<string, string> = {
  year: "祖上 / 父母宫",
  month: "父母 / 兄弟宫",
  day: "自身 / 配偶宫",
  hour: "子女宫",
};

const ELEMENT_COLORS: Record<string, string> = {
  金: "#b8a878",
  木: "#5a8a4a",
  水: "#4a7a9a",
  火: "#c2554a",
  土: "#b08d57",
};

export default function BaziPage() {
  const location = useLocation();
  const [date, setDate] = useState("1990-01-01");
  const [time, setTime] = useState("12:00");
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [gender, setGender] = useState<"m" | "f">("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BaziResponse | null>(null);

  // 时间校正相关状态
  const [locations, setLocations] = useState<LocationsResponse | null>(null);
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [dstAssumed, setDstAssumed] = useState<boolean | null>(null); // null=自动判断

  // 从历史记录恢复
  useEffect(() => {
    const state = location.state as { result?: BaziResponse } | null;
    if (state?.result) {
      setResult(state.result);
    }
  }, [location.state]);

  // 加载地理位置列表
  useEffect(() => {
    fetchLocations().then(setLocations).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await baziChart({
        date, time, calendar, gender,
        province: province || undefined,
        city: city || undefined,
        dst_assumed: dstAssumed,
        birthplace: province && city ? `${province}${city}` : "",
      });
      setResult(data);
      // 保存历史
      addHistory({
        type: "bazi",
        title: `${data.solar_display} ${data.day_master}日主`,
        data,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bazi-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2 className="card-title">八字排盘</h2>
        <p className="hint">输入出生的公历或农历日期与时间，排出完整四柱八字。</p>
        <div className="field">
          <label>日期（{calendar === "solar" ? "公历" : "农历"}）</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="row">
          <div className="field">
            <label>时辰</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>历法</label>
            <select value={calendar} onChange={(e) => setCalendar(e.target.value as "solar" | "lunar")}>
              <option value="solar">公历</option>
              <option value="lunar">农历</option>
            </select>
          </div>
          <div className="field">
            <label>性别</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as "m" | "f")}>
              <option value="m">男</option>
              <option value="f">女</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>出生地（可选·真太阳时校正）</label>
            <select
              value={province}
              onChange={(e) => { setProvince(e.target.value); setCity(""); }}
            >
              <option value="">-- 省/直辖市 --</option>
              {locations?.provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>市/区</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!province}
            >
              <option value="">-- 选择市 --</option>
              {(province && locations?.cities[province]) &&
                locations.cities[province].map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))
              }
            </select>
          </div>
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", paddingTop: 6 }}>
              <input
                type="checkbox"
                checked={dstAssumed === true}
                onChange={(e) => setDstAssumed(e.target.checked ? true : null)}
              />
              <span>出生在夏令时期间<br />(1986-1991 夏)</span>
            </label>
          </div>
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "排盘中…" : "开始排盘"}
        </button>
        {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      </form>

      {result && <BaziResult data={result} />}
    </div>
  );
}

function BaziResult({ data }: { data: BaziResponse }) {
  const maxEl = Math.max(...Object.values(data.elements), 1);
  const [showExplain, setShowExplain] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mdCopied, setMdCopied] = useState(false);

  async function handleShare() {
    const text = formatBaziForShare(data);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCopyMarkdown() {
    const md = exportBaziMarkdown(data);
    const ok = await copyToClipboard(md);
    if (ok) {
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 2000);
    }
  }

  function handleDownloadMarkdown() {
    const md = exportBaziMarkdown(data);
    const date = data.solar_display.replace(/-/g, "");
    downloadMarkdown(md, `八字排盘_${date}_${data.day_master}.md`);
  }

  return (
    <>
      {/* 操作按钮 */}
      <div className="card">
        <div className="btn-row">
          <button
            className="btn btn-explain"
            onClick={() => setShowExplain(!showExplain)}
          >
            {showExplain ? "隐藏白话解释" : "📖 查看白话解释"}
          </button>
          <button
            className={"btn btn-share" + (copied ? " copied" : "")}
            onClick={handleShare}
          >
            {copied ? "已复制 ✓" : "复制结果"}
          </button>
        </div>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button
            className={"btn btn-export" + (mdCopied ? " copied" : "")}
            onClick={handleCopyMarkdown}
          >
            {mdCopied ? "已复制 ✓" : "复制完整报告（Markdown）"}
          </button>
          <button
            className="btn btn-export"
            onClick={handleDownloadMarkdown}
          >
            下载 .md 文件
          </button>
        </div>
        <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
          导出的Markdown包含完整排盘数据和术语索引，可直接发给AI进行深度解读
        </p>
      </div>

      {/* 白话解释面板 */}
      {showExplain && <ExplainPanel data={data} />}

      <BasicChartCard data={data} />
      <AnalysisCard data={data} />
      <DetailTableCard data={data} />
      <ThreePillarsCard data={data} />
      <DaYunCard data={data} />
      <LiuNianCard data={data} />
      <ShenShaCard data={data} />
      {data.time_correction && <TimeCorrectionCard data={data} />}
      <ElementsCard data={data} maxEl={maxEl} />
    </>
  );
}

/** 白话解释面板 */
function ExplainPanel({ data }: { data: BaziResponse }) {
  // 收集所有出现的十神
  const shishenSet = new Set<string>();
  PILLAR_ORDER.forEach((k) => {
    const d = data.details[k];
    if (d.shishen_gan && d.shishen_gan !== "日主") shishenSet.add(d.shishen_gan);
    d.shishen_hide.forEach((s) => { if (s) shishenSet.add(s); });
  });
  // 大运十神
  data.yun?.dayun.forEach((dy) => {
    if (dy.shishen_gan) shishenSet.add(dy.shishen_gan);
  });

  // 收集所有出现的五行
  const wuxingSet = new Set<string>(Object.keys(data.elements));

  // 收集所有出现的十二长生
  const changshengSet = new Set<string>();
  PILLAR_ORDER.forEach((k) => {
    const d = data.details[k];
    if (d.dishi) changshengSet.add(d.dishi);
  });

  // 收集神煞
  const shenshaList = Object.keys(data.shensha || {});

  // 格局
  const gejuName = data.analysis?.geju?.name || "";

  return (
    <div className="card explain-panel">
      <h2 className="card-title">白话解释</h2>
      <p className="hint">以下是对本次排盘中出现的专业术语的通俗解释：</p>

      {/* 日主解释 */}
      <ExplainSection title={`日主：${data.day_master}`}>
        <p>日主就是<strong>你自己</strong>，代表命主本人。日主的五行属性决定了你的基本性格特征。</p>
        {WUXING_EXPLAIN[data.wuxing.day] && (
          <div className="explain-item">
            <span className="explain-tag">{data.wuxing.day}</span>
            <span>{WUXING_EXPLAIN[data.wuxing.day].含义}。{WUXING_EXPLAIN[data.wuxing.day].性格}。</span>
          </div>
        )}
      </ExplainSection>

      {/* 十神解释 */}
      {shishenSet.size > 0 && (
        <ExplainSection title="十神（人际关系与性格）">
          <p>十神是根据其他干支与你的关系推算出来的，代表不同的人际关系和性格特点：</p>
          {Array.from(shishenSet).map((ss) => {
            const exp = SHISHEN_EXPLAIN[ss];
            if (!exp) return null;
            return (
              <div className="explain-item" key={ss}>
                <span className="explain-tag">{ss}</span>
                <span>{exp.含义}。{exp.性格}。</span>
              </div>
            );
          })}
        </ExplainSection>
      )}

      {/* 五行解释 */}
      <ExplainSection title="五行（性格与健康）">
        <p>五行代表五种能量，影响你的性格和健康：</p>
        {Array.from(wuxingSet).map((wx) => {
          const exp = WUXING_EXPLAIN[wx];
          if (!exp) return null;
          return (
            <div className="explain-item" key={wx}>
              <span className="explain-tag" style={{ color: ELEMENT_COLORS[wx] }}>{wx}</span>
              <span>{exp.含义}。健康方面：{exp.健康}。</span>
            </div>
          );
        })}
      </ExplainSection>

      {/* 阴阳解释 */}
      <ExplainSection title="阴阳">
        {PILLAR_ORDER.map((k) => {
          const d = data.details[k];
          return (
            <div className="explain-item" key={k}>
              <span className="explain-tag">{PILLAR_LABELS[k]}</span>
              <span>天干{d.gan}为{d.gan_yinyang}（{YINYANG_EXPLAIN[d.gan_yinyang]}），地支{d.zhi}为{d.zhi_yinyang}（{YINYANG_EXPLAIN[d.zhi_yinyang]}）</span>
            </div>
          );
        })}
      </ExplainSection>

      {/* 十二长生解释 */}
      {changshengSet.size > 0 && (
        <ExplainSection title="十二长生（生命状态）">
          <p>十二长生表示五行在地支中的强弱状态：</p>
          {Array.from(changshengSet).map((cs) => {
            const exp = CHANGSHENG_EXPLAIN[cs];
            if (!exp) return null;
            return (
              <div className="explain-item" key={cs}>
                <span className="explain-tag">{cs}</span>
                <span>{exp}</span>
              </div>
            );
          })}
        </ExplainSection>
      )}

      {/* 格局解释 */}
      {gejuName && (
        <ExplainSection title="格局">
          <p>格局是八字的整体配置，决定命局的基本走向：</p>
          <div className="explain-item">
            <span className="explain-tag">{gejuName}</span>
            <span>{GEJU_EXPLAIN[gejuName] || data.analysis?.geju?.description || "此格局代表命局的基本特征"}</span>
          </div>
        </ExplainSection>
      )}

      {/* 用神喜忌解释 */}
      {data.analysis?.yongshen && (
        <ExplainSection title="用神喜忌">
          <p>用神是对你最有利的五行，忌神是对你不利的五行：</p>
          <div className="explain-item">
            <span className="explain-tag" style={{ color: ELEMENT_COLORS[data.analysis.yongshen.yongshen] }}>用神：{data.analysis.yongshen.yongshen}</span>
            <span>对你最有利的能量，应该多接触</span>
          </div>
          <div className="explain-item">
            <span className="explain-tag" style={{ color: ELEMENT_COLORS[data.analysis.yongshen.xishen] }}>喜神：{data.analysis.yongshen.xishen}</span>
            <span>对你有帮助的能量，可以多亲近</span>
          </div>
          <div className="explain-item">
            <span className="explain-tag" style={{ color: ELEMENT_COLORS[data.analysis.yongshen.jishen] }}>忌神：{data.analysis.yongshen.jishen}</span>
            <span>对你不利的能量，应该注意规避</span>
          </div>
        </ExplainSection>
      )}

      {/* 神煞解释 */}
      {shenshaList.length > 0 && (
        <ExplainSection title="神煞（命带吉凶星）">
          <p>神煞是传统命理中的吉凶星曜：</p>
          {shenshaList.map((ss) => {
            const exp = SHENSHA_EXPLAIN[ss];
            if (!exp) return null;
            return (
              <div className="explain-item" key={ss}>
                <span className="explain-tag">{ss}</span>
                <span>{exp.含义}。{exp.影响}。</span>
              </div>
            );
          })}
        </ExplainSection>
      )}

      {/* 纳音解释 */}
      <ExplainSection title="纳音（五行属性细分）">
        <p>纳音是更精细的五行分类，每两年一个纳音：</p>
        {PILLAR_ORDER.map((k) => {
          const d = data.details[k];
          return (
            <div className="explain-item" key={k}>
              <span className="explain-tag">{PILLAR_LABELS[k]}</span>
              <span>{d.nayin}——{getNayinDesc(d.nayin)}</span>
            </div>
          );
        })}
      </ExplainSection>

      <p className="hint" style={{ marginTop: 16, fontSize: 12, fontStyle: "italic" }}>
        以上解释基于传统命理学基本概念，不同流派可能有不同解读。命理仅供参考，人生掌握在自己手中。
      </p>
    </div>
  );
}

/** 解释区块 */
function ExplainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="explain-section">
      <h3 className="explain-title">{title}</h3>
      <div className="explain-content">{children}</div>
    </div>
  );
}

/** 纳音简要解释 */
function getNayinDesc(nayin: string): string {
  if (!nayin) return "";
  const last = nayin.slice(-1); // 金木水火土
  const map: Record<string, string> = {
    金: "属金，主刚毅果断",
    木: "属木，主仁慈成长",
    水: "属水，主智慧灵活",
    火: "属火，主热情礼节",
    土: "属土，主稳重诚信",
  };
  return map[last] || "";
}

/** 基础四柱卡片 */
function BasicChartCard({ data }: { data: BaziResponse }) {
  return (
    <div className="card">
      <h2 className="card-title">四柱八字</h2>
      <div className="pillars">
        {PILLAR_ORDER.map((key) => {
          const p = data.pillars[key];
          const d = data.details[key];
          return (
            <div className="pillar" key={key}>
              <div className="pillar-pos">{PILLAR_LABELS[key]}</div>
              <div className="pillar-rel">{RELATION_LABELS[key]}</div>
              <div className="pillar-gan">{p.gan}<span className="pillar-yy">{d.gan_yinyang}</span></div>
              <div className="pillar-zhi">{p.zhi}<span className="pillar-yy">{d.zhi_yinyang}</span></div>
              <div className="pillar-wx">{data.wuxing[key]}</div>
              <div className="pillar-nayin">{data.nayin[key]}</div>
            </div>
          );
        })}
      </div>
      <div className="day-master">日主：<strong>{data.day_master}</strong></div>
      <div className="lunar-info">
        <span>公历：{data.solar_display}</span>
        <span className="sep">·</span>
        <span>农历：{data.lunar_display}</span>
      </div>
      {data.yun && (
        <div className="yun-info">
          大运起运：<strong>{data.yun.start_age}</strong> 岁，{data.yun.direction}行
        </div>
      )}
    </div>
  );
}

/** 进阶分析卡片 */
function AnalysisCard({ data }: { data: BaziResponse }) {
  const a = data.analysis;
  if (!a || !a.wangshuai) return null;

  return (
    <div className="card">
      <h2 className="card-title">命理分析</h2>

      {a.wangshuai && (
        <div className="analysis-section">
          <h3 className="sub-title">日主旺衰</h3>
          <div className="wangshuai-bar">
            <div className="ws-track">
              <div className="ws-fill" style={{ width: `${a.wangshuai.score}%` }} />
              <div className="ws-marker" style={{ left: `${a.wangshuai.score}%` }} />
            </div>
            <div className="ws-labels">
              <span>弱</span>
              <span>中和</span>
              <span>旺</span>
            </div>
          </div>
          <div className="ws-result">
            <span className="ws-level">{a.wangshuai.level}</span>
            <span className="ws-score">（综合得分：{a.wangshuai.score}）</span>
          </div>
          <p className="hint">{a.wangshuai.description}</p>
        </div>
      )}

      {a.geju && (
        <div className="analysis-section">
          <h3 className="sub-title">格局</h3>
          <div className="geju-name">{a.geju.name}</div>
          <p className="hint">{a.geju.description}</p>
        </div>
      )}

      {a.yongshen && (
        <div className="analysis-section">
          <h3 className="sub-title">用神喜忌</h3>
          <div className="yongshen-grid">
            <div className="ys-item ys-yong">
              <div className="ys-label">用神</div>
              <div className="ys-value" style={{ color: ELEMENT_COLORS[a.yongshen.yongshen] }}>{a.yongshen.yongshen}</div>
            </div>
            <div className="ys-item ys-xi">
              <div className="ys-label">喜神</div>
              <div className="ys-value" style={{ color: ELEMENT_COLORS[a.yongshen.xishen] }}>{a.yongshen.xishen}</div>
            </div>
            <div className="ys-item ys-ji">
              <div className="ys-label">忌神</div>
              <div className="ys-value" style={{ color: ELEMENT_COLORS[a.yongshen.jishen] }}>{a.yongshen.jishen}</div>
            </div>
          </div>
          <p className="hint">{a.yongshen.description}</p>
        </div>
      )}

      {a.wuxing_strength && (
        <div className="analysis-section">
          <h3 className="sub-title">五行力量</h3>
          <div className="elements">
            {Object.entries(a.wuxing_strength.normalized).map(([wx, pct]) => (
              <div className="element-bar" key={wx}>
                <span className="el-name">{wx}</span>
                <div className="el-track">
                  <div
                    className="el-fill"
                    style={{
                      width: `${pct}%`,
                      background: ELEMENT_COLORS[wx] ?? "var(--gold)",
                    }}
                  />
                </div>
                <span className="el-count">{pct}%</span>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            最旺：{a.wuxing_strength.strongest}，最弱：{a.wuxing_strength.weakest}
          </p>
        </div>
      )}

      <p className="hint" style={{ marginTop: 12, fontSize: 12, fontStyle: "italic" }}>
        注：以上分析基于传统命理量化算法，仅供参考。日主旺衰、格局、用神在业界存在不同流派的分歧。
      </p>
    </div>
  );
}

/** 详细排盘表 */
function DetailTableCard({ data }: { data: BaziResponse }) {
  const detailOf = (k: string): PillarDetailOut => data.details[k];
  return (
    <div className="card">
      <h2 className="card-title">排盘详情</h2>
      <div className="detail-table">
        <div className="detail-row detail-head">
          <div></div>
          {PILLAR_ORDER.map((k) => (
            <div key={k}>{PILLAR_LABELS[k]}</div>
          ))}
        </div>
        <DetailRow
          label="天干（十神）"
          render={(k) => {
            const d = detailOf(k);
            return <span>{d.gan} <em>{d.shishen_gan}</em></span>;
          }}
        />
        <DetailRow label="天干阴阳" render={(k) => detailOf(k).gan_yinyang} />
        <DetailRow label="地支" render={(k) => {
          const d = detailOf(k);
          return <span>{d.zhi} <em>{d.zhi_wuxing}</em></span>;
        }} />
        <DetailRow label="地支阴阳" render={(k) => detailOf(k).zhi_yinyang} />
        <DetailRow label="藏干" render={(k) => detailOf(k).hide_gan.join(" ")} />
        <DetailRow label="藏干十神" render={(k) => detailOf(k).shishen_hide.join(" ")} />
        <DetailRow label="纳音" render={(k) => detailOf(k).nayin} />
        <DetailRow label="十二长生" render={(k) => detailOf(k).dishi} />
        <DetailRow label="旬 / 空亡" render={(k) => `${detailOf(k).xun} / ${detailOf(k).xunkong}`} />
      </div>
    </div>
  );
}

function DetailRow({ label, render }: { label: string; render: (key: string) => React.ReactNode }) {
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      {PILLAR_ORDER.map((k) => (
        <div key={k} className="detail-cell">{render(k)}</div>
      ))}
    </div>
  );
}

/** 三垣 */
function ThreePillarsCard({ data }: { data: BaziResponse }) {
  const e = data.extra;
  const items = [
    { name: "胎元", gz: e.tai_yuan, nayin: e.tai_yuan_nayin, desc: "受孕之月，看先天体质" },
    { name: "命宫", gz: e.ming_gong, nayin: e.ming_gong_nayin, desc: "先天天赋、性格" },
    { name: "身宫", gz: e.shen_gong, nayin: e.shen_gong_nayin, desc: "后天体魄、中年行运" },
  ];
  return (
    <div className="card">
      <h2 className="card-title">三垣（暗柱）</h2>
      <div className="three-pillars">
        {items.map((it) => (
          <div className="three-pillar" key={it.name}>
            <div className="tp-name">{it.name}</div>
            <div className="tp-gz">{it.gz}</div>
            <div className="tp-nayin">{it.nayin}</div>
            <div className="tp-desc">{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 大运 */
function DaYunCard({ data }: { data: BaziResponse }) {
  if (!data.yun || data.yun.dayun.length === 0) return null;
  return (
    <div className="card">
      <h2 className="card-title">大运（每柱十年）</h2>
      <p className="hint">起运 <strong>{data.yun.start_age}</strong> 岁，{data.yun.direction}行排布。</p>
      <div className="dayun-list">
        {data.yun.dayun.map((dy, i) => (
          <div className="dayun-item" key={i}>
            <div className="dy-gz">{dy.ganzhi}</div>
            <div className="dy-ss">{dy.shishen_gan}</div>
            <div className="dy-age">{dy.start_age}-{dy.end_age} 岁</div>
            <div className="dy-year">{dy.start_year} 年起</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 流年 */
function LiuNianCard({ data }: { data: BaziResponse }) {
  if (data.liunian.length === 0) return null;
  return (
    <div className="card">
      <h2 className="card-title">流年</h2>
      <div className="liunian-list">
        {data.liunian.map((l) => (
          <div className="liunian-item" key={l.year}>
            <span className="ln-year">{l.year}</span>
            <span className="ln-gz">{l.ganzhi}</span>
            <span className="ln-ss">{l.shishen_gan}</span>
            <span className="ln-hide" title={l.shishen_hide.join(" ")}>{l.hide_gan.join(" ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 神煞 */
function ShenShaCard({ data }: { data: BaziResponse }) {
  const entries = Object.entries(data.shensha_detail || {});
  const hasDetail = entries.length > 0;

  if (!hasDetail) {
    const oldEntries = Object.entries(data.shensha);
    return (
      <div className="card">
        <h2 className="card-title">命带神煞</h2>
        {oldEntries.length === 0 ? (
          <p className="hint">命中未带常用神煞。</p>
        ) : (
          <div className="shensha-list">
            {oldEntries.map(([name, positions]) => (
              <div className="shensha-item" key={name}>
                <span className="ss-name">{name}</span>
                <span className="ss-pos">{positions.join("、")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">命带神煞</h2>
      {entries.length === 0 ? (
        <p className="hint">命中未带常用神煞。</p>
      ) : (
        <div className="shensha-list">
          {entries.map(([name, info]) => (
            <div className="shensha-item" key={name}>
              <div className="ss-header">
                <span className="ss-name">{name}</span>
                <span className="ss-pos">{info.positions?.join("、")}</span>
              </div>
              {info.含义 && <div className="ss-desc">{info.含义}</div>}
              {info.特征 && <div className="ss-trait">{info.特征}</div>}
            </div>
          ))}
        </div>
      )}
      <p className="hint" style={{ marginTop: 10 }}>
        含天乙贵人、文昌、禄神、羊刃、驿马、桃花、华盖（按日干与年日支查）。
      </p>
    </div>
  );
}

/** 五行分布 */
function ElementsCard({ data, maxEl }: { data: BaziResponse; maxEl: number }) {
  return (
    <div className="card">
      <h2 className="card-title">五行分布（天干+地支本气）</h2>
      <div className="elements">
        {Object.entries(data.elements).map(([wx, count]) => (
          <div className="element-bar" key={wx}>
            <span className="el-name">{wx}</span>
            <div className="el-track">
              <div
                className="el-fill"
                style={{
                  width: `${(count / maxEl) * 100}%`,
                  background: ELEMENT_COLORS[wx] ?? "var(--gold)",
                }}
              />
            </div>
            <span className="el-count">{count}</span>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        注：此为简化统计（天干+地支本气，共 8 位）。详细五行力量请参考上方"命理分析"中的五行力量图。
      </p>
    </div>
  );
}

/** 时间校正信息卡片（夏令时 + 真太阳时）。 */
function TimeCorrectionCard({ data }: { data: BaziResponse }) {
  const tc = data.time_correction;
  if (!tc || !tc.applied) return null;

  const lines: string[] = [];
  lines.push(`原始输入时间：${tc.original_time}`);
  lines.push(`校正后排盘时间：${tc.corrected_time}`);
  if (tc.dst_applied) {
    lines.push("已做夏令时还原（-1 小时）");
  }
  if (Math.abs(tc.longitude_offset_min) > 0.1) {
    const sign = tc.longitude_offset_min > 0 ? "+" : "";
    lines.push(`出生地经度校正：${sign}${tc.longitude_offset_min.toFixed(1)} 分钟（东经 ${tc.longitude}°）`);
  }
  if (Math.abs(tc.eot_min) > 0.5) {
    const sign = tc.eot_min > 0 ? "+" : "";
    lines.push(`均时差校正：${sign}${tc.eot_min.toFixed(1)} 分钟`);
  }
  lines.push(`出生地：${tc.birthplace || `东经 ${tc.longitude}°`}`);

  return (
    <div className="card" style={{ borderLeft: "3px solid var(--accent)" }}>
      <h2 className="card-title">时间校正</h2>
      <p className="hint" style={{ marginBottom: 8 }}>
        排盘使用经夏令时还原与真太阳时校正后的时间
      </p>
      {lines.map((l, i) => (
        <p key={i} style={{ margin: "4px 0", fontSize: 14 }}>{l}</p>
      ))}
    </div>
  );
}
