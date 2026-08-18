 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import axios from "axios";

const api = axios.create({
  baseURL: _nullishCoalesce(import.meta.env.VITE_API_URL, () => ( "http://localhost:3000")),
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
function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = _optionalChain([error, 'optionalAccess', _ => _.response, 'optionalAccess', _2 => _2.status]);
    const config = _optionalChain([error, 'optionalAccess', _3 => _3.config]);

    if (status === 429 && config) {
      // store retry count on the request config
      (config )._retryCount = (config )._retryCount || 0;
      const maxRetries = 3;

      if ((config )._retryCount >= maxRetries) {
        return Promise.reject(error);
      }

      (config )._retryCount++;

      // Prefer Retry-After header (seconds). Fallback to exponential backoff.
      const retryAfter = _optionalChain([error, 'access', _4 => _4.response, 'optionalAccess', _5 => _5.headers, 'optionalAccess', _6 => _6['retry-after']]);
      let delayMs = 1000 * Math.pow(2, (config )._retryCount - 1);

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