"""应用配置，通过环境变量注入。

第二期接 LLM 时，会把 API key 等放在这里。
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "bagua"
    debug: bool = Field(default=False, description="调试模式")

    # CORS 允许的前端来源，逗号分隔。开发期默认允许本地 Vite 端口。
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # 第二期：LLM 配置
    llm_provider: str = Field(default="", description="LLM 供应商，留空表示未启用")
    llm_api_key: str = Field(default="", description="LLM API key")
    llm_base_url: str = Field(default="", description="LLM API 基础地址")
    llm_model: str = Field(default="", description="LLM 模型名")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """单例 Settings，避免重复读取环境变量。"""
    return Settings()
