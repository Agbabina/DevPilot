import api from "./api";

export type User = {
  id: number;
  username: string;
  email: string;
  level: number;
  totalXp: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
};

type AuthResponse = {
  accessToken: string;
  user: User;
};

export async function register(
  username: string,
  email: string,
  password: string,
) {
  await api.post<User>("/auth/register", {
    username,
    email,
    password,
  });
}

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });

  localStorage.setItem("accessToken", response.data.accessToken);

  return response.data.user;
}

export async function getCurrentUser() {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

export function logout() {
  localStorage.removeItem("accessToken");
}