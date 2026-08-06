// === STUDY BUDDY MAP WITH HEATMAP + BUDDY MARKERS ===
// Heatmap intensity is based on how many UniGo users are at each location

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

  // === USER DENSITY DATA (based on UniGo active users at each spot) ===
  // More data points = more users checked in at that location
  const heatData = [
    // IKB Library - 5 users (moderate)
    [49.26780, -123.25270, 0.5],
    [49.26770, -123.25250, 0.5],
    [49.26790, -123.25280, 0.45],
    [49.26775, -123.25260, 0.5],
    [49.26785, -123.25290, 0.45],
    // Koerner Library - 2 users (quiet)
    [49.26630, -123.25550, 0.2],
    [49.26620, -123.25530, 0.25],
    // The Nest (AMS) - 8 users (busy)
    [49.26648, -123.24985, 0.9],
    [49.26660, -123.25010, 0.85],
    [49.26640, -123.24970, 0.95],
    [49.26655, -123.25000, 0.9],
    [49.26645, -123.24990, 0.85],
    [49.26665, -123.25020, 0.8],
    [49.26635, -123.24960, 0.9],
    [49.26650, -123.24975, 0.85],
    // Life Sciences Centre - 3 users (moderate)
    [49.26250, -123.24670, 0.55],
    [49.26240, -123.24660, 0.5],
    [49.26260, -123.24680, 0.5],
    // Buchanan - 7 users (busy)
    [49.26900, -123.25450, 0.8],
    [49.26890, -123.25430, 0.75],
    [49.26910, -123.25470, 0.8],
    [49.26895, -123.25440, 0.85],
    [49.26905, -123.25460, 0.75],
    [49.26885, -123.25420, 0.8],
    [49.26915, -123.25480, 0.7],
    // ICICS/CS Building - 4 users (moderate-busy)
    [49.26110, -123.24880, 0.65],
    [49.26100, -123.24870, 0.7],
    [49.26120, -123.24890, 0.6],
    [49.26105, -123.24860, 0.65],
    // Woodward Library - 3 users (moderate)
    [49.26420, -123.24980, 0.55],
    [49.26410, -123.24970, 0.5],
    [49.26430, -123.24990, 0.6],
    // Student Rec Centre - 1 user (quiet)
    [49.26850, -123.24560, 0.2],
    // MacLeod - 1 user (quiet)
    [49.26120, -123.25600, 0.15],
    // Earth Sciences Building - 2 users (quiet-moderate)
    [49.26260, -123.25270, 0.35],
    [49.26250, -123.25260, 0.3]
  ];

  // Heatmap layer: gradient from green (few users) -> red (many users)
  const heat = L.heatLayer(heatData, {
    radius: 35,
    blur: 25,
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.0: '#27ae60',
      0.3: '#2ecc71',
      0.5: '#f1c40f',
      0.7: '#e67e22',
      0.85: '#e74c3c',
      1.0: '#c0392b'
    }
  }).addTo(map);

  // === STUDY BUDDIES (more profiles, some at the same location) ===
  const buddies = [
    {
      name: 'Alex K.', initials: 'AK',
      lat: 49.26780, lng: -123.25270,
      course: 'CPSC 210', location: 'IKB Library',
      preferences: ['Pomodoro', 'Solo', 'Daylight'],
      studying: 'Object-Oriented Programming review'
    },
    {
      name: 'Liam C.', initials: 'LC',
      lat: 49.26785, lng: -123.25255,
      course: 'CPSC 210', location: 'IKB Library',
      preferences: ['Deep Work', 'Enclosed', 'Afternoon Study'],
      studying: 'CPSC 210 lab assignment'
    },
    {
      name: 'Maria L.', initials: 'ML',
      lat: 49.26630, lng: -123.25550,
      course: 'MATH 200', location: 'Koerner Library',
      preferences: ['Deep Work', 'Enclosed', 'Morning Study'],
      studying: 'Multivariable Calculus problem set'
    },
    {
      name: 'Jason T.', initials: 'JT',
      lat: 49.26648, lng: -123.24985,
      course: 'PHYS 118', location: 'The Nest',
      preferences: ['Group Study', 'Windows', 'Afternoon Study'],
      studying: 'Physics lab prep with group'
    },
    {
      name: 'Emily R.', initials: 'ER',
      lat: 49.26655, lng: -123.24995,
      course: 'BIOL 200', location: 'The Nest',
      preferences: ['Group Study', 'Daylight', 'Afternoon Study'],
      studying: 'Cell biology group review'
    },
    {
      name: 'Kevin H.', initials: 'KH',
      lat: 49.26660, lng: -123.25010,
      course: 'COMM 291', location: 'The Nest',
      preferences: ['Flashcards', 'Windows', 'Morning Study'],
      studying: 'Business statistics practice'
    },
    {
      name: 'Sara N.', initials: 'SN',
      lat: 49.26250, lng: -123.24670,
      course: 'CHEM 121', location: 'Life Sciences',
      preferences: ['Flashcards', 'Daylight', 'Early Riser'],
      studying: 'Organic chemistry nomenclature'
    },
    {
      name: 'David W.', initials: 'DW',
      lat: 49.26110, lng: -123.24880,
      course: 'CPSC 310', location: 'ICICS Building',
      preferences: ['Deep Work', 'Dark Lit', 'Night Owl'],
      studying: 'Software engineering project sprint'
    },
    {
      name: 'Priya S.', initials: 'PS',
      lat: 49.26900, lng: -123.25450,
      course: 'ENGL 110', location: 'Buchanan',
      preferences: ['Solo', 'Windows', 'Morning Study'],
      studying: 'Essay writing - Literary Analysis'
    },
    {
      name: 'Chris M.', initials: 'CM',
      lat: 49.26895, lng: -123.25440,
      course: 'POLI 100', location: 'Buchanan',
      preferences: ['Solo', 'Enclosed', 'Evening Study'],
      studying: 'Political theory readings'
    },
    {
      name: 'Aisha B.', initials: 'AB',
      lat: 49.26105, lng: -123.24870,
      course: 'CPSC 320', location: 'ICICS Building',
      preferences: ['Pomodoro', 'Dark Lit', 'Night Owl'],
      studying: 'Algorithm design assignment'
    },
    {
      name: 'Tom Z.', initials: 'TZ',
      lat: 49.26420, lng: -123.24980,
      course: 'MATH 221', location: 'Woodward Library',
      preferences: ['Deep Work', 'Daylight', 'Morning Study'],
      studying: 'Linear algebra proofs'
    },
    {
      name: 'Nina P.', initials: 'NP',
      lat: 49.26775, lng: -123.25260,
      course: 'PSYC 101', location: 'IKB Library',
      preferences: ['Flashcards', 'Windows', 'Afternoon Study'],
      studying: 'Intro Psychology exam review'
    },
    {
      name: 'Ryan K.', initials: 'RK',
      lat: 49.26645, lng: -123.24990,
      course: 'ECON 101', location: 'The Nest',
      preferences: ['Group Study', 'Daylight', 'Morning Study'],
      studying: 'Microeconomics problem set'
    }
  ];

  function createBuddyIcon(initials) {
    return L.divIcon({
      className: 'buddy-marker',
      html: `<div class="buddy-marker-inner">${initials}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  buddies.forEach(buddy => {
    const marker = L.marker([buddy.lat, buddy.lng], {
      icon: createBuddyIcon(buddy.initials)
    }).addTo(map);

    const popupContent = `
      <div class="buddy-popup">
        <div class="buddy-popup-header">
          <div class="buddy-popup-avatar">${buddy.initials}</div>
          <div>
            <div class="buddy-popup-name">${buddy.name}</div>
            <div class="buddy-popup-location">${buddy.location}</div>
          </div>
        </div>
        <div class="buddy-popup-studying">
          <strong>Currently studying:</strong><br>
          ${buddy.course} — ${buddy.studying}
        </div>
        <div class="buddy-popup-prefs">
          <strong>Preferences:</strong>
          <div class="buddy-popup-tags">
            ${buddy.preferences.map(p => `<span class="buddy-popup-tag">${p}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 260,
      className: 'buddy-popup-container'
    });
  });

  // === SHOW CURRENT USER'S LOCATION ON MAP ===
  function placeUserMarker(lat, lng) {
    const userName = localStorage.getItem('unigo-name') || 'You';
    const userIcon = L.divIcon({
      className: 'buddy-marker',
      html: '<div class="you-marker-inner">ME</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    const userMarker = L.marker([lat, lng], {
      icon: userIcon
    }).addTo(map);

    userMarker.bindPopup(`
      <div class="buddy-popup">
        <div class="buddy-popup-header">
          <div class="buddy-popup-avatar" style="background:#1abc9c;">ME</div>
          <div>
            <div class="buddy-popup-name">${userName} (You)</div>
            <div class="buddy-popup-location">Your current location</div>
          </div>
        </div>
      </div>
    `, {
      maxWidth: 220,
      className: 'buddy-popup-container'
    });

    // Add to heatmap
    heat.addLatLng([lat, lng, 0.5]);

    // Adjust map view to include user's location and UBC campus
    const ubcCenter = L.latLng(49.2606, -123.2460);
    const userLatLng = L.latLng(lat, lng);
    const bounds = L.latLngBounds([ubcCenter, userLatLng]);
    map.fitBounds(bounds.pad(0.2));
  }

  // Always attempt geolocation on HTTPS (CloudFront provides HTTPS)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        localStorage.setItem('unigo-user-lat', lat.toString());
        localStorage.setItem('unigo-user-lng', lng.toString());
        localStorage.setItem('unigo-location-enabled', 'true');
        placeUserMarker(lat, lng);
      },
      () => {
        // Geolocation denied/failed — try stored coordinates
        const storedLat = localStorage.getItem('unigo-user-lat');
        const storedLng = localStorage.getItem('unigo-user-lng');
        if (storedLat && storedLng) {
          placeUserMarker(parseFloat(storedLat), parseFloat(storedLng));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
})();
