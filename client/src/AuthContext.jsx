import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  // Restore the session on page load
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, body) => {
    localStorage.removeItem("token");
    const { data } = await api.post(path, body);
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const login = (email, password) => authenticate("/auth/login", { email, password });
  const register = (name, email, password) => authenticate("/auth/register", { name, email, password });
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Profile picture: pass a data URL, or "" to remove it
  const updateAvatar = async (image) => {
    const { data } = await api.put("/auth/avatar", { image });
    setUser(data);
  };

  const favorites = useMemo(() => new Set(user?.favorites || []), [user]);

  const toggleFavorite = async (trackId) => {
    const { data } = favorites.has(trackId)
      ? await api.delete(`/favorites/${trackId}`)
      : await api.post(`/favorites/${trackId}`);
    setUser((u) => ({ ...u, favorites: data.favorites }));
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, favorites, toggleFavorite, updateAvatar }}>
      {children}
    </Ctx.Provider>
  );
}
