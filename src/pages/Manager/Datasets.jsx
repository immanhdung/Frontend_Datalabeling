import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    MoreVertical,
    FolderPlus,
    FileArchive,
    Image as ImageIcon,
    Tag,
    X,
    Check,
    ChevronDown,
} from "lucide-react";
import api from "../../config/api";

const PREDEFINED_COLORS = [
    { name: "Red", value: "#EF4444" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Yellow", value: "#F59E0B" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Pink", value: "#EC4899" },
    { name: "Indigo", value: "#6366F1" },
];

export default function Datasets() {
    const [datasets, setDatasets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [targetProjectId, setTargetProjectId] = useState("");
    const [newDataset, setNewDataset] = useState({
        name: "",
        zipFile: null,
        images: [],
        labels: [],
    });
    const [currentLabel, setCurrentLabel] = useState({ name: "", color: PREDEFINED_COLORS[0].value });

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Lấy riêng biệt Projects, Categories và thực tế là Datasets
            const [projRes, catRes, datasetRes] = await Promise.all([
                api.get("/projects/mine"),
                api.get("/categories"),
                api.get("/datasets").catch(() => ({ data: [] })) // Fallback if endpoint doesn't exist
            ]);

            const projectsList = projRes.data?.items || [];
            setProjects(projectsList);

            // Dataset thực tế từ endpoint /datasets
            const datasetsList = datasetRes.data?.items || datasetRes.data || [];
            setDatasets(datasetsList);

            setCategories(catRes.data || []);
        } catch (err) {
            console.error("Fetch data error:", err);
            setError("Không thể tải danh sách dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddLabel = () => {
        if (!currentLabel.name.trim()) return;
        setNewDataset(prev => ({
            ...prev,
            labels: [...prev.labels, currentLabel]
        }));
        setCurrentLabel({ name: "", color: PREDEFINED_COLORS[0].value });
    };

    const handleRemoveLabel = (index) => {
        setNewDataset(prev => ({
            ...prev,
            labels: prev.labels.filter((_, i) => i !== index)
        }));
    };

    const handleAddDataset = async () => {
        if (!targetProjectId && !newDataset.name) {
            alert("Vui lòng nhập tên cho Dataset mới");
            return;
        }

        if (!newDataset.zipFile && newDataset.images.length === 0) {
            alert("Vui lòng chọn file ZIP hoặc danh sách ảnh để tải lên.");
            return;
        }

        try {
            setLoading(true);

            // 1. Tạo một Project "container" cho Dataset này (theo yêu cầu không cần chọn project trước)
            // Ta sẽ sử dụng CategoryId người dùng chọn (hoặc mặc định)
            const createProjRes = await api.post("/projects", {
                name: newDataset.name,
                description: "Dataset uploaded via Datasets Management",
                categoryId: targetProjectId, // Ở modal ta sẽ gán categoryId vào targetProjectId
            });

            const projectId = createProjRes.data?.id || createProjRes.data?.projectId;

            if (!projectId) throw new Error("Không thể tạo container cho Dataset");

            // 2. Import dữ liệu vào project vừa tạo
            if (newDataset.zipFile) {
                const formData = new FormData();
                formData.append("File", newDataset.zipFile);
                formData.append("Name", newDataset.name || newDataset.zipFile.name);
                await api.post(`/projects/${projectId}/datasets/import`, formData);
            } else if (newDataset.images.length > 0) {
                for (const file of newDataset.images) {
                    const formData = new FormData();
                    formData.append("File", file);
                    formData.append("Name", file.name);
                    await api.post(`/projects/${projectId}/datasets/import`, formData);
                }
            }

            alert("Tạo Dataset và tải lên dữ liệu thành công!");
            setShowAddModal(false);
            setNewDataset({ name: "", zipFile: null, images: [], labels: [] });
            setTargetProjectId("");
            fetchData();
        } catch (err) {
            console.error("Import error:", err);
            alert("Thêm dataset thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleAssignProject = async (projectId) => {
        try {
            setLoading(true);
            await api.post(`/projects/${projectId}/datasets`, { datasetId: selectedDataset.id || selectedDataset.datasetId });
            alert(`Đã gán dataset "${selectedDataset.name}" cho project thành công!`);
            setShowAssignModal(false);
        } catch (err) {
            console.error(err);
            alert("Gán project thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Datasets</h1>
                    <p className="text-gray-500">Quản lý và tổ chức các nguồn dữ liệu của bạn</p>
                </div>
                <button
                    onClick={() => {
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-md shadow-indigo-100"
                >
                    <Plus className="w-4 h-4" />
                    Tạo Dataset mới
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm dataset..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {datasets.filter(ds => ds.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((ds) => (
                    <div key={ds.id || ds.projectId} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <FolderPlus className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setOpenMenuId(openMenuId === (ds.id || ds.datasetId) ? null : (ds.id || ds.datasetId))}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <MoreVertical className="w-5 h-5 text-gray-400" />
                                </button>
                                {openMenuId === (ds.id || ds.datasetId) && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-20 py-1">
                                        <button
                                            onClick={() => {
                                                setSelectedDataset(ds);
                                                setShowAssignModal(true);
                                                setOpenMenuId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            <FolderPlus className="w-4 h-4" />
                                            Gán vào dự án
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            <X className="w-4 h-4" />
                                            Xóa Dataset
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 className="font-bold text-gray-900 text-lg mb-1">{ds.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{ds.imagesCount || 0} hình ảnh</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {ds.labelsCount > 0 ? (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold border">
                                    {ds.labelsCount} nhãn thiết lập
                                </span>
                            ) : (
                                <span className="text-xs text-gray-400 italic">Chưa có nhãn</span>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            ID: {ds.id || ds.datasetId}
                        </div>
                    </div>
                ))}
            </div>
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Thêm Dataset mới</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Tên Dataset *</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Bộ dữ liệu xe cộ, Động vật hoang dã..."
                                    value={newDataset.name}
                                    onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Phân loại (Category) *</label>
                                <select
                                    value={targetProjectId}
                                    onChange={(e) => setTargetProjectId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(c => (
                                        <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Import ZIP</label>
                                    <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none">
                                        <FileArchive className="w-8 h-8 text-gray-400" />
                                        <span className="mt-2 text-xs text-gray-500 text-center">{newDataset.zipFile ? newDataset.zipFile.name : "Kéo thả hoặc bấm để chọn .zip"}</span>
                                        <input type="file" accept=".zip" className="hidden" onChange={(e) => setNewDataset({ ...newDataset, zipFile: e.target.files[0], images: [] })} />
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Import ảnh</label>
                                    <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none">
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                        <span className="mt-2 text-xs text-gray-500 text-center">{newDataset.images.length > 0 ? `${newDataset.images.length} ảnh đã chọn` : "Chọn nhiều ảnh"}</span>
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setNewDataset({ ...newDataset, images: Array.from(e.target.files), zipFile: null })} />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700">Thêm Labels</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Tên nhãn..."
                                        value={currentLabel.name}
                                        onChange={(e) => setCurrentLabel({ ...currentLabel, name: e.target.value })}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 p-1 border rounded-lg bg-gray-50">
                                            {PREDEFINED_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    onClick={() => setCurrentLabel({ ...currentLabel, color: c.value })}
                                                    className={`w-6 h-6 rounded-full transition-transform ${currentLabel.color === c.value ? "scale-125 border-2 border-white shadow-sm" : "opacity-60 hover:opacity-100"}`}
                                                    style={{ backgroundColor: c.value }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddLabel}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        Thêm
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newDataset.labels.map((l, i) => (
                                        <span
                                            key={i}
                                            style={{ backgroundColor: `${l.color}20`, color: l.color }}
                                            className="px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2"
                                        >
                                            {l.name}
                                            <X onClick={() => handleRemoveLabel(i)} className="w-3 h-3 cursor-pointer hover:scale-110" />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowAddModal(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleAddDataset}
                                className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100"
                            >
                                Lưu Dataset
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Assign Project */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Gán Project</h2>
                                <p className="text-xs text-gray-500">Dataset: {selectedDataset.name}</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {projects.length === 0 ? (
                                <p className="text-center text-gray-400 py-8 italic">Chưa có dự án nào</p>
                            ) : (
                                projects.map((p) => (
                                    <button
                                        key={p.id || p.projectId}
                                        onClick={() => handleAssignProject(p.id || p.projectId)}
                                        className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800 group-hover:text-indigo-600">{p.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-black">{p.type}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                            <Check className="w-4 h-4 text-gray-300 group-hover:text-white" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-center">
                            <button onClick={() => setShowAssignModal(false)} className="text-sm font-bold text-gray-500 hover:text-gray-700">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
