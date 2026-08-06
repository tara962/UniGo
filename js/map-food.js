// === FOOD FINDER MAP ===
// Correct coordinates for actual UBC food spots

(function() {
  const map = L.map('map', {
    center: [49.2606, -123.2460],
    zoom: 15,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Corrected food locations on UBC campus
  const foodSpots = [
    { name: 'The Nest (AMS)', type: 'Multiple cuisines', lat: 49.26480, lng: -123.25000 },
    { name: 'Open Kitchen', type: 'International', lat: 49.26220, lng: -123.25340 },
    { name: 'Great Dane Coffee', type: 'Coffee & pastries', lat: 49.26930, lng: -123.25680 },
    { name: 'Kokoro Mazesoba', type: 'Japanese noodles', lat: 49.26420, lng: -123.24130 },
    { name: 'Mercante', type: 'Italian pizza', lat: 49.26230, lng: -123.25360 },
    { name: 'Loafe Cafe', type: 'Bakery & sandwiches', lat: 49.26140, lng: -123.25230 },
    { name: 'Tim Hortons', type: 'Coffee & donuts', lat: 49.26010, lng: -123.24890 },
    { name: "Triple O's", type: 'Burgers', lat: 49.26490, lng: -123.25010 },
    { name: 'Starbucks (Life Building)', type: 'Coffee', lat: 49.26710, lng: -123.25020 },
    { name: 'Blue Chip Cafe', type: 'Coffee & snacks', lat: 49.26140, lng: -123.24870 },
    { name: 'Honour Roll', type: 'Sushi', lat: 49.26480, lng: -123.24980 },
    { name: "Uncle Fatih's Pizza", type: 'Pizza', lat: 49.26490, lng: -123.24990 }
  ];

  function createFoodIcon() {
    return L.divIcon({
      className: 'food-marker',
      html: '<div class="food-marker-inner">&#127828;</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });
  }

  foodSpots.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lng], {
      icon: createFoodIcon()
    }).addTo(map);

    marker.bindPopup(`
      <div class="food-popup">
        <strong>${spot.name}</strong><br>
        <span style="color:#666; font-size:0.85rem;">${spot.type}</span>
      </div>
    `, { maxWidth: 200 });
  });
})();
