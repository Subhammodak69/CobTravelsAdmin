import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ServerUnavailable from '../pages/ServerUnavailable';

const ProtectedRoute = () => {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (authError === 'server-unavailable') {
    return <ServerUnavailable />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
