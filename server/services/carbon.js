'use strict';

const {
  roundEmission,
  resolveProductCategory,
  resolveOriginLocation,
  resolveWeight,
  resolveEmissionFactor,
  resolveDistance,
  normalizeTransportMethod
} = require('../utils/helpers');

/**
 * Build a full carbon footprint response from a product object.
 *
 * @param {Object} product - Product record with optional carbonFootprint profile
 * @param {Object} deps - Injected dependencies
 * @returns {Object} Carbon footprint breakdown
 */
function buildCarbonFootprint(product, deps) {
  const profile = product.carbonFootprint || {};

  const categoryCode = resolveProductCategory(
    profile.product_category,
    deps.afsisCategories,
    deps.defaultCategory
  );
  const originLocation = resolveOriginLocation(
    profile.origin_location,
    deps.validOrigins,
    deps.defaultOrigin
  );
  const { weightKg, weightSource } = resolveWeight(
    profile,
    categoryCode,
    deps.defaultWeights
  );
  const emissionFactor = resolveEmissionFactor(
    profile.emission_factor,
    categoryCode,
    deps.emissionFactorMap
  );
  const distanceKm = resolveDistance(profile, product);
  const transportMethod = normalizeTransportMethod(profile.transport_method);
  const transportFactor = deps.transportFactors[transportMethod] || deps.transportFactors.road_truck;
  const adjustmentFactor = profile.is_fresh_food && transportMethod === 'air' ? 5.5 : 1.0;

  const productionEmissions = roundEmission(weightKg * emissionFactor);
  const transportEmissions = roundEmission((weightKg / 1000) * distanceKm * transportFactor * adjustmentFactor);
  const packagingEmissions = deps.packagingEmissions;
  const totalEmissions = roundEmission(productionEmissions + transportEmissions + packagingEmissions);
  const weightNote = weightSource === 'estimated' ? 'Estimated value' : null;

  return {
    co2_kg: totalEmissions,
    category: product.category,
    brand: product.brand,
    origin: product.origin,
    transport_km: distanceKm,
    product_category: categoryCode,
    origin_location: originLocation,
    weight_kg: weightKg,
    weight_source: weightSource,
    weight_note: weightNote,
    emission_factor: emissionFactor,
    distance_km: distanceKm,
    transport_method: transportMethod,
    transport_factor: transportFactor,
    adjustment_factor: adjustmentFactor,
    production_emissions: productionEmissions,
    transport_emissions: transportEmissions,
    packaging_emissions: packagingEmissions,
    production_method: profile.production_method,
    packaging: profile.packaging,
    is_fresh_food: !!profile.is_fresh_food,
    confidence: 'high',
    source: 'afsis-mapped + anz-lca',
    region: originLocation.split('/')[0] || 'australia',
    certifications: product.certifications,
    ecoClaims: product.ecoClaims,
    freightData: product.freightData,
    image: product.image || null,
    productName: product.name
  };
}

/**
 * Generate an estimated carbon profile when no real data is available.
 *
 * @param {string} [confidence='medium'] - Confidence label
 * @param {Object} deps - Injected dependencies
 * @param {string} [categoryCode] - Optional category code override
 * @returns {Object} Estimated carbon footprint profile
 */
function generateEstimatedProfile(confidence = 'medium', deps, categoryCode) {
  const normalizedCategory = resolveProductCategory(
    categoryCode,
    deps.afsisCategories,
    deps.defaultCategory
  );
  const { weightKg, weightSource } = resolveWeight(
    {},
    normalizedCategory,
    deps.defaultWeights
  );
  const emissionFactor = resolveEmissionFactor(
    undefined,
    normalizedCategory,
    deps.emissionFactorMap
  );
  const distanceKm = 1000;
  const transportMethod = 'road_truck';
  const transportFactor = deps.transportFactors[transportMethod];
  const adjustmentFactor = 1.0;
  const weightNote = weightSource === 'estimated' ? 'Estimated value' : null;

  const productionEmissions = roundEmission(weightKg * emissionFactor);
  const transportEmissions = roundEmission((weightKg / 1000) * distanceKm * transportFactor * adjustmentFactor);
  const packagingEmissions = deps.packagingEmissions;
  const totalEmissions = roundEmission(productionEmissions + transportEmissions + packagingEmissions);

  return {
    co2_kg: totalEmissions,
    category: 'Estimate',
    brand: 'Unknown',
    origin: 'Australia',
    transport_km: distanceKm,
    product_category: normalizedCategory,
    origin_location: deps.defaultOrigin,
    weight_kg: weightKg,
    weight_source: weightSource,
    weight_note: weightNote,
    emission_factor: emissionFactor,
    distance_km: distanceKm,
    transport_method: transportMethod,
    transport_factor: transportFactor,
    adjustment_factor: adjustmentFactor,
    production_emissions: productionEmissions,
    transport_emissions: transportEmissions,
    packaging_emissions: packagingEmissions,
    production_method: 'estimate',
    packaging: 'mixed',
    is_fresh_food: false,
    confidence,
    source: 'australian-estimate',
    region: deps.defaultOrigin.split('/')[0] || 'australia',
    certifications: [],
    ecoClaims: [],
    freightData: {},
    image: null,
    productName: 'Australian product (estimate)'
  };
}

module.exports = {
  buildCarbonFootprint,
  generateEstimatedProfile
};
