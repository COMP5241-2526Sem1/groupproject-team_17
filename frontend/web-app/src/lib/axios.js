'use client';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export function setAxiosAuthToken(token) {
  if (token) {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common.Authorization;
  }
}
export function deleteAxiosAuthToken() {
  delete axiosInstance.defaults.headers.common.Authorization;
}

const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Optional: Add token (if using auth)
 *
 axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
*
*/

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    throw error;
  }
);

export default axiosInstance;

// Helper function to handle response
const handleResponse = (response) => {
  const resData = response.data;
  if (resData && resData.code === 0) {
    return resData;
  }
  throw response || { code: -999, message: 'Unknown error' };
};

// Helper function to handle errors
const handleError = (error) => {
  const response = error;
  const data = response?.data;
  if (data && data.code && Number.isInteger(data.code)) {
    console.warn(`[API Error ${data.code}]`, data.message || 'Unknown error');
    return data;
  }
  console.error('API Error:', response.message || response);
  return {
    code: -999,
    message: response.message || 'Unknown error',
    data: response,
  };
};

export const httpGet = async (url, params = {}) => {
  try {
    const response = await axiosInstance.get(url, { params });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const httpPost = async (url, data = {}, config = {}) => {
  try {
    const response = await axiosInstance.post(url, data, config);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const httpPut = async (url, data = {}, config = {}) => {
  try {
    const response = await axiosInstance.put(url, data, config);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const httpDelete = async (url, data = {}, config = {}) => {
  try {
    const response = await axiosInstance.delete(url, {
      data,
      ...config,
    });
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};
