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
    Link2,
    Upload,
    AlertCircle,
    Loader2,
    Eye,
    Calendar,
    Database,
    Pencil
} from "lucide-react";
import api, { datasetAPI, API_BASE_URL } from "../../config/api";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"];

const formatBytes = (bytes) => {
    const numeric = Number(bytes || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return "N/A";
    const units = ["B", "KB", "MB", "GB"];
    let value = numeric;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const getItemName = (item, fallbackIndex) => {
    const name = item?.name || item?.fileName || item?.filename || item?.originalName || item?.path;
    if (name) return String(name);

    const url = item?.url || item?.thumbnailUrl || item?.fileUrl;
    if (url && typeof url === "string") {
        const parts = url.split("/");
        const finalPart = parts[parts.length - 1];
        if (finalPart) return decodeURIComponent(finalPart);
    }

    return `item-${fallbackIndex + 1}`;
};

const getItemSizeBytes = (item) => {
    const raw = item?.size ?? item?.fileSize ?? item?.length ?? item?.contentLength ?? item?.bytes;
    const numeric = Number(raw || 0);
    return Number.isFinite(numeric) ? numeric : 0;
};

const getItemExtension = (item, fallbackIndex) => {
    const name = getItemName(item, fallbackIndex);
    const chunks = String(name).split(".");
    if (chunks.length <= 1) return "unknown";
    return chunks[chunks.length - 1].toLowerCase();
};

const isImageItem = (item, fallbackIndex) => {
    const name = getItemName(item, fallbackIndex);
    const ext = String(name).split(".").pop()?.toLowerCase();
    if (ext && IMAGE_EXTENSIONS.includes(ext)) return true;

    // Check contentType or mediaType if available
    const type = (item?.contentType || item?.mediaType || "").toLowerCase();
    if (type.startsWith("image/")) return true;

    return false;
};

const getItemDimensions = (item) => {
    const width = Number(item?.width ?? item?.imageWidth ?? item?.meta?.width ?? 0);
    const height = Number(item?.height ?? item?.imageHeight ?? item?.meta?.height ?? 0);
    if (width > 0 && height > 0) {
        return { width, height };
    }
    return null;
};

const getQualityInfo = (item, fallbackIndex) => {
    if (!isImageItem(item, fallbackIndex)) {
        return { status: "na", text: "N/A" };
    }

    const sizeBytes = getItemSizeBytes(item);
    const dims = getItemDimensions(item);

    const lowBySize = sizeBytes > 0 && sizeBytes < 80 * 1024;
    const lowByDimension = dims ? dims.width < 640 || dims.height < 480 : false;

    if (lowBySize || lowByDimension) {
        return { status: "low", text: "Chất lượng thấp" };
    }

    if (dims || sizeBytes > 0) {
        return { status: "ok", text: "Tốt" };
    }

    return { status: "unknown", text: "Chưa đủ dữ liệu" };
};

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
        images: []
    });
    const [uploadType, setUploadType] = useState("images"); // "images" or "zip"
    const fileInputRef = useRef(null);

    // Edit State
    const [editName, setEditName] = useState("");

    const [openMenuId, setOpenMenuId] = useState(null);

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
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (uploadType === "zip") {
            setNewDataset(prev => ({ ...prev, zipFile: files[0] }));
        } else {
            setNewDataset(prev => ({ ...prev, images: [...prev.images, ...files] }));
        }
    };

    const resetAddForm = () => {
        setNewDataset({ name: "", zipFile: null, images: [] });
        setUploadType("images");
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
                name: newDataset.name
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
            await datasetAPI.attach(dsId, projectId);
            alert("Gán vào project thành công!");
            setShowAssignModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Gán thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };


    const handleViewDetail = async (ds, openModal = true) => {
        const id = ds.id || ds.datasetId;
        if (openModal) setShowDetailModal(true);
        setLoadingDetail(true);
        try {
            // Fetch fresh dataset info AND items
            const [infoRes, itemsRes] = await Promise.all([
                api.get(`/datasets/${id}`),
                api.get(`/datasets/${id}/items`)
            ]);
            console.log("DEBUG: Dataset items data:", itemsRes.data);
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

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Bạn có chắc muốn xóa tệp này?")) return;
        try {
            setLoading(true);
            await api.delete(`/datasets/items/${itemId}`);
            setDetailItems(prev => prev.filter(it => (it.id || it.itemId || it.datasetItemId || it.dataset_item_id) !== itemId));
            // Also refresh dataset list to update counts/size
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Xóa tệp thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleUploadMore = async () => {
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
            const datasetId = selectedDataset.id || selectedDataset.datasetId;

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

            alert("Tải lên thêm thành công!");
            resetAddForm();
            // Refresh items list
            handleViewDetail(selectedDataset, false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Tải lên thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // ================= RENDER =================
    const filteredDatasets = datasets.filter(d =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDetailFiles = detailItems.length;
    const totalDetailSize = detailItems.reduce((sum, item) => sum + getItemSizeBytes(item), 0);
    const lowQualityCount = detailItems.reduce((sum, item, index) => {
        const quality = getQualityInfo(item, index);
        return quality.status === "low" ? sum + 1 : sum;
    }, 0);

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
                                                        setSelectedDataset(ds);
                                                        setEditName(ds.name);
                                                        setShowEditModal(true);
                                                        setOpenMenuId(null);
                                                        handleViewDetail(ds, false); // Fetch items for editing
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
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
                                        {(() => {
                                            const count = ds.imagesCount ?? ds.itemsCount ?? ds.totalItems ?? ds.itemCount ?? ds.imageCount ?? (Array.isArray(ds.items) ? ds.items.length : 0);
                                            return count || 0;
                                        })()} files
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Database className="w-4 h-4" />
                                        {formatBytes(ds.totalSize || ds.totalBytes || ds.size || ds.datasetSize)}
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

                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600">
                                Nhan duoc quan ly o trang Category. Dataset chi quan ly tep va archive.
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
                                <p className="text-sm text-gray-500">Quản lý tên và nội dung của dataset</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); resetAddForm(); }} className="p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Rename Section */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 ml-1">Đổi tên Dataset</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all font-bold"
                                    />
                                    <button
                                        onClick={handleEditDataset}
                                        disabled={loading || !editName.trim() || editName === selectedDataset?.name}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all font-sans"
                                    >
                                        Đổi tên
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Manage Items List */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Danh sách tệp tin hiện tại
                                    </h3>
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                                        {loadingDetail ? (
                                            <div className="p-10 text-center">
                                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                                                <p className="text-xs text-gray-400 font-bold">Đang tải...</p>
                                            </div>
                                        ) : detailItems.length === 0 ? (
                                            <div className="p-10 text-center text-gray-400 text-sm font-medium italic">Trống</div>
                                        ) : (
                                            <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                                                {detailItems.map((item, idx) => {
                                                    const name = getItemName(item, idx);
                                                    const itemId = item.id || item.itemId || item.datasetItemId || item.dataset_item_id;
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-white transition-colors group">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                                                    <ImageIcon className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-sm truncate font-medium text-gray-700">{name}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteItem(itemId)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Upload More Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Thêm tệp mới
                                    </h3>

                                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                                        <button
                                            onClick={() => setUploadType("images")}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${uploadType === "images" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}
                                        >
                                            Ảnh
                                        </button>
                                        <button
                                            onClick={() => setUploadType("zip")}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${uploadType === "zip" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}
                                        >
                                            ZIP
                                        </button>
                                    </div>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                    >
                                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" />
                                        <p className="text-xs font-bold text-gray-500">Nhấp để tải lên</p>
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
                                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <span className="text-xs font-bold text-indigo-700">{newDataset.images.length} tệp đã chọn</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => resetAddForm()} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500">Hủy</button>
                                                <button
                                                    onClick={handleUploadMore}
                                                    disabled={loading}
                                                    className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 disabled:opacity-50"
                                                >
                                                    Tải lên
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {uploadType === "zip" && newDataset.zipFile && (
                                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-xs font-bold text-indigo-900 truncate">{newDataset.zipFile.name}</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => resetAddForm()} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500">Hủy</button>
                                                <button
                                                    onClick={handleUploadMore}
                                                    disabled={loading}
                                                    className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 disabled:opacity-50"
                                                >
                                                    Tải lên
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 flex justify-end">
                            <button
                                onClick={() => { setShowEditModal(false); resetAddForm(); }}
                                className="px-8 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-black shadow-lg"
                            >
                                Xong
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
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                    <p className="text-xs font-black uppercase text-indigo-400">Tong file</p>
                                    <p className="text-2xl font-black text-indigo-700 mt-1">{totalDetailFiles}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                    <p className="text-xs font-black uppercase text-blue-400">Tong dung luong</p>
                                    <p className="text-2xl font-black text-blue-700 mt-1">{formatBytes(totalDetailSize)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                    <p className="text-xs font-black uppercase text-amber-400">File chat luong thap</p>
                                    <p className="text-2xl font-black text-amber-700 mt-1">{lowQualityCount}</p>
                                </div>
                            </section>

                            {/* Content Preview Section */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Danh sach file trong dataset
                                    </h3>
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase">
                                        Archive va image deu ho tro
                                    </span>
                                </div>

                                {loadingDetail ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                                        <p className="text-sm font-bold text-gray-400">Dang tai danh sach file...</p>
                                    </div>
                                ) : detailItems.length > 0 ? (
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                            <div className="col-span-5">File</div>
                                            <div className="col-span-2">Loai</div>
                                            <div className="col-span-2">Dung luong</div>
                                            <div className="col-span-2">Kich thuoc</div>
                                            <div className="col-span-1">Chat luong</div>
                                        </div>

                                        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                                            {detailItems.map((item, idx) => {
                                                const fileName = getItemName(item, idx);
                                                const ext = getItemExtension(item, idx);
                                                const sizeBytes = getItemSizeBytes(item);
                                                const dims = getItemDimensions(item);
                                                const quality = getQualityInfo(item, idx);

                                                return (
                                                    <div key={`${fileName}-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center">
                                                        <div className="col-span-5 flex items-center gap-3 min-w-0">
                                                            {(() => {
                                                                let displayUrl = item.url || item.thumbnailUrl || item.fileUrl || item.path || "";

                                                                // Handle relative paths from backend
                                                                if (displayUrl && !displayUrl.startsWith("http") && !displayUrl.startsWith("data:")) {
                                                                    const base = API_BASE_URL.replace("/api", "");
                                                                    displayUrl = `${base}${displayUrl.startsWith("/") ? "" : "/"}${displayUrl}`;
                                                                }

                                                                return displayUrl && isImageItem(item, idx) ? (
                                                                    <img
                                                                        src={displayUrl}
                                                                        alt={fileName}
                                                                        className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = "https://via.placeholder.com/40?text=IMG";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                                        <FileArchive className="w-4 h-4" />
                                                                    </div>
                                                                );
                                                            })()}
                                                            <span className="truncate font-medium text-gray-800">{fileName}</span>
                                                        </div>

                                                        <div className="col-span-2 text-gray-600 uppercase">{ext}</div>
                                                        <div className="col-span-2 text-gray-600">{formatBytes(sizeBytes)}</div>
                                                        <div className="col-span-2 text-gray-600">{dims ? `${dims.width}x${dims.height}` : "N/A"}</div>
                                                        <div className="col-span-1">
                                                            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${quality.status === "low"
                                                                ? "bg-amber-100 text-amber-700"
                                                                : quality.status === "ok"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-gray-100 text-gray-600"
                                                                }`}>
                                                                {quality.text}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <FolderPlus className="w-12 h-12 text-gray-300 mb-2" />
                                        <p className="text-sm font-bold text-gray-400 font-sans">Khong tim thay file nao trong dataset.</p>
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
        </div>
    );
}