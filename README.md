<p align="center">
  <img src="docs/images/logo.svg" alt="AI-Higress logo" width="360" />
</p>

<div align="center">

[![Release](https://img.shields.io/github/v/release/MarshallEriksen-Neura/AI-Higress-Gateway?label=release&style=flat-square)](https://github.com/MarshallEriksen-Neura/AI-Higress-Gateway/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/MarshallEriksen-Neura/AI-Higress-Gateway/test.yml?branch=main&style=flat-square)](https://github.com/MarshallEriksen-Neura/AI-Higress-Gateway/actions)
[![License](https://img.shields.io/github/license/MarshallEriksen-Neura/AI-Higress-Gateway?style=flat-square)](https://github.com/MarshallEriksen-Neura/AI-Higress-Gateway/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/MarshallEriksen-Neura/AI-Higress-Gateway?style=flat-square)](https://github.com/MarshallEriksen-Neura/AI-Higress-Gateway/stargazers)

</div>

<h1 align="center">AI-Higress-Gateway</h1>

<p align="center"><em>Production-grade AI gateway — OpenAI-compatible API, multi-provider routing, caching, and failover.</em></p>

__Languages__: English · [中文](README.zh.md)

<details>
  <summary><strong>Version</strong></summary>

  - **v1.x** (Stable): main branch ✅
  - **v2.x** (WIP): next branch (development) 🔥

</details>

> **Note**: badges now point to `MarshallEriksen-Neura/AI-Higress-Gateway`. If you prefer a different org or repo name, tell me and I will update them.

## Quick Overview

- Presents a unified OpenAI-compatible API (e.g., `/v1/chat/completions`, `/v1/responses`, `/models`).
- Aggregates model catalogs from multiple providers and caches them for low-latency discovery.
- Routes requests to provider backends with weighted scheduling and metrics-aware failover.
- Persists short conversation snippets by `X-Session-Id` in Redis for session stickiness and inspection.
- Supports both streaming (SSE) and non-streaming responses.

<p align="center">
  <img src="docs/images/architecture.svg" alt="Architecture diagram" width="700" />
</p>
---

**目录概览**

- `backend/`：FastAPI 后端实现，入口为 `main.py`，业务代码位于 `app/`。
- `frontend/`：Next.js 管理与监控 UI（App Router + Tailwind + shadcn 组件风格）。
- `docs/`：设计与运维文档（路由、上下文、迁移等）。
- `scripts/`：各类辅助脚本（模型检查、批量任务、密钥生成示例等）。
- `tests/`：后端 pytest 测试套件（包含 async 测试）。
- `docker-compose.yml`：开发/本地调试容器化编排（包含 Redis）。

> Note: The repository also contains a Chinese README at `README.zh.md`.

详细结构与设计说明见 `docs/` 目录。

---

**主要特性（概览）**

- OpenAI 兼容的 API（如 `/v1/chat/completions`, `/v1/responses`, `/models`）；
- 多供应商模型路由与加权调度；
- 跨厂商故障切换（重试与回退策略）；
- 请求格式适配器（支持不同厂商的请求/响应形态）；
- 会话粘滞与基于 `X-Session-Id` 的上下文存储（Redis）；
- 模型列表聚合与缓存（统一 `/models` 返回）；
- 支持 SSE 流式与非流式响应；
- 完善的本地开发与容器化部署流程；

---

**快速开始（开发环境）**

1. 克隆仓库并进入项目根目录：

```bash
git clone <repo-url>
cd AI-Higress-Gateway
```

2. Python 环境与后端依赖（推荐 Python 3.12）：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e backend/  # 或 pip install . 在 backend/ 根目录运行
```

3. 启动本地 Redis（开发时可用 docker-compose 一键启动）：

```bash
docker-compose up -d
```

4. 本地运行后端（开发模式）：

```bash
# 在 backend/ 目录下
apiproxy    # 项目内已提供的本地运行脚本（或： uvicorn main:app --reload）
```

5. 前端（可选）

```bash
cd frontend
# 可使用 bun、pnpm 或 npm，仓库支持 bun 示例
bun install
bun dev
```

更多环境变量与运行参数请参阅 `backend/app/settings.py`。

---

**测试**

后端测试使用 `pytest` 与 `pytest-asyncio`：

```bash
# 在 backend/ 根目录
pytest
# 或运行单个文件
pytest tests/test_chat_greeting.py
```

注意：AI Agent 不会自动运行测试，请在本地虚拟环境中执行并反馈结果。

---

**数据库迁移**

使用 Alembic 管理模式变更：

```bash
cd backend
alembic upgrade head
```

开发时可启用自动迁移：设置环境变量 `ENABLE_AUTO_MIGRATION=true`（生产环境推荐手动执行）。

---

**容器化与部署**

- 本地快速启动（包含 Redis）:

```bash
docker-compose up -d
```

- 生产部署建议：
  - 使用外部 Redis、可观察性与日志系统（ELK/Prometheus/Grafana）；
  - 先在 CI 中运行 `alembic upgrade head`，再滚动发布后端服务；
  - 使用健康检查与速率限制做流量保护。

---

**配置与 Secrets**

- 配置集中在 `backend/app/settings.py`，优先使用环境变量进行注入；
- 请通过系统 API 生成并保存 `SECRET_KEY`：`POST /system/secret-key/generate`（见项目安全规范），避免将真实密钥提交到仓库；
- Redis、上游提供商的 API Keys、权重配置均通过环境变量或容器运行时注入。

---

**架构概览**

- 网关层：FastAPI 提供统一接入面，负责鉴权、路由、格式转换与限流；
- 上游适配：`app/upstream.py` 管理与各模型提供商的通信与重试策略；
- 会话与缓存：使用 Redis 保存模型列表缓存与会话上下文（`app/context_store.py`、`app/model_cache.py`）；
- 前端：Next.js 管理界面用于模型管理、审计与运维监控。

---

**贡献指南**

- 新增改动请同时添加/更新测试（后端使用 pytest）；
- 遵循代码风格：Python 使用 PEP8；函数/变量 snake_case，类 PascalCase；优先添加类型注释；
- 提交信息简洁清晰（参见仓库历史样式，例如 `添加模型缓存错误处理`）；
- 在变更涉及 API、鉴权或错误码时，务必同步更新 `docs/api/` 下对应文档。

---

**常见命令速查**

- 创建并激活 Python 虚拟环境：`python -m venv .venv && source .venv/bin/activate`
- 安装依赖：在 `backend/` 目录运行 `pip install -e .`
- 启动服务：`apiproxy` 或 `uvicorn main:app --reload`（在 `backend/`）
- 运行测试：`pytest`（在 `backend/`）
- 启动本地全部服务：`docker-compose up -d`

---

如果你希望我把 README 的英文版或更为精简的“开发者速查”页单独拆出来，我可以继续生成对应的 `docs/` 页面或 `CONTRIBUTING.md`。

---

License: MIT

