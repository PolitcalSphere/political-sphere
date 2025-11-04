import { describe, it, expect, beforeEach } from 'vitest';

// Provide minimal stubs for external modules used by moderationService so we can
// require it and test the pure helper methods.
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'openai') {
    return { OpenAI: class OpenAI { constructor() {} moderation = { create: async () => ({ results: [{ flagged: false, categories: {} }] }) }; } };
  }
  if (request === 'perspective-api-client') {
    return { PerspectiveAPI: class PerspectiveAPI { constructor() {} async analyze() { return { attributeScores: { TOXICITY: { summaryScore: { value: 0 } } } }; } } };
  }
  if (request === './error-handler' || request === './error-handler.js') {
    return { CircuitBreaker: class CircuitBreaker { constructor() {} async execute(fn) { return typeof fn === 'function' ? fn() : fn; } } };
  }
  return originalLoad(request, parent, isMain);
};

const Moderation = require('../moderationService');
Module._load = originalLoad;

describe('ModerationService helper functions (pure)', () => {
  let svc;
  beforeEach(() => {
    svc = new Moderation();
  });

  it('calculates violence score', () => {
    expect(svc.calculateViolenceScore('no violence here')).toBe(0);
    expect(svc.calculateViolenceScore('kill murder bomb')).toBeGreaterThan(0);
  });

  it('calculates language score', () => {
    expect(svc.calculateLanguageScore('hello friend')).toBe(0);
    expect(svc.calculateLanguageScore('fuck shit damn')).toBeGreaterThan(0);
  });

  it('calculates sexual content score', () => {
    expect(svc.calculateSexualContentScore('this is fine')).toBe(0);
    expect(svc.calculateSexualContentScore('sex porn nude')).toBeGreaterThan(0);
  });

  it('checks custom rules', () => {
    const v = svc.checkCustomRules('this text contains kill and bullying @user');
    expect(Array.isArray(v)).toBe(true);
    expect(v.length).toBeGreaterThanOrEqual(1);
  });

  it('assesses age appropriateness', () => {
    expect(svc.assessAgeAppropriateness('clean text')).toBe('U');
    expect(svc.assessAgeAppropriateness('fuck kill sex bomb')).toBeDefined();
  });
});
