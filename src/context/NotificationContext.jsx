import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import Toast from "../components/ui/Toast";
import api from "../services/api";

const NotificationContext = createContext();

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastFetchedId = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/notifications");

      if (res.status === 200) {
        const data = res.data;
        setNotifications(Array.isArray(data) ? data : []);
        setUnreadCount(data.filter(n => !n.is_read).length);

        // Logic for auto-toasts: Show toast for the latest notification if it's new
        if (data.length > 0) {
            const latest = data[0];
            if (lastFetchedId.current && latest.id > lastFetchedId.current && !latest.is_read) {
                addToast(latest.type || 'info', latest.message);
            }
            lastFetchedId.current = latest.id;
        } else {
            lastFetchedId.current = 0;
        }
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.status === 200) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await api.put("/notifications/read-all");
      if (res.status === 200) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToast = useCallback((type, message, duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const success = (message) => addToast("success", message);
  const error = (message) => addToast("error", message);
  const warning = (message) => addToast("warning", message);
  const info = (message) => addToast("info", message);

  return (
    <NotificationContext.Provider value={{ 
        success, error, warning, info, 
        notifications, unreadCount, fetchNotifications, 
        markAsRead, markAllAsRead, loading 
    }}>
      {children}
      
      <div className="fixed top-5 right-5 z-[100] flex flex-col items-end gap-2 pointer-events-none w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
