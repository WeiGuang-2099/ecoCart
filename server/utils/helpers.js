'use strict';

// Australian barcode prefixes (GS1 country codes)
const AUSTRALIAN_BARCODE_PREFIXES = ['93', '930', '931', '932', '933', '934', '935', '936', '937'];

/**
 * Round an emission value to 3 decimal places.
 * Handles numbers, numeric strings, null, and undefined.
 *
 * @param {*} value - The value to round
 * @returns {number} Rounded value
 */
function roundEmission(value) {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  return Math.round(numeric * 1000) / 1000;
}

/**
 * Normalize a transport method string to a canonical key.
 *
 * @param {string} [method='road_truck'] - The transport method
 * @returns {string} One of: 'air', 'sea', 'rail', 'road_truck'
 */
function normalizeTransportMethod(method = 'road_truck') {
  if (!method) return 'road_truck';
  const normalized = method.toLowerCase();
  if (normalized.includes('air')) return 'air';
  if (normalized.includes('sea')) return 'sea';
  if (normalized.includes('rail')) return 'rail';
  return 'road_truck';
}

/**
 * Check whether a barcode value starts with an Australian GS1 prefix.
 *
 * @param {string} [barcodeValue=''] - The barcode to check
 * @param {string[]} [australianBarcodePrefixes=['93','930','931','932','933','934','935','936','937']] - Prefix array
 * @returns {boolean}
 */
function isAustralianBarcode(barcodeValue = '', australianBarcodePrefixes = ['93', '930', '931', '932', '933', '934', '935', '936', '937']) {
  return australianBarcodePrefixes.some(prefix => barcodeValue.startsWith(prefix));
}

/**
 * Identify the barcode symbology from its format.
 *
 * @param {string} [barcodeValue=''] - The barcode to identify
 * @returns {string} One of: 'EAN-13', 'EAN-8', 'UPC-A', 'CODE-128/39', 'Unknown'
 */
function identifyBarcodeType(barcodeValue = '') {
  if (/^\d{13}$/.test(barcodeValue)) return 'EAN-13';
  if (/^\d{8}$/.test(barcodeValue)) return 'EAN-8';
  if (/^\d{12}$/.test(barcodeValue)) return 'UPC-A';
  if (/^[A-Z0-9]+$/.test(barcodeValue) && barcodeValue.length >= 6 && barcodeValue.length <= 16) return 'CODE-128/39';
  return 'Unknown';
}

/**
 * Calculate a confidence score for a barcode detection.
 * Base: 0.9, +0.05 if Australian, +0.03 if standard type, max 0.98.
 *
 * @param {string} [barcodeValue=''] - The barcode to score
 * @param {string[]} [australianBarcodePrefixes] - Prefix array forwarded to isAustralianBarcode
 * @returns {number} Confidence score between 0.9 and 0.98
 */
function getBarcodeConfidence(barcodeValue = '', australianBarcodePrefixes) {
  let confidence = 0.9;
  if (isAustralianBarcode(barcodeValue, australianBarcodePrefixes)) confidence += 0.05;
  if (['EAN-13', 'EAN-8', 'UPC-A'].includes(identifyBarcodeType(barcodeValue))) confidence += 0.03;
  return Math.min(0.98, confidence);
}

/**
 * Resolve a product category code against a known set.
 *
 * @param {string} categoryCode - The category code from the profile
 * @param {Set<string>} afsisCategories - Valid category set
 * @param {string} defaultCategory - Fallback category (e.g. 'generic_food')
 * @returns {string} The resolved category code
 */
function resolveProductCategory(categoryCode, afsisCategories, defaultCategory) {
  if (categoryCode && afsisCategories.has(categoryCode)) {
    return categoryCode;
  }
  return defaultCategory;
}

/**
 * Resolve an origin location against a known set.
 *
 * @param {string} originLocation - The origin from the profile
 * @param {Set<string>} validOrigins - Valid origin set
 * @param {string} defaultOrigin - Fallback origin
 * @returns {string} The resolved origin location
 */
function resolveOriginLocation(originLocation, validOrigins, defaultOrigin) {
  if (originLocation && validOrigins.has(originLocation)) {
    return originLocation;
  }
  return defaultOrigin;
}

/**
 * Resolve the weight for a product, using reported data or category defaults.
 *
 * @param {Object} profile - Product profile data
 * @param {string} categoryCode - The product category
 * @param {Object} defaultWeights - Map of category -> default weight in kg
 * @param {number} fallbackWeight - Final fallback weight
 * @returns {{ weightKg: number, weightSource: string }}
 */
function resolveWeight(profile = {}, categoryCode, defaultWeights = {}, fallbackWeight = 0.3) {
  if (typeof profile.weight_kg === 'number') {
    const source = profile.weight_source && profile.weight_source.toLowerCase() === 'estimated'
      ? 'estimated'
      : 'reported';
    return { weightKg: profile.weight_kg, weightSource: source };
  }
  const weight = defaultWeights[categoryCode] ?? defaultWeights['generic_food'] ?? fallbackWeight;
  return { weightKg: weight, weightSource: 'estimated' };
}

/**
 * Resolve the emission factor for a product category.
 *
 * @param {*} profileFactor - Factor from the profile (must be a number to be used)
 * @param {string} categoryCode - The product category
 * @param {Object} emissionFactorMap - Map of category -> emission factor
 * @param {number} defaultFactor - Final fallback factor
 * @returns {number} The resolved emission factor
 */
function resolveEmissionFactor(profileFactor, categoryCode, emissionFactorMap = {}, defaultFactor = 2) {
  if (typeof profileFactor === 'number') {
    return profileFactor;
  }
  return emissionFactorMap[categoryCode] ?? emissionFactorMap['generic_food'] ?? defaultFactor;
}

/**
 * Resolve the transport distance from profile or product freight data.
 *
 * @param {Object} [profile={}] - Product profile data
 * @param {Object} [product={}] - Product data (may contain freightData)
 * @returns {number} Distance in km, or 0
 */
function resolveDistance(profile = {}, product = {}) {
  if (typeof profile.distance_km === 'number') {
    return profile.distance_km;
  }
  if (typeof profile.transport_km === 'number') {
    return profile.transport_km;
  }
  if (product.freightData && typeof product.freightData.distance_km === 'number') {
    return product.freightData.distance_km;
  }
  return null;
}

module.exports = {
  roundEmission,
  normalizeTransportMethod,
  isAustralianBarcode,
  identifyBarcodeType,
  getBarcodeConfidence,
  resolveProductCategory,
  resolveOriginLocation,
  resolveWeight,
  resolveEmissionFactor,
  resolveDistance
};
