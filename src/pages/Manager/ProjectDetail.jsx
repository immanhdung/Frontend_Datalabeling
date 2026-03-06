import { ArrowLeft, Download, Plus, Loader2, AlertCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../config/api";

export default function ManagerProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [labelSets, setLabelSets] = useState([]);

    useEffect(() => {
        const fetchProjectDetail = async () => {
            try {
                setLoading(true);
                setError(null);

                const [projectRes, labelSetsRes] = await Promise.all([
                    api.get(`/projects/${id}`),
                    api.get(`/projects/${id}/label-sets`).catch(() => ({ data: [] }))
                ]);

                setProject(projectRes.data);
                setLabelSets(Array.isArray(labelSetsRes.data) ? labelSetsRes.data : []);
            } catch (err) {
                console.error("Fetch project detail error:", err);
                setError("Không thể tải thông tin chi tiết dự án. Vui lòng thử lại sau.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProjectDetail();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Đang tải thông tin dự án...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <p className="text-gray-800 font-bold text-lg">{error || "Không tìm thấy dự án"}</p>
                <button
                    onClick={() => navigate("/manager/projects")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    // Process labels from labelSets
    const allLabels = labelSets.flatMap(set => set.labels || []);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <span className={`px-3 py-1 text-xs rounded-full ${project.status === "Completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            }`}>
                            {project.status || "Đang hoạt động"}
                        </span>
                    </div>
                    <p className="text-gray-500 mt-1">{project.description || "Chưa có mô tả cho dự án này."}</p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Xuất dữ liệu
                    </button>
                    <button
                        onClick={() => navigate("/manager/projects", { state: { openAssignModal: true, projectId: id } })}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        Giao việc
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5 shadow">
                    <h3 className="font-semibold mb-1">Tiến độ dự án</h3>
                    <p className="text-sm text-gray-500 mb-4">Tiến độ chung</p>

                    <div className="flex justify-between mb-1">
                        <span className="text-sm">Tổng</span>
                        <span className="font-semibold text-blue-600">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${project.progress || 0}%` }}
                        />
                    </div>

                    <div className="mt-4 text-sm">
                        <p className="font-medium mb-1">Tình trạng:</p>
                        <div className="flex justify-between text-gray-600">
                            <span>Đã hoàn thành</span>
                            <span>{project.completedImages || 0} / {project.totalImages || 0} ảnh</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow">
                    <h3 className="font-semibold mb-1">Chỉ số đồng thuận</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Mức độ đồng thuận giữa các annotator
                    </p>

                    <div className="flex justify-between mb-1">
                        <span className="text-sm">Đồng thuận chung</span>
                        <span className="font-semibold text-red-500">{project.agreement || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 transition-all duration-500"
                            style={{ width: `${project.agreement || 0}%` }}
                        />
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                        <p> Đồng thuận cao (≥90%): 0 ảnh</p>
                        <p> Bất đồng (&lt;70%): 0 ảnh</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow space-y-3">
                    <h3 className="font-semibold">Thông tin dự án</h3>
                    <InfoRow label="Loại dự án" value={project.type || "Chưa xác định"} />
                    <InfoRow label="Ngày tạo" value={project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "--"} />
                    <InfoRow label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString() : "Không có"} />
                    <InfoRow label="ID Dự án" value={id.substring(0, 8) + "..."} />
                </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow">
                <h3 className="font-semibold mb-1">Hình ảnh ({project.totalImages || 0})</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Hình ảnh đang được xử lý trong dự án
                </p>

                {project.images && project.images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {project.images.map((img, idx) => (
                            <div key={img.id || idx} className="relative group">
                                <img
                                    src={img.url || "https://placehold.co/400x300?text=No+Image"}
                                    alt=""
                                    className="w-full h-32 object-cover rounded-lg border"
                                />
                                {img.agreement && (
                                    <span className="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                                        {img.agreement}%
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
                        <p className="text-gray-400">Chưa có hình ảnh nào trong dự án này</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5 shadow lg:col-span-2">
                    <h3 className="font-semibold mb-2">Hướng dẫn gán nhãn</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                        {project.guideline || "Dự án này chưa có hướng dẫn chi tiết."}
                    </p>
                </div>
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-5 shadow text-wrap overflow-hidden">
                        <h3 className="font-semibold mb-3">Nhãn ({allLabels.length})</h3>
                        <div className="flex gap-2 flex-wrap text-wrap">
                            {allLabels.length > 0 ? (
                                allLabels.map((label, idx) => (
                                    <span
                                        key={label.id || idx}
                                        className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700"
                                        style={{ backgroundColor: label.color || '#dbeafe', color: label.color ? '#fff' : '#1d4ed8' }}
                                    >
                                        {label.name}
                                    </span>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400">Chưa có nhãn</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow">
                        <h3 className="font-semibold mb-3">Nhóm làm việc ({project.members?.length || 0})</h3>
                        {project.members && project.members.length > 0 ? (
                            <div className="space-y-4">
                                {project.members.map((member, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 uppercase">
                                            {member.name?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="font-medium">{member.name}</p>
                                            <p className="text-sm text-gray-500">{member.email || member.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Chưa có thành viên nào tham gia</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
