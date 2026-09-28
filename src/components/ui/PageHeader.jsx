import React from "react";

const PageHeader = ({ title, subtitle, icon, actions }) => {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {icon && (
          <div className="page-header-icon">
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        )}
        <div className="page-header-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;
