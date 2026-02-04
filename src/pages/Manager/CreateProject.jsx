import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import {
    ArrowLeft,
    ArrowRight,
    Layers,
    Target,
    Image as ImageIcon,
    Tag,
    FileText,
    Check,
    FolderOpen,
} from "lucide-react";

export default function CreateProjectPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [projectType, setProjectType] = useState("classification");
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [guidelines, setGuidelines] = useState("");

    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");

    const [loadingCategories, setLoadingCategories] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const selectedCategory = categories.find(
        (c) => String(c.id) === String(selectedCategoryId)
    );

    // Load categories from API
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);
                const res = await api.get("/Categories");
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
        switch (step) {
            case 1:
                return !!projectType;
            case 2:
                return projectName.trim() !== "" && projectDescription.trim() !== "";
            case 3:
                return selectedCategoryId !== "";
            default:
                return true;
        }
    };

    const handleSubmit = async () => {
        setError("");
        setSubmitting(true);
        try {
            const payload = {
                name: projectName,
                description: projectDescription,
                guidelines: guidelines,
                type: projectType, // "classification" | "detection"
                categoryId: selectedCategoryId,
            };

            const res = await api.post("/projects", payload);
            console.log("CREATE PROJECT RES:", res.data);

            alert("Tạo dự án thành công!");
            navigate("/manager/projects");
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message || "Tạo dự án thất bại, vui lòng thử lại"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { number: 1, title: "Loại dự án", icon: Layers },
        { number: 2, title: "Thông tin", icon: FileText },
        { number: 3, title: "Category", icon: FolderOpen },
        { number: 4, title: "Xác nhận", icon: Check },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
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

            {/* Steps */}
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

            {/* Card */}
            <div className="bg-white border rounded-xl p-6">
                {/* Step 1 */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Chọn loại dự án</h2>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div
                                onClick={() => setProjectType("classification")}
                                className={`border rounded-lg p-6 cursor-pointer ${projectType === "classification"
                                        ? "border-indigo-600 bg-indigo-50"
                                        : ""
                                    }`}
                            >
                                <Layers className="h-8 w-8 mb-2 text-indigo-600" />
                                <p className="font-semibold">Phân loại theo lớp</p>
                                <p className="text-sm text-gray-500">
                                    Mỗi ảnh chỉ có một nhãn
                                </p>
                            </div>

                            <div
                                onClick={() => setProjectType("detection")}
                                className={`border rounded-lg p-6 cursor-pointer ${projectType === "detection"
                                        ? "border-indigo-600 bg-indigo-50"
                                        : ""
                                    }`}
                            >
                                <Target className="h-8 w-8 mb-2 text-indigo-600" />
                                <p className="font-semibold">Đánh dấu vùng</p>
                                <p className="text-sm text-gray-500">
                                    Khoanh vùng nhiều đối tượng
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
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

                {/* Step 3 */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Chọn Category</h2>

                        {loadingCategories ? (
                            <p>Đang tải category...</p>
                        ) : categories.length === 0 ? (
                            <div>
                                <p className="text-gray-500">Chưa có category nào</p>
                                <button
                                    className="mt-3 border px-4 py-2 rounded"
                                    onClick={() => navigate("/manager/categories")}
                                >
                                    Tạo Category
                                </button>
                            </div>
                        ) : (
                            <select
                                className="w-full border rounded px-3 py-2"
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                            >
                                <option value="">-- Chọn category --</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {selectedCategory && (
                            <div className="border rounded p-4 bg-gray-50">
                                <p className="font-semibold">{selectedCategory.name}</p>
                                <p className="text-sm text-gray-500">
                                    {selectedCategory.description || "Chưa có mô tả"}
                                </p>
                                <p className="text-sm mt-2">
                                    • {selectedCategory.labelsCount || 0} nhãn •{" "}
                                    {selectedCategory.imagesCount || 0} ảnh
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Xác nhận</h2>

                        <div className="bg-gray-50 border rounded p-4 space-y-2">
                            <p>
                                <b>Tên:</b> {projectName}
                            </p>
                            <p>
                                <b>Loại:</b>{" "}
                                {projectType === "classification"
                                    ? "Phân loại"
                                    : "Đánh dấu vùng"}
                            </p>
                            <p>
                                <b>Category:</b> {selectedCategory?.name}
                            </p>
                            <p>
                                <b>Mô tả:</b> {projectDescription}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between">
                <button
                    className="border px-4 py-2 rounded"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                >
                    <ArrowLeft className="inline w-4 h-4 mr-1" />
                    Quay lại
                </button>

                {step < 4 ? (
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
                        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
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
