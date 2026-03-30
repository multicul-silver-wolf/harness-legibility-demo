# Harness Legibility Demo

一个基于 Next.js 的本地 observability harness demo，用来复现 OpenAI 在 harness engineering 文章里提到的这条思路:

- app 对 agent 可见
- logs / metrics / traces 对 agent 可查
- agent 能基于运行时信号验证自己的修改

这个子项目目前聚焦 3 条观测链路:

- `VictoriaLogs`：结构化日志
- `VictoriaMetrics`：Prometheus 风格 metrics
- `VictoriaTraces`：OTLP traces + Jaeger 查询 API

## 这个仓库是给谁用的

这个仓库适合三类人:

- 正在做 agent / coding agent / harness engineering 实验的人
- 想验证“代码改动之后，agent 能不能自己用运行时信号证明改动是对的”的人
- 想搭一个最小本地 observability playground，用来练 logs / metrics / traces 查询和回归验证的人

比较典型的使用场景:

- 你在设计一个 agent 验证闭环，需要一个小而完整的 demo 看 agent 能不能自己启动服务、触发交互、再用 telemetry 给出结论
- 你在研究“不要只看终端输出，要看真实运行时信号”这件事，想有一个仓库专门练 startup、journey、regression 这几类验证
- 你想给团队演示 harness legibility 的价值，让大家看到一个 Next.js app 如何把 logs、metrics、traces 暴露成 agent 可用的证据面

简单说，这个仓库是一个本地 agent-validation harness：

- 人或 agent 先改代码
- 再启动 app 和 observability stack
- 然后通过 startup telemetry、journey logs、journey metrics、journey spans 来验证系统是否仍然按预期工作
- 最后把这些信号当成“修改成功”的证据，而不是只靠终端里的一句 `Ready in ...`

应用里目前已经接好了这些信号:

- startup telemetry
- `home.initial_load`
- `demo.component_interaction`
- `diagnostics.view`
- `action.submit`

## Quick Start

1. 启动本地观测栈

```bash
./scripts/stack-up.sh
```

脚本会输出一条 `source .../env`，把它执行掉。

2. 载入当前 worktree 的 observability 环境变量

```bash
source .observability/<stack-id>/env
```

3. 启动 Next.js

```bash
npm run dev
```

如果你想直接把 README 里的示例 prompt 当成一轮可重复的端到端验收，可以运行:

```bash
npm run smoke:readme
```

4. 打开首页并触发几次交互

- `Advance cycle`
- `Reset to red`
- `Submit action`

5. 直接检查当前 app 暴露出的 metrics

```bash
curl http://localhost:3000/api/metrics
```

## What To Try

你可以把这个 demo 当成一个“让 agent 学会看运行时信号”的最小试验场。

比较值得先试的方向:

- 改页面交互，再让 agent 用 traces 验证关键 journey 时长
- 故意让某条 route 变慢，再让 agent 用 metrics 找出来
- 故意改坏日志字段，再让 agent 修到查询恢复可用
- 给 journey route 人为加一个失败分支，再让 agent 用 logs + metrics 解释故障

## Example Prompts

下面这些 prompt 是按这个 harness 当前的能力写的，基本可以直接用。

### Startup Gate

```text
Start the local observability stack for this worktree, boot the app, and verify that service startup completes in under 800ms. Use the startup metric and startup trace instead of guessing from the terminal output.
```

```text
Check whether the current startup signal is healthy. Tell me the latest startup duration, whether it is under 800ms, and which log and trace records support your conclusion.
```

### Journey Latency

```text
Open the demo page, trigger the canonical journeys, and verify that no span for home.initial_load, demo.component_interaction, diagnostics.view, or action.submit exceeds two seconds.
```

```text
Run the UI once and summarize the latest span durations for the four canonical journeys. If any journey is slower than expected, point to the exact trace evidence.
```

### Logs

```text
Exercise the demo interactions and inspect the latest logs for this worktree. Confirm that the journey logs are structured correctly and list the most recent event for each canonical journey.
```

```text
Check the current logs for this stack and tell me whether there are any error-level events, missing message fields, or malformed journey records.
```

### Metrics

```text
Verify that VictoriaMetrics is scraping the Next.js metrics endpoint successfully, then report the latest demo_journey_runs_total values for each canonical journey in this worktree.
```

```text
Use Prometheus-style queries against the local metrics backend to tell me how many journey runs have been observed so far, how many HTTP request errors occurred, and what the latest startup duration is.
```

### Regression Checks

```text
Make a small change to the demo, rerun the canonical journeys, and use logs, metrics, and traces to prove the harness still works end to end.
```

```text
Treat this repo like an agent-validation harness. After your change, use the local observability stack to confirm that the app still emits startup telemetry, journey logs, journey metrics, and journey spans.
```

## Useful Endpoints

- app metrics: `http://localhost:3000/api/metrics`
- journey ingestion route: `http://localhost:3000/api/observability/journey`
- VictoriaLogs query: `http://127.0.0.1:10528/select/logsql/query`
- VictoriaMetrics query API: `http://127.0.0.1:18428/api/v1/query`
- VictoriaTraces Jaeger query API: `http://127.0.0.1:11428/select/jaeger/api/traces`

## Validation

本项目当前通过了这些基础检查:

```bash
npx vitest run
npm run build
npm run smoke:readme
```

## Shut Down

```bash
./scripts/stack-down.sh
```
