import React from "react";

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Ya, Lanjutkan", 
  cancelText = "Batal",
  type = "warning" // warning, danger, success
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: "report",
          iconBg: "bg-rose-50",
          iconColor: "text-rose-500",
          btnBg: "bg-rose-500 hover:bg-rose-600 shadow-rose-200"
        };
      case "success":
        return {
          icon: "check_circle",
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-500",
          btnBg: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200"
        };
      default: // warning
        return {
          icon: "help",
          iconBg: "bg-amber-50",
          iconColor: "text-amber-500",
          btnBg: "bg-slate-900 hover:bg-[#F97316] shadow-slate-200"
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="p-8 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 ${styles.iconBg} ${styles.iconColor} rounded-lg flex items-center justify-center mx-auto mb-6`}>
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
              {styles.icon}
            </span>
          </div>

          {/* Text Content */}
          <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`w-full h-12 rounded-lg text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${styles.btnBg}`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full h-12 bg-white border border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all active:scale-95"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
