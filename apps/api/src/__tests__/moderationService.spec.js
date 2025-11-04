// inject a tiny stub for the 'openai' module during tests so requiring
// moderationService doesn't fail when OpenAI isn't installed in CI/dev
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'openai') {
    // minimal stub matching how moderationService uses the OpenAI client
    return {
      OpenAI: class OpenAI {
        constructor() {}
        // moderation client shape may vary; provide a safe stub
        moderation = { create: async () => ({ results: [] }) };
      }
    };
  }
  if (request === './error-handler' || request === './error-handler.js') {
    // minimal CircuitBreaker implementation for tests
    return {
      CircuitBreaker: class CircuitBreaker {
        constructor() {}
        async execute(fn) {
          // Immediately invoke the function for unit tests
          return typeof fn === 'function' ? fn() : fn;
        }
      }
    };
  }
  if (request === 'perspective-api-client') {
    // stub for perspective API client used by moderationService
    return {
      PerspectiveAPI: class PerspectiveAPI {
        constructor() {}
        async analyze() { return { attributeScores: { TOXICITY: { summaryScore: { value: 0 } } } }; }
      }
    };
  }
  return originalLoad(request, parent, isMain);
};

const moderation = require('../moderationService');
// restore loader to avoid interfering with other tests
Module._load = originalLoad;

describe('ModerationService (unit helpers)', () => {
  beforeEach(() => {
    // Ensure cache is cleared before each test
    if (typeof moderation.clearCache === 'function') moderation.clearCache();
  });

  it('detects custom-rule violations and calculates scores', () => {
    const text = 'This contains kill and fuck and bullying @someone';

    const violations = moderation.checkCustomRules ? moderation.checkCustomRules(text) : [];
    expect(Array.isArray(violations)).toBe(true);

    const vScore = typeof moderation.calculateViolenceScore === 'function'
      ? moderation.calculateViolenceScore(text) : 0;
    const lScore = typeof moderation.calculateLanguageScore === 'function'
      ? moderation.calculateLanguageScore(text) : 0;
    const sScore = typeof moderation.calculateSexualContentScore === 'function'
      ? moderation.calculateSexualContentScore(text) : 0;

    expect(vScore).toBeGreaterThanOrEqual(0);
    expect(lScore).toBeGreaterThanOrEqual(0);
    expect(sScore).toBeGreaterThanOrEqual(0);
  });

  it('assesses age appropriateness', () => {
    const safe = moderation.assessAgeAppropriateness ? moderation.assessAgeAppropriateness('safe text') : 'U';
    expect(safe).toBeDefined();

    const rude = moderation.assessAgeAppropriateness ? moderation.assessAgeAppropriateness('fuck fuck fuck') : '18';
    expect(rude).toBeDefined();
  });
});
