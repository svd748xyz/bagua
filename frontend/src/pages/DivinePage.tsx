import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import { divineCast, errorMessage } from "../api/client";
import type { CastResponse, YaoOut } from "../api/types";
import HexagramFigure from "../components/HexagramFigure";
import {
  YAO_POSITION_EXPLAIN,
  YIN_YANG_YAO_EXPLAIN,
  HEXAGRAM_BASICS,
  ZHU_XI_RULES,
  getMovingYaoExplain,
} from "../data/divineExplain";
import { addHistory, copyToClipboard } from "../utils/history";
import { exportDivineMarkdown, downloadMarkdown } from "../utils/export";

type Phase = "idle" | "shaking" | "done";

export default function DivinePage() {
  const location = useLocation();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<CastResponse | null>(null);

  // 从历史记录恢复
  useEffect(() => {
    const state = location.state as { result?: CastResponse } | null;
    if (state?.result) {
      setResult(state.result);
      setPhase("done");
    }
  }, [location.state]);

  async function handleDivine() {
    setError("");
    setResult(null);
    setPhase("shaking");
    try {
      const [data] = await Promise.all([
        divineCast(question.trim() || undefined),
        new Promise((r) => setTimeout(r, 1600)),
      ]);
      setResult(data);
      setPhase("done");
      // 保存历史
      addHistory({
        type: "divine",
        title: data.question || data.original.name,
        data,
      });
    } catch (err) {
      setError(errorMessage(err));
      setPhase("idle");
    }
  }

  function handleReset() {
    setResult(null);
    setPhase("idle");
    setQuestion("");
  }

  return (
    <div className="divine-page">
      <div className="card">
        <h2 className="card-title">起卦问事</h2>
        <p className="hint">
          凝神静气，默念所问之事，然后掷币起卦。三枚铜钱摇六次，得本卦与变卦。
        </p>
        <div className="field">
          <label>所问之事（可留空）</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="如：今年事业是否顺遂？"
            disabled={phase === "shaking"}
          />
        </div>
        <div className="btn-row">
          {phase !== "done" ? (
            <button
              className="btn"
              onClick={handleDivine}
              disabled={phase === "shaking"}
            >
              {phase === "shaking" ? "掷币中…" : "诚心起卦"}
            </button>
          ) : (
            <button className="btn" onClick={handleReset}>
              再次起卦
            </button>
          )}
        </div>
        {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      </div>

      <AnimatePresence>
        {phase === "shaking" && (
          <motion.div
            className="coin-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="coin-row">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="coin"
                  animate={{ rotateY: [0, 1080, 1440] }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  ☯
                </motion.div>
              ))}
            </div>
            <div className="shake-hint">三钱掷地…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "done" && result && <CastResult data={result} />}
    </div>
  );
}

