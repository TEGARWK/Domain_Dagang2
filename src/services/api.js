import axios from "axios";

// Create Axios Instance
// Use relative path for Vite proxy in development, or full URL in production
const getBaseURL = () => {
  // In development with Vite proxy, use relative path
  if (import.meta.env.DEV) {
    return '/api';
  }
  // In production, use environment variable or fall back to relative
  return import.meta.env.VITE_API_URL || '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  withCredentials: true,
});

// 1. Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

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

    // Debug: log request in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => {
    // Debug: log response time in development
    if (import.meta.env.DEV && response.config.metadata?.startTime) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`[API] Response from ${response.config.url}: ${duration}ms`);
    }
    return response;
  },
  (error) => {
    // Debug: log errors in development
    if (import.meta.env.DEV) {
      const status = error.response?.status;
      const url = error.config?.url;
      console.error(`[API Error] ${status} ${url}:`, error.response?.data || error.message);
    }

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
