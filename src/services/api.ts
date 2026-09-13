import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://devpilot-api-vsh2.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Retry 429 (rate limit) with exponential backoff. Uses `Retry-After` header when provided.
function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config;

    if (status === 429 && config) {
      // store retry count on the request config
      (config as any)._retryCount = (config as any)._retryCount || 0;
      const maxRetries = 3;

      if ((config as any)._retryCount >= maxRetries) {
        return Promise.reject(error);
      }

      (config as any)._retryCount++;

      // Prefer Retry-After header (seconds). Fallback to exponential backoff.
      const retryAfter = error.response?.headers?.['retry-after'];
      let delayMs = 1000 * Math.pow(2, (config as any)._retryCount - 1);

      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) {
          delayMs = parsed * 1000;
        }
      }

      await wait(delayMs);
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
