import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth0 } from '../auth';
import { dbOperations } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  color_preference: string;
  created_at: string;
  updated_at: string;
}

interface UserContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (name: string, colorPreference: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    if (!user?.sub || !isAuthenticated) {
      console.log('UserContext: User not authenticated or missing sub:', { sub: user?.sub, isAuthenticated });
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('UserContext: Starting user profile fetch for:', { 
        email: user.email, 
        name: user.name, 
        sub: user.sub 
      });
      
      // First try to get user from database
      console.log('UserContext: Fetching existing users from database...');
      const users = await dbOperations.getUsers();
      console.log('UserContext: Found', users.length, 'users in database');
      
      let dbUser = users.find(u => u.email === user.email);
      console.log('UserContext: Existing user found by email:', !!dbUser);
      
      if (!dbUser && user.email && user.name) {
        console.log('UserContext: Creating new user in database...');
        try {
          dbUser = await dbOperations.createOrUpdateUserProfile(user.sub, {
            email: user.email,
            name: user.name,
            color_preference: '#d4af37'
          });
          console.log('UserContext: Successfully created user in database:', dbUser);
        } catch (createError) {
          console.error('UserContext: Failed to create user in database:', createError);
          // Continue with fallback logic
        }
      }
      
      if (dbUser) {
        console.log('UserContext: Using database user profile');
        setUserProfile(dbUser);
        // Also save to localStorage as backup
        localStorage.setItem(`user_profile_${user.sub}`, JSON.stringify(dbUser));
        return;
      }
      
      // Fallback: Check localStorage for existing profile
      console.log('UserContext: Checking localStorage for existing profile...');
      const savedProfile = localStorage.getItem(`user_profile_${user.sub}`);
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile);
          console.log('UserContext: Using localStorage profile');
          setUserProfile(parsedProfile);
          return;
        } catch (parseErr) {
          console.error('UserContext: Failed to parse localStorage profile:', parseErr);
        }
      }
      
      // Create initial profile if none exists
      console.log('UserContext: Creating fallback local profile...');
      const initialProfile: UserProfile = {
        id: user.sub,
        email: user.email || '',
        name: user.name || user.email?.split('@')[0] || 'User',
        color_preference: '#d4af37',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setUserProfile(initialProfile);
      localStorage.setItem(`user_profile_${user.sub}`, JSON.stringify(initialProfile));
      console.log('UserContext: Created fallback profile (user not saved to database)');
    } catch (err) {
      console.error('UserContext: Error in fetchUserProfile:', err);
      setError('Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (name: string, colorPreference: string) => {
    if (!user?.sub || !userProfile) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      // Update in database if the user exists there
      let updatedProfile: UserProfile;
      
      if (userProfile.id && userProfile.id !== user.sub) {
        // User exists in database, update there
        updatedProfile = await dbOperations.updateUserProfile(userProfile.id, {
          name,
          color_preference: colorPreference
        });
      } else {
        // Fallback to local update
        updatedProfile = {
          ...userProfile,
          name,
          color_preference: colorPreference,
          updated_at: new Date().toISOString()
        };
      }
      
      setUserProfile(updatedProfile);
      
      // Store in localStorage for persistence across sessions
      localStorage.setItem(`user_profile_${user.sub}`, JSON.stringify(updatedProfile));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshProfile = async () => {
    if (!user?.sub || !isAuthenticated) return;
    
    setIsLoading(true);
    await fetchUserProfile();
  };

  useEffect(() => {
    if (!authLoading) {
      // Test database connection on first load
      dbOperations.testDatabaseConnection().then(result => {
        if (!result.success) {
          console.error('UserContext: Database connection test failed during initialization');
        }
      });
      
      fetchUserProfile();
    }
  }, [user?.sub, isAuthenticated, authLoading]);

  const contextValue: UserContextType = {
    userProfile,
    isLoading: isLoading || authLoading,
    error,
    updateProfile,
    refreshProfile
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProvider');
  }
  return context;
};

export type { UserProfile };