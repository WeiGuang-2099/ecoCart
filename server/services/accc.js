// ACCC (Australian Competition and Consumer Commission) Anti-Greenwashing Compliance
// Detect misleading sustainability claims as required by Australian consumer law

class ACCCComplianceChecker {
  constructor() {
    this.greenwashingKeywords = [
      'carbon neutral',
      'fully organic', 
      'all natural',
      'eco-friendly',
      'green',
      'sustainable'
    ];
    
    this.requireEvidence = [
      'carbon neutral',
      'certified organic',
      '100% organic',
      'zero waste'
    ];
    
    this.australianStandards = [
      'Australian Certified Organic (ACO)',
      'Carbon Reduction Institute',
      'Climate Active',
      'Good Environmental Choice Australia (GECA)'
    ];
  }

  // Determine which claims require supporting evidence
  checkEvidenceRequired(claims) {
    const warnings = [];
    const requiredEvidence = [];
    
    claims.forEach(claim => {
      this.requireEvidence.forEach(keyword => {
        if (claim.toLowerCase().includes(keyword.toLowerCase())) {
          requiredEvidence.push({
            claim: claim,
            requiredEvidence: this.getEvidenceRequirement(keyword),
            riskLevel: this.assessRiskLevel(keyword)
          });
        }
      });
    });
    
    return {
      requiresEvidence: requiredEvidence.length > 0,
      evidenceClaims: requiredEvidence,
      complianceStatus: requiredEvidence.length === 0 ? 'compliant' : 'requires-verification'
    };
  }

  // Risk assessment based on claim type
  assessRiskLevel(claim) {
    const highRiskClaims = ['carbon neutral', '100% organic', 'certified organic'];
    const mediumRiskClaims = ['eco-friendly', 'green', 'sustainable'];
    
    if (highRiskClaims.includes(claim)) return 'high';
    if (mediumRiskClaims.includes(claim)) return 'medium';
    return 'low';
  }

  // Evidence requirements for sensitive claims
  getEvidenceRequirement(claim) {
    const requirements = {
      'carbon neutral': 'Requires certified carbon offset certificates and an independent audit report',
      'certified organic': 'Requires Australian Certified Organic (ACO) or equivalent documentation',
      '100% organic': 'Requires ACO or equivalent organic certification',
      'zero waste': 'Requires full supply-chain zero-waste documentation'
    };
    
    return requirements[claim] || 'Requires independent third-party certification evidence';
  }

  // Build warning set for risky claims
  generateComplianceWarnings(claims) {
    const warnings = [];
    
    claims.forEach(claim => {
      // Flag vague claims
      if (this.isVagueClaim(claim)) {
        warnings.push({
          type: 'vague-claim',
          claim: claim,
          message: 'Claim is too vague and may breach ACCC misleading claims guidance',
          recommendation: 'Provide specific data, metrics, or certification details'
        });
      }
      
      // Flag claims that need certification
      if (this.needsCertification(claim)) {
        warnings.push({
          type: 'certification-required',
          claim: claim,
          message: 'This statement requires support from an Australian-recognised certification',
          recommendation: 'Reference Climate Active, ACO, GECA or another approved program'
        });
      }
    });
    
    return warnings;
  }

  // Check vague comparative language
  isVagueClaim(claim) {
    const vaguePatterns = [
      /greener/i,
      /more eco/i,
      /more sustainable/i
    ];
    
    return vaguePatterns.some(pattern => pattern.test(claim));
  }

  // Determine if claim needs certification language
  needsCertification(claim) {
    const certificationRequired = [
      'organic', 'bio', 'eco', 'green',
      'carbon', 'climate', 'sustainable'
    ];
    
    return certificationRequired.some(keyword => 
      claim.toLowerCase().includes(keyword)
    );
  }

  // Validate references to Australian standards
  validateAustralianStandards(claims) {
    const validStandards = [];
    const invalidClaims = [];
    
    claims.forEach(claim => {
      const hasValidStandard = this.australianStandards.some(standard =>
        claim.toLowerCase().includes(standard.toLowerCase())
      );
      
      if (hasValidStandard) {
        validStandards.push(claim);
      } else if (this.needsCertification(claim)) {
        invalidClaims.push({
          claim: claim,
          issue: 'Missing reference to an Australian environmental standard',
          suggestedStandards: this.australianStandards
        });
      }
    });
    
    return {
      validClaims: validStandards,
      invalidClaims: invalidClaims,
      complianceRate: claims.length > 0 ? (validStandards.length / claims.length * 100).toFixed(1) : '100.0'
    };
  }

  // Generate final ACCC compliance bundle
  generateComplianceReport(claims) {
    const evidenceCheck = this.checkEvidenceRequired(claims);
    const warnings = this.generateComplianceWarnings(claims);
    const standardsValidation = this.validateAustralianStandards(claims);
    
    return {
      acccCompliance: {
        status: evidenceCheck.complianceStatus,
        riskLevel: this.calculateOverallRisk(warnings),
        evidenceRequired: evidenceCheck.requiresEvidence,
        warnings: warnings,
        standardsValidation: standardsValidation,
        recommendations: this.generateRecommendations(warnings, evidenceCheck)
      },
      disclaimer: 'Per ACCC guidance, this analysis is informational only. Seek professional legal advice for final compliance decisions.'
    };
  }

  // Determine overall risk label
  calculateOverallRisk(warnings) {
    if (warnings.length === 0) return 'low';
    
    const highRiskCount = warnings.filter(w => w.type === 'certification-required').length;
    if (highRiskCount > 0) return 'high';
    
    return warnings.length > 2 ? 'medium' : 'low';
  }

  // Provide recommended remediations
  generateRecommendations(warnings, evidenceCheck) {
    const recommendations = [];
    
    if (evidenceCheck.requiresEvidence) {
      recommendations.push('Provide third-party certification evidence for each sustainability claim.');
    }
    
    if (warnings.some(w => w.type === 'vague-claim')) {
      recommendations.push('Avoid vague comparative statements - quantify any "greener" or "better" claims.');
    }
    
    if (warnings.some(w => w.type === 'certification-required')) {
      recommendations.push('Back every claim with an Australian-recognised certification or program.');
    }
    
    recommendations.push('Review marketing copy regularly against the latest ACCC guidance.');
    recommendations.push('Retain supporting documentation for sustainability claims for at least five years.');
    
    return recommendations;
  }
}

module.exports = ACCCComplianceChecker;
