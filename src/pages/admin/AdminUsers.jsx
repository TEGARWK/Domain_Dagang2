import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/users");
      setUsers(response.data);
      applyFilters(response.data, roleFilter, sortConfig, searchTerm);
    } catch (err) {
      console.error("Error fetching users:", err);
      error("Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, role, sort, search) => {
    if (!data) return;
    let result = [...data];
    
    // 1. Filtering by Role
    if (role !== "all") {
      result = result.filter(u => u.role === role);
    }
    
    // 2. Searching
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(u => 
        (u.name || "").toLowerCase().includes(s) || 
        (u.email || "").toLowerCase().includes(s) ||
        String(u.id).includes(s)
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
        let valA = a[sort.key] || "";
        let valB = b[sort.key] || "";

        if (sort.key === 'id') {
            valA = parseInt(a.id);
            valB = parseInt(b.id);
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    setFilteredUsers(result);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    applyFilters(users, roleFilter, sortConfig, val);
  };

  const handleRoleChange = (val) => {
    setRoleFilter(val);
    applyFilters(users, val, sortConfig, searchTerm);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSort = { key, direction };
    setSortConfig(newSort);
    applyFilters(users, roleFilter, newSort, searchTerm);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(filteredUsers, {
        id: 'UID',
        name: 'Nama',
        email: 'Email',
        phone: 'WhatsApp',
        role: 'Role',
        created_at: 'Member Since'
    });
    exportToExcel(exportData, 'Data_Users', 'Users');
  };

  const handleDelete = async (id, name) => {
    const isConfirmed = await confirm({
      title: "Hapus Pengguna",
      message: `Hapus user "${name}"? Data yang dihapus tidak bisa dikembalikan!`,
      type: "danger",
      confirmText: "Hapus Permanen"
    });
    if (!isConfirmed) return;

    try {
        await api.delete(`/users/${id}`);
        success(`User ${name} berhasil dihapus.`);
        fetchUsers();
    } catch (err) {
        console.error(err);
        error("Gagal menghapus user.");
    }
  };

  const stats = {
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      regular: users.filter(u => u.role !== 'admin').length
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-[#F97316]">↑</span> : <span className="ml-1 text-[#F97316]">↓</span>;
  };

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] pb-10">
      
      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-[#f97316] p-3 rounded-xl shadow-xl shadow-orange-200/50 flex items-center gap-4 group hover:shadow-xl hover:shadow-orange-300/40 hover:-translate-y-1 transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:bg-white/30 group-hover:scale-150"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-2xl transition-transform duration-1000 group-hover:scale-125"></div>
              
              <div className="relative z-10 w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 border border-white/30 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">group</span>
              </div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none">Total Pengguna</p>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></span>
                  </div>
                  <h3 className="text-3xl font-bold text-white leading-none tracking-tight">{loading ? "..." : stats.total}</h3>
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-2">Seluruh Kolega</p>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Administrator</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.admin}</h3>
                  <p className="text-[10px] font-bold text-purple-500 mt-1">Super User</p>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Daftar Member</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.regular}</h3>
                  <p className="text-[10px] font-bold text-blue-500 mt-1">Sobat Domain</p>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* Unified Header */}
        <div className="p-3 sm:p-3 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="flex-1 w-full max-w-xl relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                    <input 
                        type="text" 
                        placeholder="Cari User, Email, atau ID..." 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-48">
                        <CustomSelect
                            value={roleFilter}
                            onChange={handleRoleChange}
                            options={[
                                { value: 'all', label: 'Semua Kolega' },
                                { value: 'admin', label: 'Administrator' },
                                { value: 'user', label: 'Regular User' },
                            ]}
                        />
                    </div>
                    <div className="w-48">
                        <button 
                            onClick={handleExportExcel}
                            className="w-full h-11 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            Export
                        </button>
                    </div>
                </div>
            </div>
            {searchTerm && (
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Menampilkan <span className="text-[#f97316]">{filteredUsers.length}</span> hasil pencarian untuk "{searchTerm}"
                    </p>
                    <button onClick={() => {setSearchTerm(""); applyFilters(users, roleFilter, sortConfig, "");}} className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest hover:underline">Reset</button>
                </div>
            )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 w-10">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                        className="w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                    />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('name')}>
                    User Profile <SortIcon column="name" />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('email')}>
                    Informasi Kontak <SortIcon column="email" />
                </th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('role')}>
                    Tingkat Akses <SortIcon column="role" />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('created_at')}>
                    Member Since <SortIcon column="created_at" />
                </th>
                <th className="px-4 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                Array(itemsPerPage).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="px-4 py-4"><div className="h-4 w-4 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                                <div>
                                    <div className="h-4 w-32 bg-slate-100 rounded mb-2"></div>
                                    <div className="h-2 w-16 bg-slate-50 rounded"></div>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 py-4">
                            <div className="h-4 w-40 bg-slate-100 rounded mb-2"></div>
                            <div className="h-2 w-24 bg-slate-50 rounded"></div>
                        </td>
                        <td className="px-4 py-4 text-center"><div className="h-5 w-16 bg-slate-100 rounded mx-auto"></div></td>
                        <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-4 text-center"><div className="h-8 w-32 bg-slate-100 rounded-lg mx-auto"></div></td>
                    </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 font-bold italic">Tidak ada pengguna ditemukan.</td></tr>
              ) : (
                currentItems.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(user.id) ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-3">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.includes(user.id)}
                            onChange={() => handleSelectItem(user.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                        />
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#f97316] flex items-center justify-center font-bold border border-orange-100 transition-transform group-hover:scale-105 text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm tracking-tight">{user.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold tracking-tight uppercase">UID: #{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="text-xs font-semibold text-slate-700">{user.email}</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">{user.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all ${
                        user.role === 'admin' 
                        ? 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-100' 
                        : 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                        {new Date(user.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                             <button 
                                onClick={() => navigate(`/admin/invoices?search=${user.email}`)}
                                className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-500 border border-slate-100 transition-all shadow-sm active:scale-90"
                                title="Lihat Invoice User"
                             >
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                             </button>
                             <button 
                                onClick={() => navigate(`/admin/domains?search=${user.email}`)}
                                className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 border border-slate-100 transition-all shadow-sm active:scale-90"
                                title="Lihat Domain User"
                             >
                                <span className="material-symbols-outlined text-[18px]">language</span>
                             </button>
                             <button 
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                                className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-orange-950 hover:text-white border border-slate-100 transition-all shadow-sm active:scale-90"
                                title="Kelola Akun"
                             >
                                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                             </button>
                             <button 
                                onClick={() => handleDelete(user.id, user.name)}
                                className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 border border-slate-100 transition-all shadow-sm active:scale-90"
                                title="Hapus User"
                             >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                             </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="bg-white px-5 py-2.5 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Total <span className="text-[#F97316] font-bold">{filteredUsers.length}</span> Pengguna • Hal <span className="text-slate-800 font-bold">{currentPage} / {totalPages || 1}</span>
                </p>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:border-[#F97316] hover:text-[#F97316] transition-all disabled:opacity-30 flex items-center gap-2 shadow-sm"
                >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Kembali
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-6 py-2.5 bg-slate-900 text-white border border-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#F97316] hover:border-[#F97316] transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                >
                    Lanjut
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
