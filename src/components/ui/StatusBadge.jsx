import React from "react";

const statusStyles = {
  active: "badge-success",
  paid: "badge-success",
  success: "badge-success",
  completed: "badge-success",
  lunas: "badge-success",
  pending: "badge-warning",
  unpaid: "badge-warning",
  expired: "badge-danger",
  failed: "badge-danger",
  cancelled: "badge-neutral",
  inactive: "badge-neutral",
  pending_transfer: "badge-purple",
  processing: "badge-info",
  refund: "badge-warning",
};

const StatusBadge = ({ status, pulse }) => {
  const s = (status || "").toLowerCase();
  const cls = statusStyles[s] || "badge-neutral";

  return (
    <span className={`badge ${cls} ${pulse ? "animate-pulse" : ""}`}>
      {pulse && <span className="dot" />}
      {status?.replace(/_/g, " ") || "Unknown"}
    </span>
  );
};

export default StatusBadge;
