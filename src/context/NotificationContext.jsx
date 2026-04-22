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
      const userStr = localStorage.getItem("user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      if (!user?.token) return;

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
      if (err.response?.status === 401) {
          console.warn("Unauthorized fetch in NotificationContext - clearing state.");
          setNotifications([]);
          setUnreadCount(0);
      } else {
          console.error("Fetch notifications error:", err);
      }
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

  const addToast = useCallback((type, message, title = null, duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message, title, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const success = (message, title = null) => addToast("success", message, title);
  const error = (message, title = null) => addToast("error", message, title);
  const warning = (message, title = null) => addToast("warning", message, title);
  const info = (message, title = null) => addToast("info", message, title);

  return (
    <NotificationContext.Provider value={{ 
        success, error, warning, info, 
        notifications, unreadCount, fetchNotifications, 
        markAsRead, markAllAsRead, loading 
    }}>
      {children}
      
      <div className="fixed top-4 left-4 right-4 sm:top-5 sm:right-5 sm:left-auto z-[100] flex flex-col items-center sm:items-end gap-2 pointer-events-none w-auto sm:w-full sm:max-w-sm">
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
