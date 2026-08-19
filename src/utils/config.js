const normalizeUrl = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const API_BASE = normalizeUrl(
  process.env.REACT_APP_API_BASE
);

export const UPLOAD_API_URL = 
  process.env.REACT_APP_UPLOAD_API_URL

export const UPLOAD_API_KEY = 
  process.env.REACT_APP_UPLOAD_API_KEY

export const GOOGLE_CLIENT_ID = 
  process.env.REACT_APP_GOOGLE_CLIENT_ID
  
