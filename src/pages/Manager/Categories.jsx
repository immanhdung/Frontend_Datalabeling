import { useEffect, useState } from "react";
import api from "../../config/api";
import { Plus, Folder, ChevronRight, Tag } from "lucide-react";

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await api.get("/Categories");
            setCategories(res.data || []);
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

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý nhãn và ảnh</h1>
                    <p className="text-gray-500">
                        Tổ chức dữ liệu theo các category
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white">
                        <Tag className="w-4 h-4" />
                        Thêm nhãn
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm Category
                    </button>
                </div>
            </div>

            {/* Main */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left: Categories list */}
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
                            {categories.map((c) => (
                                <div
                                    key={c.id}
                                    onClick={() => setSelected(c)}
                                    className={`p-4 border rounded-lg cursor-pointer flex items-center justify-between hover:bg-gray-50 ${selected?.id === c.id ? "border-blue-500 bg-blue-50" : ""
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

                {/* Right: Detail / Empty */}
                <div className="col-span-8 bg-white rounded-xl p-6 shadow-sm flex items-center justify-center">
                    {!selected ? (
                        <div className="text-center text-gray-500">
                            <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium">Chọn một category để xem chi tiết</p>
                            <p className="text-sm">
                                Hoặc tạo category mới để bắt đầu
                            </p>
                        </div>
                    ) : (
                        <div className="w-full">
                            <h2 className="text-xl font-semibold mb-2">{selected.name}</h2>
                            <p className="text-gray-500 mb-4">
                                {selected.description || "Chưa có mô tả"}
                            </p>
                            <div className="text-sm text-gray-600">
                                • {selected.labelsCount || 0} nhãn <br />
                                • {selected.imagesCount || 0} ảnh
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Create */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-[420px]">
                        <h2 className="text-lg font-semibold mb-4">Thêm Category</h2>

                        <div className="space-y-3">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Tên category"
                            />
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Mô tả (tuỳ chọn)"
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                            >
                                Tạo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
