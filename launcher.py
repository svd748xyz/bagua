"""玄机阁 一键启动器。

这个脚本负责：启动后端 + 前端，等待端口就绪，打开浏览器。
所有逻辑用 Python（跨编码、跨 shell 稳定），bat 只负责调用本文件。

双击 start.bat 即运行本脚本。
"""
from __future__ import annotations

import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

# 强制 stdout/stderr 用 UTF-8 输出，避免中文在 GBK 控制台乱码。
# Windows 控制台默认 GBK，Python 3.14 在 print 中文时可能 UnicodeEncodeError。
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def start() -> int:
    print("=" * 60)
    print("       玄机阁 一键启动（八卦占卜 + 八字排盘）")
    print("=" * 60)
    print()

    # 1. 前端依赖（首次）
    if not (FRONTEND_DIR / "node_modules").exists():
        print("[..] 首次启动，安装前端依赖（约 30 秒）...")
        subprocess.run(["npm", "install", "--include=dev"], cwd=FRONTEND_DIR, shell=True, check=True)

    # 2. 启动后端（后台，不阻塞）
    print("[1/3] 启动后端 http://127.0.0.1:8000")
    be = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # 3. 启动前端（后台，不阻塞）
    print("[2/3] 启动前端 http://127.0.0.1:5173")
    fe = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # 4. 轮询等待两个端口就绪
    print("[3/3] 等待服务就绪...", end="", flush=True)
    deadline = time.time() + 40
    while time.time() < deadline:
        print(".", end="", flush=True)
        time.sleep(1)
        if is_port_open("127.0.0.1", 8000) and is_port_open("127.0.0.1", 5173):
            print(" OK")
            break
    else:
        print()
        print()
        print("[!] 等待超时（40 秒）。后端或前端未就绪。")
        print(f"    后端进程存活: {be.poll() is None}")
        print(f"    前端进程存活: {fe.poll() is None}")
        input("按回车键退出...")
        be.terminate()
        fe.terminate()
        return 1

    # 5. 开浏览器
    print()
    print("正在打开浏览器...")
    webbrowser.open("http://127.0.0.1:5173")

    print()
    print("=" * 60)
    print("  应用已在浏览器打开。")
    print()
    print("  停止服务：关闭这个窗口，或双击 stop.bat")
    print("=" * 60)
    print()

    # 6. 保持窗口，直到用户按回车（此时进程仍在后台运行）
    try:
        input("服务运行中。按回车键停止服务并退出...")
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        print("正在停止服务...")
        be.terminate()
        fe.terminate()
        try:
            be.wait(timeout=5)
            fe.wait(timeout=5)
        except subprocess.TimeoutExpired:
            be.kill()
            fe.kill()
    return 0


if __name__ == "__main__":
    sys.exit(start())
