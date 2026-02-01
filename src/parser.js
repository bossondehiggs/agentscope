import fs from 'fs';
import path from 'path';
import readline from 'readline';

/**
 * Parses OpenClaw JSONL session logs
 */
export class LogParser {
  constructor(logPath) {
    this.logPath = logPath;
  }

  /**
   * Parse all session files in the log directory
   */
  async parseAll() {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const files = fs.readdirSync(this.logPath)
      .filter(f => f.endsWith('.jsonl') && !f.includes('.lock') && !f.includes('.deleted'))
      .map(f => path.join(this.logPath, f));

    const sessions = [];
    for (const file of files) {
      try {
        const session = await this.parseFile(file);
        if (session) {
          sessions.push(session);
        }
      } catch (err) {
        // Skip invalid files
      }
    }

    return sessions;
  }

  /**
   * Parse a single JSONL session file
   */
  async parseFile(filePath) {
    const lines = [];
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          lines.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    if (lines.length === 0) return null;

    return this.processSession(lines, filePath);
  }

  /**
   * Process parsed lines into a session object
   */
  processSession(lines, filePath) {
    const session = {
      id: path.basename(filePath, '.jsonl'),
      file: filePath,
      startTime: null,
      endTime: null,
      messages: [],
      toolCalls: [],
      tokens: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0
      },
      cost: 0,
      model: null,
      provider: null
    };

    for (const entry of lines) {
      // Extract timestamp
      if (entry.timestamp) {
        const ts = new Date(entry.timestamp);
        if (!session.startTime || ts < session.startTime) {
          session.startTime = ts;
        }
        if (!session.endTime || ts > session.endTime) {
          session.endTime = ts;
        }
      }

      // Extract session metadata
      if (entry.type === 'session') {
        session.id = entry.id || session.id;
      }

      // Extract model info
      if (entry.type === 'model_change') {
        session.model = entry.modelId;
        session.provider = entry.provider;
      }

      // Extract messages
      if (entry.type === 'message' && entry.message) {
        const msg = entry.message;
        session.messages.push({
          role: msg.role,
          timestamp: new Date(entry.timestamp),
          hasToolCalls: msg.content?.some(c => c.type === 'toolCall') || false
        });

        // Extract usage stats from assistant messages
        if (msg.role === 'assistant' && entry.message.usage) {
          const usage = entry.message.usage;
          session.tokens.input += usage.input || 0;
          session.tokens.output += usage.output || 0;
          session.tokens.cacheRead += usage.cacheRead || 0;
          session.tokens.cacheWrite += usage.cacheWrite || 0;
          session.tokens.total += usage.totalTokens || 0;
          
          if (usage.cost?.total) {
            session.cost += usage.cost.total;
          }
        }

        // Extract tool calls
        if (msg.content) {
          for (const block of msg.content) {
            if (block.type === 'toolCall') {
              session.toolCalls.push({
                id: block.id,
                name: block.name,
                timestamp: new Date(entry.timestamp)
              });
            }
          }
        }
      }

      // Extract tool results
      if (entry.type === 'message' && entry.message?.role === 'toolResult') {
        const result = entry.message;
        const toolCall = session.toolCalls.find(t => t.id === result.toolCallId);
        if (toolCall) {
          toolCall.result = {
            isError: result.isError || false,
            timestamp: new Date(entry.timestamp)
          };
        }
      }
    }

    // Calculate duration
    if (session.startTime && session.endTime) {
      session.durationMs = session.endTime - session.startTime;
    }

    return session;
  }
}
