import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './component/ProtectedRoute';
import MainLayout from './component/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import StaffManagement from './pages/StaffManagement';
import CustomerManagement from './pages/CustomerManagement';
import CustomerDetails from './pages/CustomerDetails';
import DocumentManagement from './pages/DocumentManagement';
import TourPackages from './pages/TourPackages';
import TourVariant from './pages/TourVariant';
import TourDetails from './pages/TourDetails';
import ServerUnavailable from './pages/ServerUnavailable';
import NotFound from './pages/NotFound';

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
      <Route path="/server-unavailable" element={<ServerUnavailable />} />

      {/* Authenticated Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/staff-management" element={<StaffManagement />} />
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/customers/:customerId" element={<CustomerDetails />} />
          <Route path="/document-management" element={<DocumentManagement />} />
          <Route path="/tour-packages" element={<TourPackages />} />
          <Route path="/tour-variants" element={<TourVariant />} />
          <Route path="/tour-packages/:packageId/variants" element={<TourVariant />} />
          <Route path="/tour-packages/:packageId/variants/:variantId/details" element={<TourDetails />} />
          <Route path="/users" element={<UnderConstruction title="Users" />} />
          <Route path="/projects" element={<UnderConstruction title="Projects" />} />
          <Route path="/qr-codes" element={<UnderConstruction title="QR Codes" />} />
          <Route path="/tech-provider" element={<UnderConstruction title="Tech Providers" />} />
          <Route path="/subscription-packs" element={<UnderConstruction title="Subscription Packs" />} />
          <Route path="/subscriptions" element={<UnderConstruction title="All Subscriptions" />} />
          <Route path="/custom-pricing" element={<UnderConstruction title="Custom Pricing" />} />
          <Route path="/ai-providers" element={<UnderConstruction title="AI Providers" />} />
          <Route path="/ai-pricing" element={<UnderConstruction title="AI Pricing" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      {/* Wildcard Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
