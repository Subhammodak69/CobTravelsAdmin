import toast from 'react-hot-toast';
import { API_BASE, UPLOAD_API_URL, UPLOAD_API_KEY } from './config';

export const handleApiError = (error, fallbackMessage = null) => {
  const message =
    fallbackMessage ||
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.detail ||
    error?.message ||
    'Network error or server unreachable';

  toast.error(typeof message === 'string' ? message : JSON.stringify(message));
};

// Endpoints that should not include Authorization header
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/v1/admin/auth/otp/request',
  '/api/v1/admin/auth/otp/verify',
  '/api/v1/admin/auth/google',
];

/**
 * Unified API calling utility
 * @param {string} endpoint - The API endpoint (e.g. '/api/v1/admin/auth/me') or full URL
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object|null} body - Request payload
 * @param {Object} customHeaders - Additional request headers
 * @returns {Promise<Response>} - The fetch response object
 */
export const apiCall = async (endpoint, method = 'GET', body = null, customHeaders = {}) => {
  const isPublicAuth = 
    PUBLIC_AUTH_ENDPOINTS.some(p => endpoint.includes(p)) ||
    endpoint.includes('/auth/otp/request') ||
    endpoint.includes('/auth/otp/verify') ||
    endpoint.includes('/auth/google') ||
    customHeaders.Authorization === false ||
    customHeaders.Authorization === null;

  let token = null;

  if (!isPublicAuth) {
    // Retrieve token from user_data or access_token in localStorage
    const userDataStr = localStorage.getItem('admin_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        token = userData.access_token || userData.token;
      } catch (e) {
        console.error('Failed to parse admin_data from local storage', e);
      }
    }

    if (!token) {
      token = localStorage.getItem('access_token');
    }
  }

  const headers = { ...customHeaders };

  // Remove explicit false/null Authorization if passed in customHeaders
  if (headers['Authorization'] === false || headers['Authorization'] === null) {
    delete headers['Authorization'];
  }

  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Send token as Authorization Bearer header if available and not a public auth route
  if (!isPublicAuth && token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
    if (body instanceof FormData) {
      options.body = body;
    } else if (typeof body === 'string') {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }

  // Handle absolute vs relative URLs cleanly
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${formattedEndpoint}`;

  try {
    const response = await fetch(url, options);

    // Global 401 Unauthorized handler (only for protected endpoints, not public auth)
    if (response.status === 401 && !isPublicAuth) {
      localStorage.removeItem('admin_data');
      localStorage.removeItem('access_token');

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return response;
  } catch (error) {
    console.error(`API Call Error (${url}):`, error);
    throw error;
  }
};

/**
 * Common file upload utility
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The URL of the uploaded file
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_API_URL, {
    method: 'POST',
    headers: {
      key: UPLOAD_API_KEY,
    },
    body: formData,
  });

  const result = await response.json();
  if (result.success && result.url) {
    return result.url;
  }
  throw new Error(result.message || result.detail || 'Upload failed');
};

export default apiCall;
