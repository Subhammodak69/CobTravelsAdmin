import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiCall } from '../utils/apiCall';
import { useAuth } from './AuthContext';

const EnumsContext = createContext(null);
let enumsRequest = null;

const fetchEnums = async () => {
  if (!enumsRequest) {
    enumsRequest = apiCall('/api/v1/enums', 'GET')
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to load enums');
        return Array.isArray(payload?.data?.groups) ? payload.data.groups : [];
      })
      .catch((error) => {
        enumsRequest = null;
        throw error;
      });
  }
  return enumsRequest;
};

export const EnumsProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEnums = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await fetchEnums());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadEnums();
  }, [authLoading, user, loadEnums]);

  const getEnumOptions = useCallback((name) => groups.find((group) => group.name === name)?.options || [], [groups]);
  const value = useMemo(() => ({ groups, loading, error, getEnumOptions, refreshEnums: loadEnums }), [groups, loading, error, getEnumOptions, loadEnums]);

  return <EnumsContext.Provider value={value}>{children}</EnumsContext.Provider>;
};

export const useEnums = () => {
  const context = useContext(EnumsContext);
  if (!context) throw new Error('useEnums must be used inside EnumsProvider');
  return context;
};
