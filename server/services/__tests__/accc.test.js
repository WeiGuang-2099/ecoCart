const ACCCComplianceChecker = require('../accc');

describe('ACCCComplianceChecker', () => {
  const checker = new ACCCComplianceChecker();

  test('detects compliant claims (empty)', () => {
    const report = checker.generateComplianceReport([]);
    expect(report.acccCompliance.status).toBe('compliant');
    expect(report.acccCompliance.riskLevel).toBe('low');
  });

  test('flags carbon neutral as high risk', () => {
    const report = checker.generateComplianceReport(['carbon neutral']);
    expect(report.acccCompliance.evidenceRequired).toBe(true);
    expect(report.acccCompliance.riskLevel).toBe('high');
  });

  test('flags vague comparative claims', () => {
    const report = checker.generateComplianceReport(['greener than before']);
    const vagueWarnings = report.acccCompliance.warnings.filter(w => w.type === 'vague-claim');
    expect(vagueWarnings.length).toBeGreaterThan(0);
  });

  test('flags claims needing certification', () => {
    const report = checker.generateComplianceReport(['organic']);
    const certWarnings = report.acccCompliance.warnings.filter(w => w.type === 'certification-required');
    expect(certWarnings.length).toBeGreaterThan(0);
  });

  test('includes disclaimer', () => {
    const report = checker.generateComplianceReport([]);
    expect(report.disclaimer).toContain('ACCC');
  });

  test('generates recommendations', () => {
    const report = checker.generateComplianceReport(['carbon neutral']);
    expect(report.acccCompliance.recommendations.length).toBeGreaterThan(0);
  });
});
