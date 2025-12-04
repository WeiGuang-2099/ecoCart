const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const ACCCComplianceChecker = require('./accc-compliance');
const AustralianDataIntegration = require('./government-data-integration');
const LocalAlternativesMap = require('./local-alternatives-map');
const YOLONASBarcodeDetector = require('./yolo-nas-barcode');

// Load Australian product database
const australianProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'australian-products.json'), 'utf8'));
const productMetadata = australianProducts.metadata || {};
const afsisCategories = new Set(productMetadata.afsisCategories || []);
const validOrigins = new Set(productMetadata.validOrigins || []);
const defaultWeights = productMetadata.anzDefaultWeightsKg || {};
const emissionFactorMap = productMetadata.anzEmissionFactors || {};
const TRANSPORT_FACTORS = {
  air: 0.84,
  sea: 0.02,
  road_truck: 0.096,
  rail: 0.025
};
const PACKAGING_EMISSIONS = 0.05;
const DEFAULT_CATEGORY = 'generic_food';
const DEFAULT_ORIGIN_LOCATION = (productMetadata.validOrigins && productMetadata.validOrigins[0]) || 'Australia/Victoria';

// Initialize services
const govDataIntegration = new AustralianDataIntegration();
const localMap = new LocalAlternativesMap();
const yoloDetector = new YOLONASBarcodeDetector();
const australianBarcodePrefixes = ['93', '930', '931', '932', '933', '934', '935', '936', '937'];

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize ACCC compliance checker
const acccChecker = new ACCCComplianceChecker();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Privacy Act compliance middleware
app.use((req, res, next) => {
  res.setHeader('X-Privacy-Compliance', 'AU-Privacy-Act-1988');
  res.setHeader('X-Data-Retention', '0-days');
  next();
});

