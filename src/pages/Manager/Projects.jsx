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
  UserCheck,
  CheckCircle2,
  Loader2,
  Calendar,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../config/api";
import { useAuth } from "../../context/AuthContext";


export default function ManagerProjects() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  // Modal Giao việc (Assign Work) state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleAssignDataset = async (datasetId) => {
    if (!selectedProject || !datasetId) return;
    try {
      setSubmittingLabel(true);
      const projectId = selectedProject.id || selectedProject.projectId;

      // Using the working endpoint pattern from Datasets.jsx with empty body
      await api.post(`/datasets/${datasetId}/attach/${projectId}`, {});

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
      const items = res.data?.items || res.data || [];
      setDatasets(items);
    } catch (err) {
      console.error("Fetch datasets error:", err);
      // Fallback or keep empty
    } finally {
      setLoadingDatasets(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/users");
      const usersData = res.data.data || res.data || [];
      setAllUsers(usersData);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingUsers(false);
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

      setProjects(Array.isArray(projRes.data?.items) ? projRes.data.items : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
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

      const uniqueTargetIds = new Set();
      selectedProjectIds.forEach((id) => {
        const project = projects.find((p) => (p.id || p.projectId) === id);
        if (project?.categoryId) {
          uniqueTargetIds.add(project.categoryId);
        }
      });

      if (uniqueTargetIds.size === 0) {
        alert("Không tìm thấy Category ID của các dự án đã chọn.");
        setSubmittingLabel(false);
        return;
      }

      for (const targetId of uniqueTargetIds) {
        await api.post(`/labelsets/${targetId}/labels`, {
          name: labelName,
        });
      }

      alert("Thêm nhãn cho các dự án thành công!");
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

  const handleAssignWork = async () => {
    if (!selectedProject) return;
    if (selectedAnnotators.length === 0) {
      alert("Vui lòng chọn ít nhất một Annotator");
      return;
    }
    if (!selectedReviewer) {
      alert("Vui lòng chọn một Reviewer");
      return;
    }

    try {
      setSubmittingAssign(true);
      const projectId = selectedProject.id || selectedProject.projectId;

      const membersToAssign = [
        ...selectedAnnotators.map(id => ({ userId: id, role: "Annotator" })),
        { userId: selectedReviewer, role: "Reviewer" }
      ];

      for (const member of membersToAssign) {
        await api.post(`/projects/${projectId}/members`, {
          userId: member.userId,
          roleName: member.role
        }).catch(err => {
          console.warn(`Failed to add member ${member.userId}:`, err.response?.data || err.message);
        });
      }

      alert(`Đã giao việc cho dự án "${selectedProject.name}" thành công!`);
      setShowAssignModal(false);
      setSelectedAnnotators([]);
      setSelectedReviewer("");
      fetchProjects();
    } catch (err) {
      console.error("Assign work error:", err);
      alert("Giao việc thất bại: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAssign(false);
    }
  };

  const toggleProjectSelection = (id) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAnnotatorSelection = (id) => {
    setSelectedAnnotators((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa dự án này?")) return;

    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) =>
        prev.filter((p) => (p.projectId || p.id) !== id)
      );

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
    fetchUsers();

    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.state?.openAssignModal && location.state?.projectId && projects.length > 0) {
      const proj = projects.find(p => (p.id || p.projectId) === location.state.projectId);
      if (proj) {
        setSelectedProject(proj);
        setShowAssignModal(true);
        // Clear state to avoid reopening on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, projects]);

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => (c.id || c.categoryId || c.category_id) === categoryId);
    return cat?.name || "Chưa xác định";
  };

  const getRole = (user) => {
    const roleValue = user.roleName || user.role || user.Role?.name || user.role?.name || "";
    return typeof roleValue === 'string' ? roleValue.toLowerCase() : "";
  };

  const annotators = allUsers.filter(u => getRole(u) === "annotator");
  const reviewers = allUsers.filter(u => getRole(u) === "reviewer");

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

      {/* Modal Giao việc (Assign Work) */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100">
            <div className="p-8 border-b flex justify-between items-start bg-indigo-50/30">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Giao việc cho dự án</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100">
                    {selectedProject?.name}
                  </span>
                  <span className="text-xs font-black uppercase text-gray-400 tracking-widest">
                    ID: {(selectedProject?.id || selectedProject?.projectId)?.substring(0, 8)}...
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAnnotators([]);
                  setSelectedReviewer("");
                }}
                className="p-2 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-200"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[65vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Loại dự án</p>
                    <p className="text-sm font-bold text-gray-800">{getCategoryName(selectedProject?.categoryId)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                    <Image className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Quy mô</p>
                    <p className="text-sm font-bold text-gray-800">{selectedProject?.imagesCount || 0} hình ảnh</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Annotators ({selectedAnnotators.length})
                  </label>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase">
                    Chọn một hoặc nhiều
                  </span>
                </div>
                {loadingUsers ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : annotators.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">Không tìm thấy Annotator nào trong hệ thống</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {annotators.map((u) => {
                      const userId = u.userId || u.id || u._id;
                      const isSelected = selectedAnnotators.includes(userId);
                      return (
                        <div
                          key={userId}
                          onClick={() => toggleAnnotatorSelection(userId)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                            ? "border-indigo-500 bg-indigo-50/50 shadow-md translate-y-[-2px]"
                            : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                              {(u.displayName || u.username || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{u.displayName || u.username}</p>
                              <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  Reviewer Phụ trách
                </label>
                {loadingUsers ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : reviewers.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">Không tìm thấy Reviewer nào trong hệ thống</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reviewers.map((u) => {
                      const userId = u.userId || u.id || u._id;
                      const isSelected = selectedReviewer === userId;
                      return (
                        <div
                          key={userId}
                          onClick={() => setSelectedReviewer(userId)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                            ? "border-indigo-500 bg-indigo-50/50 shadow-md translate-y-[-2px]"
                            : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                              {(u.displayName || u.username || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{u.displayName || u.username}</p>
                              <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t bg-gray-50 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAnnotators([]);
                  setSelectedReviewer("");
                }}
                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAssignWork}
                disabled={submittingAssign || selectedAnnotators.length === 0 || !selectedReviewer}
                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
              >
                {submittingAssign ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                {submittingAssign ? "Đang xử lý..." : "Xác nhận giao việc"}
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
          const id = p.projectId || p.id;
          return (
            <div key={id} className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {p.name || "Chưa có tên"}
                  </h3>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {p.status || "Đang hoạt động"}
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
                          setSelectedProject(p);
                          setShowDatasetModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
                      >
                        <Image className="w-4 h-4" />
                        Gán Datasets
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject(p);
                          setShowAssignModal(true);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Users className="w-4 h-4 text-green-500" />
                        Giao việc
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
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
                {getCategoryName(p.categoryId)}
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
                  <Calendar className="w-3 h-3 inline mr-1" />
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
