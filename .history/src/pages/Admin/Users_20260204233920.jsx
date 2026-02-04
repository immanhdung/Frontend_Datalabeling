import React, { useState, useEffect } from "react";
import Header from "../../components/common/Header";
import api from "../../config/api";
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

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
    email: "",
    roleName: "annotator",
    password: "",
  });

  /* ================= API ================= */

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.data || res.data);
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= FILTER + SORT ================= */

  useEffect(() => {
    let result = [...users];

    if (searchTerm) {
      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== "all") {
      result = result.filter((u) => u.roleName === filterRole);
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      return sortOrder === "asc"
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
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

  /* ================= MODAL ================= */

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      username: "",
      email: "",
      roleName: "annotator",
      password: "",
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setCurrentUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      roleName: user.roleName,
      password: "",
    });
    setShowModal(true);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === "add") {
        await api.post("/users", {
          username: formData.username,
          email: formData.email,
          password: formData.password || "123456",
          roleName: formData.roleName,
        });
      } else {
        await api.put(`/users/${currentUser._id}`, {
          username: formData.username,
          email: formData.email,
          roleName: formData.roleName,
        });
      }

      await fetchUsers();
      setShowModal(false);
    } catch (err) {
      console.error("Save user error:", err);
    }
  };

  /* ================= DELETE ================= */

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${userToDelete._id}`);
      await fetchUsers();
    } catch (err) {
      console.error("Delete user error:", err);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  /* ================= UI HELPERS ================= */

  const getRoleBadgeColor = (role) =>
    ({
      admin: "bg-red-100 text-red-800",
      manager: "bg-purple-100 text-purple-800",
      reviewer: "bg-blue-100 text-blue-800",
      annotator: "bg-green-100 text-green-800",
    }[role] || "bg-gray-100 text-gray-800");

  const SortIcon = ({ field }) =>
    sortField === field ? (
      sortOrder === "asc" ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      )
    ) : null;

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Quản lý người dùng"
        userName="Admin"
        userRole="admin"
        actionButton={
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            <UserPlus className="w-4 h-4" />
            Thêm người dùng
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search + Filter */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                placeholder="Tìm theo username hoặc email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="reviewer">Reviewer</option>
              <option value="annotator">Annotator</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["username", "email", "roleName", "createdAt"].map((f) => (
                  <th
                    key={f}
                    onClick={() => handleSort(f)}
                    className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {f}
                      <SortIcon field={f} />
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filteredUsers.map((u) => (
                <tr key={u._id}>
                  <td className="px-6 py-4">{u.username}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${getRoleBadgeColor(u.roleName)}`}>
                      {u.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(u)} className="mr-3 text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setUserToDelete(u);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal & Delete confirm: giữ như hiện tại của bạn */}
    </div>
  );
};

export default Users;
