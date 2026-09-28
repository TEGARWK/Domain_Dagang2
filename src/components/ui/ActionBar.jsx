import React from "react";

const ActionBar = ({ children }) => {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
};

const variants = {
  default: "btn-default",
  primary: "btn-primary",
  danger: "btn-danger",
  ghost: "btn-ghost",
};

export const ActionButton = ({ icon, label, onClick, variant = "default", disabled, loading, size }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${variants[variant] || "btn-default"} ${size === "sm" ? "btn-sm" : ""} ${(disabled || loading) ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="material-symbols-outlined">{icon}</span>
      ) : null}
      {label}
    </button>
  );
};

export default ActionBar;
