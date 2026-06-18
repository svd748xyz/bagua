import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory, deleteHistory, clearHistory, type HistoryItem } from "../utils/history";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  function handleDelete(id: string) {
    deleteHistory(id);
    setHistory(getHistory());
  }

  function handleClear() {
    if (confirm("确定要清空所有历史记录吗？")) {
      clearHistory();
      setHistory([]);
    }
  }

  function handleClick(item: HistoryItem) {
    if (item.type === "divine") {
      navigate("/divine", { state: { result: item.data } });
    } else {
      navigate("/bazi", { state: { result: item.data } });
    }
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <div className="bazi-page">
      <div className="card">
        <h2 className="card-title">历史记录</h2>
        <p className="hint">最近 {history.length} 条查询记录，点击可查看结果。</p>
        {history.length > 0 && (
          <button
            className="btn btn-secondary"
            style={{ marginBottom: 16, fontSize: 13, padding: "6px 12px" }}
            onClick={handleClear}
          >
            清空记录
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--ink-soft)" }}>暂无历史记录</p>
          <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
            使用金钱卦或八字排盘后，查询记录会自动保存在这里
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="history-list">
            {history.map((item) => (
              <div className="history-item" key={item.id} onClick={() => handleClick(item)}>
                <div className="history-info">
                  <span className="history-title">
                    {item.type === "divine" ? "金钱卦" : "八字排盘"} · {item.title}
                  </span>
                  <span className="history-time">{formatTime(item.time)}</span>
                </div>
                <button
                  className="history-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
