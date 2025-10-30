#!/usr/bin/env node

/**
 * Competence Monitor for AI Enhancement
 * @fileoverview Monitors and improves AI competence through metrics and learning
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Competence assessment criteria
const COMPETENCE_CRITERIA = {
  architecturalDecisions: {
    weight: 0.3,
    metrics: {
      consistency: 'How well suggestions align with project architecture',
      accuracy: 'Correctness of architectural recommendations',
      completeness: 'Coverage of all relevant architectural aspects'
    }
  },
  codeQuality: {
    weight: 0.25,
    metrics: {
      lintingPassRate: 'Percentage of generated code passing linting',
      testCoverage: 'Test coverage of generated code',
      securityScanPass: 'Security scan pass rate'
    }
  },
  errorPrevention: {
    weight: 0.2,
    metrics: {
      caughtIssues: 'Percentage of potential issues caught before implementation',
      falsePositives: 'Rate of incorrect warnings/flags',
      fixAccuracy: 'Accuracy of suggested fixes'
    }
  },
  contextAwareness: {
    weight: 0.15,
    metrics: {
      relevance: 'Relevance of suggestions to current context',
      completeness: 'How complete the context understanding is',
      proactivity: 'Ability to suggest improvements beyond immediate request'
    }
  },
  efficiency: {
    weight: 0.1,
    metrics: {
      responseTime: 'Average response time for different task types',
      iterationEfficiency: 'Reduction in back-and-forth iterations',
      batchOperations: 'Effectiveness of batched suggestions'
    }
  }
};

function loadMetrics() {
  try {
    const metricsPath = path.join(__dirname, '../../ai-metrics.json');
    return JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  } catch (error) {
    console.warn('Failed to load metrics:', error.message);
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      usageByType: {},
      userSatisfaction: [],
      qualityMetrics: {
        compilationSuccess: 0,
        testPassRate: 0,
        securityScanPass: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

function loadPatterns() {
  try {
    const patternsPath = path.join(__dirname, '../../ai-learning/patterns.json');
    return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
  } catch (error) {
    console.warn('Failed to load patterns:', error.message);
    return { competenceMetrics: {} };
  }
}

function calculateCompetenceScore() {
  const metrics = loadMetrics();
  const patterns = loadPatterns();

  const scores = {};

  // Architectural decisions score
  const archMetrics = patterns.competenceMetrics?.architecturalDecisions || {};
  scores.architecturalDecisions = {
    score: (archMetrics.accuracy || 0) * 0.5 + (archMetrics.consistency || 0) * 0.5,
    weight: COMPETENCE_CRITERIA.architecturalDecisions.weight,
    details: archMetrics
  };

  // Code quality score
  const codeMetrics = patterns.competenceMetrics?.codeQuality || {};
  scores.codeQuality = {
    score: (codeMetrics.lintingPassRate || 0) * 0.4 +
           (codeMetrics.testCoverage || 0) * 0.4 +
           (codeMetrics.securityScanPass || 0) * 0.2,
    weight: COMPETENCE_CRITERIA.codeQuality.weight,
    details: codeMetrics
  };

  // Error prevention score
  const errorMetrics = patterns.competenceMetrics?.errorPrevention || {};
  scores.errorPrevention = {
    score: (errorMetrics.caughtIssues || 0) * 0.7 - (errorMetrics.falsePositives || 0) * 0.3,
    weight: COMPETENCE_CRITERIA.errorPrevention.weight,
    details: errorMetrics
  };

  // Context awareness (derived from successful patterns)
  const contextScore = patterns.successfulPrompts?.length > 0 ?
    patterns.successfulPrompts.reduce((acc, p) => acc + (p.successRate || 0), 0) /
    patterns.successfulPrompts.length : 0;
  scores.contextAwareness = {
    score: contextScore,
    weight: COMPETENCE_CRITERIA.contextAwareness.weight,
    details: { patternSuccessRate: contextScore }
  };

  // Efficiency score (derived from performance metrics)
  const efficiencyScore = metrics.averageResponseTime > 0 ?
    Math.max(0, 1 - (metrics.averageResponseTime / 5000)) : 0; // Target: < 5s average
  scores.efficiency = {
    score: efficiencyScore,
    weight: COMPETENCE_CRITERIA.efficiency.weight,
    details: { avgResponseTime: metrics.averageResponseTime }
  };

  // Overall competence score
  const overallScore = Object.values(scores).reduce((acc, category) =>
    acc + (category.score * category.weight), 0);

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    categories: scores,
    assessmentDate: new Date().toISOString(),
    dataPoints: metrics.totalRequests || 0
  };
}

function generateImprovementRecommendations(assessment) {
  const recommendations = [];

  // Architectural decisions
  if (assessment.categories.architecturalDecisions.score < 0.8) {
    recommendations.push({
      category: 'architecturalDecisions',
      priority: 'high',
      recommendation: 'Improve architectural decision accuracy by reviewing past decisions and updating knowledge base',
      actions: [
        'Review ADRs in docs/architecture/decisions/',
        'Update ai-knowledge/knowledge-base.json with recent patterns',
        'Analyze failed architectural suggestions'
      ]
    });
  }

  // Code quality
  if (assessment.categories.codeQuality.score < 0.85) {
    recommendations.push({
      category: 'codeQuality',
      priority: 'high',
      recommendation: 'Enhance code quality by improving linting and testing practices',
      actions: [
        'Review and update ESLint rules',
        'Ensure comprehensive test coverage',
        'Add security scanning to CI pipeline'
      ]
    });
  }

  // Error prevention
  if (assessment.categories.errorPrevention.score < 0.7) {
    recommendations.push({
      category: 'errorPrevention',
      priority: 'medium',
      recommendation: 'Improve error detection and prevention mechanisms',
      actions: [
        'Analyze common error patterns',
        'Update pre-commit hooks',
        'Enhance static analysis tools'
      ]
    });
  }

  // Context awareness
  if (assessment.categories.contextAwareness.score < 0.8) {
    recommendations.push({
      category: 'contextAwareness',
      priority: 'medium',
      recommendation: 'Enhance context understanding and relevance',
      actions: [
        'Rebuild codebase index with scripts/ai/code-indexer.js build',
        'Pre-load more contexts with scripts/ai/context-preloader.js preload',
        'Update successful patterns in ai-learning/patterns.json'
      ]
    });
  }

  // Efficiency
  if (assessment.categories.efficiency.score < 0.7) {
    recommendations.push({
      category: 'efficiency',
      priority: 'low',
      recommendation: 'Optimize response times and iteration efficiency',
      actions: [
        'Enable fast mode (FAST_AI=1) for appropriate tasks',
        'Increase cache utilization',
        'Batch related operations'
      ]
    });
  }

  return recommendations;
}

function updateCompetenceMetrics(assessment) {
  const patternsPath = path.join(__dirname, '../../ai-learning/patterns.json');

  try {
    const patterns = loadPatterns();
    patterns.competenceMetrics = {
      ...patterns.competenceMetrics,
      overallScore: assessment.overallScore,
      lastAssessment: assessment.assessmentDate,
      dataPoints: assessment.dataPoints
    };

    // Update individual category scores
    Object.entries(assessment.categories).forEach(([category, data]) => {
      if (!patterns.competenceMetrics[category]) {
        patterns.competenceMetrics[category] = {};
      }
      patterns.competenceMetrics[category].currentScore = data.score;
      patterns.competenceMetrics[category].lastUpdated = assessment.assessmentDate;
    });

    patterns.lastUpdated = new Date().toISOString();
    fs.writeFileSync(patternsPath, JSON.stringify(patterns, null, 2));

    console.log('Competence metrics updated');
  } catch (error) {
    console.error('Failed to update competence metrics:', error.message);
  }
}

function displayAssessment(assessment) {
  console.log('🔍 AI Competence Assessment');
  console.log('==========================');
  console.log(`Overall Score: ${(assessment.overallScore * 100).toFixed(1)}%`);
  console.log(`Assessment Date: ${assessment.assessmentDate}`);
  console.log(`Data Points: ${assessment.dataPoints}`);
  console.log('');

  console.log('Category Breakdown:');
  Object.entries(assessment.categories).forEach(([category, data]) => {
    const scorePercent = (data.score * 100).toFixed(1);
    const weightPercent = (data.weight * 100).toFixed(0);
    console.log(`  ${category}: ${scorePercent}% (weight: ${weightPercent}%)`);
  });
  console.log('');

  const recommendations = generateImprovementRecommendations(assessment);
  if (recommendations.length > 0) {
    console.log('📈 Improvement Recommendations:');
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
      rec.actions.forEach(action => {
        console.log(`   • ${action}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ All competence areas are performing well!');
  }
}

function main() {
  const command = process.argv[2];

  switch (command) {
    case 'assess':
      const assessment = calculateCompetenceScore();
      displayAssessment(assessment);
      updateCompetenceMetrics(assessment);
      break;

    case 'recommend':
      const recAssessment = calculateCompetenceScore();
      const recommendations = generateImprovementRecommendations(recAssessment);
      console.log('Improvement Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.recommendation}`);
      });
      break;

    case 'update':
      const updateAssessment = calculateCompetenceScore();
      updateCompetenceMetrics(updateAssessment);
      console.log('Competence metrics updated successfully');
      break;

    default:
      console.log('Usage:');
      console.log('  node competence-monitor.js assess  - Run full competence assessment');
      console.log('  node competence-monitor.js recommend - Show improvement recommendations');
      console.log('  node competence-monitor.js update   - Update competence metrics only');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { calculateCompetenceScore, generateImprovementRecommendations };
