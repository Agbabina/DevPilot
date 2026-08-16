import api from "./api";

 
















export async function register(
  username,
  email,
  password,
) {
  await api.post("/auth/register", {
    username,
    email,
    password,
  });
}

export async function login(email, password) {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  localStorage.setItem("accessToken", response.data.accessToken);

  return response.data.user;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export function logout() {
  localStorage.removeItem("accessToken");
}