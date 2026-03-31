import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Toast = ({ id, type = "success", message, duration = 3000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      startExit();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const startExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Tunggu animasi keluar
  };

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800 ring-green-500/20";
      case "error":
        return "bg-red-50 border-red-200 text-red-800 ring-red-500/20";
      case "warning":
        return "bg-orange-50 border-orange-200 text-orange-800 ring-orange-500/20";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800 ring-slate-500/20";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-2xl ring-1 backdrop-blur-3xl p-4 mb-3 transition-all duration-300 transform
        ${getStyles()}
        ${isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold">{type.toUpperCase()}</p>
            <p className="mt-1 text-sm font-medium opacity-90">{message}</p>
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            onClick={startExit}
            className="inline-flex rounded-md text-slate-400 hover:text-slate-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200/50">
          <div 
            className={`h-full ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-orange-500'}`}
            style={{ animation: `shrink ${duration}ms linear forwards` }}
          />
      </div>
      <style>{`
        @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Toast;
