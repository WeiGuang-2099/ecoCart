const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const { localAlternativesValidation } = require('../middleware/validation');

module.exports = function(deps) {
  const { localMapService } = deps;

  router.post('/api/local-alternatives', localAlternativesValidation, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    try {
      const { productCategory, userLocation } = req.body;

      const recommendations = localMapService.getStoreRecommendations(
        productCategory,
        userLocation.lat,
        userLocation.lng
      );

      const nearbyStores = localMapService.findEcoStoresNearby(
        userLocation.lat,
        userLocation.lng,
        15
      );

      res.json({
        recommendations: recommendations.recommendations,
        nearbyStores: nearbyStores.stores,
        storeComparison: localMapService.generateStoreComparison(nearbyStores.stores),
        searchLocation: recommendations.searchLocation,
        totalStoresFound: nearbyStores.stores.length
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
