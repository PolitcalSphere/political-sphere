process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const ageService = require('../ageVerificationService');

describe('AgeVerificationService (basic)', () => {
  it('returns age restrictions for different ages', () => {
    const r1 = ageService.getAgeRestrictions(10);
    expect(r1.contentRating).toBe('U');
    expect(r1.features).toContain('parental_controls');

    const r2 = ageService.getAgeRestrictions(14);
    expect(r2.contentRating).toBe('12');

    const r3 = ageService.getAgeRestrictions(19);
    expect(r3.contentRating).toBe('18');
  });

  it('checks access control correctly', () => {
    expect(ageService.canAccessContent(15, '12')).toBe(true);
    expect(ageService.canAccessContent(11, '12')).toBe(false);
  });

  it('processes self-declaration correctly', async () => {
    const res = await ageService.processSelfDeclaration({ age: 14, consent: true });
    expect(res.success).toBe(true);
    expect(res.requiresAdditionalVerification).toBe(true);
  });

  it('generates parental consent token', () => {
    const token = ageService.generateParentalConsentToken('parent@example.com', 12);
    expect(typeof token).toBe('string');
  });
});
