const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const config = require('../config');
const { applySecurityMiddleware } = require('./middleware/security');
const { createErrorHandler } = require('./middleware/error-handler');
const createBarcodeRoutes = require('./routes/barcode');
const createAlternativesRoutes = require('./routes/alternatives');
const pagesRoutes = require('./routes/pages');

const { buildCarbonFootprint, generateEstimatedProfile } = require('./services/carbon');
const { extractBarcode } = require('./services/barcode');
const { getProductByBarcode, extractProductInfo } = require('./services/open-food-facts');
const ACCCComplianceChecker = require('./services/accc');
const AustralianDataIntegration = require('./services/gov-data');
const LocalAlternativesMap = require('./services/alternatives');

function createApp() {
  const app = express();

  // Load product data
  const australianProducts = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/australian-products.json'), 'utf8')
  );
  const productMetadata = australianProducts.metadata || {};

  // Build dependency container
  const deps = {
    config,
    products: australianProducts,
    productMetadata,
    afsisCategories: new Set(productMetadata.afsisCategories || []),
    validOrigins: new Set(productMetadata.validOrigins || []),
    defaultWeights: productMetadata.anzDefaultWeightsKg || {},
    emissionFactorMap: productMetadata.anzEmissionFactors || {},
    transportFactors: { air: 0.84, sea: 0.02, road_truck: 0.096, rail: 0.025 },
    packagingEmissions: 0.05,
    defaultCategory: 'generic_food',
    defaultOrigin: (productMetadata.validOrigins && productMetadata.validOrigins[0]) || 'Australia/Victoria',
    carbonService: { buildCarbonFootprint, generateEstimatedProfile },
    barcodeService: { extractBarcode },
    offService: { getProductByBarcode, extractProductInfo },
    acccService: new ACCCComplianceChecker(),
    govDataService: new AustralianDataIntegration(),
    localMapService: new LocalAlternativesMap()
  };

  // Logging middleware
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Security middleware
  applySecurityMiddleware(app);

  // Core middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));

  // Request logging (keep the privacy-compliant log from original)
  app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Request: ${req.method} ${req.path}`);
    next();
  });

  // Routes
  app.use(createBarcodeRoutes(deps));
  app.use(createAlternativesRoutes(deps));
  app.use(pagesRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
  });

  // Error handler (must be last)
  app.use(createErrorHandler(config));

  return app;
}

module.exports = { createApp };
