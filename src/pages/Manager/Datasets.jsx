import { useEffect, useState, useRef } from "react";
import {
    Plus,
    Search,
    MoreVertical,
    FolderPlus,
    FileArchive,
    Image as ImageIcon,
    X,
    Check,
    Trash2,
    Edit2,
    Link2,
    Upload,
    Tag,
    AlertCircle,
    Loader2,
    Eye,
    Calendar,
    Database
} from "lucide-react";
import api from "../../config/api";

const PRESET_COLORS = [
    "#4F46E5", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"
];

export default function Datasets() {
    const [datasets, setDatasets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // New Dataset State
    const [newDataset, setNewDataset] = useState({
        name: "",
        zipFile: null,
        images: [],
        labels: [] // { name: "", color: "" }
    });
    const [labelInput, setLabelInput] = useState("");
    const [uploadType, setUploadType] = useState("images"); // "images" or "zip"
    const fileInputRef = useRef(null);

    // Quality Check State
    const [qualityWarnings, setQualityWarnings] = useState([]);
    const [showQualityModal, setShowQualityModal] = useState(false);

    // Edit State
    const [editName, setEditName] = useState("");

    const [openMenuId, setOpenMenuId] = useState(null);

    // Edit Enhanced States
    const [editImages, setEditImages] = useState([]);
    const [editLabels, setEditLabels] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editLabelInput, setEditLabelInput] = useState("");

    // ================= FETCH DATA =================
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [datasetRes, projRes] = await Promise.all([
                api.get("/datasets"),
                api.get("/projects"),
            ]);

            const datasetList =
                datasetRes.data?.items ||
                datasetRes.data?.data ||
                datasetRes.data ||
                [];

            const projectList =
                projRes.data?.items ||
                projRes.data?.data ||
                projRes.data ||
                [];

            setDatasets(datasetList);
            setProjects(projectList);
        } catch (err) {
            console.error(err);
            setError("Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    // ================= ACTIONS =================
    const handleAddLabel = () => {
        if (!labelInput.trim()) return;
        const color = PRESET_COLORS[newDataset.labels.length % PRESET_COLORS.length];
        setNewDataset(prev => ({
            ...prev,
            labels: [...prev.labels, { name: labelInput.trim(), color }]
        }));
        setLabelInput("");
    };

    const removeLabel = (index) => {
        setNewDataset(prev => ({
            ...prev,
            labels: prev.labels.filter((_, i) => i !== index)
        }));
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (uploadType === "zip") {
            setNewDataset(prev => ({ ...prev, zipFile: files[0] }));
        } else {
            // Process images quality check
            setLoading(true);
            const checkResults = [];
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    checkResults.push({ file, isLow: false });
                    continue;
                }
                const res = await new Promise((resolve) => {
                    const img = new Image();
                    const url = URL.createObjectURL(file);
                    img.onload = () => {
                        const isLow = img.width < 640 || img.height < 480;
                        resolve({ file, isLow, width: img.width, height: img.height });
                        URL.revokeObjectURL(url);
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(url);
                        resolve({ file, isLow: false });
                    };
                    img.src = url;
                });
                checkResults.push(res);
            }
            setLoading(false);

            const lowQuality = checkResults.filter(r => r.isLow);
            const goodQuality = checkResults.filter(r => !r.isLow).map(r => r.file);

            if (lowQuality.length > 0) {
                setQualityWarnings(prev => [...prev, ...lowQuality]);
                setShowQualityModal(true);
            }

            if (goodQuality.length > 0) {
                setNewDataset(prev => ({ ...prev, images: [...prev.images, ...goodQuality] }));
            }
        }
    };

    const resetAddForm = () => {
        setNewDataset({ name: "", zipFile: null, images: [], labels: [] });
        setLabelInput("");
        setUploadType("images");
        setQualityWarnings([]);
    };

    const handleCreateDataset = async () => {
        if (!newDataset.name.trim()) {
            alert("Vui lòng nhập tên Dataset");
            return;
        }

        if (uploadType === "zip" && !newDataset.zipFile) {
            alert("Vui lòng chọn file ZIP");
            return;
        }

        if (uploadType === "images" && newDataset.images.length === 0) {
            alert("Vui lòng chọn ít nhất một ảnh");
            return;
        }

        try {
            setLoading(true);

            // 1. Create Dataset
            const createRes = await api.post("/datasets", {
                name: newDataset.name,
                labels: newDataset.labels // Persist labels if backend supports it
            });

            const datasetId = createRes.data?.id || createRes.data?.datasetId;
            if (!datasetId) throw new Error("Không tạo được dataset");

            // 2. Upload Content
            if (uploadType === "zip") {
                const formData = new FormData();
                formData.append("File", newDataset.zipFile);
                formData.append("Name", newDataset.zipFile.name);
                await api.post(`/datasets/${datasetId}/items`, formData);
            } else {
                for (const file of newDataset.images) {
                    const formData = new FormData();
                    formData.append("File", file);
                    formData.append("Name", file.name);
                    await api.post(`/datasets/${datasetId}/items`, formData);
                }
            }

            alert("Tạo dataset thành công!");
            setShowAddModal(false);
            resetAddForm();
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Thêm dataset thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEditDataset = async () => {
        if (!editName.trim()) return;
        try {
            setLoading(true);
            const id = selectedDataset.id || selectedDataset.datasetId;
            await api.put(`/datasets/${id}`, { name: editName });
            alert("Cập nhật thành công!");
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Cập nhật thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDataset = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xoá dataset này? Dữ liệu bên trong sẽ bị mất.")) return;

        try {
            setLoading(true);
            // Standarizing to uppercase for this resource
            await api.delete(`/datasets/${id}`);
            setDatasets(prev => prev.filter(d => (d.id || d.datasetId) !== id));
            alert("Đã xóa dataset thành công!");
        } catch (err) {
            console.error("Delete error details:", err.response || err);
            const errorMsg = err.response?.data?.message || err.message;
            if (err.response?.status === 500) {
                alert("Lỗi Server (500): Không thể xóa dataset này. Có thể dataset đang được sử dụng trong một dự án hoặc gặp lỗi ràng buộc dữ liệu phía Backend.");
            } else {
                alert("Xoá thất bại: " + errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAssignToProject = async (projectId) => {
        try {
            setLoading(true);
            const dsId = selectedDataset.id || selectedDataset.datasetId;
            await api.post(`/datasets/${dsId}/attach/${projectId}`, {});
            alert("Gán vào project thành công!");
            setShowAssignModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Gán thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (ds) => {
        const id = ds.id || ds.datasetId;
        setShowDetailModal(true);
        setLoadingDetail(true);
        try {
            // Fetch fresh dataset info AND items
            const [infoRes, itemsRes] = await Promise.all([
                api.get(`/datasets/${id}`),
                api.get(`/datasets/${id}/items`)
            ]);
            setSelectedDataset(infoRes.data);
            setDetailItems(itemsRes.data?.items || itemsRes.data || []);
        } catch (err) {
            console.error("Fetch dataset details error:", err);
            setSelectedDataset(ds); // Fallback to list info
            setDetailItems([]);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleOpenEditModal = async (ds) => {
        const id = ds.id || ds.datasetId;
        setSelectedDataset(ds);
        setEditName(ds.name);
        setShowEditModal(true);
        setLoadingDetail(true);
        try {
            const [infoRes, itemsRes] = await Promise.all([
                api.get(`/datasets/${id}`),
                api.get(`/datasets/${id}/items`)
            ]);
            setSelectedDataset(infoRes.data);
            setEditName(infoRes.data.name);
            setEditImages(itemsRes.data?.items || itemsRes.data || []);

            // Handle labels from infoRes
            const labelsFound = infoRes.data.labels || infoRes.data.labelSet?.labels || [];
            setEditLabels(labelsFound);
        } catch (err) {
            console.error("Fetch edit info error:", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleDeleteImage = async (itemId) => {
        if (!window.confirm("Xóa ảnh này khỏi dataset?")) return;
        try {
            await api.delete(`/datasets/items/${itemId}`);
            setEditImages(prev => prev.filter(img => img.id !== itemId && img.itemId !== itemId));
        } catch (err) {
            console.error(err);
            alert("Xóa ảnh thất bại");
        }
    };

    const handleEditAddImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dsId = selectedDataset.id || selectedDataset.datasetId;
        try {
            setIsUpdating(true);
            const formData = new FormData();
            formData.append("File", file);
            formData.append("Name", file.name);
            await api.post(`/datasets/${dsId}/items`, formData);
            // Refresh images
            const res = await api.get(`/datasets/${dsId}/items`);
            setEditImages(res.data?.items || res.data || []);
        } catch (err) {
            console.error(err);
            alert("Thêm ảnh thất bại");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddEditLabel = async () => {
        if (!editLabelInput.trim()) return;
        const color = PRESET_COLORS[editLabels.length % PRESET_COLORS.length];
        const labelSetId = selectedDataset.labelSetId || selectedDataset.labelSet?.id;

        if (!labelSetId) {
            alert("Dataset này chưa có LabelSet để thêm nhãn trực tiếp.");
            return;
        }

        try {
            setIsUpdating(true);
            await api.post(`/labelsets/${labelSetId}/labels`, {
                name: editLabelInput.trim(),
                color: color
            });
            setEditLabelInput("");
            // Refresh dataset info for labels
            const dsId = selectedDataset.id || selectedDataset.datasetId;
            const res = await api.get(`/datasets/${dsId}`);
            setEditLabels(res.data.labels || res.data.labelSet?.labels || []);
        } catch (err) {
            console.error(err);
            alert("Thêm nhãn thất bại");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteLabel = async (labelId) => {
        if (!window.confirm("Xóa nhãn này?")) return;
        try {
            await api.delete(`/labels/${labelId}`);
            setEditLabels(prev => prev.filter(l => l.id !== labelId));
        } catch (err) {
            console.error(err);
            alert("Xóa nhãn thất bại");
        }
    };

    // ================= RENDER =================
    const filteredDatasets = datasets.filter(d =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Thư viện Dataset</h1>
                    <p className="text-gray-500 mt-1">Quản lý và tổ chức các nguồn dữ liệu của bạn</p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Tạo Dataset mới
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Tìm kiếm dataset theo tên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm"
                />
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Dataset Grid */}
            {loading && datasets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
                </div>
            ) : filteredDatasets.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                    <FolderPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-400">Không tìm thấy dataset nào</h3>
                    <p className="text-gray-500 mt-1">Hãy thử tìm kiếm từ khóa khác hoặc tạo dataset mới</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDatasets.map((ds) => {
                        const id = ds.id || ds.datasetId;
                        return (
                            <div
                                key={id}
                                className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="relative transition-all">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === id ? null : id);
                                            }}
                                            className="p-2 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5 text-gray-500 hover:text-indigo-600" />
                                        </button>

                                        {openMenuId === id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDetail(ds);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Xem chi tiết
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditModal(ds);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Chỉnh sửa
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDataset(ds);
                                                        setShowAssignModal(true);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Link2 className="w-4 h-4" />
                                                    Gán vào project
                                                </button>

                                                <div className="h-px bg-gray-100 my-1" />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDataset(id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Xoá Dataset
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-5 group-hover:bg-indigo-600 transition-colors duration-300">
                                    <FolderPlus className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{ds.name}</h3>
                                <div className="mt-4 flex items-center gap-4 text-sm font-medium text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <ImageIcon className="w-4 h-4" />
                                        {ds.imagesCount || ds.itemsCount || ds.totalItems || ds.itemCount || ds.imageCount || ds.items?.length || 0} ảnh
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Tag className="w-4 h-4" />
                                        {ds.labelsCount || ds.labelCount || ds.labels?.length || ds.labelSet?.labels?.length || ds.numberOfLabels || 0} nhãn
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mt-4 italic">
                                    Ngày tạo: {ds.createdAt ? new Date(ds.createdAt).toLocaleDateString() : "N/A"}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Tạo Dataset mới</h2>
                                <p className="text-sm text-gray-500 mt-1">Chuẩn bị dữ liệu cho quy trình gán nhãn của bạn</p>
                            </div>
                            <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-200">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto">
                            {/* Dataset Name */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-700 ml-1">Tên Dataset *</label>
                                <input
                                    type="text"
                                    value={newDataset.name}
                                    onChange={(e) => setNewDataset(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ví dụ: Training_Cars_2024"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all text-lg font-bold placeholder:font-normal"
                                />
                            </div>

                            {/* Upload Section */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 ml-1">Nguồn dữ liệu *</label>
                                <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl w-fit">
                                    <button
                                        onClick={() => setUploadType("images")}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadType === "images" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        Hình ảnh
                                    </button>
                                    <button
                                        onClick={() => setUploadType("zip")}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadType === "zip" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        <FileArchive className="w-4 h-4" />
                                        Tệp ZIP
                                    </button>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-[28px] p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                >
                                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-700">Kéo thả hoặc click để tải lên</p>
                                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-black">
                                            {uploadType === "images" ? "Chấp nhận: .jpg, .png, .jpeg" : "Chấp nhận: .zip (Tối đa 500MB)"}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        multiple={uploadType === "images"}
                                        accept={uploadType === "images" ? "image/*" : ".zip"}
                                        className="hidden"
                                    />
                                </div>

                                {uploadType === "images" && newDataset.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
                                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                                            {newDataset.images.length} tệp đã chọn
                                        </span>
                                        <button onClick={() => setNewDataset(p => ({ ...p, images: [] }))} className="text-xs font-bold text-red-500 hover:underline">Xóa tất cả</button>
                                    </div>
                                )}
                                {uploadType === "zip" && newDataset.zipFile && (
                                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in bounce-in duration-300">
                                        <FileArchive className="w-6 h-6 text-indigo-600" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-indigo-900 truncate">{newDataset.zipFile.name}</p>
                                            <p className="text-[10px] text-indigo-400 uppercase font-black">{(newDataset.zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button onClick={() => setNewDataset(p => ({ ...p, zipFile: null }))} className="p-1.5 hover:bg-indigo-200 text-indigo-600 rounded-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Labels Section */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 ml-1">Danh sách nhãn dự kiến</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={labelInput}
                                        onChange={(e) => setLabelInput(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleAddLabel()}
                                        placeholder="Tên nhãn mới..."
                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                                    />
                                    <button
                                        onClick={handleAddLabel}
                                        className="bg-gray-900 text-white px-6 rounded-xl text-sm font-bold hover:bg-black transition-colors"
                                    >
                                        Thêm
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {newDataset.labels.map((label, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-gray-100 shadow-sm bg-white hover:border-indigo-200 transition-all group"
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                                            <span className="text-xs font-bold text-gray-700">{label.name}</span>
                                            <button
                                                onClick={() => removeLabel(index)}
                                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {newDataset.labels.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">Chưa có nhãn nào được thêm</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t bg-gray-50/50 flex justify-end gap-4">
                            <button
                                onClick={() => { setShowAddModal(false); resetAddForm(); }}
                                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleCreateDataset}
                                disabled={loading || !newDataset.name}
                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2 transition-all"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? "Đang xử lý..." : "Khởi tạo Dataset"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa Dataset</h2>
                                <p className="text-sm text-gray-500">{selectedDataset?.name}</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* General Info */}
                            <div className="space-y-4">
                                <label className="text-sm font-black uppercase tracking-widest text-gray-400">Tên Dataset</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all text-lg font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Images Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-black uppercase tracking-widest text-gray-400">Hình ảnh ({editImages.length})</label>
                                        <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                            <Plus className="w-3 h-3 inline mr-1" /> Thêm ảnh
                                            <input type="file" className="hidden" onChange={handleEditAddImage} accept="image/*" />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {editImages.map((img, idx) => (
                                            <div key={idx} className="aspect-square rounded-xl bg-gray-100 relative group overflow-hidden border">
                                                <img src={img.storageUri || img.url} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleDeleteImage(img.id || img.itemId)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {loadingDetail && <div className="col-span-3 py-10 text-center text-gray-400">Đang tải ảnh...</div>}
                                    </div>
                                </div>

                                {/* Labels Section */}
                                <div className="space-y-4">
                                    <label className="text-sm font-black uppercase tracking-widest text-gray-400">Nhãn dán ({editLabels.length})</label>

                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editLabelInput}
                                                onChange={(e) => setEditLabelInput(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddEditLabel()}
                                                placeholder="Tên nhãn mới..."
                                                className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl text-sm"
                                            />
                                            <button
                                                onClick={handleAddEditLabel}
                                                className="bg-gray-900 text-white px-4 rounded-xl text-xs font-bold hover:bg-black transition-colors"
                                            >
                                                Thêm
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {editLabels.map((label, idx) => (
                                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-full group">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                                                    <span className="text-xs font-bold text-gray-700">{label.name}</span>
                                                    <button
                                                        onClick={() => handleDeleteLabel(label.id)}
                                                        className="p-0.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {editLabels.length === 0 && <p className="text-xs text-gray-400 italic">Chưa có nhãn</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
                            {(isUpdating || loadingDetail) && <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-auto ml-4" />}
                            <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500">Đóng</button>
                            <button
                                onClick={handleEditDataset}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Gán vào Project</h2>
                                <p className="text-sm text-gray-500 mt-1">Dataset: <span className="font-bold text-indigo-600">{selectedDataset?.name}</span></p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-white rounded-full">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-3">
                            <p className="text-sm font-bold text-gray-700 px-2">Chọn dự án đích:</p>
                            {projects.length === 0 ? (
                                <div className="p-10 text-center font-medium text-gray-400">Không tìm thấy dự án nào</div>
                            ) : projects.map(p => (
                                <button
                                    key={p.id || p.projectId}
                                    onClick={() => handleAssignToProject(p.id || p.projectId)}
                                    className="w-full flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <FolderPlus className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{p.name}</p>
                                            <p className="text-xs text-gray-400 uppercase font-black">{p.type || "N/A"}</p>
                                        </div>
                                    </div>
                                    <Check className="w-5 h-5 text-transparent group-hover:text-indigo-600 transition-all translate-x-4 group-hover:translate-x-0" />
                                </button>
                            ))}
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 text-center">
                            <button onClick={() => setShowAssignModal(false)} className="text-sm font-bold text-gray-500 hover:text-gray-700">Hủy bỏ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* DETAIL MODAL */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-indigo-50/30">
                            <div className="flex gap-4">
                                <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100">
                                    <Database className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 leading-tight">{selectedDataset?.name}</h2>
                                    <div className="flex flex-wrap items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            {selectedDataset?.createdAt ? new Date(selectedDataset.createdAt).toLocaleDateString() : "N/A"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100">
                                            <ImageIcon className="w-4 h-4" />
                                            {selectedDataset?.imagesCount || selectedDataset?.itemsCount || selectedDataset?.totalItems || 0} items
                                        </div>
                                        <div className="text-xs font-black uppercase text-gray-400 tracking-widest">
                                            ID: {selectedDataset?.id || selectedDataset?.datasetId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-200"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* Labels Section */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Labels associated
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedDataset?.labels?.map((label, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                                            <span className="text-sm font-bold text-gray-800">{label.name}</span>
                                        </div>
                                    )) || (
                                            <p className="text-sm italic text-gray-400 bg-gray-50 px-4 py-3 rounded-2xl w-full border border-dashed border-gray-200">
                                                No explicit labels defined in metadata.
                                            </p>
                                        )}
                                </div>
                            </section>

                            {/* Content Preview Section */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Dataset Content Preview
                                    </h3>
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase">
                                        Max 20 latest items
                                    </span>
                                </div>

                                {loadingDetail ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                                        <p className="text-sm font-bold text-gray-400">Loading items preview...</p>
                                    </div>
                                ) : detailItems.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {detailItems.slice(0, 20).map((item, idx) => (
                                            <div key={idx} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 relative group cursor-zoom-in">
                                                <img
                                                    src={item.storageUri || item.url || item.thumbnailUrl}
                                                    alt="ds-item"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Eye className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <FolderPlus className="w-12 h-12 text-gray-300 mb-2" />
                                        <p className="text-sm font-bold text-gray-400 font-sans">No items found in this dataset.</p>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t bg-gray-50/50 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-10 py-4 bg-gray-900 text-white rounded-[20px] text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-200"
                            >
                                Close Detailed View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUALITY WARNING MODAL */}
            {showQualityModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border-4 border-amber-100/50">
                        <div className="p-8 border-b border-amber-50 flex justify-between items-center bg-amber-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-200 animate-pulse">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-amber-900 leading-tight">Cảnh báo chất lượng</h2>
                                    <p className="text-sm font-bold text-amber-600 mt-0.5">Một số ảnh có độ phân giải thấp (dưới 640x480)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQualityModal(false)}
                                className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-amber-200"
                            >
                                <X className="w-6 h-6 text-amber-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-4 max-h-[50vh] custom-scrollbar">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Danh sách ảnh cần kiểm tra ({qualityWarnings.length})</p>
                            {qualityWarnings.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-gray-100 transition-all duration-300">
                                    <div className="flex items-center gap-5 min-w-0">
                                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{item.file.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black rounded-lg border border-red-100">
                                                    {item.width} x {item.height}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setNewDataset(prev => ({ ...prev, images: [...prev.images, item.file] }));
                                                const newWarnings = qualityWarnings.filter((_, i) => i !== idx);
                                                setQualityWarnings(newWarnings);
                                                if (newWarnings.length === 0) setShowQualityModal(false);
                                            }}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                        >
                                            GIỮ LẠI
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newWarnings = qualityWarnings.filter((_, i) => i !== idx);
                                                setQualityWarnings(newWarnings);
                                                if (newWarnings.length === 0) setShowQualityModal(false);
                                            }}
                                            className="px-5 py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl text-[11px] font-black hover:border-red-500 hover:text-red-700 transition-all"
                                        >
                                            XÓA BỎ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t bg-gray-50/50 flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setQualityWarnings([]);
                                    setShowQualityModal(false);
                                }}
                                className="px-6 py-3 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
                            >
                                Xóa tất cả cảnh báo
                            </button>
                            <button
                                onClick={() => {
                                    const allFiles = qualityWarnings.map(q => q.file);
                                    setNewDataset(prev => ({ ...prev, images: [...prev.images, ...allFiles] }));
                                    setQualityWarnings([]);
                                    setShowQualityModal(false);
                                }}
                                className="px-10 py-4 bg-amber-500 text-white rounded-[20px] text-sm font-black hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all active:scale-95"
                            >
                                GIỮ LẠI TẤT CẢ ({qualityWarnings.length})
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}