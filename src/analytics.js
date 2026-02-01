/**
 * Analytics engine for session data
 */
export class Analytics {
  constructor(sessions) {
    this.sessions = sessions;
    this.now = new Date();
  }

  /**
   * Get sessions within a date range
   */
  filterByDays(days) {
    const cutoff = new Date(this.now);
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.sessions.filter(s => 
      s.startTime && s.startTime >= cutoff
    );
  }

  /**
   * Get daily stats for the past N days
   */
  getDailyStats(days = 7) {
    const stats = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(this.now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const daySessions = this.sessions.filter(s => 
        s.startTime && s.startTime >= date && s.startTime < nextDate
      );
      
      stats.push({
        date: date.toISOString().split('T')[0],
        sessions: daySessions.length,
        messages: daySessions.reduce((sum, s) => sum + s.messages.length, 0),
        toolCalls: daySessions.reduce((sum, s) => sum + s.toolCalls.length, 0),
        tokens: daySessions.reduce((sum, s) => sum + s.tokens.total, 0),
        cost: daySessions.reduce((sum, s) => sum + s.cost, 0),
        userMessages: daySessions.reduce((sum, s) => 
          sum + s.messages.filter(m => m.role === 'user').length, 0),
        assistantMessages: daySessions.reduce((sum, s) => 
          sum + s.messages.filter(m => m.role === 'assistant').length, 0)
      });
    }
    
    return stats.reverse(); // Oldest first
  }

  /**
   * Get weekly summary
   */
  getWeeklySummary(days = 7) {
    const sessions = this.filterByDays(days);
    
    const toolCallCounts = {};
    const hourlyActivity = new Array(24).fill(0);
    
    for (const session of sessions) {
      // Count tool calls by name
      for (const tc of session.toolCalls) {
        toolCallCounts[tc.name] = (toolCallCounts[tc.name] || 0) + 1;
      }
      
      // Hourly activity
      if (session.startTime) {
        hourlyActivity[session.startTime.getHours()]++;
      }
    }
    
    // Sort tool calls by frequency
    const topTools = Object.entries(toolCallCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Find peak hours
    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    
    return {
      totalSessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      totalToolCalls: sessions.reduce((sum, s) => sum + s.toolCalls.length, 0),
      totalTokens: sessions.reduce((sum, s) => sum + s.tokens.total, 0),
      totalCost: sessions.reduce((sum, s) => sum + s.cost, 0),
      avgTokensPerSession: sessions.length > 0 
        ? Math.round(sessions.reduce((sum, s) => sum + s.tokens.total, 0) / sessions.length)
        : 0,
      avgMessagesPerSession: sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + s.messages.length, 0) / sessions.length)
        : 0,
      topTools,
      peakHour,
      hourlyActivity,
      models: [...new Set(sessions.map(s => s.model).filter(Boolean))],
      toolErrors: sessions.reduce((sum, s) => 
        sum + s.toolCalls.filter(tc => tc.result?.isError).length, 0)
    };
  }

  /**
   * Get tool call stats
   */
  getToolStats(days = 7) {
    const sessions = this.filterByDays(days);
    const stats = {};
    
    for (const session of sessions) {
      for (const tc of session.toolCalls) {
        if (!stats[tc.name]) {
          stats[tc.name] = { count: 0, errors: 0 };
        }
        stats[tc.name].count++;
        if (tc.result?.isError) {
          stats[tc.name].errors++;
        }
      }
    }
    
    return stats;
  }

  /**
   * Export data for external use
   */
  export(days = 30) {
    const sessions = this.filterByDays(days);
    const daily = this.getDailyStats(days);
    const summary = this.getWeeklySummary(days);
    const toolStats = this.getToolStats(days);
    
    return {
      exportedAt: new Date().toISOString(),
      period: {
        days,
        from: new Date(this.now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
        to: this.now.toISOString()
      },
      summary,
      daily,
      toolStats,
      sessions: sessions.map(s => ({
        id: s.id,
        startTime: s.startTime?.toISOString(),
        endTime: s.endTime?.toISOString(),
        durationMs: s.durationMs,
        model: s.model,
        messageCount: s.messages.length,
        toolCallCount: s.toolCalls.length,
        tokens: s.tokens,
        cost: s.cost
      }))
    };
  }
}
