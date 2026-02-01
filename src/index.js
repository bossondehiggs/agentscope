#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { LogParser } from './parser.js';
import { Analytics } from './analytics.js';
import { AnomalyDetector } from './anomaly.js';
import { Reporter } from './reporter.js';
import { Watcher } from './watcher.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const program = new Command();

// Default OpenClaw paths
const DEFAULT_LOG_PATH = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');

program
  .name('agentscope')
  .description('Activity dashboard and analytics for OpenClaw agents')
  .version('1.0.0');

program
  .command('report')
  .description('Generate activity report')
  .option('-p, --path <path>', 'Path to session logs', DEFAULT_LOG_PATH)
  .option('-d, --days <days>', 'Number of days to analyze', '7')
  .option('--daily', 'Show daily breakdown')
  .option('--weekly', 'Show weekly summary (default)')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    console.log(chalk.cyan.bold('\n📊 AgentScope Report\n'));
    
    const parser = new LogParser(options.path);
    const sessions = await parser.parseAll();
    
    if (sessions.length === 0) {
      console.log(chalk.yellow('No session logs found at: ' + options.path));
      return;
    }

    const analytics = new Analytics(sessions);
    const days = parseInt(options.days);
    
    if (options.daily) {
      Reporter.printDailyReport(analytics, days);
    } else {
      Reporter.printWeeklyReport(analytics, days);
    }
    
    // Always show anomalies
    const anomalies = AnomalyDetector.detect(analytics);
    if (anomalies.length > 0) {
      Reporter.printAnomalies(anomalies);
    }
  });

program
  .command('watch')
  .description('Watch logs in real-time')
  .option('-p, --path <path>', 'Path to session logs', DEFAULT_LOG_PATH)
  .option('-i, --interval <seconds>', 'Refresh interval', '10')
  .action(async (options) => {
    console.log(chalk.cyan.bold('\n👁️  AgentScope Watch Mode\n'));
    console.log(chalk.gray(`Watching: ${options.path}`));
    console.log(chalk.gray(`Press Ctrl+C to exit\n`));
    
    const watcher = new Watcher(options.path, parseInt(options.interval));
    await watcher.start();
  });

program
  .command('export')
  .description('Export analytics data')
  .option('-p, --path <path>', 'Path to session logs', DEFAULT_LOG_PATH)
  .option('-o, --output <file>', 'Output file', 'agentscope-export.json')
  .option('-f, --format <format>', 'Format (json|csv)', 'json')
  .option('-d, --days <days>', 'Number of days to export', '30')
  .action(async (options) => {
    console.log(chalk.cyan.bold('\n📤 Exporting Data...\n'));
    
    const parser = new LogParser(options.path);
    const sessions = await parser.parseAll();
    const analytics = new Analytics(sessions);
    
    const data = analytics.export(parseInt(options.days));
    
    if (options.format === 'csv') {
      const csv = Reporter.toCSV(data);
      fs.writeFileSync(options.output, csv);
    } else {
      fs.writeFileSync(options.output, JSON.stringify(data, null, 2));
    }
    
    console.log(chalk.green(`✅ Exported to ${options.output}`));
  });

program
  .command('summary')
  .description('Quick summary of agent activity')
  .option('-p, --path <path>', 'Path to session logs', DEFAULT_LOG_PATH)
  .action(async (options) => {
    const parser = new LogParser(options.path);
    const sessions = await parser.parseAll();
    
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found'));
      return;
    }

    const analytics = new Analytics(sessions);
    Reporter.printQuickSummary(analytics);
  });

program.parse();
