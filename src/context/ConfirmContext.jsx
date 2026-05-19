import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ConfirmModal from "../components/ui/ConfirmModal";

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "Ya, Lanjutkan",
    cancelText: "Batal",
  });

  const resolver = useRef();

  const handleConfirm = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(true);
  }, []);

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(false);
  }, []);

  const confirm = useCallback((options) => {
    // If string is passed, use it as message
    const config = typeof options === "string" ? { message: options } : options;

    setModalState({
      isOpen: true,
      title: config.title || "Konfirmasi Tindakan",
      message: config.message || "Apakah Anda yakin ingin melanjutkan?",
      type: config.type || "warning",
      confirmText: config.confirmText || "Ya, Lanjutkan",
      cancelText: config.cancelText || "Batal",
    });

    return new Promise((res) => {
      resolver.current = res;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal 
        {...modalState} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />
    </ConfirmContext.Provider>
  );
};
