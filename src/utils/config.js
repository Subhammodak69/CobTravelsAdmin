const normalizeUrl = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const API_BASE = normalizeUrl(
  process.env.REACT_APP_API_BASE || 
  process.env.API_BASE || 
  'https://coochbehar-travels.onrender.com'
);

export const UPLOAD_API_URL = 
  process.env.REACT_APP_UPLOAD_API_URL || 
  process.env.UPLOAD_API_URL || 
  'https://coochbehar-travels.onrender.com/api/v1/public/files/upload';

export const UPLOAD_API_KEY = 
  process.env.REACT_APP_UPLOAD_API_KEY || 
  process.env.UPLOAD_API_KEY || 
  '';

export const GOOGLE_CLIENT_ID = 
  process.env.REACT_APP_GOOGLE_CLIENT_ID || 
  process.env.GOOGLE_CLIENT_ID_WEB || 
  '61755144915-pj9o538ffi7dldtemnrlhj36pvenb3n9.apps.googleusercontent.com';
