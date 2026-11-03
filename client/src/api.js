import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach the login token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says the session is invalid, log out
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

export default api;
