import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FileText,
    FolderOpen,
} from "lucide-react";

export default function CreateProjectPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [guidelines, setGuidelines] = useState("");

    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const selectedCategory = useMemo(() => {
        return categories.find(
            (c) => String(c.categoryId || c.id) === String(selectedCategoryId)
        );
    }, [categories, selectedCategoryId]);
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);
                const res = await api.get("/categories");
                setCategories(res.data || []);
            } catch (err) {
                console.error(err);
                setError("Không tải được danh sách category");
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, []);
    const canProceed = () => {
        if (step === 1) {
            return projectName.trim() && projectDescription.trim();
        }
        if (step === 2) {
            return selectedCategoryId !== "";
        }
        return true;
    };
    const handleSubmit = async () => {
        if (!selectedCategoryId) {
            setError("Vui lòng chọn category");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const payload = {
                name: projectName.trim(),
                description: projectDescription.trim(),
                categoryId: selectedCategoryId,
            };

            console.log("CREATE PROJECT PAYLOAD:", payload);

            await api.post("/projects", payload);

            alert("Tạo dự án thành công!");
            navigate("/manager/projects");
        } catch (err) {
            console.error(err.response?.data || err);
            setError(
                err.response?.data?.message ||
                "Tạo dự án thất bại (400 Bad Request)"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { number: 1, title: "Thông tin", icon: FileText },
        { number: 2, title: "Category", icon: FolderOpen },
        { number: 3, title: "Xác nhận", icon: Check },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    className="p-2 rounded hover:bg-gray-100"
                    onClick={() => navigate("/manager/projects")}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Tạo dự án mới</h1>
                    <p className="text-gray-500">Thiết lập dự án gán nhãn dữ liệu</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded border">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                {steps.map((s, index) => (
                    <div key={s.number} className="flex items-center">
                        <div
                            className={`flex items-center gap-2 ${step >= s.number ? "text-indigo-600" : "text-gray-400"
                                }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${step > s.number
                                    ? "bg-indigo-600 text-white"
                                    : step === s.number
                                        ? "border-2 border-indigo-600"
                                        : "bg-gray-200"
                                    }`}
                            >
                                {step > s.number ? <Check /> : <s.icon />}
                            </div>
                            <span className="hidden sm:block text-sm font-medium">
                                {s.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`w-12 sm:w-32 h-0.5 mx-2 ${step > s.number ? "bg-indigo-600" : "bg-gray-200"
                                    }`}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="bg-white border rounded-xl p-6">
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Thông tin dự án</h2>

                        <div>
                            <label className="block text-sm font-medium">Tên dự án *</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Mô tả *</label>
                            <textarea
                                className="w-full border rounded px-3 py-2"
                                rows={3}
                                value={projectDescription}
                                onChange={(e) => setProjectDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Hướng dẫn</label>
                            <textarea
                                className="w-full border rounded px-3 py-2"
                                rows={4}
                                value={guidelines}
                                onChange={(e) => setGuidelines(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Chọn Category</h2>

                        {loadingCategories ? (
                            <p>Đang tải category...</p>
                        ) : (
                            <select
                                className="w-full border rounded px-3 py-2"
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                            >
                                <option value="">-- Chọn category --</option>

                                {categories.map((c, index) => {
                                    const catId = c.categoryId || c.id;
                                    return (
                                        <option key={catId || index} value={String(catId)}>
                                            {c.name}
                                        </option>
                                    );
                                })}
                            </select>
                        )}

                        {selectedCategory && (
                            <div className="border rounded p-4 bg-gray-50">
                                <p className="font-semibold">{selectedCategory.name}</p>
                                <p className="text-sm text-gray-500">
                                    {selectedCategory.description || "Chưa có mô tả"}
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Xác nhận</h2>
                        <div className="bg-gray-50 border rounded p-4 space-y-2">
                            <p><b>Tên:</b> {projectName}</p>
                            <p><b>Category:</b> {selectedCategory?.name}</p>
                            <p><b>Mô tả:</b> {projectDescription}</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-between">
                <button
                    className="border px-4 py-2 rounded"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                >
                    <ArrowLeft className="inline w-4 h-4 mr-1" />
                    Quay lại
                </button>

                {step < 3 ? (
                    <button
                        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        onClick={() => setStep(step + 1)}
                        disabled={!canProceed()}
                    >
                        Tiếp theo
                        <ArrowRight className="inline w-4 h-4 ml-1" />
                    </button>
                ) : (
                    <button
                        className="bg-green-600 text-white px-4 py-2 rounded"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        <Check className="inline w-4 h-4 mr-1" />
                        {submitting ? "Đang tạo..." : "Tạo dự án"}
                    </button>
                )}
            </div>
        </div>
    );
}
