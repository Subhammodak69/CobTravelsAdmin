import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall } from '../utils/apiCall';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const USER_DATA_KEY = 'admin_data';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const clearAuthStorage = () => {
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const getTokenLifetimeSeconds = (session = {}) => {
  const value = Number(session?.expires_in_sec ?? session?.expires_in ?? 900);
  return Number.isFinite(value) && value > 0 ? value : 900;
};

const getExpiryTimestamp = (session = {}) => {
  if (session?.expires_at) {
    const parsedDate = new Date(session.expires_at);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.getTime();
    }
  }

  const expiresInSec = getTokenLifetimeSeconds(session);
  return Date.now() + expiresInSec * 1000;
};

const readStoredSession = () => {
  const rawUserData = localStorage.getItem(USER_DATA_KEY);
  let parsed = null;

  if (rawUserData) {
    try {
      parsed = JSON.parse(rawUserData);
    } catch (error) {
      console.warn('Failed to parse admin_data from localStorage:', error);
      clearAuthStorage();
    }
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || parsed?.access_token || parsed?.token || '';
  const refreshToken = parsed?.refresh_token || localStorage.getItem(REFRESH_TOKEN_KEY) || '';

  const expiresAt = getExpiryTimestamp(parsed || {});

  return {
    parsed,
    accessToken: typeof accessToken === 'string' ? accessToken.trim() : '',
    refreshToken: typeof refreshToken === 'string' ? refreshToken.trim() : '',
    expiresAt,
    expiresInSec: getTokenLifetimeSeconds(parsed || {})
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const clearAuthState = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setTokenInfo(null);
    setAuthError(null);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiCall('/api/v1/admin/auth/me', 'GET');
      if (response.ok) {
        const profileData = await response.json();
        setUser(profileData);
        return profileData;
      }

      console.warn('Failed to fetch admin profile (/api/v1/admin/auth/me):', response.status);
      return null;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      throw error;
    }
  };

  const refreshAccessToken = useCallback(async () => {
    const { parsed, accessToken, refreshToken } = readStoredSession();

    if (!accessToken && !refreshToken) {
      return { ok: false, reason: 'missing_tokens' };
    }

    const payload = {};
    if (refreshToken) payload.refresh_token = refreshToken;

    try {
      const response = await apiCall('/api/v1/sessions/refresh', 'POST', payload);
      const data = await response.json().catch(() => ({}));

      if (response.ok && (data?.access_token || data?.token)) {
        const renewedAccessToken = data.access_token || data.token;
        const renewedRefreshToken = data.refresh_token || refreshToken;
        const expiresInSec = Number(data?.expires_in_sec ?? data?.expires_in ?? 900) || 900;
        const nextSession = {
          ...(parsed || {}),
          access_token: renewedAccessToken,
          refresh_token: renewedRefreshToken,
          token: renewedAccessToken,
          token_type: data?.token_type || parsed?.token_type || 'bearer',
          expires_in_sec: expiresInSec,
          expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
          profile: parsed?.profile || parsed?.user || null
        };

        localStorage.setItem(USER_DATA_KEY, JSON.stringify(nextSession));
        localStorage.setItem(ACCESS_TOKEN_KEY, renewedAccessToken);
        if (renewedRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, renewedRefreshToken);
        }

        setTokenInfo(nextSession);
        return { ok: true, data };
      }

      return { ok: false, status: response.status, data };
    } catch (error) {
      console.error('Refresh token request failed:', error);
      return { ok: false, error };
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { accessToken, parsed } = readStoredSession();

    if (!accessToken) {
      clearAuthState();
      setLoading(false);
      return;
    }

    const storedTokenInfo = {
      access_token: parsed?.access_token || parsed?.token || accessToken,
      refresh_token: parsed?.refresh_token || localStorage.getItem(REFRESH_TOKEN_KEY) || null,
      token_type: parsed?.token_type || 'bearer',
      expires_in_sec: parsed?.expires_in_sec || parsed?.expires_in || null
    };

    setTokenInfo(storedTokenInfo);
    setAuthError(null);

    try {
      const response = await apiCall('/api/v1/admin/auth/me', 'GET');

      if (response.ok) {
        const profile = await response.json();
        setUser(profile);
        setLoading(false);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        const refreshResult = await refreshAccessToken();

        if (refreshResult.ok) {
          const retryResponse = await apiCall('/api/v1/admin/auth/me', 'GET');
          if (retryResponse.ok) {
            const profile = await retryResponse.json();
            setUser(profile);
            setAuthError(null);
            setLoading(false);
            return;
          }
        }

        clearAuthState();
        setLoading(false);
        return;
      }

      throw new Error(`Authentication check failed with status ${response.status}`);
    } catch (error) {
      console.error('Failed to authenticate:', error);
      setUser(null);
      setAuthError('server-unavailable');
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, refreshAccessToken]);

  useEffect(() => {
    checkAuth();

    const refreshTimer = window.setInterval(() => {
      const { accessToken, refreshToken, expiresAt } = readStoredSession();
      if (!accessToken && !refreshToken) return;

      const minutesRemaining = (expiresAt - Date.now()) / 60000;
      if (minutesRemaining <= 2) {
        refreshAccessToken().catch(() => undefined);
      }
    }, 60000);

    const handleStorage = (e) => {
      if (!e || e.key === USER_DATA_KEY || e.key === 'access_token' || e.key === REFRESH_TOKEN_KEY) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('storage', handleStorage);
    };
  }, [checkAuth, refreshAccessToken]);

  const login = async (authResponse, profile = null) => {
    const normalizedAuthResponse = authResponse?.data && typeof authResponse.data === 'object' ? authResponse.data : authResponse;
    const accessToken = normalizedAuthResponse?.access_token || normalizedAuthResponse?.token || '';
    const refreshToken = normalizedAuthResponse?.refresh_token || normalizedAuthResponse?.refreshToken || '';
    const expiresInSec = Number(normalizedAuthResponse?.expires_in_sec ?? normalizedAuthResponse?.expires_in ?? 900) || 900;
    const sessionData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token: accessToken,
      token_type: normalizedAuthResponse?.token_type || 'bearer',
      expires_in_sec: expiresInSec,
      expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
      profile: profile || null
    };

    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(sessionData));
    setTokenInfo(sessionData);

    if (profile) {
      setUser(profile);
      return profile;
    }

    try {
      const fetchedProfile = await fetchUserProfile();
      if (fetchedProfile) {
        sessionData.profile = fetchedProfile;
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(sessionData));
        setUser(fetchedProfile);
        return fetchedProfile;
      }
    } catch (err) {
      console.error('Error fetching profile after login:', err);
      setAuthError('server-unavailable');
    }

    return null;
  };

  const logout = async () => {
    const { refreshToken } = readStoredSession();

    try {
      await apiCall('/api/v1/sessions/logout', 'POST', refreshToken ? { refresh_token: refreshToken } : null);
    } catch (error) {
      console.warn('Logout API error:', error);
    } finally {
      clearAuthState();
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
        authError,
        login,
        logout,
        checkAuth,
        fetchUserProfile,
        refreshAccessToken,
        clearAuthState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
