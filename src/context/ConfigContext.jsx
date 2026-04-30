import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    google_client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    app_client_url: "",
    app_backend_url: "",
    loaded: false
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success) {
          const d = res.data.data;
           setConfig({
            google_client_id: d.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
            app_client_url: d.app_client_url || "",
            app_backend_url: d.app_backend_url || "",
            company_whatsapp: d.company_whatsapp || d.footer_whatsapp || "",
            company_email: d.company_email || d.footer_support_email || "support@domaindagang.id",
            company_name: d.company_name || d.footer_company_name || "DomainDagang",
            loaded: true
          });
        }
      } catch (err) {
        console.error("Failed to fetch site config:", err);
        setConfig(prev => ({ ...prev, loaded: true }));
      }
    };
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
