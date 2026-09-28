import React from "react";
import { Link } from "react-router-dom";

const colorMap = {
  orange: "orange",
  blue: "blue",
  green: "green",
  amber: "amber",
  rose: "rose",
  purple: "purple",
  teal: "green",
  indigo: "blue",
  emerald: "green",
};

const Wrapper = ({ to, onClick, children }) => {
  if (to) return <Link to={to} className="block group">{children}</Link>;
  if (onClick) return <button onClick={onClick} className="w-full text-left group">{children}</button>;
  return <div className="group">{children}</div>;
};

const StatsCard = ({ title, value, icon, color = "blue", trend, to, onClick, loading: isLoading }) => {
  const c = colorMap[color] || "blue";

  return (
    <Wrapper to={to} onClick={onClick}>
      <div className="stats-card">
        <div className="stats-card-top">
          <div className="stats-card-left">
            <div className={`stats-card-icon icon-${c}`}>
              <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div className="stats-card-info">
              <div className="stats-card-label">{title}</div>
              {isLoading ? (
                <div className="h-6 w-24 skeleton rounded-md" />
              ) : (
                <div className="stats-card-value">{value ?? "-"}</div>
              )}
            </div>
          </div>
          {trend && (
            <span className={`stats-card-trend trend-${c}`}>{trend}</span>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default StatsCard;
