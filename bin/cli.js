#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';

const program = new Command();

function findSessionFiles(dir) {
  const files = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...findSessionFiles(fullPath));
      } else if (item.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

function parseSession(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  const stats = { messages: 0, toolCalls: 0, tokens: 0, tools: {}, errors: 0, startTime: null, endTime: null };
  
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.role === 'user') stats.messages++;
      if (entry.role === 'assistant') {
        stats.messages++;
        if (entry.content?.includes('<function_calls>')) stats.toolCalls++;
      }
      if (entry.usage) stats.tokens += entry.usage.total_tokens || 0;
      if (entry.tool) {
        stats.tools[entry.tool] = (stats.tools[entry.tool] || 0) + 1;
        stats.toolCalls++;
      }
      if (entry.error) stats.errors++;
      if (entry.timestamp) {
        const ts = new Date(entry.timestamp);
        if (!stats.startTime || ts < stats.startTime) stats.startTime = ts;
        if (!stats.endTime || ts > stats.endTime) stats.endTime = ts;
      }
    } catch {}
  }
  return stats;
}

program.name('agentscope').version('1.0.0').description('Activity dashboard for OpenClaw agents');

program.command('report').description('Generate activity report')
  .option('-d, --dir <path>', 'OpenClaw agents directory', path.join(os.homedir(), '.openclaw/agents'))
  .option('-p, --period <days>', 'Report period in days', '7')
  .action((options) => {
    console.log(chalk.bold('\n📊 AgentScope Activity Report\n'));
    
    const sessions = findSessionFiles(options.dir);
    const cutoff = Date.now() - parseInt(options.period) * 24 * 60 * 60 * 1000;
    
    let totalMessages = 0, totalTools = 0, totalTokens = 0, totalErrors = 0;
    const toolUsage = {};
    
    for (const file of sessions) {
      const mtime = fs.statSync(file).mtime.getTime();
      if (mtime < cutoff) continue;
      
      const stats = parseSession(file);
      totalMessages += stats.messages;
      totalTools += stats.toolCalls;
      totalTokens += stats.tokens;
      totalErrors += stats.errors;
      for (const [tool, count] of Object.entries(stats.tools)) {
        toolUsage[tool] = (toolUsage[tool] || 0) + count;
      }
    }
    
    console.log(`Period: Last ${options.period} days`);
    console.log(`Sessions analyzed: ${sessions.length}`);
    console.log(`\n${chalk.cyan('Messages:')} ${totalMessages}`);
    console.log(`${chalk.cyan('Tool calls:')} ${totalTools}`);
    console.log(`${chalk.cyan('Tokens used:')} ${totalTokens.toLocaleString()}`);
    console.log(`${chalk.cyan('Errors:')} ${totalErrors}`);
    
    if (Object.keys(toolUsage).length) {
      console.log(`\n${chalk.bold('Top Tools:')}`);
      const sorted = Object.entries(toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [tool, count] of sorted) {
        const bar = '█'.repeat(Math.min(20, Math.round(count / sorted[0][1] * 20)));
        console.log(`  ${tool.padEnd(15)} ${bar} ${count}`);
      }
    }
    
    // Anomaly detection
    const avgToolsPerSession = totalTools / Math.max(1, sessions.length);
    if (avgToolsPerSession > 50) {
      console.log(chalk.yellow(`\n⚠️ High tool usage detected (${avgToolsPerSession.toFixed(1)} per session)`));
    }
    if (totalErrors > sessions.length * 0.1) {
      console.log(chalk.yellow(`\n⚠️ Elevated error rate (${(totalErrors / sessions.length * 100).toFixed(1)}%)`));
    }
    console.log();
  });

program.command('watch').description('Watch for new activity')
  .option('-d, --dir <path>', 'OpenClaw agents directory', path.join(os.homedir(), '.openclaw/agents'))
  .action((options) => {
    console.log(chalk.bold('👁️  Watching for agent activity...\n'));
    console.log(chalk.dim(`Monitoring: ${options.dir}`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    const seen = new Set();
    setInterval(() => {
      const sessions = findSessionFiles(options.dir);
      for (const file of sessions) {
        const mtime = fs.statSync(file).mtime.getTime();
        if (mtime > Date.now() - 5000 && !seen.has(file + mtime)) {
          seen.add(file + mtime);
          console.log(chalk.green(`[${new Date().toLocaleTimeString()}]`) + ` Activity in ${path.basename(file)}`);
        }
      }
    }, 2000);
  });

program.command('export').description('Export activity data')
  .option('-o, --output <file>', 'Output file', 'activity.json')
  .option('-d, --dir <path>', 'OpenClaw agents directory', path.join(os.homedir(), '.openclaw/agents'))
  .action((options) => {
    const sessions = findSessionFiles(options.dir);
    const data = sessions.map(f => ({ file: f, stats: parseSession(f) }));
    fs.writeFileSync(options.output, JSON.stringify(data, null, 2));
    console.log(chalk.green(`✓ Exported to ${options.output}`));
  });

program.parse();
