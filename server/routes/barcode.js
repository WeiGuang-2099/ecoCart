const express = require('express');
const router = express.Router();
const multer = require('multer');
const { validationResult } = require('express-validator');
const { barcodeValidation } = require('../middleware/validation');

const yoloDetector = require('../services/yolo-detector');
const imagePreprocess = require('../utils/image-preprocess');

module.exports = function(deps) {
  const { config, products, carbonService, acccService, govDataService, offService } = deps;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxFileSize },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are accepted'), false);
    }
  });

  // POST /api/scan-barcode - image upload
  router.post('/api/scan-barcode', upload.single('image'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const processingId = Math.random().toString(36).substring(7);
      console.log(`Processing ID: ${processingId} - Image analysis started`);

      const imageBuffer = req.file.buffer;

      // Step 1: Server-side barcode extraction not available;
      // client must decode barcode and use /api/lookup-barcode instead
      const barcodeResult = { detected: false, code: null, confidence: 0 };

      // Step 2: Preprocess image for YOLO
      let yoloResults = [];
      let tensorMeta = null;
      try {
        const { tensor, meta } = await imagePreprocess.prepareForYolo(imageBuffer);
        tensorMeta = meta;

        // Step 3: Run YOLO detection
        yoloResults = await yoloDetector.detect(tensor, meta);
      } catch (e) {
        console.error('YOLO detection failed:', e.message);
      }

      // Step 4: Extract barcode candidate regions from detections
      const barcodeRegions = tensorMeta
        ? imagePreprocess.extractBarcodeRegions(yoloResults, tensorMeta.origWidth, tensorMeta.origHeight)
        : [];

      // Step 5: Crop each region to base64 PNGs
      const regionImages = [];
      for (const region of barcodeRegions) {
        try {
          const { base64, width, height } = await imagePreprocess.cropRegion(imageBuffer, region);
          regionImages.push({ base64, bbox: region, width, height });
        } catch (e) {
          console.error('Crop failed:', e.message);
        }
      }

      // Step 6: Get product category from best detection
      const bestDetection = yoloResults.length > 0 ? yoloResults[0] : null;

      const ecoClaims = { claims: [] }; // client side does not upload image, default to empty

      // Build carbon deps for the service calls
      const carbonDeps = {
        afsisCategories: deps.afsisCategories,
        validOrigins: deps.validOrigins,
        defaultWeights: deps.defaultWeights,
        emissionFactorMap: deps.emissionFactorMap,
        transportFactors: deps.transportFactors,
        packagingEmissions: deps.packagingEmissions,
        defaultCategory: deps.defaultCategory,
        defaultOrigin: deps.defaultOrigin
      };

      let carbonFootprint;
      if (barcodeResult.detected) {
        const product = products.products.find(p => p.barcode === barcodeResult.code);
        carbonFootprint = product
          ? carbonService.buildCarbonFootprint(product, carbonDeps)
          : carbonService.generateEstimatedProfile('medium', carbonDeps);
      } else {
        carbonFootprint = carbonService.generateEstimatedProfile('low', carbonDeps);
      }

      // Government data
      let governmentData = {};
      if (barcodeResult.detected) {
        const afsisData = await govDataService.getAFSISProductInfo(barcodeResult.code);
        const freightData = await govDataService.getFreightEmissions(
          barcodeResult.code,
          carbonFootprint.origin || 'Unknown',
          'Sydney, NSW'
        );
        governmentData = {
          afsisData,
          freightData,
          dataQuality: govDataService.getDataQualityMetrics()
        };
      }

      const acccCompliance = acccService.generateComplianceReport(ecoClaims.claims);

      req.file.buffer = null;
      console.log(`Processing ID: ${processingId} - Analysis completed, data cleared`);

      res.json({
        barcode: barcodeResult,
        yoloDetection: bestDetection ? {
          category: bestDetection.label,
          confidence: bestDetection.confidence,
          bbox: bestDetection.bbox,
          allDetections: yoloResults
        } : null,
        barcodeRegions: regionImages,
        ecoClaims,
        carbonFootprint,
        alternatives: findEcoAlternatives(products, carbonFootprint),
        governmentData,
        acccCompliance,
        privacyCompliance: {
          dataRetention: '0-days',
          storagePolicy: 'memory-only',
          complianceStandards: ['Privacy-Act-1988', 'ACCC-Guidelines']
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Common barcode lookup handler
  async function handleBarcodeLookup(barcode, detectionMethod) {
    const { isAustralianBarcode, identifyBarcodeType, getBarcodeConfidence } = require('../utils/helpers');

    const barcodeResult = {
      detected: true,
      code: barcode,
      confidence: getBarcodeConfidence(barcode),
      type: identifyBarcodeType(barcode),
      isAustralian: isAustralianBarcode(barcode),
      detectionMethod: detectionMethod || 'api-get',
      bbox: null,
      quality: 'client'
    };

    const ecoClaims = { claims: [] };

    const carbonDeps = {
      afsisCategories: deps.afsisCategories,
      validOrigins: deps.validOrigins,
      defaultWeights: deps.defaultWeights,
      emissionFactorMap: deps.emissionFactorMap,
      transportFactors: deps.transportFactors,
      packagingEmissions: deps.packagingEmissions,
      defaultCategory: deps.defaultCategory,
      defaultOrigin: deps.defaultOrigin
    };

    const product = products.products.find(p => p.barcode === barcode);
    const carbonFootprint = product
      ? carbonService.buildCarbonFootprint(product, carbonDeps)
      : carbonService.generateEstimatedProfile('medium', carbonDeps);

    // Open Food Facts enrichment
    let openFoodFacts = null;
    try {
      const offResult = await offService.getProductByBarcode(barcode);
      const offInfo = offService.extractProductInfo(offResult);
      if (offInfo) {
        openFoodFacts = offInfo;
        // If local product not found, use OFF data for name/brand/origin
        if (!product) {
          if (offInfo.productName) carbonFootprint.productName = offInfo.productName;
          if (offInfo.brand) carbonFootprint.brand = offInfo.brand;
          if (offInfo.origin) carbonFootprint.origin = offInfo.origin;
        }
      }
    } catch (err) {
      console.error('Open Food Facts lookup failed:', err.message);
    }

    const alternatives = findEcoAlternatives(products, carbonFootprint);

    const afsisData = await govDataService.getAFSISProductInfo(barcode);
    const freightData = await govDataService.getFreightEmissions(
      barcode,
      carbonFootprint.origin || 'Unknown',
      'Sydney, NSW'
    );

    const governmentData = {
      afsisData,
      freightData,
      dataQuality: govDataService.getDataQualityMetrics()
    };

    const acccCompliance = acccService.generateComplianceReport(ecoClaims.claims);

    return {
      barcode: barcodeResult,
      ecoClaims,
      carbonFootprint,
      alternatives,
      governmentData,
      acccCompliance,
      openFoodFacts,
      privacyCompliance: {
        dataRetention: '0-days',
        storagePolicy: 'memory-only',
        complianceStandards: ['Privacy-Act-1988', 'ACCC-Guidelines']
      }
    };
  }

  // GET /api/lookup-barcode
  router.get('/api/lookup-barcode', async (req, res, next) => {
    try {
      const barcode = req.query.barcode;
      if (!barcode || barcode.length < 6 || barcode.length > 18) {
        return res.status(400).json({
          error: 'Invalid barcode',
          message: 'Barcode must be between 6 and 18 characters',
          example: 'GET /api/lookup-barcode?barcode=930030000000'
        });
      }
      const result = await handleBarcodeLookup(barcode.trim());
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/lookup-barcode
  router.post('/api/lookup-barcode', barcodeValidation, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    try {
      const { barcode, detectionMethod } = req.body;
      const result = await handleBarcodeLookup(barcode, detectionMethod);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

// Helper: find eco alternatives based on actual product carbon profile
function findEcoAlternatives(products, carbonFootprint) {
  const baseCarbon = carbonFootprint.co2_kg;
  const isLocal = /australia/i.test(carbonFootprint.origin || '');
  const transportKm = carbonFootprint.distance_km || 0;

  // Calculate dynamic reductions based on product profile
  const localReduction = isLocal
    ? baseCarbon * 0.05  // Already local, small improvement from farmers market
    : Math.max(baseCarbon * 0.4, transportKm * 0.0001); // Imported: big gain from going local

  const organicReduction = baseCarbon * 0.3;

  const packagingReduction = carbonFootprint.packaging_emissions || baseCarbon * 0.1;

  const isPlantCandidate = /meat|dairy|beef|chicken|pork|lamb|milk|cheese/i.test(
    (carbonFootprint.category || '') + (carbonFootprint.productName || '')
  );
  const plantReduction = isPlantCandidate
    ? baseCarbon * 0.5
    : baseCarbon * 0.15;

  return [
    {
      name: products.alternatives.localProduce.title,
      carbonReduction: Math.round(localReduction * 1000) / 1000,
      description: products.alternatives.localProduce.description,
      priceDiff: isLocal ? '+2%' : '+5%',
      australianContext: 'Support local farms, reduce food miles',
      exampleBrands: ['Macro Local', 'Coles Local', 'Woolworths Local']
    },
    {
      name: products.alternatives.organic.title,
      carbonReduction: Math.round(organicReduction * 1000) / 1000,
      description: products.alternatives.organic.description,
      priceDiff: '+15%',
      australianContext: 'Australian Certified Organic (ACO) standards',
      exampleBrands: ['Macro Organic', 'Coles Organic', 'Woolworths Organic']
    },
    {
      name: products.alternatives.minimalPackaging.title,
      carbonReduction: Math.round(packagingReduction * 1000) / 1000,
      description: products.alternatives.minimalPackaging.description,
      priceDiff: '-10%',
      australianContext: 'Compliant with Australian Packaging Covenant',
      exampleBrands: ['Naked Foods', 'The Source Bulk Foods']
    },
    {
      name: products.alternatives.plantBased.title,
      carbonReduction: Math.round(plantReduction * 1000) / 1000,
      description: products.alternatives.plantBased.description,
      priceDiff: '+8%',
      australianContext: 'Rapid growth in Australian plant-based products',
      exampleBrands: ['Thankyou', 'Earth Choice', 'Biome']
    }
  ];
}
