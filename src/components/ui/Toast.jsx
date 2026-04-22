import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Toast = ({ id, type = "success", message, title, duration = 3000, onClose }) => {
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
    }, 500); // Wait for smoother exit animation
  };

  const getTheme = () => {
    switch (type) {
      case "success":
        return {
          container: "bg-emerald-50/80 border-emerald-200/50 text-emerald-900 ring-emerald-500/10",
          iconColor: "text-emerald-500",
          progress: "bg-emerald-500",
          label: title || "Success"
        };
      case "error":
        return {
          container: "bg-red-50/80 border-red-200/50 text-red-900 ring-red-500/10",
          iconColor: "text-red-500",
          progress: "bg-red-500",
          label: title || "Error"
        };
      case "warning":
        return {
          container: "bg-amber-50/80 border-amber-200/50 text-amber-900 ring-amber-500/10",
          iconColor: "text-amber-500",
          progress: "bg-amber-500",
          label: title || "Warning"
        };
      case "info":
        return {
          container: "bg-blue-50/80 border-blue-200/50 text-blue-900 ring-blue-500/10",
          iconColor: "text-blue-500",
          progress: "bg-blue-500",
          label: title || "Info"
        };
      default:
        return {
          container: "bg-slate-50/80 border-slate-200/50 text-slate-900 ring-slate-500/10",
          iconColor: "text-slate-500",
          progress: "bg-slate-500",
          label: title || "Notification"
        };
    }
  };

  const theme = getTheme();

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg className={`w-5 h-5 ${theme.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "error":
        return (
          <svg className={`w-5 h-5 ${theme.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg className={`w-5 h-5 ${theme.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "info":
        return (
           <svg className={`w-5 h-5 ${theme.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        );
      default:
        return (
          <svg className={`w-5 h-5 ${theme.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 backdrop-blur-xl p-4 mb-3 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${theme.container}
        ${isExiting 
          ? "opacity-0 scale-95 translate-y-[-20px] sm:translate-x-full sm:translate-y-0" 
          : "opacity-100 scale-100 translate-y-0 sm:translate-x-0 animate-in fade-in duration-500 " + 
            "slide-in-from-top-5 sm:slide-in-from-right-10"
        }
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 bg-white/50 p-1.5 rounded-xl shadow-sm border border-white/20">{getIcon()}</div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-0.5">{theme.label}</p>
            <p className="text-sm font-bold leading-tight">{message}</p>
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            onClick={startExit}
            className="inline-flex rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-white/40 transition-all focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Premium Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden">
          <div 
            className={`h-full ${theme.progress} transition-all`}
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
