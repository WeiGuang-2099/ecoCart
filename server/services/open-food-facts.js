const axios = require('axios');

const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org/api/v2';

/**
 * Fetch product data from Open Food Facts by barcode.
 * @param {string} barcode - Product barcode (EAN-13, UPC, etc.)
 * @param {object} options - Optional configuration
 * @param {string} options.baseUrl - Override API base URL
 * @returns {Promise<object>} OFF API response
 */
async function getProductByBarcode(barcode, options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  try {
    const response = await axios.get(`${baseUrl}/product/${barcode}.json`, {
      timeout: 8000,
      params: {
        fields: 'product_name,brands,countries,origins,ecoscore_grade,image_url,categories,quantity,categories_tags'
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      return { status: error.response.status, error: 'Open Food Facts API request failed' };
    }
    return { status: 0, error: error.message };
  }
}

/**
 * Extract useful product info from OFF response for our API.
 * Returns null if product not found.
 */
function extractProductInfo(offResponse) {
  if (!offResponse || offResponse.status !== 1 || !offResponse.product) {
    return null;
  }

  const p = offResponse.product;
  return {
    productName: p.product_name || null,
    brand: p.brands || null,
    origin: p.origins || null,
    categories: p.categories || null,
    ecoScore: p.ecoscore_grade || null,
    imageUrl: p.image_url || null,
    quantity: p.quantity || null
  };
}

module.exports = { getProductByBarcode, extractProductInfo };
