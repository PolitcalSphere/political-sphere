#!/usr/bin/env node

// AI Learning and Adaptation System
// Continuously improves AI capabilities based on feedback and patterns

const fs = require('fs').promises;
const path = require('path');

class AILearningSystem {
  constructor() {
    this.learningDir = path.join(__dirname, '..', 'ai-learning');
    this.feedbackFile = path.join(this.learningDir, 'feedback.jsonl');
    this.patternsFile = path.join(this.learningDir, 'patterns.json');
  }

  async initialize() {
    await fs.mkdir(this.learningDir, { recursive: true });

    const initialPatterns = {
      successfulPrompts: [],
      commonIssues: {},
      userPreferences: {},
      qualityImprovements: [],
      lastUpdated: new Date().toISOString(),
    };

    await this.savePatterns(initialPatterns);
  }

  async recordFeedback(feedback) {
    const feedbackEntry = {
      timestamp: new Date().toISOString(),
      type: feedback.type, // 'accept', 'reject', 'modify'
      operation: feedback.operation, // 'codeGeneration', 'review', etc.
      originalPrompt: feedback.originalPrompt,
      result: feedback.result,
      userRating: feedback.userRating, // 1-5
      comments: feedback.comments,
      improvements: feedback.improvements || [],
    };

    await fs.appendFile(
      this.feedbackFile,
      JSON.stringify(feedbackEntry) + '\n'
    );

    // Update patterns
    await this.updatePatterns(feedbackEntry);
  }

  async updatePatterns(feedback) {
    const patterns = await this.loadPatterns();

    // Track successful prompts
    if (feedback.type === 'accept' && feedback.userRating >= 4) {
      patterns.successfulPrompts.push({
        prompt: feedback.originalPrompt,
        operation: feedback.operation,
        rating: feedback.userRating,
        timestamp: feedback.timestamp,
      });

      // Keep only top 100
      if (patterns.successfulPrompts.length > 100) {
        patterns.successfulPrompts = patterns.successfulPrompts
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 100);
      }
    }

    // Track common issues
    if (feedback.type === 'reject' || feedback.userRating <= 2) {
      const key = `${feedback.operation}:${feedback.comments}`;
      patterns.commonIssues[key] = (patterns.commonIssues[key] || 0) + 1;
    }

    // Track improvements
    if (feedback.improvements && feedback.improvements.length > 0) {
      patterns.qualityImprovements.push(...feedback.improvements);
    }

    // Track user preferences
    if (feedback.comments) {
      const prefs = this.extractPreferences(feedback.comments);
      for (const [key, value] of Object.entries(prefs)) {
        patterns.userPreferences[key] = value;
      }
    }

