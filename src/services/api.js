import axios from "axios";

// Create Axios Instance
const api = axios.create({
  baseURL: "/api", // Gunakan relative path agar otomatis mengikuti domain yang diakses (domaindagang.com)
});

// 1. Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        if (parsedUser.token) {
          config.headers.Authorization = `Bearer ${parsedUser.token}`;
        }
      } catch (e) {
        // Ignore parsing error
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Token Invalid/Expired/Forbidden
      console.warn("Session expired or unauthorized. Clearing session...");
      
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      // Redirect ke login jika bukan di halaman login/register/home
      const publicPaths = ["/login", "/register", "/forgot-password", "/", "/domain", "/promo"];
      const currentPath = window.location.pathname;
      
      if (!publicPaths.includes(currentPath) && !currentPath.startsWith("/verify") && !currentPath.startsWith("/reset-password")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
