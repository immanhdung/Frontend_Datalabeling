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
    const fetchCategories = async (updateSelectedId) => {
        try {
            setLoading(true);
            const res = await api.get("/Categories");
            const data = res.data || [];
            setCategories(data);
            const targetId = updateSelectedId || selected?.categoryId || selected?.id;
            if (targetId) {
                const refreshed = data.find(c => (c.categoryId || c.id) === targetId);
                if (refreshed) setSelected(refreshed);
            }
        } catch (err) {
            console.error(err);
            alert("Không tải được danh sách category");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

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
            // Theo Swagger: POST /api/labelsets/{labelSetId}/labels
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
            // Tìm Project thuộc Category này để upload (vì API Dataset Import yêu cầu projectId)
            const projectsRes = await api.get(`/projects?CategoryId=${currentId}`);
            const projects = projectsRes.data?.items || [];

            if (projects.length === 0) {
                alert("Category này hiện chưa có Project nào. Hãy tạo dự án trước khi upload ảnh.");
                return;
            }

            const projectId = projects[0].id || projects[0].projectId;

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
            fetchCategories(currentId);
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
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý nhãn và ảnh</h1>
                    <p className="text-gray-500">
                        Tổ chức dữ liệu theo các category
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
                                    onClick={() => setSelected(c)}
                                    className={`p-4 border rounded-lg cursor-pointer flex items-center justify-between hover:bg-gray-50 ${(selected?.categoryId || selected?.id) === (c.categoryId || c.id) ? "border-blue-500 bg-blue-50" : ""
                                        }`}
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{c.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {c.labelsCount || 0} nhãn • {c.imagesCount || 0} ảnh
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
                            <p className="font-medium">Chọn một category để xem chi tiết</p>
                            <p className="text-sm">
                                Hoặc tạo category mới để bắt đầu
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">{selected.name}</h2>
                                <p className="text-gray-500">
                                    {selected.description || "Chưa có mô tả"}
                                </p>
                            </div>
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-5 h-5 text-gray-400" />
                                        <h3 className="font-semibold text-lg">Nhãn ({selected.labels?.length || 0})</h3>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const catId = selected.categoryId || selected.id;
                                            setSelectedCategoryIds([catId]);
                                            setShowLabelModal(true);
                                        }}
                                        className="flex items-center gap-1.2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Thêm nhãn
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(selected.labels?.length > 0 || selected.labelsCount > 0) ? (
                                        (selected.labels || [{ name: "Chó" }, { name: "Mèo" }]).map((l, i) => {
                                            const colors = [
                                                { bg: "bg-indigo-100", text: "text-indigo-700" },
                                                { bg: "bg-emerald-100", text: "text-emerald-700" },
                                                { bg: "bg-amber-100", text: "text-amber-700" },
                                                { bg: "bg-rose-100", text: "text-rose-700" },
                                            ];
                                            const color = colors[i % colors.length];
                                            return (
                                                <span key={i} className={`px-4 py-1.5 ${color.bg} ${color.text} rounded-full text-sm font-semibold`}>
                                                    {l.name}
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Chưa có nhãn nào</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-gray-400" />
                                        <h3 className="font-semibold text-lg">Ảnh ({selected.imagesCount || 0})</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <label className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                                            <FileUp className="w-4 h-4" />
                                            Import ZIP
                                            <input type="file" accept=".zip" hidden onChange={handleZipUpload} />
                                        </label>
                                        <label className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            Upload ảnh
                                            <input type="file" multiple accept="image/*" hidden onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>

                                {selected.imagesCount > 0 ? (
                                    <div className="grid grid-cols-4 gap-4">
                                        {[...Array(Math.min(selected.imagesCount, 8))].map((_, i) => (
                                            <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                                <img
                                                    src={`https://picsum.photos/seed/${selected.id}-${i}/200`}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-40 border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400">
                                        Trống
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
