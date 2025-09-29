// Auth0 Configuration
// Vite exposes env vars on import.meta.env instead of process.env

export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  redirectUri: import.meta.env.VITE_AUTH0_REDIRECT_URI,
  scope: 'openid profile email'
};

export const AUTH0_NAMESPACE = 'https://withpridehvac.net/';

// Auth0 connection names for social providers
export const AUTH0_CONNECTIONS = {
  GOOGLE: 'google-oauth2',
  // Add other connections as needed
  // MICROSOFT: 'windowslive',
  // FACEBOOK: 'facebook',
} as const;