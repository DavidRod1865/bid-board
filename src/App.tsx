import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Auth0Provider } from './auth';
import { UserProvider } from './contexts/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppContent from './AppContent';

const App: React.FC = () => {
  return (
    <Auth0Provider>
      <UserProvider>
        <Router>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </Router>
      </UserProvider>
    </Auth0Provider>
  );
};

export default App;