import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Tag,
  Image,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import { useAuth } from "../../context/AuthContext";

export default function ManagerProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { logout } = useAuth(); // ✅ để xử lý 401

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/projects/mine");
      console.log("PROJECTS FROM API:", res.data);

      /**
       * Backend trả dạng:
       * {
       *   items: [],
       *   totalItems,
       *   page,
       *   pageSize,
       *   totalPages
       * }
       */
      setProjects(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      console.error("Fetch projects error:", err);

      // ✅ Token hết hạn / không hợp lệ
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      setError("Không tải được danh sách dự án");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý dự án</h1>
          <p className="text-sm text-gray-500">
            Tạo và quản lý các dự án gán nhãn
          </p>
        </div>
        <button
          onClick={() => navigate("/manager/projects/create")}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Tạo dự án mới
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm dự án..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Lọc
        </button>
      </div>

      {/* States */}
      {loading && <p className="text-gray-500">Đang tải dự án...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <p className="text-gray-500">Chưa có dự án nào</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div
            key={p.id || p.projectId}
            className="bg-white border rounded-xl shadow-sm p-5 space-y-4"
          >
            {/* Header card */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {p.name || "Chưa có tên"}
                </h3>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {p.status || "Đang hoạt động"}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-500">
              {p.description || "Chưa có mô tả"}
            </p>

            {/* Type */}
            <div className="flex items-center gap-2 text-sm text-indigo-600">
              <Tag className="w-4 h-4" />
              {p.type || "Chưa xác định"}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tiến độ</span>
                <span>{p.progress ?? 0}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600"
                  style={{ width: `${p.progress ?? 0}%` }}
                />
              </div>
            </div>

            {/* Images & Labels */}
            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
              <div className="flex items-center gap-1">
                <Image className="w-4 h-4" />
                {p.imagesCount ?? 0} ảnh
              </div>
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {p.labelsCount ?? 0} nhãn
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <span>
                {p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString()
                  : ""}
              </span>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {p.membersCount ?? 0} người
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
