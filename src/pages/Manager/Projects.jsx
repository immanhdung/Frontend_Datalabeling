import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Tag,
  Image,
  Database,
  Users,
  Eye,
  Trash2,
  X,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { labelAPI } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/common/Pagination";
import { getProjectItemCount, getProjectTypeLabel } from "../../utils/projectDashboardHelpers";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  const root = value?.data ?? value?.items ?? value?.results ?? value;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  return [];
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
  const [projectMetaMap, setProjectMetaMap] = useState({});

  const navigate = useNavigate();
  const { logout } = useAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const enrichProjectData = async () => {
      const visibleProjects = projects
        .filter((p) => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice((currentPage - 1) * pageSize, currentPage * pageSize);

      if (visibleProjects.length === 0) return;

      const newMeta = { ...projectMetaMap };
      let changed = false;

      await Promise.allSettled(visibleProjects.map(async (p) => {
        const pid = getProjectId(p);
        if (!pid || (newMeta[pid]?.enriched)) return;

        try {
          const [labelsRes, datasetsRes] = await Promise.all([
            api.get(`/projects/${pid}/labels`),
            api.get(`/projects/${pid}/datasets`)
          ]);

          const labels = toArray(labelsRes.data);
          const datasets = toArray(datasetsRes.data);

          newMeta[pid] = {
            labelsCount: labels.length,
            datasetsCount: datasets.length,
            enriched: true
          };
          changed = true;
        } catch (e) { }
      }));

      if (changed) setProjectMetaMap(newMeta);
    };

    enrichProjectData();
  }, [projects, currentPage, pageSize, searchTerm]);

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

  const handleAssignDataset = async (datasetId) => {
    if (!selectedProject || !datasetId) return;
    try {
      setSubmittingLabel(true);
      const projectId = selectedProject.id || selectedProject.projectId;

      await api.post(`/datasets/add/${projectId}`, { datasetId });

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

      const { getAssignedTasksByUserMap } = await import("../../utils/annotatorTaskHelpers");

      const [projRes, catRes] = await Promise.all([
        api.get("/projects", { params: { PageSize: 1000, pageSize: 1000, page: 1 } }),
        api.get("/categories", { params: { PageSize: 1000, pageSize: 1000 } }).catch(() => ({ data: [] })),
      ]);

      const apiProjects = toArray(projRes.data);
      const serverCategories = toArray(catRes.data);

      const localTasksMap = getAssignedTasksByUserMap();
      const allLocalTasks = Object.values(localTasksMap).flat();

      const localProjects = [];
      const seenPids = new Set(apiProjects.map(p => String(p.id || p.projectId)));

      allLocalTasks.forEach(t => {
        const pid = String(t.projectId || t.project?.id || "");
        if (pid && !seenPids.has(pid)) {
          localProjects.push({
            id: pid,
            projectId: pid,
            name: t.projectName || t.ProjectName || t.project?.name || `Dự án #${pid.slice(0, 5)}`,
            status: t.project?.status || 'Active',
            type: t.project?.type || 'Image',
            itemsCount: t.totalItems || t.items?.length || 0,
            labelsCount: t.labels?.length || 0,
            updatedAt: t.updatedAt,
            createdAt: t.createdAt
          });
          seenPids.add(pid);
        }
      });

      setProjects([...apiProjects, ...localProjects]);
      setCurrentPage(1);
      setCategories(serverCategories);
    } catch (err) {
      console.error("Fetch projects error:", err);
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
      await api.delete(`/projects/${id}`);
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
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Quản lý dự án</h1>
          <p className="text-slate-500 font-medium text-lg">Tạo và quản lý các dự án gán nhãn chuyên nghiệp.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/manager/projects/create")}
            className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] hover:bg-indigo-700 hover:-translate-y-1 transition-all font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
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
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

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
        {projects
          .filter((p) => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
          .map((p, i) => {
            const id = getProjectId(p);
            const displayStatus = normalizeVietnameseProjectText(p.status, "Đang hoạt động");
            const type = getProjectTypeLabel(p);
            const stats = projectMetaMap[id] || {};

            // Ultra-vibrant premium themes
            const themes = [
              { base: 'blue', grad: 'from-blue-600 to-indigo-700', text: 'text-blue-600', shadow: 'shadow-blue-200', glow: 'group-hover:shadow-blue-500/30', light: 'bg-blue-50/50' },
              { base: 'emerald', grad: 'from-emerald-500 to-teal-700', text: 'text-emerald-600', shadow: 'shadow-emerald-200', glow: 'group-hover:shadow-emerald-500/30', light: 'bg-emerald-50/50' },
              { base: 'amber', grad: 'from-amber-400 to-orange-600', text: 'text-amber-600', shadow: 'shadow-amber-200', glow: 'group-hover:shadow-amber-500/30', light: 'bg-amber-50/50' },
              { base: 'rose', grad: 'from-rose-500 to-pink-700', text: 'text-rose-600', shadow: 'shadow-rose-200', glow: 'group-hover:shadow-rose-500/30', light: 'bg-rose-50/50' },
              { base: 'purple', grad: 'from-purple-500 to-violet-700', text: 'text-purple-600', shadow: 'shadow-purple-200', glow: 'group-hover:shadow-purple-500/30', light: 'bg-purple-50/50' }
            ];
            const theme = themes[i % themes.length];

            return (
              <div
                key={id}
                onClick={() => navigate(`/manager/projects/${id}`)}
                className={`group bg-white border border-slate-100 rounded-[48px] shadow-sm hover:shadow-2xl ${theme.glow} hover:-translate-y-2 transition-all duration-500 p-9 cursor-pointer flex flex-col h-full relative overflow-hidden`}
              >
                {/* Gradient Top Accent */}
                <div className={`absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r ${theme.grad} opacity-90`} />

                <div className="flex justify-between items-start mb-8 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.grad} flex items-center justify-center text-white shadow-lg ${theme.shadow} group-hover:scale-110 transition-transform duration-500`}>
                        <FolderOpen className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-display font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 tracking-tight">
                        {p.name || "Dự án không tên"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-5 py-2 bg-gradient-to-r ${theme.grad} text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${theme.shadow}`}>
                        {displayStatus}
                      </span>
                      {type !== "N/A" && type !== "Chưa xác định" && (
                        <span className="px-5 py-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === id ? null : id);
                      }}
                      className="p-3.5 hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      <MoreHorizontal className="w-6 h-6 text-slate-300 group-hover:text-slate-500" />
                    </button>

                    {openMenuId === id && (
                      <div className="absolute right-0 mt-3 w-60 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-50 py-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        <button
                          onClick={() => navigate(`/manager/projects/${id}`)}
                          className="w-full flex items-center gap-4 px-7 py-4 text-sm font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all uppercase tracking-widest"
                        >
                          <Eye className="w-5 h-5 opacity-70" />
                          Chi tiết
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProject(p);
                            setShowDatasetModal(true);
                          }}
                          className="w-full flex items-center gap-4 px-7 py-4 text-sm font-black text-indigo-600 hover:bg-indigo-50 transition-all uppercase tracking-widest"
                        >
                          <Plus className="w-5 h-5 opacity-70" />
                          Datasets
                        </button>
                        <div className="mx-7 border-t border-slate-50 my-2" />
                        <button
                          onClick={() => handleDelete(id)}
                          className="w-full flex items-center gap-4 px-7 py-4 text-sm font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-widest"
                        >
                          <Trash2 className="w-5 h-5 opacity-70" />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-slate-400 text-base font-medium mb-12 flex-1 line-clamp-2 leading-relaxed px-1">
                  {p.description || "Gán nhãn chuyên nghiệp, chuẩn hóa dữ liệu tối ưu cho các thuật toán Computer Vision."}
                </p>

                <div className="grid grid-cols-2 gap-x-10 gap-y-8 pt-10 border-t border-slate-50 relative">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-indigo-500">
                      <div className="p-1.5 rounded-lg bg-indigo-50">
                        <Database className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Datasets</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{stats.datasetsCount ?? 0}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-amber-500">
                      <div className="p-1.5 rounded-lg bg-amber-50">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Nhãn</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter">{stats.labelsCount ?? (p.labelsCount || p.labelCount || 0)}</p>
                  </div>

                  <div className={`absolute inset-0 -m-6 ${theme.light} rounded-[40px] -z-10 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl scale-95 group-hover:scale-100`} />
                </div>

                <div className="mt-10 flex items-center justify-between border-t border-slate-50 pt-8">
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <span className="text-[14px] font-black text-slate-400 uppercase tracking-widest">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </span>
                  </div>
                  <div className={`h-1.5 w-12 bg-gradient-to-r ${theme.grad} rounded-full shadow-sm`} />
                </div>
              </div>
            );
          })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(projects.filter(p => !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase())).length / pageSize)}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[6, 12, 24, 48]}
        totalItems={projects.filter(p => !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase())).length}
      />
    </div>
  );
}












