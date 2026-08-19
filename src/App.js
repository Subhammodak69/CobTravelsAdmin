import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './component/ProtectedRoute';
import MainLayout from './component/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Fallback placeholder component for other routes
const UnderConstruction = ({ title }) => (
  <div className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm my-6">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title} Management</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
      This module is being connected with your administrative backend. Check back soon.
    </p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Authenticated Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users" element={<UnderConstruction title="Users" />} />
          <Route path="/projects" element={<UnderConstruction title="Projects" />} />
          <Route path="/qr-codes" element={<UnderConstruction title="QR Codes" />} />
          <Route path="/tech-provider" element={<UnderConstruction title="Tech Providers" />} />
          <Route path="/subscription-packs" element={<UnderConstruction title="Subscription Packs" />} />
          <Route path="/subscriptions" element={<UnderConstruction title="All Subscriptions" />} />
          <Route path="/custom-pricing" element={<UnderConstruction title="Custom Pricing" />} />
          <Route path="/ai-providers" element={<UnderConstruction title="AI Providers" />} />
          <Route path="/ai-pricing" element={<UnderConstruction title="AI Pricing" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
