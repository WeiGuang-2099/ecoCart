// Local Alternatives Map for Australian Eco-friendly Products
// Integrates with Google Maps API to show nearby eco-stores and alternatives

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
          carbonReductionScore: 8.5
        },
        {
          name: 'The Source Bulk Foods',
          address: '448 Oxford St, Paddington, NSW 2021',
          lat: -33.8892,
          lng: 151.2334,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'package-free', 'zero waste'],
          rating: 4.4,
          carbonReductionScore: 9.2
        },
        {
          name: 'Harris Farm Markets',
          address: 'Multiple locations across Sydney',
          lat: -33.8688,
          lng: 151.2093,
          type: 'farmers_market',
          specialties: ['local produce', 'imperfect picks', 'reduced food waste'],
          rating: 4.3,
          carbonReductionScore: 7.8
        }
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
          carbonReductionScore: 9.0
        },
        {
          name: 'The Wholefoods Warehouse',
          address: '399 Sydney Rd, Coburg, VIC 3058',
          lat: -37.7449,
          lng: 144.9569,
          type: 'bulk_food_store',
          specialties: ['organic bulk foods', 'local products'],
          rating: 4.5,
          carbonReductionScore: 8.8
        },
        {
          name: 'South Melbourne Market',
          address: 'Coventry St, South Melbourne, VIC 3205',
          lat: -37.8330,
          lng: 144.9650,
          type: 'farmers_market',
          specialties: ['local producers', 'organic options', 'sustainable practices'],
          rating: 4.4,
          carbonReductionScore: 7.5
        }
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
          carbonReductionScore: 8.3
        },
        {
          name: 'Jan Powers Farmers Markets',
          address: 'Multiple locations across Brisbane',
          lat: -27.4698,
          lng: 153.0251,
          type: 'farmers_market',
          specialties: ['local produce', 'seasonal products'],
          rating: 4.3,
          carbonReductionScore: 7.9
        }
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
          carbonReductionScore: 8.7
        },
        {
          name: 'Kakulas Sisters',
          address: '18 Fitzgerald St, North Perth, WA 6006',
          lat: -31.9386,
          lng: 115.8520,
          type: 'bulk_food_store',
          specialties: ['bulk foods', 'local products', 'organic'],
          rating: 4.4,
          carbonReductionScore: 8.5
        }
      ]
    };
  }

  // Get user location (with privacy compliance)
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        }
      );
    });
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

  // Generate map HTML
  generateMapHTML(center, stores, userLocation) {
    return `
      <div id="eco-map" style="height: 400px; width: 100%; border-radius: 10px;"></div>
      <script>
        function initEcoMap() {
          const mapCenter = { lat: ${center.lat}, lng: ${center.lng} };
          const map = new google.maps.Map(document.getElementById('eco-map'), {
            zoom: 12,
            center: mapCenter,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ]
          });

          // Add user location marker
          const userMarker = new google.maps.Marker({
            position: { lat: ${userLocation.lat}, lng: ${userLocation.lng} },
            map: map,
            title: "Your location",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2
            }
          });

          // Add eco store markers
          ${stores.map(store => `
            new google.maps.Marker({
              position: { lat: ${store.lat}, lng: ${store.lng} },
              map: map,
              title: "${store.name}",
              icon: {
                url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2327ae60'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/%3E%3C/svg%3E",
                scaledSize: new google.maps.Size(32, 32)
              }
            });
          `).join('')}
        }
      </script>
      <script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initEcoMap"></script>
    `;
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
