import React from "react";

const EmptyState = ({ icon = "inventory_2", title, description, action }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && action}
    </div>
  );
};

export default EmptyState;
