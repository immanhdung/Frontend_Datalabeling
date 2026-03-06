import { useEffect, useState } from "react";
import api from "../../config/api";
import { Plus, Folder, ChevronRight, Tag, X, FileUp, Upload, Image as ImageIcon } from "lucide-react";

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const [showLabelModal, setShowLabelModal] = useState(false);
    const [labelName, setLabelName] = useState("");
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [categoryProjects, setCategoryProjects] = useState([]);
    const [fetchingProjects, setFetchingProjects] = useState(false);

    const fetchCategories = async (updateSelectedId) => {
        try {
            setLoading(true);
            const res = await api.get("/Categories");
            const data = res.data || [];
            setCategories(data);
            const targetId = updateSelectedId || selected?.categoryId || selected?.id;
            if (targetId) {
                const refreshed = data.find(c => (c.categoryId || c.id) === targetId);
                if (refreshed) {
                    setSelected(refreshed);
                    fetchCategoryProjects(targetId);
                }
            }
        } catch (err) {
            console.error(err);
            alert("Không tải được danh sách category");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategoryProjects = async (categoryId) => {
        try {
            setFetchingProjects(true);
            // Lấy toàn bộ dự án để lọc chính xác tại Frontend
            const res = await api.get("/projects");

            const allItems = res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);

            // Lọc các dự án có categoryId khớp với category đang chọn
            const filtered = allItems.filter(p =>
                String(p.categoryId) === String(categoryId) ||
                String(p.category?.id) === String(categoryId) ||
                String(p.category?.categoryId) === String(categoryId)
            );

            setCategoryProjects(filtered);
        } catch (err) {
            console.error("Fetch category projects error:", err);
            setCategoryProjects([]);
        } finally {
            setFetchingProjects(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSelectCategory = (c) => {
        setSelected(c);
        fetchCategoryProjects(c.categoryId || c.id);
    };

    const handleCreate = async () => {
        if (!newName.trim()) {
            alert("Vui lòng nhập tên category");
            return;
        }
        try {
            await api.post("/Categories", {
                name: newName,
                description: newDesc,
            });
            setShowModal(false);
            setNewName("");
            setNewDesc("");
            fetchCategories();
        } catch (err) {
            console.error(err);
            alert("Tạo category thất bại");
        }
    };

    const handleCreateLabel = async () => {
        if (!labelName.trim() || selectedCategoryIds.length === 0) {
            alert("Vui lòng nhập tên nhãn và chọn ít nhất một category");
            return;
        }
        try {
            setLoading(true);
            await Promise.all(
                selectedCategoryIds.map(id =>
                    api.post(`/labelsets/${id}/labels`, {
                        name: labelName
                    })
                )
            );

            setShowLabelModal(false);
            setLabelName("");
            setSelectedCategoryIds([]);
            const currentId = selected?.categoryId || selected?.id;
            await fetchCategories(currentId);

            alert("Thêm nhãn thành công!");
        } catch (err) {
            console.error("Error creating label:", err);
            alert("Thêm nhãn thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleCategorySelection = (id) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleUploadAction = async (e, isZip = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const currentId = selected?.categoryId || selected?.id;
        if (!currentId) {
            alert("Vui lòng chọn Category trước");
            return;
        }

        try {
            setLoading(true);
            if (categoryProjects.length === 0) {
                alert("Category này hiện chưa có Project nào. Hãy tạo dự án trước khi upload ảnh.");
                return;
            }

            const projectId = categoryProjects[0].id || categoryProjects[0].projectId;

            if (isZip) {
                const formData = new FormData();
                formData.append("File", files[0]);
                formData.append("Name", files[0].name);
                await api.post(`/projects/${projectId}/datasets/import`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await Promise.all(Array.from(files).map(file => {
                    const formData = new FormData();
                    formData.append("File", file);
                    formData.append("Name", file.name);
                    return api.post(`/projects/${projectId}/datasets/import`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }));
            }

            alert("Upload thành công!");
            fetchCategoryProjects(currentId);
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => handleUploadAction(e, false);
    const handleZipUpload = (e) => handleUploadAction(e, true);

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Phân loại theo Category</h1>
                    <p className="text-gray-500">
                        Quản lý các dự án theo từng danh mục
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setSelectedCategoryIds([]);
                            setShowLabelModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                        <Tag className="w-4 h-4" />
                        Thêm nhãn
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm Category
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-4 bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Folder className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-lg">Categories</h2>
                    </div>

                    {loading ? (
                        <p className="text-gray-500">Đang tải...</p>
                    ) : categories.length === 0 ? (
                        <p className="text-gray-500">Chưa có category nào</p>
                    ) : (
                        <div className="space-y-3">
                            {categories.map((c, index) => (
                                <div
                                    key={c.categoryId || c.id || index}
                                    onClick={() => handleSelectCategory(c)}
                                    className={`p-4 border rounded-lg cursor-pointer flex items-center justify-between hover:bg-gray-50 ${(selected?.categoryId || selected?.id) === (c.categoryId || c.id) ? "border-blue-500 bg-blue-50" : ""
                                        }`}
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{c.name}</p>
                                        <p className="text-sm text-gray-500">
                                            Phân loại: {c.description || "Chưa có mô tả"}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="col-span-8 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12">
                            <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium">Chọn một category để xem các dự án</p>
                            <p className="text-sm">
                                Các dự án sẽ được hiển thị tại đây
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="mb-6 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selected.name}</h2>
                                    <p className="text-gray-500">
                                        {selected.description || "Chưa có mô tả"}
                                    </p>
                                </div>
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {categoryProjects.length} Dự án
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-gray-400" />
                                    Danh sách dự án thuộc Category
                                </h3>

                                {fetchingProjects ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : categoryProjects.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {categoryProjects.map((p) => (
                                            <div key={p.id || p.projectId} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-all bg-gray-50/30">
                                                <h4 className="font-bold text-gray-900">{p.name}</h4>
                                                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{p.description}</p>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black uppercase">
                                                        {p.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {p.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400">
                                        <p>Chưa có dự án nào trong category này</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showLabelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 w-[500px] shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Thêm nhãn mới</h2>
                                <p className="text-sm text-gray-500">Chọn category và nhập tên nhãn muốn thêm</p>
                            </div>
                            <button
                                onClick={() => setShowLabelModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Chọn Category * <span className="font-normal text-gray-400">(có thể chọn nhiều)</span>
                                </label>
                                <div className="max-h-[240px] overflow-y-auto border rounded-xl p-2 space-y-1 bg-gray-50/50">
                                    {categories.map((c, index) => {
                                        const catId = c.categoryId || c.id;
                                        return (
                                            <label
                                                key={catId || index}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategoryIds.includes(catId)}
                                                    onChange={() => toggleCategorySelection(catId)}
                                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900">{c.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({c.labelsCount || 0} nhãn)</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tên nhãn *
                                </label>
                                <input
                                    value={labelName}
                                    onChange={(e) => setLabelName(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="Ví dụ: Chó, Mèo, Xe hơi..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowLabelModal(false)}
                                className="px-6 py-2.5 font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateLabel}
                                className="px-6 py-2.5 font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none"
                                disabled={!labelName.trim() || selectedCategoryIds.length === 0}
                            >
                                Thêm nhãn
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 w-[450px] shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Thêm Category mới</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tên category *
                                </label>
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="Ví dụ: Động vật, Giao thông..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Mô tả
                                </label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm min-h-[100px]"
                                    placeholder="Mô tả ngắn gọn về category này..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-2.5 font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                                disabled={!newName.trim()}
                            >
                                Tạo Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
