/**
 * Anomaly detection for agent activity
 */
export class AnomalyDetector {
  /**
   * Detect anomalies in analytics data
   */
  static detect(analytics) {
    const anomalies = [];
    
    // Get baseline (past 7 days)
    const weeklyStats = analytics.getWeeklySummary(7);
    const dailyStats = analytics.getDailyStats(7);
    
    // Check for various anomaly patterns
    anomalies.push(...this.detectTokenSpikes(dailyStats, weeklyStats));
    anomalies.push(...this.detectToolErrors(weeklyStats));
    anomalies.push(...this.detectUnusualHours(weeklyStats));
    anomalies.push(...this.detectCostSpikes(dailyStats, weeklyStats));
    anomalies.push(...this.detectActivityGaps(dailyStats));
    anomalies.push(...this.detectHighToolUsage(weeklyStats));
    
    return anomalies;
  }

  /**
   * Detect unusual token usage spikes
   */
  static detectTokenSpikes(dailyStats, weeklyStats) {
    const anomalies = [];
    const avgDaily = weeklyStats.totalTokens / 7;
    
    for (const day of dailyStats) {
      if (day.tokens > avgDaily * 3 && day.tokens > 10000) {
        anomalies.push({
          type: 'token_spike',
          severity: 'medium',
          date: day.date,
          message: `Token usage spike: ${day.tokens.toLocaleString()} tokens (3x average)`,
          value: day.tokens,
          threshold: avgDaily * 3
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Detect high tool error rates
   */
  static detectToolErrors(weeklyStats) {
    const anomalies = [];
    const errorRate = weeklyStats.totalToolCalls > 0 
      ? weeklyStats.toolErrors / weeklyStats.totalToolCalls 
      : 0;
    
    if (errorRate > 0.1 && weeklyStats.toolErrors > 5) {
      anomalies.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `High tool error rate: ${(errorRate * 100).toFixed(1)}% (${weeklyStats.toolErrors} errors)`,
        value: errorRate,
        threshold: 0.1
      });
    }
    
    return anomalies;
  }

  /**
   * Detect activity at unusual hours
   */
  static detectUnusualHours(weeklyStats) {
    const anomalies = [];
    const nightActivity = weeklyStats.hourlyActivity
      .slice(0, 6)
      .reduce((sum, v) => sum + v, 0);
    
    const totalActivity = weeklyStats.hourlyActivity.reduce((sum, v) => sum + v, 0);
    const nightRatio = totalActivity > 0 ? nightActivity / totalActivity : 0;
    
    if (nightRatio > 0.3 && nightActivity > 5) {
      anomalies.push({
        type: 'unusual_hours',
        severity: 'low',
        message: `High night activity (00:00-06:00): ${(nightRatio * 100).toFixed(1)}% of sessions`,
        value: nightRatio,
        threshold: 0.3
      });
    }
    
    return anomalies;
  }

  /**
   * Detect cost spikes
   */
  static detectCostSpikes(dailyStats, weeklyStats) {
    const anomalies = [];
    const avgDaily = weeklyStats.totalCost / 7;
    
    for (const day of dailyStats) {
      if (day.cost > avgDaily * 3 && day.cost > 0.5) {
        anomalies.push({
          type: 'cost_spike',
          severity: 'high',
          date: day.date,
          message: `Cost spike: $${day.cost.toFixed(2)} (3x average)`,
          value: day.cost,
          threshold: avgDaily * 3
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Detect gaps in activity (potential downtime)
   */
  static detectActivityGaps(dailyStats) {
    const anomalies = [];
    let consecutiveZero = 0;
    
    for (const day of dailyStats) {
      if (day.sessions === 0) {
        consecutiveZero++;
        if (consecutiveZero >= 2) {
          anomalies.push({
            type: 'activity_gap',
            severity: 'low',
            date: day.date,
            message: `No activity detected for ${consecutiveZero}+ days`,
            value: consecutiveZero
          });
        }
      } else {
        consecutiveZero = 0;
      }
    }
    
    return anomalies;
  }

  /**
   * Detect unusually high tool usage
   */
  static detectHighToolUsage(weeklyStats) {
    const anomalies = [];
    
    // Check if any single tool dominates usage
    for (const [tool, count] of weeklyStats.topTools) {
      const ratio = count / weeklyStats.totalToolCalls;
      if (ratio > 0.5 && count > 50) {
        anomalies.push({
          type: 'tool_dominance',
          severity: 'low',
          message: `Tool "${tool}" accounts for ${(ratio * 100).toFixed(1)}% of all tool calls`,
          value: ratio,
          tool
        });
      }
    }
    
    // Check for very high tool call frequency
    const toolsPerSession = weeklyStats.totalSessions > 0 
      ? weeklyStats.totalToolCalls / weeklyStats.totalSessions 
      : 0;
    
    if (toolsPerSession > 100) {
      anomalies.push({
        type: 'high_tool_frequency',
        severity: 'medium',
        message: `High tool call frequency: ${toolsPerSession.toFixed(0)} calls per session`,
        value: toolsPerSession,
        threshold: 100
      });
    }
    
    return anomalies;
  }
}