function CastResult({ data }: { data: CastResponse }) {
  const [showExplain, setShowExplain] = useState(false);
  const [mdCopied, setMdCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleScreenshot() {
    if (!resultRef.current) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: "#f7f4ee",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `金钱卦_${data.original.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("截图失败:", err);
    } finally {
      setCapturing(false);
    }
  }

  async function handleCopyMarkdown() {
    const md = exportDivineMarkdown(data);
    const ok = await copyToClipboard(md);
    if (ok) {
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 2000);
    }
  }

  function handleDownloadMarkdown() {
    const md = exportDivineMarkdown(data);
    downloadMarkdown(md, `金钱卦_${data.original.name}.md`);
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
            className="btn btn-screenshot"
            onClick={handleScreenshot}
            disabled={capturing}
          >
            {capturing ? "截图中…" : "📷 长截图"}
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
          导出的Markdown包含完整卦象数据和术语索引，可直接发给AI进行深度解读
        </p>
      </div>

      {/* 结果内容区域（用于截图） */}
      <div ref={resultRef}>
        {/* 白话解释面板 */}
        {showExplain && <DivineExplainPanel data={data} />}

      {data.question && (
        <div className="card">
          <div className="question">问：{data.question}</div>
        </div>
      )}

      {/* 卦象总览 */}
      <div className="card">
        <h2 className="card-title">卦象</h2>
        <div className="hexagrams-row">
          <HexagramFigure hexagram={data.original} yaos={data.yaos} label="本卦" />
          {data.changed && (
            <>
              <div className="arrow">→</div>
              <HexagramFigure hexagram={data.changed} label="变卦" />
            </>
          )}
        </div>
        {data.moving.length > 0 && (
          <div className="moving-hint">
            动爻在第 {data.moving.map((m) => POSITION_LABEL[m]).join("、")} 爻
          </div>
        )}
      </div>

      {/* 六爻详情 */}
      <YaoDetailCard yaos={data.yaos} original={data.original} />

      {/* 解卦 */}
      <div className="card">
        <h2 className="card-title">解卦（朱熹动爻法）</h2>
        <p className="reading-rule">{data.reading.explanation}</p>
        <div className="reading-refs">
          {data.reading.references.map((r, i) => (
            <p key={i} className="reading-ref">{r}</p>
          ))}
        </div>
      </div>

      {/* 本卦详情 */}
      <HexagramDetailCard hexagram={data.original} title="本卦" />

      {/* 变卦详情 */}
      {data.changed && <HexagramDetailCard hexagram={data.changed} title="变卦" />}
      </div>
    </>
  );
}

/** 白话解释面板 */
function DivineExplainPanel({ data }: { data: CastResponse }) {
  const movingCount = data.moving.length;
  const zhuXi = ZHU_XI_RULES[movingCount];

  return (
    <div className="card explain-panel">
      <h2 className="card-title">白话解释</h2>
      <p className="hint">以下是对本次卦象的通俗解释：</p>

      {/* 基本概念 */}
      <ExplainSection title="什么是本卦和变卦？">
        <div className="explain-item">
          <span className="explain-tag">本卦</span>
          <span>{HEXAGRAM_BASICS.本卦}。本次本卦是<strong>{data.original.name}</strong>（{data.original.unicode}）</span>
        </div>
        {data.changed && (
          <div className="explain-item">
            <span className="explain-tag">变卦</span>
            <span>{HEXAGRAM_BASICS.变卦}。本次变卦是<strong>{data.changed.name}</strong>（{data.changed.unicode}）</span>
          </div>
        )}
        <div className="explain-item">
          <span className="explain-tag">动爻</span>
          <span>{HEXAGRAM_BASICS.动爻}。本次有<strong>{movingCount}</strong>个动爻</span>
        </div>
      </ExplainSection>

      {/* 动爻详解 */}
      <ExplainSection title="动爻详解">
        {data.yaos.filter((y) => y.is_moving).map((yao) => (
          <div className="explain-item" key={yao.position}>
            <span className="explain-tag">{POSITION_LABEL[yao.position]}爻</span>
            <span>
              {yao.label}。{getMovingYaoExplain(yao.label)}
              <br />
              <em className="explain-sub">位置含义：{YAO_POSITION_EXPLAIN[POSITION_LABEL[yao.position]]}</em>
            </span>
          </div>
        ))}
      </ExplainSection>

      {/* 六爻位置含义 */}
      <ExplainSection title="六爻位置含义">
        <p>从下到上，六个爻位代表事物发展的不同阶段：</p>
        {[...data.yaos].reverse().map((yao) => (
          <div className="explain-item" key={yao.position}>
            <span className="explain-tag">{POSITION_LABEL[yao.position]}爻</span>
            <span>
              {YIN_YANG_YAO_EXPLAIN[yao.is_yang ? "阳" : "阴"]}。
              {YAO_POSITION_EXPLAIN[POSITION_LABEL[yao.position]]}
            </span>
          </div>
        ))}
      </ExplainSection>

      {/* 解卦规则 */}
      {zhuXi && (
        <ExplainSection title="解卦规则（朱熹动爻法）">
          <p>本次有<strong>{movingCount}</strong>个动爻，按朱熹《易学启蒙》的规则：</p>
          <div className="explain-item">
            <span className="explain-tag">{zhuXi.rule}</span>
            <span>{zhuXi.explain}</span>
          </div>
        </ExplainSection>
      )}

      {/* 本卦卦象解读 */}
      <ExplainSection title={`本卦：${data.original.name}`}>
        <div className="explain-item">
          <span className="explain-tag">卦象</span>
          <span>
            {data.original.name}（{data.original.unicode}）
            <br />
            <em className="explain-sub">卦辞：{data.original.judgement}</em>
          </span>
        </div>
        <div className="explain-item">
          <span className="explain-tag">大象传</span>
          <span>{data.original.image}</span>
        </div>
      </ExplainSection>

      {/* 变卦卦象解读 */}
      {data.changed && (
        <ExplainSection title={`变卦：${data.changed.name}`}>
          <div className="explain-item">
            <span className="explain-tag">卦象</span>
            <span>
              {data.changed.name}（{data.changed.unicode}）
              <br />
              <em className="explain-sub">卦辞：{data.changed.judgement}</em>
            </span>
          </div>
          <div className="explain-item">
            <span className="explain-tag">大象传</span>
            <span>{data.changed.image}</span>
          </div>
        </ExplainSection>
      )}

      {/* 参考爻辞解释 */}
      {data.reading.references.length > 0 && (
        <ExplainSection title="参考辞（解卦依据）">
          <p>{data.reading.explanation}</p>
          {data.reading.references.map((r, i) => (
            <div className="explain-item" key={i}>
              <span className="explain-tag">参考{i + 1}</span>
              <span>{r}</span>
            </div>
          ))}
        </ExplainSection>
      )}

      <p className="hint" style={{ marginTop: 16, fontSize: 12, fontStyle: "italic" }}>
        以上解释基于传统易学基本概念，仅供参考。易道深远，不同流派可能有不同解读。
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

/** 六爻详情卡片 */
function YaoDetailCard({ yaos, original }: { yaos: YaoOut[]; original: { yao: string[] } }) {
  return (
    <div className="card">
      <h2 className="card-title">六爻详情</h2>
      <div className="yao-detail-list">
        {[...yaos].reverse().map((yao) => (
          <div
            key={yao.position}
            className={"yao-detail-item" + (yao.is_moving ? " yao-moving" : "")}
          >
            <div className="yd-pos">{POSITION_LABEL[yao.position]}爻</div>
            <div className="yd-symbol">
              {yao.is_yang ? "▄▄▄▄▄" : "▄▄　▄▄"}
            </div>
            <div className="yd-value">
              {yao.label}
              {yao.is_moving && <span className="yd-moving-tag">动</span>}
            </div>
            <div className="yd-text">{original.yao[yao.position]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 卦详情卡片 */
function HexagramDetailCard({ hexagram, title }: { hexagram: { name: string; unicode: string; judgement: string; tuan: string; image: string; yao: string[] }; title: string }) {
  return (
    <div className="card">
      <h2 className="card-title">{title}：{hexagram.name}</h2>
      <div className="hex-detail-header">
        <span className="hex-unicode-lg">{hexagram.unicode}</span>
        <span className="hex-name-lg">{hexagram.name}</span>
      </div>

      <h3 className="sub-title">卦辞</h3>
      <p className="classic-text">{hexagram.judgement}</p>

      <h3 className="sub-title">彖传</h3>
      <p className="classic-text">{hexagram.tuan}</p>

      <h3 className="sub-title">大象传</h3>
      <p className="classic-text">{hexagram.image}</p>

      <h3 className="sub-title">六爻辞</h3>
      <div className="yao-text-list">
        {hexagram.yao.map((text, i) => (
          <p key={i} className="yao-text-item">{text}</p>
        ))}
      </div>
    </div>
  );
}

const POSITION_LABEL = ["初", "二", "三", "四", "五", "上"];
