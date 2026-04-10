import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, AUTH_HEADER, INTEGRATOR_ID } from './constants.js';
import { getApiKey } from './config.js';
import { mapAxiosError } from './errors.js';

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const apiKey = getApiKey();
    if (apiKey) {
      config.headers[AUTH_HEADER] = apiKey;
    }

    config.params = config.params || {};
    config.params.integrator = INTEGRATOR_ID;

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      throw mapAxiosError(error);
    },
  );

  return client;
}

export const api = createApiClient();
