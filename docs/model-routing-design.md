Model Routing & Multi-Provider Design
=====================================

背景
----

当前网关需要支持多个大模型厂商的 API 服务作为上游（upstream），并且：

- 对下游业务只暴露统一的接口和「逻辑模型名」（例如：`gpt-4.1`、`gpt-4.1-mini`）。
- 对上游可以挂接任意数量的厂商，只要它们提供兼容的接口和相同的底层模型。
- 需要在多个厂商之间做智能分流 / 负载均衡，同时保证：
  - 请求始终落到「同一逻辑模型」对应的那一组物理模型上；
  - 同一会话可以选择性地粘连到同一个厂商；
  - 可以综合延迟、错误率、成本、配额等做更智能的决策。

厂商列表由环境变量配置，数量是动态的。服务启动时需要自动调用各厂商的 `/models` 接口发现可用模型，并把「厂商 → 模型列表」的映射存入 Redis，由调度器在运行时根据规则做分流决策。


核心概念
--------

- 逻辑模型（Logical Model）
  - 对业务暴露的模型名称，例如：`gpt-4.1`、`gpt-4.1-mini`、`my-llm-1`。
  - 不直接等同于某个厂商内部的模型 ID，而是一个抽象层。

- 物理模型 / 上游（Upstream / Physical Model）
  - 某个具体厂商的某个具体模型，例如：
    - `vendorA` 的 `gpt-4.1`，
    - `vendorB` 的 `gpt-4.1-general`。
  - 一个逻辑模型可以映射到多个「确认是同一底层模型」的物理模型。

- 调度器（Scheduler）
  - 在一个逻辑模型对应的多个上游里，按规则选择一个厂商+模型来转发请求。
  - 支持权重、延迟、错误率、成本、配额、会话粘连等因素。


环境变量配置约定
----------------

为了支持「随机数量」的厂商，采用「厂商 ID 列表 + 前缀变量」的方式配置：

```env
# 所有厂商的 ID（自定义），逗号分隔
LLM_PROVIDERS=openai,azure,foo

# openai
LLM_PROVIDER_openai_NAME=OpenAI
LLM_PROVIDER_openai_BASE_URL=https://api.openai.com
LLM_PROVIDER_openai_API_KEY=sk-xxx
LLM_PROVIDER_openai_MODELS_PATH=/v1/models
LLM_PROVIDER_openai_WEIGHT=3           # 可选：基础权重
LLM_PROVIDER_openai_REGION=global      # 可选：区域/标签
LLM_PROVIDER_openai_COST_INPUT=3.0     # 可选：输入单价（自定义单位）
LLM_PROVIDER_openai_COST_OUTPUT=10.0   # 可选：输出单价

# azure
LLM_PROVIDER_azure_NAME=AzureOpenAI
LLM_PROVIDER_azure_BASE_URL=https://xxx.openai.azure.com
LLM_PROVIDER_azure_API_KEY=sk-yyy
LLM_PROVIDER_azure_MODELS_PATH=/openai/models
LLM_PROVIDER_azure_WEIGHT=2

# foo：示例的其他兼容厂商
LLM_PROVIDER_foo_NAME=FooLLM
LLM_PROVIDER_foo_BASE_URL=https://api.foo.com
LLM_PROVIDER_foo_API_KEY=sk-zzz
LLM_PROVIDER_foo_MODELS_PATH=/v1/models
LLM_PROVIDER_foo_WEIGHT=1
```

约定：

- `LLM_PROVIDERS` 给出所有厂商 ID。
- 对于每个 ID=`{id}`，通过前缀 `LLM_PROVIDER_{id}_` 读取该厂商配置。
- 最小必填字段：
  - `BASE_URL`
  - `API_KEY`
- 可选字段：
  - `MODELS_PATH`：不配置时默认 `/v1/models`。
  - `WEIGHT`：基础权重，影响调度器初始偏好。
  - `REGION`：区域标识，可用于就近路由。
  - `COST_*`：成本信息，用于「成本敏感」策略。


启动时的厂商加载与模型发现
--------------------------

服务启动时执行以下流程：

