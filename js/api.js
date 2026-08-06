// === UniGo API Client ===

const API = {
  async request(method, path, body = null, requiresAuth = true) {
    const headers = { 'Content-Type': 'application/json' };

    if (requiresAuth) {
      const token = Auth.getToken();
      if (!token) {
        window.location.href = 'login.html';
        return;
      }
      headers['Authorization'] = token;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${UNIGO_CONFIG.API_URL}${path}`, options);

    if (response.status === 401) {
      // Token expired
      Auth.signOut();
      return;
    }

    return response.json();
  },

  // === User Profile ===
  getProfile() {
    return this.request('GET', 'users');
  },

  updateProfile(data) {
    return this.request('PUT', 'users', data);
  },

  getPublicProfile(userId) {
    return this.request('GET', `users/${userId}`, null, false);
  },

  // === Locations (Vibe Meter) ===
  getActiveLocations() {
    return this.request('GET', 'locations', null, false);
  },

  checkIn(lat, lng, locationId = 'campus') {
    return this.request('POST', 'locations', { lat, lng, locationId });
  },

  // === Study Buddies ===
  getBuddies() {
    return this.request('GET', 'buddies', null, false);
  },

  broadcastSession(data) {
    return this.request('POST', 'buddies', data);
  },
};