// Log privacy compliance
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Privacy-compliant request: ${req.method} ${req.path}`);
  next();
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Privacy Act: Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'), false);
    }
  }
});

app.post('/api/scan-barcode', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Privacy Act: Log processing without storing personal data
    const processingId = Math.random().toString(36).substring(7);
    console.log(`Processing ID: ${processingId} - Image analysis started`);

    const imageBuffer = req.file.buffer;
    
    // Process data in memory only - no persistent storage
    const barcodeResult = await extractBarcode(imageBuffer);
    const ecoClaims = await extractEcoClaims(imageBuffer);
    const carbonFootprint = await calculateCarbonFootprint(barcodeResult);
    const alternatives = await findEcoAlternatives(barcodeResult, carbonFootprint);
    
    // Government data integration
    let governmentData = {};
    if (barcodeResult.detected) {
      const afsisData = await govDataIntegration.getAFSISProductInfo(barcodeResult.code);
      const freightData = await govDataIntegration.getFreightEmissions(
        barcodeResult.code, 
        carbonFootprint.origin || 'Unknown',
        'Sydney, NSW' // Default destination
      );
      
      governmentData = {
        afsisData: afsisData,
        freightData: freightData,
        dataQuality: govDataIntegration.getDataQualityMetrics()
      };
    }
    
    // ACCC compliance check for greenwashing
    const acccCompliance = acccChecker.generateComplianceReport(ecoClaims.claims);

    // Privacy Act: Clear buffer immediately after processing
    req.file.buffer = null;

    console.log(`Processing ID: ${processingId} - Analysis completed, data cleared`);

    res.json({
      barcode: barcodeResult,
      ecoClaims: ecoClaims,
      carbonFootprint: carbonFootprint,
      alternatives: alternatives,
      governmentData: governmentData,
      acccCompliance: acccCompliance,
      privacyCompliance: {
        dataRetention: '0-days',
        storagePolicy: 'memory-only',
        complianceStandards: ['Privacy-Act-1988', 'ACCC-Guidelines']
      }
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Server processing failed' });
  }
});

// Fast path: client has already identified barcode, directly query data
app.post('/api/lookup-barcode', async (req, res) => {
  try {
    const { barcode, detectionMethod } = req.body || {};
    if (!barcode) {
      return res.status(400).json({ error: 'barcode field is required' });
    }

    const barcodeResult = {
      detected: true,
      code: barcode,
      confidence: getBarcodeConfidence(barcode),
      type: identifyBarcodeType(barcode),
      isAustralian: isAustralianBarcode(barcode),
      detectionMethod: detectionMethod || 'client-decode',
      bbox: null,
      quality: 'client'
    };

    const ecoClaims = { claims: [] }; // client side does not upload image, default to empty
    const carbonFootprint = await calculateCarbonFootprint(barcodeResult);
    const alternatives = await findEcoAlternatives(barcodeResult, carbonFootprint);

    let governmentData = {};
    const afsisData = await govDataIntegration.getAFSISProductInfo(barcodeResult.code);
    const freightData = await govDataIntegration.getFreightEmissions(
      barcodeResult.code,
      carbonFootprint.origin || 'Unknown',
      'Sydney, NSW'
    );
    governmentData = {
      afsisData,
      freightData,
      dataQuality: govDataIntegration.getDataQualityMetrics()
    };

    const acccCompliance = acccChecker.generateComplianceReport(ecoClaims.claims);

    res.json({
      barcode: barcodeResult,
      ecoClaims,
      carbonFootprint,
      alternatives,
      governmentData,
      acccCompliance,
      privacyCompliance: {
        dataRetention: '0-days',
        storagePolicy: 'memory-only',
        complianceStandards: ['Privacy-Act-1988', 'ACCC-Guidelines']
      }
    });
  } catch (error) {
    console.error('Barcode direct query error:', error);
    res.status(500).json({ error: 'Server processing failed' });
  }
});

async function extractBarcode(imageBuffer) {
  try {
    // Primary: Use YOLO-NAS for barcode detection (simulated)
    const yoloResult = await yoloDetector.detectBarcodes(imageBuffer);

    if (yoloResult.success && yoloResult.barcodes.length > 0) {
      const bestBarcode = yoloResult.barcodes[0]; // Take highest confidence detection
      return {
        detected: true,
        code: bestBarcode.barcode,
        confidence: bestBarcode.confidence,
        type: bestBarcode.type,
        isAustralian: bestBarcode.isAustralian,
        detectionMethod: 'YOLO-NAS',
        bbox: bestBarcode.bbox,
        quality: bestBarcode.quality,
        processingTime: yoloResult.processingTime
      };
    }

    // Privacy-first fallback: return detection failure instead of cloud OCR
    console.log('YOLO-NAS detection failed, cloud backup not enabled (offline mode)...');
    return { 
      detected: false, 
      code: null,
      detectionMethod: 'none',
      confidence: 0
    };
    
  } catch (error) {
    console.error('Barcode recognition error:', error);
    return { 
      detected: false, 
      code: null,
      error: 'Barcode recognition failed',
      detectionMethod: 'none'
    };
  }
}

async function extractEcoClaims(imageBuffer) {
  try {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract all environmental claim text from this product packaging image, such as 'recyclable', 'organic', 'low carbon', 'eco-friendly packaging', etc. Please return in JSON format containing all found environmental keywords."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 200
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const claimsText = response.data.choices[0].message.content.trim();
    try {
      return JSON.parse(claimsText);
    } catch {
      return { claims: [claimsText] };
    }
  } catch (error) {
    console.error('Environmental claims extraction error:', error);
    return { claims: [] };
  }
}

async function calculateCarbonFootprint(barcodeResult) {
  if (!barcodeResult.detected) {
    return generateEstimatedCarbonProfile('low');
  }

  const product = australianProducts.products.find(p => p.barcode === barcodeResult.code);
  
  if (product) {
    return buildCarbonFootprintResponse(product);
  }

  return generateEstimatedCarbonProfile('medium');
}

async function findEcoAlternatives(barcodeResult, carbonFootprint) {
  const baseCarbon = carbonFootprint.co2_kg;
  
  // Get Australian-specific alternatives
  const alternatives = [
    {
      name: australianProducts.alternatives.localProduce.title,
      carbonReduction: australianProducts.alternatives.localProduce.averageReduction,
      description: australianProducts.alternatives.localProduce.description,
      priceDiff: '+5%',
      australianContext: 'Support local farms, reduce food miles',
      exampleBrands: ['Macro Local', 'Coles Local', 'Woolworths Local']
    },
    {
      name: australianProducts.alternatives.organic.title,
      carbonReduction: baseCarbon * 0.3,
      description: australianProducts.alternatives.organic.description,
      priceDiff: '+15%',
      australianContext: 'Australian Certified Organic (ACO) standards',
      exampleBrands: ['Macro Organic', 'Coles Organic', 'Woolworths Organic']
    },
    {
      name: australianProducts.alternatives.minimalPackaging.title,
      carbonReduction: australianProducts.alternatives.minimalPackaging.averageReduction,
      description: australianProducts.alternatives.minimalPackaging.description,
      priceDiff: '-10%',
      australianContext: 'Compliant with Australian Packaging Covenant',
      exampleBrands: ['Naked Foods', 'The Source Bulk Foods']
    },
    {
      name: australianProducts.alternatives.plantBased.title,
      carbonReduction: australianProducts.alternatives.plantBased.averageReduction,
      description: australianProducts.alternatives.plantBased.description,
      priceDiff: '+8%',
      australianContext: 'Rapid growth in Australian plant-based products',
      exampleBrands: ['Thankyou', 'Earth Choice', 'Biome']
    }
  ];

  return alternatives;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function buildCarbonFootprintResponse(product) {
  const profile = product.carbonFootprint || {};
  const categoryCode = resolveProductCategory(profile.product_category);
  const originLocation = resolveOriginLocation(profile.origin_location);
  const { weightKg, weightSource } = resolveWeight(profile, categoryCode);
  const emissionFactor = resolveEmissionFactor(profile.emission_factor, categoryCode);
  const distanceKm = resolveDistance(profile, product);
  const transportMethod = normalizeTransportMethod(profile.transport_method);
  const transportFactor = TRANSPORT_FACTORS[transportMethod] || TRANSPORT_FACTORS.road_truck;
  const adjustmentFactor = profile.is_fresh_food && transportMethod === 'air' ? 5.5 : 1.0;

  const productionEmissions = roundEmission(weightKg * emissionFactor);
  const transportEmissions = roundEmission((weightKg / 1000) * distanceKm * transportFactor * adjustmentFactor);
  const packagingEmissions = PACKAGING_EMISSIONS;
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

function generateEstimatedCarbonProfile(confidence = 'medium', categoryCode = DEFAULT_CATEGORY) {
  const normalizedCategory = resolveProductCategory(categoryCode);
  const { weightKg, weightSource } = resolveWeight({}, normalizedCategory);
  const emissionFactor = resolveEmissionFactor(undefined, normalizedCategory);
  const distanceKm = 1000;
  const transportMethod = 'road_truck';
  const transportFactor = TRANSPORT_FACTORS[transportMethod];
  const adjustmentFactor = 1.0;
  const weightNote = weightSource === 'estimated' ? 'Estimated value' : null;

  const productionEmissions = roundEmission(weightKg * emissionFactor);
  const transportEmissions = roundEmission((weightKg / 1000) * distanceKm * transportFactor * adjustmentFactor);
  const packagingEmissions = PACKAGING_EMISSIONS;
  const totalEmissions = roundEmission(productionEmissions + transportEmissions + packagingEmissions);

  return {
    co2_kg: totalEmissions,
    category: 'Estimate',
    brand: 'Unknown',
    origin: 'Australia',
    transport_km: distanceKm,
    product_category: normalizedCategory,
    origin_location: DEFAULT_ORIGIN_LOCATION,
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
    region: DEFAULT_ORIGIN_LOCATION.split('/')[0] || 'australia',
    certifications: [],
    ecoClaims: [],
    freightData: {},
    image: null,
    productName: 'Australian product (estimate)'
  };
}

function resolveProductCategory(categoryCode) {
  if (categoryCode && afsisCategories.has(categoryCode)) {
    return categoryCode;
  }
  return DEFAULT_CATEGORY;
}

function resolveOriginLocation(originLocation) {
  if (originLocation && validOrigins.has(originLocation)) {
    return originLocation;
  }
  return DEFAULT_ORIGIN_LOCATION;
}

function resolveWeight(profile = {}, categoryCode = DEFAULT_CATEGORY) {
  if (typeof profile.weight_kg === 'number') {
    const source = profile.weight_source && profile.weight_source.toLowerCase() === 'estimated'
      ? 'estimated'
      : 'reported';
    return { weightKg: profile.weight_kg, weightSource: source };
  }
  const fallbackWeight = defaultWeights[categoryCode] ?? defaultWeights[DEFAULT_CATEGORY] ?? 0.3;
  return { weightKg: fallbackWeight, weightSource: 'estimated' };
}

function resolveEmissionFactor(profileFactor, categoryCode = DEFAULT_CATEGORY) {
  if (typeof profileFactor === 'number') {
    return profileFactor;
  }
  return emissionFactorMap[categoryCode] ?? emissionFactorMap[DEFAULT_CATEGORY] ?? 2;
}

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
  return 0;
}

function normalizeTransportMethod(method = 'road_truck') {
  if (!method) return 'road_truck';
  const normalized = method.toLowerCase();
  if (normalized.includes('air')) return 'air';
  if (normalized.includes('sea')) return 'sea';
  if (normalized.includes('rail')) return 'rail';
  return 'road_truck';
}

function roundEmission(value) {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  return Math.round(numeric * 1000) / 1000;
}

function isAustralianBarcode(barcodeValue = '') {
  return australianBarcodePrefixes.some(prefix => barcodeValue.startsWith(prefix));
}

function identifyBarcodeType(barcodeValue = '') {
  if (/^\d{13}$/.test(barcodeValue)) return 'EAN-13';
  if (/^\d{8}$/.test(barcodeValue)) return 'EAN-8';
  if (/^\d{12}$/.test(barcodeValue)) return 'UPC-A';
  if (/^[A-Z0-9]+$/.test(barcodeValue) && barcodeValue.length >= 6 && barcodeValue.length <= 16) return 'CODE-128/39';
  return 'Unknown';
}

function getBarcodeConfidence(barcodeValue = '') {
  let confidence = 0.9;
  if (isAustralianBarcode(barcodeValue)) confidence += 0.05;
  if (['EAN-13', 'EAN-8', 'UPC-A'].includes(identifyBarcodeType(barcodeValue))) confidence += 0.03;
  return Math.min(0.98, confidence);
}

// API endpoint for local eco alternatives
app.post('/api/local-alternatives', express.json(), async (req, res) => {
  try {
    const { productCategory, userLocation } = req.body;
    
    if (!userLocation || !userLocation.lat || !userLocation.lng) {
      return res.status(400).json({ error: 'User location information is required' });
    }

    const recommendations = localMap.getStoreRecommendations(
      productCategory,
      userLocation.lat,
      userLocation.lng
    );

    const nearbyStores = localMap.findEcoStoresNearby(
      userLocation.lat,
      userLocation.lng,
      15 // 15km radius
    );

    res.json({
      recommendations: recommendations.recommendations,
      nearbyStores: nearbyStores.stores,
      storeComparison: localMap.generateStoreComparison(nearbyStores.stores),
      searchLocation: recommendations.searchLocation,
      totalStoresFound: nearbyStores.stores.length
    });
  } catch (error) {
    console.error('Local alternatives query error:', error);
    res.status(500).json({ error: 'Failed to get local alternatives' });
  }
});

// Privacy policy endpoint
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy-policy.html'));
});

app.listen(PORT, () => {
  console.log(`EcoCart server running on port ${PORT}`);
});