    await this.savePatterns(patterns);
  }

  extractPreferences(comments) {
    const preferences = {};

    // Simple keyword extraction - in production, use NLP
    const positiveKeywords = ['like', 'prefer', 'better', 'good'];
    const negativeKeywords = ['dislike', 'avoid', 'worse', 'bad'];

    for (const keyword of positiveKeywords) {
      if (comments.toLowerCase().includes(keyword)) {
        preferences[keyword] = (preferences[keyword] || 0) + 1;
      }
    }

    for (const keyword of negativeKeywords) {
      if (comments.toLowerCase().includes(keyword)) {
        preferences[keyword] = (preferences[keyword] || 0) - 1;
      }
    }

    return preferences;
  }

  async getOptimizedPrompt(basePrompt, operation) {
    const patterns = await this.loadPatterns();

    // Find similar successful prompts
    const similarPrompts = patterns.successfulPrompts
      .filter((p) => p.operation === operation)
      .filter((p) => this.similarity(basePrompt, p.prompt) > 0.3)
      .sort((a, b) => b.rating - a.rating);

    if (similarPrompts.length > 0) {
      // Enhance base prompt with successful elements
      const bestPrompt = similarPrompts[0].prompt;
      return this.mergePrompts(basePrompt, bestPrompt);
    }

    return basePrompt;
  }

  async getRecommendations(operation) {
    const patterns = await this.loadPatterns();

    const recommendations = [];

    // Common issues for this operation
    const operationIssues = Object.entries(patterns.commonIssues)
      .filter(([key]) => key.startsWith(`${operation}:`))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (operationIssues.length > 0) {
      recommendations.push({
        type: 'issue_prevention',
        title: 'Address Common Issues',
        items: operationIssues.map(([key, count]) => ({
          issue: key.split(':')[1],
          frequency: count,
        })),
      });
    }

    // User preferences
    if (Object.keys(patterns.userPreferences).length > 0) {
      const topPrefs = Object.entries(patterns.userPreferences)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 3);

      recommendations.push({
        type: 'user_preferences',
        title: 'User Preferences',
        items: topPrefs.map(([pref, score]) => ({
          preference: pref,
          sentiment: score > 0 ? 'positive' : 'negative',
          strength: Math.abs(score),
        })),
      });
    }

    // Quality improvements
    if (patterns.qualityImprovements.length > 0) {
      const recentImprovements = patterns.qualityImprovements.slice(-5); // Last 5 improvements

      recommendations.push({
        type: 'quality_improvements',
        title: 'Recent Quality Improvements',
        items: recentImprovements,
      });
    }

    return recommendations;
  }

  similarity(text1, text2) {
    // Simple Jaccard similarity - in production, use better algorithm
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  mergePrompts(basePrompt, successfulPrompt) {
    // Simple merge - extract key successful elements
    const successfulParts = successfulPrompt
      .split('\n')
      .filter(
        (line) =>
          line.includes('IMPORTANT') ||
          line.includes('REQUIRE') ||
          line.includes('ENSURE')
      );

    return (
      basePrompt +
      '\n\nADDITIONAL REQUIREMENTS FROM SUCCESSFUL PATTERNS:\n' +
      successfulParts.join('\n')
    );
  }

  async generateInsights() {
    const patterns = await this.loadPatterns();
    const feedback = await this.loadFeedback();

    const insights = {
      totalFeedback: feedback.length,
      averageRating:
        feedback.reduce((sum, f) => sum + (f.userRating || 3), 0) /
        feedback.length,
      mostSuccessfulOperation: this.getMostSuccessfulOperation(feedback),
      trendingIssues: this.getTrendingIssues(feedback),
      learningProgress: this.calculateLearningProgress(feedback),
      recommendations: await this.getRecommendations('general'),
    };

    return insights;
  }

  getMostSuccessfulOperation(feedback) {
    const operationRatings = {};

    for (const item of feedback) {
      if (!operationRatings[item.operation]) {
        operationRatings[item.operation] = { total: 0, count: 0 };
      }
      operationRatings[item.operation].total += item.userRating || 3;
      operationRatings[item.operation].count++;
    }

    let bestOp = null;
    let bestAvg = 0;

    for (const [op, stats] of Object.entries(operationRatings)) {
      const avg = stats.total / stats.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestOp = op;
      }
    }

    return { operation: bestOp, averageRating: bestAvg };
  }

  getTrendingIssues(feedback) {
    const recentFeedback = feedback
      .filter(
        (f) =>
          new Date(f.timestamp) >
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ) // Last 30 days
      .filter((f) => f.type === 'reject' || f.userRating <= 2);

    const issueCounts = {};
    for (const item of recentFeedback) {
      const issue = item.comments || 'unspecified';
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }

    return Object.entries(issueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));
  }

  calculateLearningProgress(feedback) {
    if (feedback.length < 10) return 'insufficient_data';

    const recent = feedback.slice(-10);
    const older = feedback.slice(-20, -10);

    const recentAvg =
      recent.reduce((sum, f) => sum + (f.userRating || 3), 0) / recent.length;
    const olderAvg =
      older.reduce((sum, f) => sum + (f.userRating || 3), 0) / older.length;

    if (recentAvg > olderAvg + 0.2) return 'improving';
    if (recentAvg < olderAvg - 0.2) return 'declining';
    return 'stable';
  }

  async loadFeedback() {
    try {
      const data = await fs.readFile(this.feedbackFile, 'utf8');
      return data
        .trim()
        .split('\n')
        .filter((line) => line)
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }

  async loadPatterns() {
    try {
      const data = await fs.readFile(this.patternsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {
        successfulPrompts: [],
        commonIssues: {},
        userPreferences: {},
        qualityImprovements: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async savePatterns(patterns) {
    patterns.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.patternsFile, JSON.stringify(patterns, null, 2));
  }
}

// CLI interface
async function main() {
  const learner = new AILearningSystem();
  const command = process.argv[2];

  switch (command) {
    case 'init':
      await learner.initialize();
      console.log('AI Learning System initialized');
      break;

    case 'insights':
      const insights = await learner.generateInsights();
      console.log(JSON.stringify(insights, null, 2));
      break;

    case 'feedback':
      const feedback = {
        type: process.argv[3] || 'accept',
        operation: process.argv[4] || 'codeGeneration',
        originalPrompt: process.argv[5] || 'sample prompt',
        result: process.argv[6] || 'sample result',
        userRating: parseInt(process.argv[7] || '4'),
        comments: process.argv[8] || 'Good work',
      };
      await learner.recordFeedback(feedback);
      console.log('Feedback recorded');
      break;

    default:
      console.log('Usage: node learning.js <init|insights|feedback>');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AILearningSystem;
