import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Tag,
  Image,
  Users,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { labelAPI } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const requestSequential = async (factories) => {
  let lastError;
  for (const factory of factories) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const getProjectId = (project) =>
  project?.id ??
  project?.projectId ??
  project?.projectID ??
  project?.ProjectId ??
  null;

const normalizeVietnameseProjectText = (value, fallback = "") => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const compact = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

  const mapped = {
    "dang hoat dong": "Đang hoạt động",
    "chua xac": "Chưa xác định",
    "chua xac dinh": "Chưa xác định",
  }[compact];

  return mapped || raw;
};

export default function ManagerProjects() {
  const [projects, setProjects] = useState([]);
  const [_categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal Thêm nhãn state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [submittingLabel, setSubmittingLabel] = useState(false);

  // Modal Gán Dataset state
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [selectedProject, _setSelectedProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleAssignDataset = async (datasetId) => {
    if (!selectedProject || !datasetId) return;
    try {
      setSubmittingLabel(true);
      const projectId = selectedProject.id || selectedProject.projectId;

      await requestSequential([
        () => api.post(`/datasets/add/${projectId}`, { datasetId }),
        () => api.post(`/Datasets/${datasetId}/attach/${projectId}`, {}),
      ]);

      alert(`Đã gán dataset cho dự án "${selectedProject.name}" thành công!`);
      setShowDatasetModal(false);
      fetchProjects();
    } catch (err) {
      console.error("Assign dataset error:", err);
      alert("Gán dataset thất bại: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingLabel(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      setLoadingDatasets(true);
      const res = await api.get("/datasets");
      const items = toArray(res.data);
      setDatasets(items);
    } catch (err) {
      console.error("Fetch datasets error:", err);
      // Fallback or keep empty
    } finally {
      setLoadingDatasets(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projRes, catRes] = await Promise.all([
        api.get("/projects"),
        api.get("/categories").catch(() => ({ data: [] })),
      ]);

      const serverProjects = toArray(projRes.data);
      const serverCategories = toArray(catRes.data);

      setProjects(serverProjects);
      setCategories(serverCategories);
    } catch (err) {
      console.error("Fetch projects error:", err);
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

  const handleCreateLabel = async () => {
    if (!labelName.trim() || selectedProjectIds.length === 0) {
      alert("Vui lòng nhập tên nhãn và chọn ít nhất một dự án");
      return;
    }

    try {
      setSubmittingLabel(true);
      const normalizedLabelName = labelName.trim();

      const uniqueTargetIds = new Set();
      selectedProjectIds.forEach((id) => {
        const project = projects.find((p) => (p.id || p.projectId) === id);
        const categoryId =
          project?.categoryId ||
          project?.category?.id ||
          project?.category?.categoryId;

        if (categoryId) {
          uniqueTargetIds.add(String(categoryId));
        }
      });

      if (uniqueTargetIds.size === 0) {
        alert("Không tìm thấy Category ID của các dự án đã chọn.");
        return;
      }

      const results = await Promise.allSettled(
        Array.from(uniqueTargetIds).map((targetId) =>
          labelAPI.create(targetId, { name: normalizedLabelName })
        )
      );

      const successCount = results.filter((item) => item.status === "fulfilled").length;

      if (successCount === 0) {
        throw new Error("Không endpoint nào hỗ trợ thêm nhãn cho category");
      }

      alert(`Đã thêm nhãn cho ${successCount}/${uniqueTargetIds.size} category.`);
      setShowLabelModal(false);
      setLabelName("");
      setSelectedProjectIds([]);
      fetchProjects();
    } catch (err) {
      console.error("Error creating label:", err);
      const serverMsg =
        err.response?.data?.title ||
        err.response?.data?.message ||
        err.message;
      alert(`Thêm nhãn thất bại: ${serverMsg}`);
    } finally {
      setSubmittingLabel(false);
    }
  };

  const toggleProjectSelection = (id) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Không tìm thấy ID dự án để xóa");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa dự án này?")) return;

    try {
      await requestSequential([
        () => api.delete(`/projects/${id}`),
        () => api.delete(`/Projects/${id}`),
      ]);
      const nextProjects = projects.filter((p) => String(p.projectId || p.id) !== String(id));
      setProjects(nextProjects);
      await fetchProjects();

      alert("Xóa dự án thành công!");
    } catch (err) {
      console.error("Delete project error:", err);
      alert(
        "Xóa dự án thất bại: " +
        (err.response?.data?.message || err.message)
      );
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchDatasets();

    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý dự án</h1>
          <p className="text-sm text-gray-500">Tạo và quản lý các dự án gán nhãn</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedProjectIds([]);
              setShowLabelModal(true);
            }}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium shadow-sm"
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            Thêm nhãn
          </button>
          <button
            onClick={() => navigate("/manager/projects/create")}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Tạo dự án mới
          </button>
        </div>
      </div>

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

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Đang tải dự án...
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}

      {/* Modal Thêm nhãn */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[550px] overflow-hidden flex flex-col border border-gray-100">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Thêm nhãn đồng loạt</h2>
                <p className="text-sm text-gray-500">Áp dụng nhãn mới cho nhiều dự án cùng lúc</p>
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tên nhãn *</label>
                <input
                  type="text"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  placeholder="Ví dụ: Xe ô tô, Biển báo, Chó..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">
                  Chọn dự án áp dụng ({selectedProjectIds.length})
                </label>
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Không có dự án</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                    {projects.map((p) => {
                      const id = p.projectId || p.id;
                      const isSelected = selectedProjectIds.includes(id);
                      return (
                        <div
                          key={id}
                          onClick={() => toggleProjectSelection(id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-100 hover:border-gray-300 bg-gray-50/30"
                            }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"
                              }`}
                          >
                            {isSelected && <Plus className="w-3 h-3 text-white rotate-45" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black">
                              {p.type || "N/A"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCreateLabel}
                disabled={submittingLabel || !labelName.trim() || selectedProjectIds.length === 0}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {submittingLabel ? "Đang xử lý..." : "Xác nhận thêm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gán Dataset */}
      {showDatasetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[450px] overflow-hidden flex flex-col border border-gray-100">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gán Dataset vào dự án</h2>
                <p className="text-sm text-gray-500">Dự án: {selectedProject?.name}</p>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
              {loadingDatasets ? (
                <div className="flex flex-col items-center py-10">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm text-gray-400">Đang tải datasets...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400 italic">Không tìm thấy dataset nào</p>
                </div>
              ) : (
                datasets.map((ds) => {
                  const dsId = ds.id || ds.datasetId;
                  return (
                    <button
                      key={dsId}
                      onClick={() => handleAssignDataset(dsId)}
                      className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="flex items-center gap-3 text-wrap text-left">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                          <Image className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{ds.name}</p>
                          <p className="text-xs text-gray-400">{ds.imagesCount || 0} hình ảnh</p>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t bg-gray-50/50 text-center">
              <button
                onClick={() => setShowDatasetModal(false)}
                className="text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <p className="text-gray-500">Chưa có dự án nào</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((p) => {
            const id = getProjectId(p);
            const displayStatus = normalizeVietnameseProjectText(p.status, "Đang hoạt động");
            const displayType = normalizeVietnameseProjectText(p.type, "Chưa xác định");
          return (
            <div key={id} className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {p.name || "Chưa có tên"}
                  </h3>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {displayStatus}
                  </span>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === id ? null : id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>

                  {openMenuId === id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-xl z-20 py-2">
                      <button
                        onClick={() => navigate(`/manager/projects/${id}`)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 text-blue-500" />
                        Xem chi tiết
                      </button>
                      <button
                        onClick={() => {
                          navigate(`/manager/projects/${id}`);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
                      >
                        <Image className="w-4 h-4" />
                        Quản lý trong chi tiết
                      </button>
                      <button
                        onClick={() => handleDelete(id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa dự án
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500">{p.description || "Chưa có mô tả"}</p>

              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <Tag className="w-4 h-4" />
                {displayType}
              </div>

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

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                <span>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                </span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {p.membersCount ?? 0} người
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}









