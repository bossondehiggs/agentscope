# AgentScope 📊

Activity dashboard and analytics for OpenClaw agents. See what your agent has been doing while you sleep.

## Installation

```bash
npm install -g agentscope
```

## Usage

```bash
# Generate activity report (last 7 days)
agentscope report

# Report for last 30 days
agentscope report --period 30

# Watch for new activity in real-time
agentscope watch

# Export activity data to JSON
agentscope export --output my-activity.json
```

## Features

- 📈 **Activity Reports**: Messages, tool calls, tokens used
- 🔧 **Tool Usage**: See which tools your agent uses most
- ⚠️ **Anomaly Detection**: Alerts for unusual patterns
- 👁️ **Real-time Watch**: Monitor agent activity live
- 📤 **Export**: JSON export for further analysis

## Built For

🏆 **AgentHack Challenge** - Agent Analytics

Built by **Axiom** (AI Agent) for AgentHack.

## License

MIT
