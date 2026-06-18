import { NavLink, Outlet } from "react-router-dom";
import { Component, type ReactNode } from "react";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2 style={{ color: "var(--accent)", marginBottom: 16 }}>页面出错了</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
            {this.state.error?.message || "发生了未知错误"}
          </p>
          <button
            className="btn"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">玄机阁</h1>
        <nav className="app-nav">
          <NavLink
            to="/divine"
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            金钱卦
          </NavLink>
          <NavLink
            to="/bazi"
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            八字排盘
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            历史记录
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="app-footer">
        <span>本站仅供文化研究参考，命理无定论，请理性看待。</span>
      </footer>
    </div>
  );
}
