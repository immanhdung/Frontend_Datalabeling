import React, { useState, useEffect } from "react";
import Header from "../../components/common/Header";
import api from "../../config/api";
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const [roles, setRoles] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const [sortField, setSortField] = useState("username");
  const [sortOrder, setSortOrder] = useState("asc");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentUser, setCurrentUser] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    email: "",
    phoneNumber: "",
    roleName: "annotator",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data.data || res.data);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/roles");
      setRoles(res.data.data || res.data);
    } catch (err) {
      console.error("Fetch roles error:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    let result = [...users];

    if (searchTerm) {
      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== "all") {
      result = result.filter(
        (u) => u.roleName?.toLowerCase() === filterRole.toLowerCase()
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      return sortOrder === "asc"
        ? aVal > bVal
          ? 1
          : -1
        : aVal < bVal
          ? 1
          : -1;
    });

    setFilteredUsers(result);
  }, [users, searchTerm, filterRole, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      username: "",
      password: "",
      displayName: "",
      email: "",
      phoneNumber: "",
      roleName: "annotator",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setCurrentUser(user);
    setFormData({
      username: user.username || "",
      password: "",
      displayName: user.displayName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      roleName: user.roleName || "annotator",
    });
    setError("");
    setShowModal(true);
  };
  const getRoleIdByName = (roleName) => {
    const role = roles.find(
      (r) => r.roleName?.toLowerCase() === roleName.toLowerCase()
    );
    return role?.id || role?.roleId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const roleId = getRoleIdByName(formData.roleName);

      if (!roleId) {
        setError("Không tìm thấy role phù hợp. Vui lòng kiểm tra lại roles!");
        return;
      }

      const payload = {
        username: formData.username,
        displayName: formData.displayName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        roleId: roleId,
      };

      if (modalMode === "add") {
        payload.password = formData.password;
        await api.post("/users", payload);
      } else {
        if (formData.password) {
          payload.password = formData.password;
        }
        await api.put(`/users/${currentUser.userId || currentUser.id || currentUser._id}`, payload);
      }

      await fetchUsers();
      setShowModal(false);
      alert(
        modalMode === "add"
          ? "Thêm người dùng thành công!"
          : "Cập nhật thành công!"
      );
    } catch (err) {
      console.error("Save user error:", err);
      setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu người dùng");
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${userToDelete.userId || userToDelete.id || userToDelete._id}`);
      await fetchUsers();
      alert("Đã xóa người dùng!");
    } catch (err) {
      console.error("Delete user error:", err);
      alert("Xóa thất bại!");
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const getRoleBadgeColor = (role) => {
    const r = role?.toLowerCase();
    return (
      {
        admin: "bg-rose-100 text-rose-700 border-rose-200",
        manager: "bg-purple-100 text-purple-700 border-purple-200",
        reviewer: "bg-blue-100 text-blue-700 border-blue-200",
        annotator: "bg-emerald-100 text-emerald-700 border-emerald-200",
      }[r] || "bg-gray-100 text-gray-700 border-gray-200"
    );
  };

  const SortIcon = ({ field }) =>
    sortField === field ? (
      sortOrder === "asc" ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      )
    ) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Quản lý người dùng"
        userName="Admin"
        userRole="admin"
        actionButton={
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95 text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Thêm người dùng
          </button>
        }
      />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 text-sm"
              placeholder="Tìm theo tên, username hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-indigo-500 text-sm font-medium min-w-[200px]"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="reviewer">Reviewer</option>
            <option value="annotator">Annotator</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th onClick={() => handleSort("username")} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center gap-2">Tên đăng nhập <SortIcon field="username" /></div>
                  </th>
                  <th onClick={() => handleSort("displayName")} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center gap-2">Họ tên <SortIcon field="displayName" /></div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Liên hệ</th>
                  <th onClick={() => handleSort("roleName")} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">
                    <div className="flex items-center gap-2">Vai trò <SortIcon field="roleName" /></div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr key="loading">
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      Đang tải danh sách...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.userId || u.id || u._id || u.username} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{u.username}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{u.displayName || "---"}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{u.email}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{u.phoneNumber || "---"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getRoleBadgeColor(u.roleName)}`}>
                          {u.roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Chỉnh sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(u);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key="empty-row">
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-xl font-bold text-slate-900">
                {modalMode === "add" ? "Thêm tài khoản mới" : "Chỉnh sửa thông tin"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Username *</label>
                  <input
                    required
                    disabled={modalMode === "edit"}
                    placeholder="Tên đăng nhập"
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm disabled:opacity-50"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Mật khẩu {modalMode === "add" ? "*" : "(để trống nếu không đổi)"}
                  </label>
                  <input
                    type="password"
                    required={modalMode === "add"}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên hiển thị (Display Name)</label>
                <input
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="example@mail.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số điện thoại</label>
                  <input
                    placeholder="0987.xxx.xxx"
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Vai trò</label>
                <div className="grid grid-cols-3 gap-3">
                  {["manager", "annotator", "reviewer"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, roleName: role })}
                      className={`py-2 px-3 rounded-xl border-2 text-[10px] font-bold uppercase tracking-wider transition-all ${formData.roleName === role
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-slate-100 text-slate-400 hover:border-slate-200"
                        }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] text-sm"
                >
                  {modalMode === "add" ? "Tạo tài khoản" : "Cập nhật ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa?</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 px-2">
              Bạn có chắc chắn muốn xóa người dùng <span className="font-bold text-slate-900">@{userToDelete?.username}</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 text-sm"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
