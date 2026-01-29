/**
 * Product Database Generator
 * Generates 1000+ Australian supermarket products for EcoCart database
 */

const fs = require('fs');
const path = require('path');

// Australian supermarket brands
const brands = {
  woolworths: ['Woolworths', 'Macro', 'Homebrand', 'Woolworths Essentials', 'Macro Organic'],
  coles: ['Coles', 'Coles Finest', 'Coles Organic', 'Coles Smart Buy', 'Coles Ultra'],
  aldi: ['ALDI', 'Simply Nature', 'Tandil', 'Mamia', 'Brooklea'],
  iga: ['IGA', 'Black & Gold', 'Community Co'],
  sevenEleven: ['7-Eleven', '7-Select']
};

// Product categories with specific items
const productTemplates = [
  // Dairy
  { name: 'Full Cream Milk 1L', category: 'Food', type: 'milk', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Skim Milk 1L', category: 'Food', type: 'milk', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Organic Milk 1L', category: 'Food', type: 'milk', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Lactose Free Milk 1L', category: 'Food', type: 'milk', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Greek Yogurt 500g', category: 'Food', type: 'milk', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Natural Yogurt 1kg', category: 'Food', type: 'milk', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Cheddar Cheese 500g', category: 'Food', type: 'milk', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Mozzarella Cheese 250g', category: 'Food', type: 'milk', weight: 0.25, origin: 'Australia/Victoria' },
  { name: 'Butter 500g', category: 'Food', type: 'milk', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Cream 300ml', category: 'Food', type: 'milk', weight: 0.3, origin: 'Australia/Victoria' },
  
  // Eggs
  { name: 'Free Range Eggs 12pk', category: 'Food', type: 'egg', weight: 0.7, origin: 'Australia/New South Wales' },
  { name: 'Cage Free Eggs 12pk', category: 'Food', type: 'egg', weight: 0.7, origin: 'Australia/New South Wales' },
  { name: 'Organic Eggs 6pk', category: 'Food', type: 'egg', weight: 0.35, origin: 'Australia/Queensland' },
  
  // Cereals & Breakfast
  { name: 'Cornflakes 500g', category: 'Food', type: 'cereal', weight: 0.5, origin: 'Australia/New South Wales' },
  { name: 'Wheat Biscuits 750g', category: 'Food', type: 'cereal', weight: 0.75, origin: 'Australia/New South Wales' },
  { name: 'Rolled Oats 1kg', category: 'Food', type: 'cereal', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Muesli 500g', category: 'Food', type: 'cereal', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Granola 400g', category: 'Food', type: 'cereal', weight: 0.4, origin: 'Australia/Victoria' },
  
  // Beverages
  { name: 'Coffee Beans 250g', category: 'Beverages', type: 'coffee', weight: 0.25, origin: 'Colombia/Antioquia' },
  { name: 'Instant Coffee 100g', category: 'Beverages', type: 'coffee', weight: 0.1, origin: 'Colombia/Antioquia' },
  { name: 'Tea Bags 100pk', category: 'Beverages', type: 'generic_food', weight: 0.2, origin: 'Australia/Victoria' },
  { name: 'Orange Juice 1L', category: 'Beverages', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Apple Juice 1L', category: 'Beverages', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Bottled Water 600ml', category: 'Beverages', type: 'bottled_water', weight: 0.6, origin: 'Australia/Victoria' },
  { name: 'Sparkling Water 1L', category: 'Beverages', type: 'bottled_water', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Energy Drink 250ml', category: 'Beverages', type: 'energy_drink', weight: 0.25, origin: 'Australia/Victoria' },
  { name: 'Soft Drink 1.25L', category: 'Beverages', type: 'generic_food', weight: 1.25, origin: 'Australia/Victoria' },
  
  // Fresh Produce
  { name: 'Tomatoes 500g', category: 'Food', type: 'tomato', weight: 0.5, origin: 'Australia/Queensland' },
  { name: 'Cherry Tomatoes 250g', category: 'Food', type: 'tomato', weight: 0.25, origin: 'Australia/Queensland' },
  { name: 'Avocados 2pk', category: 'Food', type: 'avocado', weight: 0.4, origin: 'Australia/Queensland' },
  { name: 'Bananas 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Queensland' },
  { name: 'Apples 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Oranges 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Lettuce Head', category: 'Food', type: 'generic_food', weight: 0.3, origin: 'Australia/Victoria' },
  { name: 'Carrots 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Potatoes 2kg', category: 'Food', type: 'generic_food', weight: 2.0, origin: 'Australia/Victoria' },
  { name: 'Onions 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  
  // Snacks
  { name: 'Potato Chips 200g', category: 'Snacks', type: 'snack_food', weight: 0.2, origin: 'Australia/Victoria' },
  { name: 'Chocolate Bar 50g', category: 'Snacks', type: 'snack_food', weight: 0.05, origin: 'Australia/Victoria' },
  { name: 'Crackers 200g', category: 'Snacks', type: 'snack_food', weight: 0.2, origin: 'Australia/New South Wales' },
  { name: 'Muesli Bars 6pk', category: 'Snacks', type: 'snack_food', weight: 0.18, origin: 'Australia/Victoria' },
  { name: 'Nuts Mixed 200g', category: 'Snacks', type: 'snack_food', weight: 0.2, origin: 'Australia/Victoria' },
  
  // Cleaning Supplies
  { name: 'Dishwashing Liquid 500ml', category: 'Cleaning Supplies', type: 'cleaning_agent', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Laundry Detergent 1L', category: 'Cleaning Supplies', type: 'cleaning_agent', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Surface Cleaner 750ml', category: 'Cleaning Supplies', type: 'cleaning_agent', weight: 0.75, origin: 'Australia/Victoria' },
  { name: 'Glass Cleaner 500ml', category: 'Cleaning Supplies', type: 'cleaning_agent', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Toilet Cleaner 500ml', category: 'Cleaning Supplies', type: 'cleaning_agent', weight: 0.5, origin: 'Australia/Victoria' },
  
  // Personal Care
  { name: 'Hand Wash 500ml', category: 'Personal Care', type: 'hand_wash', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Shampoo 400ml', category: 'Personal Care', type: 'generic_food', weight: 0.4, origin: 'Australia/Victoria' },
  { name: 'Conditioner 400ml', category: 'Personal Care', type: 'generic_food', weight: 0.4, origin: 'Australia/Victoria' },
  { name: 'Body Wash 500ml', category: 'Personal Care', type: 'hand_wash', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Toothpaste 110g', category: 'Personal Care', type: 'generic_food', weight: 0.11, origin: 'Australia/Victoria' },
  { name: 'Soap Bar 100g', category: 'Personal Care', type: 'hand_wash', weight: 0.1, origin: 'Australia/Victoria' },
  
  // Pantry Staples
  { name: 'Pasta 500g', category: 'Food', type: 'generic_food', weight: 0.5, origin: 'Australia/New South Wales' },
  { name: 'Rice 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/New South Wales' },
  { name: 'Flour 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Sugar 1kg', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Queensland' },
  { name: 'Olive Oil 500ml', category: 'Food', type: 'generic_food', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Vegetable Oil 1L', category: 'Food', type: 'generic_food', weight: 1.0, origin: 'Australia/Victoria' },
  { name: 'Tomato Sauce 500ml', category: 'Food', type: 'generic_food', weight: 0.5, origin: 'Australia/Victoria' },
  { name: 'Baked Beans 420g', category: 'Food', type: 'generic_food', weight: 0.42, origin: 'Australia/Victoria' }
];

// Generate Australian barcodes (starting with 93)
function generateAustralianBarcode(index) {
  const prefix = '93';
  const productCode = String(index).padStart(10, '0');
  return prefix + productCode;
}

// Generate products
function generateProducts() {
  const products = [];
  let barcodeIndex = 30000000; // Start from a high number to avoid conflicts
  
  // Generate products for each brand
  for (const [retailer, brandList] of Object.entries(brands)) {
    for (const brand of brandList) {
      for (const template of productTemplates) {
        const barcode = generateAustralianBarcode(barcodeIndex++);
        const product = {
          barcode,
          name: `${brand} ${template.name}`,
          category: template.category,
          brand,
          origin: template.origin.includes('Australia') ? `Australia (${template.origin.split('/')[1]})` : template.origin,
          image: `https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=${encodeURIComponent(brand + ' ' + template.name)}`,
          carbonFootprint: {
            product_category: template.type,
            origin_location: template.origin,
            weight_kg: template.weight,
            weight_source: 'estimated',
            emission_factor: getEmissionFactor(template.type),
            distance_km: getDistance(template.origin),
            transport_method: getTransportMethod(template.origin),
            production_method: brand.toLowerCase().includes('organic') ? 'organic' : 'conventional',
            packaging: 'recyclable',
            is_fresh_food: ['tomato', 'avocado', 'egg'].includes(template.type)
          },
          certifications: getCertifications(brand, template.type),
          ecoClaims: getEcoClaims(brand, template.origin),
          freightData: {
            origin: template.origin.split('/')[1] || 'Australia',
            transportMethod: getTransportMethod(template.origin),
            distance_km: getDistance(template.origin),
            co2_per_km: getTransportFactor(getTransportMethod(template.origin))
          }
        };
        
        products.push(product);
      }
    }
  }
  
  return products;
}

function getEmissionFactor(type) {
  const factors = {
    milk: 1.28,
    egg: 3.8,
    cereal: 1.1,
    coffee: 5.6,
    cleaning_agent: 2.2,
    tomato: 2.9,
    textile: 4.1,
    bottled_water: 0.9,
    hand_wash: 1.8,
    avocado: 3.9,
    energy_drink: 2.4,
    snack_food: 3.1,
    generic_food: 2
  };
  return factors[type] || 2;
}

function getDistance(origin) {
  if (origin.includes('Australia')) return Math.floor(Math.random() * 1500) + 50;
  if (origin.includes('New Zealand')) return Math.floor(Math.random() * 2000) + 2000;
  if (origin.includes('China')) return 8000;
  if (origin.includes('Colombia')) return 12000;
  if (origin.includes('Austria')) return 15000;
  if (origin.includes('USA')) return 14000;
  return 1000;
}

function getTransportMethod(origin) {
  if (origin.includes('Australia')) return 'road_truck';
  return 'sea';
}

function getTransportFactor(method) {
  const factors = {
    air: 0.84,
    sea: 0.02,
    road_truck: 0.096,
    rail: 0.025
  };
  return factors[method] || 0.096;
}

function getCertifications(brand, type) {
  const certs = [];
  if (brand.toLowerCase().includes('organic')) certs.push('Australian Certified Organic', 'ACO');
  if (type === 'egg') certs.push('Free Range Egg & Poultry Australia');
  if (brand.toLowerCase().includes('earth') || brand.toLowerCase().includes('thankyou')) {
    certs.push('B Corp', 'GECA');
  }
  if (!brand.toLowerCase().includes('select') && Math.random() > 0.5) {
    certs.push('Australian Made');
  }
  return certs;
}

function getEcoClaims(brand, origin) {
  const claims = [];
  if (brand.toLowerCase().includes('organic')) claims.push('Organic certified');
  if (origin.includes('Australia')) claims.push('Made in Australia', 'Locally sourced');
  claims.push('Recyclable packaging');
  if (brand.toLowerCase().includes('earth') || brand.toLowerCase().includes('nature')) {
    claims.push('Eco-friendly', 'Sustainable');
  }
  return claims;
}

// Generate and save database
const database = {
  metadata: {
    lastUpdated: new Date().toISOString().split('T')[0],
    source: 'Australian Supermarket Data',
    totalProducts: 0,
    categories: [
      'Food',
      'Beverages',
      'Daily Necessities',
      'Personal Care',
      'Cleaning Supplies',
      'Snacks'
    ],
    afsisCategories: [
      'milk',
      'egg',
      'cereal',
      'coffee',
      'cleaning_agent',
      'tomato',
      'textile',
      'bottled_water',
      'hand_wash',
      'avocado',
      'energy_drink',
      'snack_food',
      'generic_food'
    ],
    validOrigins: [
      'Australia/Victoria',
      'Australia/New South Wales',
      'Australia/Queensland',
      'China/Guangdong',
      'Colombia/Antioquia',
      'Austria/Salzburg',
      'New Zealand/Bay of Plenty',
      'USA/California'
    ],
    anzDefaultWeightsKg: {
      milk: 1,
      egg: 0.7,
      cereal: 0.75,
      coffee: 0.25,
      cleaning_agent: 0.5,
      tomato: 0.18,
      textile: 0.25,
      bottled_water: 0.6,
      hand_wash: 0.5,
      avocado: 0.2,
      energy_drink: 0.25,
      snack_food: 0.2,
      generic_food: 0.3
    },
    anzEmissionFactors: {
      milk: 1.28,
      egg: 3.8,
      cereal: 1.1,
      coffee: 5.6,
      cleaning_agent: 2.2,
      tomato: 2.9,
      textile: 4.1,
      bottled_water: 0.9,
      hand_wash: 1.8,
      avocado: 3.9,
      energy_drink: 2.4,
      snack_food: 3.1,
      generic_food: 2
    }
  },
  products: generateProducts(),
  alternatives: {
    localProduce: {
      title: 'Local Alternatives',
      description: 'Choose locally produced products to reduce transportation carbon emissions',
      averageReduction: 0.8
    },
    organic: {
      title: 'Organic Alternatives',
      description: 'Organic certified products typically have lower carbon footprints',
      averageReduction: 0.6
    },
    minimalPackaging: {
      title: 'Minimal Packaging Alternatives',
      description: 'Choose products with simpler packaging',
      averageReduction: 0.4
    },
    plantBased: {
      title: 'Plant-Based Alternatives',
      description: 'Plant-based products typically have lower carbon emissions',
      averageReduction: 1.2
    }
  },
  retailers: {
    woolworths: {
      name: 'Woolworths',
      storeCount: 1000,
      localSourcingPercentage: 96,
      carbonNeutralGoal: '2050'
    },
    coles: {
      name: 'Coles',
      storeCount: 800,
      localSourcingPercentage: 94,
      carbonNeutralGoal: '2050'
    },
    aldi: {
      name: 'ALDI',
      storeCount: 500,
      localSourcingPercentage: 92,
      carbonNeutralGoal: '2050'
    },
    iga: {
      name: 'IGA',
      storeCount: 1400,
      localSourcingPercentage: 95,
      carbonNeutralGoal: '2050'
    },
    sevenEleven: {
      name: '7-Eleven',
      storeCount: 700,
      localSourcingPercentage: 85,
      carbonNeutralGoal: '2050'
    }
  }
};

database.metadata.totalProducts = database.products.length;

// Save to file
const outputPath = path.join(__dirname, '..', 'data', 'australian-products.json');
fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

console.log(`✓ Generated ${database.products.length} products`);
console.log(`✓ Database saved to: ${outputPath}`);
console.log(`✓ Brands included: ${Object.keys(brands).join(', ')}`);
console.log(`✓ Product templates: ${productTemplates.length}`);
