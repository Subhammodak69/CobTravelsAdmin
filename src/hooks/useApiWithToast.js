// src/hooks/useApiWithToast.js
import { useState } from "react";
import API, { handleApiError } from "../utils/apiCall";
import { useToast } from "../contexts/ToastContext";

const useApiWithToast = () => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const request = async ({
    method = "GET",
    url,
    data = null,
    params = null,
    showError = true,
    errorMessage = null,
  }) => {
    let loadingToast = null;
    
    try {
      setLoading(true);
      
      // Show loading toast for long operations
      if (method !== 'GET') {
        loadingToast = toast.loading("Processing...");
      }

      const response = await API({
        method,
        url,
        data,
        params,
      });

      // Dismiss loading toast
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }

      return response.data;
    } catch (error) {
      // Dismiss loading toast
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }

      if (showError) {
        handleApiError(error, errorMessage);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    request,
  };
};

export default useApiWithToast;
