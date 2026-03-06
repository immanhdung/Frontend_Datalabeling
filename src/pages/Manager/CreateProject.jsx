import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FileText,
    FolderOpen,
    X,
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

    // Labels State
    const [projectLabels, setProjectLabels] = useState([]);
    const [labelInput, setLabelInput] = useState("");
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
                templateId: "e841b523-8215-4952-b3dc-8c9bc60f8a7d",
            };

            const createRes = await api.post("/projects", payload);
            const projectId = createRes.data?.id || createRes.data?.projectId;

            if (projectId) {
                // 1. Check if a LabelSet already exists (created by template)
                let labelSetId = null;
                try {
                    const lsRes = await api.get(`/projects/${projectId}/label-sets`);
                    const labelSets = lsRes.data || [];
                    labelSetId = labelSets[0]?.id || labelSets[0]?.labelSetId;
                } catch (err) {
                    console.log("No existing LabelSet found, will try to create one");
                }

                // 2. Create LabelSet if not found
                if (!labelSetId) {
                    try {
                        const createLsRes = await api.post(`/projects/${projectId}/label-sets`, {
                            name: `Default LabelSet for ${projectName}`,
                            description: `Automatic label set for ${projectName}`,
                            projectId: projectId
                        });
                        // Some APIs return the object on create
                        labelSetId = createLsRes.data?.id || createLsRes.data?.labelSetId;

                        // If still no ID, fetch again
                        if (!labelSetId) {
                            const refreshLs = await api.get(`/projects/${projectId}/label-sets`);
                            const freshSets = refreshLs.data || [];
                            labelSetId = freshSets[0]?.id || freshSets[0]?.labelSetId;
                        }
                    } catch (lsErr) {
                        console.error("Failed to create labelSet:", lsErr.response?.data || lsErr);
                    }
                }

                // 3. Add labels one by one if we have a labelSetId
                if (labelSetId) {
                    for (const labelName of projectLabels) {
                        try {
                            await api.post(`/labelsets/${labelSetId}/labels`, {
                                name: labelName
                            });
                        } catch (labelErr) {
                            console.error(`Failed to add label ${labelName}:`, labelErr.response?.data || labelErr);
                        }
                    }
                }
            }

            alert("Tạo dự án thành công!");
            navigate("/manager/projects");
        } catch (err) {
            console.error(err.response?.data || err);
            setError(
                err.response?.data?.message ||
                "Tạo dự án thất bại. Vui lòng kiểm tra lại thông tin."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        { number: 1, title: "Thông tin", icon: FileText },
        { number: 2, title: "Category", icon: FolderOpen },
        { number: 3, title: "Nhãn dự án", icon: Check },
        { number: 4, title: "Xác nhận", icon: Check },
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
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Thêm nhãn cho dự án</h2>
                            <span className="text-sm text-gray-400">Đã thêm: {projectLabels.length}</span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                className="flex-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                placeholder="Nhập tên nhãn (ví dụ: Chó, Mèo, Xe...)"
                                value={labelInput}
                                onChange={(e) => setLabelInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (labelInput.trim() && !projectLabels.includes(labelInput.trim())) {
                                            setProjectLabels([...projectLabels, labelInput.trim()]);
                                            setLabelInput("");
                                        }
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (labelInput.trim() && !projectLabels.includes(labelInput.trim())) {
                                        setProjectLabels([...projectLabels, labelInput.trim()]);
                                        setLabelInput("");
                                    }
                                }}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                            >
                                Thêm
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            {projectLabels.map((l, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-full group hover:border-red-200 transition-all shadow-sm">
                                    <span className="text-sm font-bold text-gray-700">{l}</span>
                                    <button
                                        onClick={() => setProjectLabels(projectLabels.filter(x => x !== l))}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {projectLabels.length === 0 && (
                                <div className="w-full flex flex-col items-center justify-center text-gray-400 py-4">
                                    <p className="text-sm">Chưa có nhãn nào được thêm</p>
                                    <p className="text-xs italic">Nhấn Enter hoặc bấm Thêm để lưu nhãn</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Xác nhận</h2>
                        <div className="bg-gray-50 border rounded-2xl p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tên dự án</p>
                                    <p className="font-bold text-gray-900">{projectName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Category</p>
                                    <p className="font-bold text-gray-900">{selectedCategory?.name}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Nhãn dán ({projectLabels.length})</p>
                                <p className="text-sm font-medium text-gray-600 mt-1">{projectLabels.join(", ") || "Không có nhãn"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Mô tả</p>
                                <p className="text-sm text-gray-600">{projectDescription}</p>
                            </div>
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
