 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import axios from "axios";

const api = axios.create({
  baseURL: _nullishCoalesce(import.meta.env.VITE_API_URL, () => ( "http://localhost:3000")),
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
