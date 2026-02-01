import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Report formatting and display
 */
export class Reporter {
  /**
   * Print quick summary
   */
  static printQuickSummary(analytics) {
    const summary = analytics.getWeeklySummary(7);
    
    console.log(chalk.cyan.bold('\n📊 AgentScope Quick Summary (7 days)\n'));
    
    console.log(`  ${chalk.bold('Sessions:')}     ${summary.totalSessions}`);
    console.log(`  ${chalk.bold('Messages:')}     ${summary.totalMessages}`);
    console.log(`  ${chalk.bold('Tool Calls:')}   ${summary.totalToolCalls}`);
    console.log(`  ${chalk.bold('Total Tokens:')} ${summary.totalTokens.toLocaleString()}`);
    console.log(`  ${chalk.bold('Total Cost:')}   $${summary.totalCost.toFixed(2)}`);
    
    if (summary.models.length > 0) {
      console.log(`  ${chalk.bold('Models:')}       ${summary.models.join(', ')}`);
    }
    
    console.log('');
  }

  /**
   * Print weekly report
   */
  static printWeeklyReport(analytics, days = 7) {
    const summary = analytics.getWeeklySummary(days);
    
    console.log(chalk.bold(`📅 Period: Last ${days} days\n`));
    
    // Summary table
    const summaryTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
      colWidths: [25, 20]
    });
    
    summaryTable.push(
      ['Total Sessions', summary.totalSessions.toString()],
      ['Total Messages', summary.totalMessages.toString()],
      ['Total Tool Calls', summary.totalToolCalls.toString()],
      ['Tool Errors', chalk.red(summary.toolErrors.toString())],
      ['Total Tokens', summary.totalTokens.toLocaleString()],
      ['Avg Tokens/Session', summary.avgTokensPerSession.toLocaleString()],
      ['Total Cost', chalk.green(`$${summary.totalCost.toFixed(2)}`)]
    );
    
    console.log(summaryTable.toString());
    
    // Top tools
    if (summary.topTools.length > 0) {
      console.log(chalk.bold('\n🔧 Top Tools:\n'));
      
      const toolTable = new Table({
        head: [chalk.cyan('Tool'), chalk.cyan('Calls')],
        colWidths: [25, 15]
      });
      
      for (const [tool, count] of summary.topTools.slice(0, 5)) {
        toolTable.push([tool, count.toString()]);
      }
      
      console.log(toolTable.toString());
    }
    
    // Activity heatmap
    console.log(chalk.bold('\n⏰ Hourly Activity:\n'));
    this.printHourlyHeatmap(summary.hourlyActivity);
    
    console.log(`\n  Peak hour: ${summary.peakHour}:00`);
  }

  /**
   * Print daily report
   */
  static printDailyReport(analytics, days = 7) {
    const dailyStats = analytics.getDailyStats(days);
    
    console.log(chalk.bold(`📅 Daily Breakdown (${days} days)\n`));
    
    const table = new Table({
      head: [
        chalk.cyan('Date'),
        chalk.cyan('Sessions'),
        chalk.cyan('Messages'),
        chalk.cyan('Tools'),
        chalk.cyan('Tokens'),
        chalk.cyan('Cost')
      ],
      colWidths: [14, 12, 12, 10, 15, 10]
    });
    
    for (const day of dailyStats) {
      table.push([
        day.date,
        day.sessions.toString(),
        day.messages.toString(),
        day.toolCalls.toString(),
        day.tokens.toLocaleString(),
        `$${day.cost.toFixed(2)}`
      ]);
    }
    
    console.log(table.toString());
    
    // Totals
    const totals = dailyStats.reduce((acc, day) => ({
      sessions: acc.sessions + day.sessions,
      messages: acc.messages + day.messages,
      toolCalls: acc.toolCalls + day.toolCalls,
      tokens: acc.tokens + day.tokens,
      cost: acc.cost + day.cost
    }), { sessions: 0, messages: 0, toolCalls: 0, tokens: 0, cost: 0 });
    
    console.log(chalk.bold(`\n  Total: ${totals.sessions} sessions, ${totals.messages} messages, ${totals.tokens.toLocaleString()} tokens, $${totals.cost.toFixed(2)}`));
  }

  /**
   * Print anomalies
   */
  static printAnomalies(anomalies) {
    if (anomalies.length === 0) return;
    
    console.log(chalk.bold('\n⚠️  Anomalies Detected:\n'));
    
    const severityColors = {
      low: chalk.yellow,
      medium: chalk.hex('#FFA500'),
      high: chalk.red
    };
    
    const severityIcons = {
      low: '○',
      medium: '◐',
      high: '●'
    };
    
    for (const anomaly of anomalies) {
      const color = severityColors[anomaly.severity] || chalk.white;
      const icon = severityIcons[anomaly.severity] || '○';
      
      console.log(`  ${color(icon)} ${color(anomaly.message)}`);
      if (anomaly.date) {
        console.log(chalk.gray(`    Date: ${anomaly.date}`));
      }
    }
    
    console.log('');
  }

  /**
   * Print hourly activity heatmap
   */
  static printHourlyHeatmap(hourlyActivity) {
    const max = Math.max(...hourlyActivity, 1);
    const blocks = ['░', '▒', '▓', '█'];
    
    let line = '  ';
    for (let i = 0; i < 24; i++) {
      const intensity = Math.floor((hourlyActivity[i] / max) * 3);
      const block = hourlyActivity[i] === 0 ? ' ' : blocks[intensity];
      line += chalk.cyan(block);
    }
    
    console.log(line);
    console.log(chalk.gray('  0         6         12        18        23'));
  }

  /**
   * Convert data to CSV format
   */
  static toCSV(data) {
    const lines = ['date,sessions,messages,tool_calls,tokens,cost'];
    
    for (const day of data.daily) {
      lines.push(`${day.date},${day.sessions},${day.messages},${day.toolCalls},${day.tokens},${day.cost.toFixed(4)}`);
    }
    
    return lines.join('\n');
  }
}
