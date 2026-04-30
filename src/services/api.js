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
    const status = error.response ? error.response.status : null;
    
    if (status === 401) {
      // 401 Unauthorized: Session truly expired
      console.warn("Session expired. Clearing session...");
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      // Redirect ke login jika bukan di halaman public
      const publicPaths = ["/login", "/register", "/forgot-password", "/", "/domain", "/promo"];
      const currentPath = window.location.pathname;
      
      if (!publicPaths.includes(currentPath) && !currentPath.startsWith("/verify") && !currentPath.startsWith("/reset-password")) {
        window.location.href = "/login";
      }
    } else if (status === 403) {
      // 403 Forbidden: Permission issue, but session might still be valid.
      // Don't auto-logout on 403 to avoid kicking users out during server-side IP whitelist issues.
      console.error("Access Forbidden (403): You might not have permission or there is a server configuration issue.");
    }
    return Promise.reject(error);
  }
);

export default api;
