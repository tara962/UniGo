// === UniGo Auth (Cognito) ===
// Uses Cognito USER_PASSWORD_AUTH flow via the public InitiateAuth API

const Auth = {
  // Sign up a new user
  async signUp(email, password) {
    const response = await fetch(`https://cognito-idp.${UNIGO_CONFIG.REGION}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
      },
      body: JSON.stringify({
        ClientId: UNIGO_CONFIG.USER_POOL_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.__type || 'Sign up failed');
    return data;
  },

  // Sign in and get tokens
  async signIn(email, password) {
    const response = await fetch(`https://cognito-idp.${UNIGO_CONFIG.REGION}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: UNIGO_CONFIG.USER_POOL_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.__type || 'Sign in failed');

    // Store tokens
    const tokens = data.AuthenticationResult;
    localStorage.setItem('unigo-id-token', tokens.IdToken);
    localStorage.setItem('unigo-access-token', tokens.AccessToken);
    localStorage.setItem('unigo-refresh-token', tokens.RefreshToken);
    localStorage.setItem('unigo-logged-in', email);
    return tokens;
  },

  // Sign out
  signOut() {
    localStorage.removeItem('unigo-id-token');
    localStorage.removeItem('unigo-access-token');
    localStorage.removeItem('unigo-refresh-token');
    localStorage.removeItem('unigo-logged-in');
    window.location.href = 'login.html';
  },

  // Get current ID token (for API calls)
  getToken() {
    return localStorage.getItem('unigo-id-token');
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!localStorage.getItem('unigo-id-token');
  },
};