1. 从环境变量中解析厂商列表：

   - 读取 `LLM_PROVIDERS`，按逗号切分获得厂商 ID 列表。
   - 对每个 ID 拼接前缀 `LLM_PROVIDER_{id}_`，读取：
     - `NAME`
     - `BASE_URL`
     - `API_KEY`
     - `MODELS_PATH`（为空则用默认值）
     - `WEIGHT`、`REGION`、`COST_*` 等可选项。
   - 跳过缺少关键字段（如 `BASE_URL` 或 `API_KEY`）的厂商。

2. 调用各厂商的 `/models` 接口，拉取模型列表：

   - URL：`{BASE_URL}{MODELS_PATH}`。
   - 鉴权：优先考虑 `Authorization: Bearer {API_KEY}`（具体细节视兼容规范）。
   - 返回结果通过适配层统一成规范结构：

     ```json
     {
       "model_id": "gpt-4.1",
       "family": "gpt-4.1",
       "context_length": 128000,
       "capabilities": ["chat", "vision"],
       "raw": { "vendor_payload": "..." }
     }
     ```

3. 将「厂商 → 模型列表」写入 Redis：

   - key：`llm:vendor:{vendor_id}:models`
   - value：标准化后的模型数组 JSON。
   - 可以设置短 TTL（例如 5 分钟），配合定时刷新。


逻辑模型与上游映射
-------------------

在 Redis 中维护两类关键映射：

1. 厂商 → 模型列表（上一步已经写入）

   - key：`llm:vendor:{vendor_id}:models`
   - value：标准化模型列表。

2. 逻辑模型 → 上游列表

   - key：`llm:logical:{logical_model}`
   - value 示例：

     ```json
     {
       "logical_model": "gpt-4.1",
       "upstreams": [
         {
           "vendor_id": "openai",
           "endpoint": "https://api.openai.com/v1/chat/completions",
           "model_id": "gpt-4.1",
           "base_weight": 3,
           "region": "global",
           "max_qps": 50,
           "meta_hash": "123abc"
         },
         {
           "vendor_id": "azure",
           "endpoint": "https://xxx.openai.azure.com/openai/chat/completions",
           "model_id": "gpt-4.1",
           "base_weight": 2,
           "region": "cn",
           "max_qps": 100,
           "meta_hash": "123abc"
         }
       ],
       "updated_at": 1732780000
     }
     ```

   - 其中 `meta_hash`（或其它 `checkpoint_id` 等字段）用于确认「确实是同一底层模型」。
   - 构建过程可以结合：
     - 厂商自身提供的模型元信息；
     - 本地静态配置（人工对照同一逻辑模型名）。


运行时指标与会话粘连
--------------------

为了支持智能分流，调度器需要参考运行时指标和会话信息，这些信息同样存放在 Redis 中。

1. 运行时指标

   - key：`llm:metrics:{logical_model}:{vendor_id}`
   - value 示例：

     ```json
     {
       "latency_p95_ms": 900,
       "error_rate": 0.02,
       "success_qps_1m": 30,
       "status": "healthy"  // healthy / degraded / down
     }
     ```

   - 由后台任务或请求拦截器周期性更新：
     - 请求时记录耗时与结果；
     - 聚合窗口可以是 1 分钟、5 分钟等。

2. 会话粘连（可选）

   - key：`llm:session:{conversation_id}`
   - value 示例：

     ```json
     {
       "logical_model": "gpt-4.1",
       "vendor_id": "openai",
       "model_id": "gpt-4.1"
     }
     ```

   - 当请求携带 `conversation_id`（或类似字段）时：
     - 第一次请求由调度器选择一个上游；
     - 将选择结果写入该 key；
     - 后续同一会话优先使用同一厂商，避免上下文语义差异。


请求流与调度逻辑
----------------

整体请求流：

1. 客户端调用网关统一接口：

   - 示例：`POST /v1/chat/completions`
   - 请求体包含：
     - `model`: 逻辑模型名（例如 `gpt-4.1`）
     - `messages`: 对话内容
     - 可选：`conversation_id`、`user_id` 等标识

2. 网关解析逻辑模型：

   - 读取 `model` 字段得到逻辑模型名。
   - 从 Redis 获取逻辑模型配置：
     - key：`llm:logical:{logical_model}`

