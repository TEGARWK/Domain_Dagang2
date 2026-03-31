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
      console.warn("Session expired or unauthorized. Logging out...");
      
      // Clear Storage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("cart");

      // Redirect to Login (using window because we are outside React Router)
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
