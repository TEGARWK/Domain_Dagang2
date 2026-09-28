import React, { useState, useMemo } from "react";
import CustomSelect from "./CustomSelect";

const DataTable = ({
  columns,
  data,
  loading,
  searchable = true,
  searchPlaceholder = "Cari...",
  filterOptions,
  filterValue,
  onFilterChange,
  itemsPerPage = 10,
  actions,
  onRowClick,
  emptyMessage = "Tidak ada data",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);

  const processedData = useMemo(() => {
    let result = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = col.accessor ? row[col.accessor] : "";
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return result;
  }, [data, searchQuery, sortConfig, columns]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [processedData, currentPage, itemsPerPage]
  );

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterValue]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="material-symbols-outlined">unfold_more</span>;
    return (
      <span className="material-symbols-outlined" style={{ opacity: 1, color: "var(--color-primary-500)" }}>
        {sortConfig.direction === "asc" ? "arrow_upward" : "arrow_downward"}
      </span>
    );
  };

  return (
    <div className="table-wrap">
      <div className="table-header">
        <div className="table-header-left">
          {searchable && (
            <div className="table-search">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="form-input"
              />
            </div>
          )}
          {filterOptions && (
            <div style={{ width: 160 }}>
              <CustomSelect value={filterValue} onChange={(v) => { onFilterChange?.(v); setCurrentPage(1); }} options={filterOptions} />
            </div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={col.sortable !== false ? "sortable" : ""}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                  style={{
                    textAlign: col.align || "left",
                    width: col.width || undefined,
                  }}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable !== false && <SortIcon column={col.accessor} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ height: 20, width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "48px 16px" }}>
                  <div className="empty-state" style={{ padding: 0 }}>
                    <div className="empty-state-icon" style={{ width: 48, height: 48, marginBottom: 12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>inventory_2</span>
                    </div>
                    <h3>{emptyMessage}</h3>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? "pointer" : undefined }}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      style={{
                        textAlign: col.align || "left",
                      }}
                      className={col.className || ""}
                    >
                      {col.render ? col.render(row) : (col.accessor ? row[col.accessor] : "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-footer">
          <span className="table-footer-info">{processedData.length} item</span>
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, currentPage - 2);
              const page = Math.min(start + i, totalPages);
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "active" : ""}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