3. 会话粘连检查（如果启用）：

   - 如果携带 `conversation_id`：
     - 尝试读取 `llm:session:{conversation_id}`；
     - 如果存在且与逻辑模型匹配，则直接使用记录中的 `vendor_id + model_id`。

4. 候选上游集合：

   - 从逻辑模型配置中获得 `upstreams` 列表。
   - 过滤掉 `status = down` 或超过配额上限的上游。

5. 读取运行时指标：

   - 针对每个候选 `vendor_id` 读取：
     - `llm:metrics:{logical_model}:{vendor_id}`

6. 计算得分，选择上游：

   - 典型的得分公式示意：

     ```text
     score =
       base_weight
       - alpha * normalized_latency
       - beta  * normalized_error_rate
       - gamma * cost_score
       - delta * quota_penalty
     ```

   - 对得分 > 0 的上游执行「按得分加权随机选择」（weighted random choice）。
   - 可以根据不同业务场景切换策略：
     - 延迟优先：增大 `alpha`；
     - 成本优先：增大 `gamma`；
     - 稳定性优先：增大 `beta`。

7. 记录会话粘连（可选）：

   - 如果有 `conversation_id` 且之前没有绑定：
     - 将本次选择结果写入 `llm:session:{conversation_id}`，设置合适 TTL。

8. 构造并转发上游请求：

   - 将逻辑模型名转为厂商具体模型 ID（`model_id`）。
   - 根据厂商配置设置 URL、Header、鉴权。
   - 将上游响应转换为统一格式返回给客户端。


智能分流策略
------------

在上述基础上，调度器可以支持多种「智能」分流策略：

- 权重 + 延迟：
  - 默认策略：基于 `base_weight`，结合近期 P95 延迟做适度惩罚。
- 成本感知：
  - 对于离线/批量任务，可以优先选择 `COST_*` 较低的厂商。
- 错误率保护：
  - 当某个厂商错误率在最近窗口内显著上升时，自动降低其得分甚至暂时标记为 `degraded`。
- 配额与限流：
  - 每个上游可以配置 `max_qps`、日配额等；
  - 调度时对于接近配额上限的厂商施加 `quota_penalty`。
- 区域优先：
  - 根据客户端区域 / 请求来源，优先选择 `REGION` 匹配的厂商。


模型一致性保证
--------------

为了确保同一逻辑模型的不同上游确实对应同一个底层模型，需要：

- 优先使用厂商提供的元信息：
  - 例如：`checkpoint_id`、`model_hash`、`version` 等。
  - 在模型发现阶段保存为 `meta_hash` 等字段。
  - 只有 `meta_hash` 一致的候选才归为同一个逻辑模型池。

- 在缺乏统一 hash 的情况下：
  - 可以维护一份人工对照表，将已验证为「行为等价」的模型归为一个逻辑模型。
  - 也可以用固定测试集 + `temperature=0` 做回归比对（仅作为辅助手段）。


健康检查与刷新流程
------------------

- 模型列表刷新：
  - 周期性任务（例如每 1 分钟或 5 分钟）重新调用各厂商的 `/models`。
  - 更新 `llm:vendor:{vendor_id}:models` 并据此重建 `llm:logical:*` 映射。

- 上游健康检查：
  - 周期性发送轻量探测请求，记录响应时间与错误。
  - 更新 `llm:metrics:{logical_model}:{vendor_id}.status` 字段。
  - 调度器根据 `status` 决定是否参与分流。

- 运行时动态调整：
  - 可以为权重、惩罚系数（`alpha/beta/gamma/delta`）预留配置开关；
  - 线上根据监控情况调整策略，无需重启服务。


总结
----

- 通过环境变量模板配置任意数量的厂商，在启动时自动加载并调用 `/models` 进行模型发现。
- 使用 Redis 存储：
  - 厂商 → 模型列表；
  - 逻辑模型 → 上游列表；
  - 运行时指标（延迟、错误率、状态、QPS 等）；
  - 会话粘连信息（可选）。
- 调度器在每次请求时，根据逻辑模型、运行时指标和策略参数，智能选择具体厂商和模型进行转发。
- 通过 `meta_hash` 等元信息约束，确保同一逻辑模型池内的各厂商实例使用的是「同一底层模型」，在此基础上才能安全地做负载均衡与故障切换。

