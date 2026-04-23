// Local Alternatives Map for Australian Eco-friendly Products
// Uses Leaflet + OpenStreetMap (free, no API key required)

class LocalAlternativesMap {
  constructor() {
    this.australianCities = {
      'Sydney': { lat: -33.8688, lng: 151.2093, state: 'NSW' },
      'Melbourne': { lat: -37.8136, lng: 144.9631, state: 'VIC' },
      'Brisbane': { lat: -27.4698, lng: 153.0251, state: 'QLD' },
      'Perth': { lat: -31.9505, lng: 115.8605, state: 'WA' },
      'Adelaide': { lat: -34.9285, lng: 138.6007, state: 'SA' },
      'Canberra': { lat: -35.2809, lng: 149.1300, state: 'ACT' },
      'Hobart': { lat: -42.8821, lng: 147.3272, state: 'TAS' },
      'Darwin': { lat: -12.4634, lng: 130.8456, state: 'NT' }
    };

    this.ecoStoreTypes = [
      'organic_food_store',
      'farmers_market',
      'bulk_food_store',
      'refill_station',
      'eco_supermarket',
      'health_food_store'
    ];

    this.ecoStoreDatabase = this.initializeEcoStoreDatabase();
  }

  // Initialize eco-friendly store database for major Australian cities
  initializeEcoStoreDatabase() {
    return {
      'Sydney': [
        {
          name: 'About Life',
          address: '181 Bondi Road, Bondi, NSW 2026',
          lat: -33.8945,
          lng: 151.2745,
          type: 'organic_food_store',
          specialties: ['organic produce', 'bulk foods', 'eco products'],
          rating: 4.6,
          carbonReductionScore: 8.5,
        },
        {
          name: 'The Source Bulk Foods',
          address: '448 Oxford St, Paddington, NSW 2021',
          lat: -33.8892,
          lng: 151.2334,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'zero waste'],
          rating: 4.4,
          carbonReductionScore: 9.2,
        },
        {
          name: 'Harris Farm Markets',
          address: 'Multiple locations across Sydney',
          lat: -33.8688,
          lng: 151.2093,
          type: 'farmers_market',
          specialties: ['local produce', 'imperfect picks', 'reduced food waste'],
          rating: 4.3,
          carbonReductionScore: 7.8,
        },
        {
          name: 'Naked Foods',
          address: '478 Crown St, Surry Hills, NSW 2010',
          lat: -33.8825,
          lng: 151.2150,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'organic', 'package-free'],
          rating: 4.5,
          carbonReductionScore: 9.0,
        },
      ],
      'Melbourne': [
        {
          name: 'CERES Community Environment Park',
          address: 'Stewart St, Brunswick East, VIC 3057',
          lat: -37.7653,
          lng: 144.9707,
          type: 'organic_food_store',
          specialties: ['organic', 'permaculture', 'community garden'],
          rating: 4.7,
          carbonReductionScore: 9.0,
        },
        {
          name: 'The Wholefoods Warehouse',
          address: '399 Sydney Rd, Coburg, VIC 3058',
          lat: -37.7449,
          lng: 144.9569,
          type: 'bulk_food_store',
          specialties: ['organic bulk foods', 'local products'],
          rating: 4.5,
          carbonReductionScore: 8.8,
        },
        {
          name: 'South Melbourne Market',
          address: 'Coventry St, South Melbourne, VIC 3205',
          lat: -37.8330,
          lng: 144.9650,
          type: 'farmers_market',
          specialties: ['local producers', 'organic options', 'sustainable practices'],
          rating: 4.4,
          carbonReductionScore: 7.5,
        },
        {
          name: 'The Source Bulk Foods Melbourne',
          address: '143 Sydney Rd, Brunswick, VIC 3056',
          lat: -37.7610,
          lng: 144.9580,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'zero waste'],
          rating: 4.5,
          carbonReductionScore: 9.1,
        },
      ],
      'Brisbane': [
        {
          name: 'Organic & Natural',
          address: 'Park Road, Milton, QLD 4064',
          lat: -27.4734,
          lng: 153.0059,
          type: 'organic_food_store',
          specialties: ['organic groceries', 'natural products'],
          rating: 4.5,
          carbonReductionScore: 8.3,
        },
        {
          name: 'Jan Powers Farmers Markets',
          address: 'Multiple locations across Brisbane',
          lat: -27.4698,
          lng: 153.0251,
          type: 'farmers_market',
          specialties: ['local produce', 'seasonal products'],
          rating: 4.3,
          carbonReductionScore: 7.9,
        },
        {
          name: 'The Source Bulk Foods Brisbane',
          address: '1/110 EDgar St, New Farm, QLD 4005',
          lat: -27.4580,
          lng: 153.0480,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'organic'],
          rating: 4.4,
          carbonReductionScore: 9.0,
        },
      ],
      'Perth': [
        {
          name: 'The Raw Kitchen',
          address: '181 Stirling St, Perth, WA 6000',
          lat: -31.9454,
          lng: 115.8620,
          type: 'organic_food_store',
          specialties: ['organic', 'raw foods', 'sustainable practices'],
          rating: 4.6,
          carbonReductionScore: 8.7,
        },
        {
          name: 'Kakulas Sisters',
          address: '18 Fitzgerald St, North Perth, WA 6006',
          lat: -31.9386,
          lng: 115.8520,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'local products', 'organic'],
          rating: 4.4,
          carbonReductionScore: 8.5,
        },
        {
          name: 'The Source Bulk Foods Perth',
          address: '226 Newcastle St, Northbridge, WA 6003',
          lat: -31.9475,
          lng: 115.8580,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'zero waste'],
          rating: 4.5,
          carbonReductionScore: 9.0,
        },
      ],
      'Adelaide': [
        {
          name: 'The Source Bulk Foods Adelaide',
          address: '2/187 Frome St, Adelaide, SA 5000',
          lat: -34.9245,
          lng: 138.6080,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'zero waste'],
          rating: 4.5,
          carbonReductionScore: 9.1,
        },
        {
          name: 'Adelaide Central Market',
          address: '44-60 Gouger St, Adelaide, SA 5000',
          lat: -34.9290,
          lng: 138.5945,
          type: 'farmers_market',
          specialties: ['local produce', 'artisan foods', 'seasonal products'],
          rating: 4.6,
          carbonReductionScore: 8.0,
        },
        {
          name: 'Go Vita Adelaide',
          address: '63 Grote St, Adelaide, SA 5000',
          lat: -34.9310,
          lng: 138.5960,
          type: 'health_food_store',
          specialties: ['organic', 'health foods', 'natural products'],
          rating: 4.3,
          carbonReductionScore: 8.2,
        },
      ],
      'Canberra': [
        {
          name: 'The Source Bulk Foods Canberra',
          address: '1/33 Dryburgh St, O\'Connor, ACT 2602',
          lat: -35.2505,
          lng: 149.1130,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'organic'],
          rating: 4.4,
          carbonReductionScore: 9.0,
        },
        {
          name: 'Capital Region Farmers Market',
          address: 'Exhibition Park, Flemington Rd, Mitchell, ACT 2911',
          lat: -35.2250,
          lng: 149.1480,
          type: 'farmers_market',
          specialties: ['local produce', 'seasonal', 'organic options'],
          rating: 4.5,
          carbonReductionScore: 8.5,
        },
        {
          name: 'Honest to Goodness',
          address: '17 Lathlain St, Belconnen, ACT 2617',
          lat: -35.2370,
          lng: 149.0710,
          type: 'organic_food_store',
          specialties: ['organic produce', 'wholefoods', 'eco products'],
          rating: 4.3,
          carbonReductionScore: 8.3,
        },
      ],
      'Hobart': [
        {
          name: 'The Source Bulk Foods Hobart',
          address: '174 Collins St, Hobart, TAS 7000',
          lat: -42.8830,
          lng: 147.3280,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'zero waste'],
          rating: 4.4,
          carbonReductionScore: 9.0,
        },
        {
          name: 'Salamanca Market',
          address: 'Salamanca Place, Hobart, TAS 7000',
          lat: -42.8860,
          lng: 147.3340,
          type: 'farmers_market',
          specialties: ['local produce', 'artisan foods', 'organic options'],
          rating: 4.7,
          carbonReductionScore: 8.8,
        },
        {
          name: 'Tasmanian Wholefoods',
          address: '140 Liverpool St, Hobart, TAS 7000',
          lat: -42.8810,
          lng: 147.3250,
          type: 'organic_food_store',
          specialties: ['organic', 'local products', 'wholefoods'],
          rating: 4.3,
          carbonReductionScore: 8.5,
        },
      ],
      'Darwin': [
        {
          name: 'Rapid Creek Market',
          address: 'Trower Rd, Rapid Creek, NT 0810',
          lat: -12.3750,
          lng: 130.8650,
          type: 'farmers_market',
          specialties: ['local produce', 'tropical fruits', 'seasonal'],
          rating: 4.4,
          carbonReductionScore: 8.0,
        },
        {
          name: 'Greenie Bean Roasters',
          address: '5 Caryota Crt, Coconut Grove, NT 0810',
          lat: -12.4050,
          lng: 130.8450,
          type: 'organic_food_store',
          specialties: ['organic coffee', 'fair trade', 'sustainable'],
          rating: 4.3,
          carbonReductionScore: 7.8,
        },
        {
          name: 'Mindil Beach Markets',
          address: 'Mindil Beach, Darwin, NT 0800',
          lat: -12.4620,
          lng: 130.8330,
          type: 'farmers_market',
          specialties: ['local produce', 'artisan foods', 'community'],
          rating: 4.5,
          carbonReductionScore: 7.5,
        },
      ],
    };
  }

  // Get user location -- NOTE: geolocation must be obtained client-side.
  // The frontend should pass { lat, lng } to the API; this method is not
  // usable on the server because navigator.geolocation is a browser-only API.
  // Kept as a placeholder that throws so callers know to provide coordinates.
  async getUserLocation() {
    throw new Error('Geolocation must be obtained client-side. Pass lat/lng from the browser.');
  }

  // Find nearest Australian city
  findNearestCity(lat, lng) {
    let nearestCity = null;
    let minDistance = Infinity;

    Object.entries(this.australianCities).forEach(([cityName, coordinates]) => {
      const distance = this.calculateDistance(
        lat, lng, 
        coordinates.lat, coordinates.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = cityName;
      }
    });

    return {
      city: nearestCity,
      distance: minDistance,
      coordinates: this.australianCities[nearestCity]
    };
  }

  // Calculate distance between two points
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Find eco stores within radius
  findEcoStoresNearby(userLat, userLng, radiusKm = 10) {
    const nearestCity = this.findNearestCity(userLat, userLng);
    const cityStores = this.ecoStoreDatabase[nearestCity.city] || [];
    
    const nearbyStores = cityStores.filter(store => {
      const distance = this.calculateDistance(
        userLat, userLng, 
        store.lat, store.lng
      );
      return distance <= radiusKm;
    });

    return {
      stores: nearbyStores.map(store => ({
        ...store,
        distance: this.calculateDistance(
          userLat, userLng, 
          store.lat, store.lng
        )
      })),
      searchCenter: {
        lat: userLat,
        lng: userLng,
        city: nearestCity.city
      },
      searchRadius: radiusKm
    };
  }

  // Get directions to eco store
  async getDirectionsToStore(userLocation, storeLocation, transportMode = 'driving') {
    // This would integrate with Google Maps Directions API
    // For now, return simulated directions
    const distance = this.calculateDistance(
      userLocation.lat, userLocation.lng,
      storeLocation.lat, storeLocation.lng
    );

    const travelTimes = {
      driving: distance / 50 * 60, // 50 km/h average
      walking: distance / 5 * 60,   // 5 km/h walking
      cycling: distance / 15 * 60,  // 15 km/h cycling
      public_transport: distance / 30 * 60 // 30 km/h average
    };

    return {
      distance_km: distance,
      travel_time_minutes: Math.round(travelTimes[transportMode]),
      transport_mode: transportMode,
      carbon_emissions_kg: this.calculateTransportEmissions(distance, transportMode),
      route: {
        start: userLocation,
        end: storeLocation,
        waypoints: []
      }
    };
  }

  // Calculate transport emissions
  calculateTransportEmissions(distanceKm, transportMode) {
    const emissionFactors = {
      driving: 0.21,      // kg CO2 per km for average car
      walking: 0,         // no emissions
      cycling: 0,         // no emissions
      public_transport: 0.08 // kg CO2 per km for bus/train
    };

    return distanceKm * emissionFactors[transportMode];
  }

  // Get store recommendations based on product category
  getStoreRecommendations(productCategory, userLat, userLng) {
    const nearbyStores = this.findEcoStoresNearby(userLat, userLng);
    
    const categorySpecialtyMatch = {
      'Food': ['organic_food_store', 'farmers_market'],
      'Beverages': ['organic_food_store', 'health_food_store'],
      'Daily Necessities': ['eco_supermarket', 'refill_station'],
      'Personal Care': ['health_food_store', 'eco_supermarket'],
      'Cleaning Supplies': ['refill_station', 'eco_supermarket']
    };

    const preferredTypes = categorySpecialtyMatch[productCategory] || ['organic_food_store'];
    
    const recommendations = nearbyStores.stores
      .filter(store => preferredTypes.includes(store.type))
      .sort((a, b) => b.carbonReductionScore - a.carbonReductionScore)
      .slice(0, 3);

    return {
      recommendations: recommendations,
      searchLocation: nearbyStores.searchCenter,
      totalStoresFound: nearbyStores.stores.length
    };
  }

  // Generate eco store comparison
  generateStoreComparison(stores) {
    return stores.map(store => ({
      name: store.name,
      address: store.address,
      distance: `${store.distance.toFixed(1)} km`,
      specialties: store.specialties.join(', '),
      rating: `${store.rating}/5`,
      carbonScore: `${store.carbonReductionScore}/10`,
      bestFor: this.getBestForCategory(store)
    }));
  }

  // Determine best category for store
  getBestForCategory(store) {
    const specialtyMapping = {
      'organic produce': 'Organic food',
      'bulk foods': 'Package-free goods',
      'package-free': 'Zero packaging shopping',
      'zero waste': 'Zero-waste lifestyle',
      'local produce': 'Local products',
      'eco products': 'Eco products'
    };

    for (const specialty of store.specialties) {
      if (specialtyMapping[specialty]) {
        return specialtyMapping[specialty];
      }
    }
    
    return 'Eco shopping';
  }
}

module.exports = LocalAlternativesMap;
