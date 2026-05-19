import api from "./api";

export const checkDomainAvailability = async (domain) => {
  try {
    // Note: /domains/check is public? If so, we can use api (which attaches token if available) or plain axios.
    // If it requires auth, api is needed.
    // My previous edit to domains.js: router.get("/check", controller.checkDomainAvailability); // Public
    // So api is fine, it will just not have token if not logged in, or have it if logged in.
    const response = await api.get(`/domains/check`, {
      params: { domain },
    });
    return response.data;
  } catch (error) {
    console.error("Error checking domain:", error);
    throw error;
  }
};
