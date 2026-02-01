import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import readline from 'readline';

/**
 * Real-time log watcher
 */
export class Watcher {
  constructor(logPath, intervalSeconds = 10) {
    this.logPath = logPath;
    this.interval = intervalSeconds * 1000;
    this.filePositions = new Map();
    this.stats = {
      messages: 0,
      toolCalls: 0,
      tokens: 0,
      errors: 0,
      lastActivity: null
    };
  }

  /**
   * Start watching
   */
  async start() {
    // Initial scan
    await this.scanExisting();
    
    // Watch for changes
    const watcher = chokidar.watch(this.logPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    watcher.on('add', async (path) => {
      if (path.endsWith('.jsonl') && !path.includes('.lock')) {
        console.log(chalk.gray(`[new session] ${path.split('/').pop()}`));
        this.filePositions.set(path, 0);
      }
    });

    watcher.on('change', async (path) => {
      if (path.endsWith('.jsonl') && !path.includes('.lock')) {
        await this.processNewLines(path);
      }
    });

    // Periodic status update
    setInterval(() => {
      this.printStatus();
    }, this.interval);

    // Keep running
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nStopping watch mode...'));
      watcher.close();
      process.exit(0);
    });
  }

  /**
   * Scan existing files
   */
  async scanExisting() {
    if (!fs.existsSync(this.logPath)) {
      console.log(chalk.yellow('Log path does not exist, waiting for creation...'));
      return;
    }

    const files = fs.readdirSync(this.logPath)
      .filter(f => f.endsWith('.jsonl') && !f.includes('.lock') && !f.includes('.deleted'));

    for (const file of files) {
      const fullPath = `${this.logPath}/${file}`;
      const stat = fs.statSync(fullPath);
      this.filePositions.set(fullPath, stat.size);
    }

    console.log(chalk.gray(`Tracking ${files.length} session files`));
  }

  /**
   * Process new lines in a file
   */
  async processNewLines(filePath) {
    const startPos = this.filePositions.get(filePath) || 0;
    const stat = fs.statSync(filePath);
    
    if (stat.size <= startPos) return;

    const stream = fs.createReadStream(filePath, {
      start: startPos,
      encoding: 'utf8'
    });

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      
      try {
        const entry = JSON.parse(line);
        this.processEntry(entry);
      } catch (e) {
        // Skip invalid lines
      }
    }

    this.filePositions.set(filePath, stat.size);
  }

  /**
   * Process a single log entry
   */
  processEntry(entry) {
    const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
    this.stats.lastActivity = timestamp;

    if (entry.type === 'message' && entry.message) {
      const msg = entry.message;
      
      if (msg.role === 'user') {
        this.stats.messages++;
        this.printEvent('📩', 'user message', chalk.blue);
      }
      
      if (msg.role === 'assistant') {
        // Check for tool calls
        if (msg.content) {
          for (const block of msg.content) {
            if (block.type === 'toolCall') {
              this.stats.toolCalls++;
              this.printEvent('🔧', `${block.name}`, chalk.cyan);
            }
          }
        }
        
        // Track tokens
        if (msg.usage) {
          this.stats.tokens += msg.usage.totalTokens || 0;
        }
      }
      
      if (msg.role === 'toolResult' && msg.isError) {
        this.stats.errors++;
        this.printEvent('❌', `tool error: ${msg.toolName}`, chalk.red);
      }
    }
  }

  /**
   * Print a real-time event
   */
  printEvent(icon, message, colorFn = chalk.white) {
    const time = new Date().toLocaleTimeString();
    console.log(`${chalk.gray(time)} ${icon} ${colorFn(message)}`);
  }

  /**
   * Print current status
   */
  printStatus() {
    const uptime = this.stats.lastActivity 
      ? Math.round((new Date() - this.stats.lastActivity) / 1000)
      : 0;
    
    const status = [
      chalk.gray('─'.repeat(50)),
      `  Messages: ${chalk.cyan(this.stats.messages)}`,
      `  Tool Calls: ${chalk.cyan(this.stats.toolCalls)}`,
      `  Tokens: ${chalk.cyan(this.stats.tokens.toLocaleString())}`,
      `  Errors: ${this.stats.errors > 0 ? chalk.red(this.stats.errors) : chalk.green('0')}`,
      this.stats.lastActivity 
        ? `  Last Activity: ${uptime}s ago`
        : '  No activity yet',
      chalk.gray('─'.repeat(50))
    ];
    
    console.log(status.join('\n'));
  }
}
