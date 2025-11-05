import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Auth0Provider } from './auth';
import { UserProvider } from './contexts/UserContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { ViewRouter } from './shared/components/ViewRouter';
import AppContent from './AppContent';

const App: React.FC = () => {
  return (
    <Auth0Provider>
      <UserProvider>
        <Router>
          <ProtectedRoute>
            <ViewRouter>
              <AppContent />
            </ViewRouter>
          </ProtectedRoute>
        </Router>
      </UserProvider>
    </Auth0Provider>
  );
};

export default App;