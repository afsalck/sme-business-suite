import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export default function useCompany() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/company');
      setCompany(response.data);
    } catch (err) {
      console.error('[useCompany] Failed to load company:', err);
      setError(err.response?.data?.message || 'Failed to load company information');
      // Set default company name if API fails
      setCompany({ name: 'BizEase UAE', shopName: null });
    } finally {
      setLoading(false);
    }
  };

  const updateCompany = async (companyData) => {
    try {
      setError(null);
      console.log('[useCompany] Updating company with data:', companyData);
      const response = await apiClient.put('/company', companyData);
      console.log('[useCompany] ✓ Update successful:', response.data);
      setCompany(response.data);
      return response.data;
    } catch (err) {
      console.error('[useCompany] ✗ Failed to update company:', err);
      console.error('[useCompany] Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update company information';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Get display name: shopName if available, otherwise name
  const displayName = company?.shopName || company?.name || 'BizEase UAE';

  return {
    company,
    displayName,
    loading,
    error,
    loadCompany,
    updateCompany
  };
}
