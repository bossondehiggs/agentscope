# AgentScope 📊

Activity dashboard and analytics for OpenClaw agents. Monitor tool calls, messages, tokens, costs, and detect anomalies.

## Features

- **Parse OpenClaw logs** - Reads JSONL session files automatically
- **Track activity** - Tool calls, messages, tokens used, costs
- **Generate reports** - Daily and weekly summaries
- **Detect anomalies** - Unusual patterns, cost spikes, errors
- **Real-time watch** - Monitor activity as it happens
- **Export data** - JSON and CSV formats

## Installation

```bash
npm install -g agentscope
# or
npx agentscope
```

## Usage

### Quick Summary
```bash
agentscope summary
```

### Generate Report
```bash
# Weekly report (default)
agentscope report

# Daily breakdown
agentscope report --daily

# Custom period
agentscope report --days 30
```

### Watch Mode
```bash
# Real-time monitoring
agentscope watch

# Custom refresh interval
agentscope watch --interval 5
```

### Export Data
```bash
# Export to JSON
agentscope export --output report.json

# Export to CSV
agentscope export --format csv --output report.csv

# Export 30 days
agentscope export --days 30
```

## Anomaly Detection

AgentScope automatically detects:

- **Token spikes** - Usage 3x above average
- **Cost spikes** - Spending 3x above average
- **High error rates** - >10% tool call failures
- **Unusual hours** - >30% activity at night (00:00-06:00)
- **Activity gaps** - 2+ days without activity
- **Tool dominance** - Single tool >50% of calls

## Example Output

```
📊 AgentScope Report

📅 Period: Last 7 days

┌─────────────────────────┬────────────────────┐
│ Metric                  │ Value              │
├─────────────────────────┼────────────────────┤
│ Total Sessions          │ 45                 │
│ Total Messages          │ 312                │
│ Total Tool Calls        │ 891                │
│ Tool Errors             │ 3                  │
│ Total Tokens            │ 1,234,567          │
│ Total Cost              │ $12.34             │
└─────────────────────────┴────────────────────┘

🔧 Top Tools:

┌─────────────────────────┬───────────────┐
│ Tool                    │ Calls         │
├─────────────────────────┼───────────────┤
│ exec                    │ 312           │
│ write                   │ 245           │
│ read                    │ 198           │
│ edit                    │ 89            │
│ web_search              │ 47            │
└─────────────────────────┴───────────────┘

⚠️  Anomalies Detected:

  ◐ Cost spike: $5.67 (3x average)
    Date: 2026-01-28
```

## Configuration

By default, AgentScope reads from:
```
~/.openclaw/agents/main/sessions/
```

Override with `--path`:
```bash
agentscope report --path /custom/path/to/sessions
```

## License

MIT
