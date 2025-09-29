import React from 'react';
import { Auth0Provider as Auth0ProviderSDK } from '@auth0/auth0-react';
import { auth0Config } from './auth0Config';

interface Auth0ProviderProps {
  children: React.ReactNode;
}

const Auth0Provider: React.FC<Auth0ProviderProps> = ({ children }) => {
  return (
    <Auth0ProviderSDK
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.redirectUri,
        scope: auth0Config.scope,
      }}
    >
      {children}
    </Auth0ProviderSDK>
  );
};

export default Auth0Provider;