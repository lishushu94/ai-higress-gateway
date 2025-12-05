# 指标精细聚合方案

## 目标
- 对已有指标数据进行离线重算，提升 p95/p99 延迟、error_rate 等统计精度，保障报表与告警的一致性。
- 基于 `provider_routing_metrics_history`（分钟/请求级原始或近似）和 `routing.metrics.aggregate_metrics`（当前聚合结果）进行对账与回写。

## 数据源与分桶维度
- **原始/分钟表：`provider_routing_metrics_history`**
  - 关键字段：`provider_id`、`logical_model`、`transport`、`is_stream`、`user_id`、`api_key_id`、`bucket_minute`、`latency_ms`、`success`/`error_code`。
  - 时间粒度：分钟级桶（或请求级原始），作为重算的输入。
- **目标聚合表：`routing.metrics.aggregate_metrics`**
  - 预期字段：统计窗口（5 分钟/1 小时）、`count_total`、`count_success`、`count_error`、`error_rate`、`latency_p50/p90/p95/p99`、`healthy_status` 等。
- **分桶维度**：默认沿用现有维度（`provider_id`、`logical_model`、`transport`、`is_stream`、`user_id`、`api_key_id`），若原始表含路由版本/上游节点，可作为可选维度。

## 聚合方法
- **延迟分位数**：使用 TDigest/CKMS 重建直方图或基于原始样本计算精确 p95/p99；若仅有分桶计数+样本，可用近似合并算法（例如 TDigest 合并）。
- **错误率**：`error_rate = count_error / count_total`，其中 `count_error` 需根据 `success=false` 或 `error_code`>0 统计。
- **成功/失败计数**：直接按维度和时间窗口求和，并支持采样率校正（若原始表存 `sample_rate`）。
- **健康度回推**：基于阈值（如 p95>xx ms 或 error_rate>yy%）重算 `healthy_status`，与在线逻辑保持一致。

## 作业流程
1. **时间窗口选择**：支持增量重算（最近 N 小时/天）和历史回填（按天/周分批）。
2. **数据装载**：
   - 从 `provider_routing_metrics_history` 按窗口和维度加载数据。
   - 将原始样本或分钟桶映射到目标时间窗口（5 分钟/1 小时）。
3. **聚合计算**：
   - 按维度+目标窗口归并，累加计数并构建 TDigest 计算分位数。
   - 计算 error_rate、成功率、QPS（`count_total/窗口秒`）。
4. **结果校验**：
   - 与 `routing.metrics.aggregate_metrics` 现有数据对比：计数差异、分位数差异、error_rate 漂移。
   - 生成校验报告（差异超过阈值的维度/窗口列表）。
5. **写回策略**：
   - 对差异超过阈值的记录执行 `UPSERT`（按维度+窗口主键）。
   - 写入时记录 `recalculated_at`、`source_version`（代码/任务版本），便于追踪。
6. **幂等与重试**：
   - 作业按窗口+批次幂等，可重复执行；写库失败支持重试/死信队列。

## 工程实现
- **调度**：使用现有任务框架（如 Celery beat/worker 或专用 cron）定时触发。
- **代码结构**：
  - `app/metrics/offline_recalc.py`：封装聚合逻辑（数据加载、TDigest 计算、差异判定、写库）。
  - `app/metrics/tasks.py`：定义调度入口（按时间窗口执行）。
  - `scripts/backfill_metrics.py`：命令行工具，支持指定时间范围/维度重算。
- **配置**：
  - 可通过环境变量或配置文件设置窗口大小、并发批大小、差异阈值、最大重试次数。

## 验证与回滚
- **验收标准**：
  - 抽样维度的 p95/p99 与原始样本直接计算结果误差 < 1%。
  - error_rate 与手工 SQL 计算一致（差异 < 0.1%）。
  - 写回后看板曲线无明显突变（除非原有误差被纠正）。
- **回滚**：
  - 写回前备份目标表对应时间段的数据；如出现异常，恢复备份或以原表为准重新 UPSERT。

## 监控与告警
- 监控作业运行时长、处理记录数、失败重试次数、写回行数。
- 监控重算结果与在线聚合的差异度分布；超出阈值触发告警并保留对账明细。

## 时间与迭代建议
- **阶段 1**：实现单窗口重算与 UPSERT（验证 TDigest 精度）。
- **阶段 2**：支持批量回填与差异报告自动生成。
- **阶段 3**：接入调度与监控，形成持续离线校准闭环。
