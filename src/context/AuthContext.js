import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall } from '../utils/apiCall';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const USER_DATA_KEY = 'admin_data';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const response = await apiCall('/api/v1/admin/auth/me', 'GET');
      if (response.ok) {
        const profileData = await response.json();
        setUser(profileData);
        return profileData;
      } else {
        console.warn('Failed to fetch admin profile (/api/v1/admin/auth/me):', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
  };

  const checkAuth = useCallback(async () => {
    const userDataStr = localStorage.getItem(USER_DATA_KEY);
    const token = localStorage.getItem('access_token');

    if (!userDataStr && !token) {
      setUser(null);
      setTokenInfo(null);
      setLoading(false);
      return;
    }

    let parsed = null;
    if (userDataStr) {
      try {
        parsed = JSON.parse(userDataStr);
      } catch {
        localStorage.removeItem(USER_DATA_KEY);
      }
    }

    if (parsed) {
      setTokenInfo({
        access_token: parsed.access_token || parsed.token,
        token_type: parsed.token_type || 'bearer',
        expires_in_sec: parsed.expires_in_sec || parsed.expires_in
      });
    }

    try {
      const response = await apiCall('/api/v1/admin/auth/me', 'GET');
      if (response.ok) {
        const profile = await response.json();
        setUser(profile);
      } else if (response.status === 401) {
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem('access_token');
        setUser(null);
        setTokenInfo(null);
      } else {
        if (parsed?.profile) {
          setUser(parsed.profile);
        } else if (parsed?.user) {
          setUser(parsed.user);
        }
      }
    } catch (error) {
      console.error('Failed to authenticate:', error);
      if (parsed?.profile) {
        setUser(parsed.profile);
      } else if (parsed?.user) {
        setUser(parsed.user);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleStorage = (e) => {
      if (!e || e.key === USER_DATA_KEY || e.key === 'access_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [checkAuth]);

  const login = async (authResponse, profile = null) => {
    const access_token = authResponse?.access_token || authResponse?.token;
    const sessionData = {
      access_token,
      token: access_token,
      token_type: authResponse?.token_type || 'bearer',
      expires_in_sec: authResponse?.expires_in_sec || authResponse?.expires_in,
      profile: profile || null
    };

    localStorage.setItem(USER_DATA_KEY, JSON.stringify(sessionData));
    localStorage.setItem('access_token', access_token);
    setTokenInfo(sessionData);

    if (profile) {
      setUser(profile);
    } else {
      try {
        const fetchedProfile = await fetchUserProfile();
        if (fetchedProfile) {
          sessionData.profile = fetchedProfile;
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(sessionData));
          setUser(fetchedProfile);
        }
      } catch (err) {
        console.error('Error fetching profile after login:', err);
      }
    }
  };

  const logout = async () => {
    try {
      await apiCall('/api/v1/sessions/logout', 'POST');
    } catch (error) {
      console.warn('Logout API error:', error);
    } finally {
      localStorage.removeItem(USER_DATA_KEY);
      localStorage.removeItem('access_token');
      setUser(null);
      setTokenInfo(null);
      toast.success('Logged out successfully');
      return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokenInfo,
        loading,
        login,
        logout,
        checkAuth,
        fetchUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
