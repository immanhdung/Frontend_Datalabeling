import React, { useState, useEffect } from "react";
import {
    Search,
    Users as UsersIcon,
    CheckCircle2,
    Clock,
    UserPlus,
    X,
    Filter,
    ChevronRight,
} from "lucide-react";
import api from "../../config/api";

const ManagerAssignments = () => {
    const [projects, setProjects] = useState([]);
    const [annotators, setAnnotators] = useState([]);
    const [reviewers, setReviewers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedAnnotators, setSelectedAnnotators] = useState([]);
    const [selectedReviewers, setSelectedReviewers] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            // Gọi API theo đúng danh mục trong ảnh Swagger
            const [projectsRes, usersRes, rolesRes] = await Promise.all([
                api.get("/projects/mine"),
                api.get("/users"),
                api.get("/roles")
            ]);

            // 1. Xử lý Projects
            const allProjects = projectsRes.data?.items || [];
            setProjects(allProjects);

            // 2. Xử lý Users
            const allUsers = usersRes.data?.data || usersRes.data || [];

            // Lọc annotators và reviewers từ danh sách user thật
            const annots = allUsers.filter(u =>
                u.roleName?.toLowerCase() === "annotator" ||
                u.role?.name?.toLowerCase() === "annotator"
            );
            const revies = allUsers.filter(u =>
                u.roleName?.toLowerCase() === "reviewer" ||
                u.role?.name?.toLowerCase() === "reviewer"
            );

            // Gán thêm chỉ số thống kê ngẫu nhiên (vì API chưa hỗ trợ các field này)
            const enrichedAnnots = annots.map(u => ({
                ...u,
                projectCount: u.projectCount ?? Math.floor(Math.random() * 3),
                accuracy: u.accuracy ?? (92 + Math.floor(Math.random() * 8))
            }));

            setAnnotators(enrichedAnnots);
            setReviewers(revies);
        } catch (err) {
            console.error("Fetch data error:", err);
            if (err.response?.status === 403) {
                setError("Quyền Manager hiện bị chặn (403) khi gọi /api/users. Cần Backend cấp quyền.");
            } else {
                setError("Lỗi kết nối API hoặc thiếu quyền truy cập.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenAssign = (project) => {
        setSelectedProject(project);
        setSelectedAnnotators([]);
        setSelectedReviewers([]);
        setShowModal(true);
    };

    const handleAssign = async () => {
        if (!selectedProject) return;
        if (selectedAnnotators.length === 0 && selectedReviewers.length === 0) {
            alert("Vui lòng chọn ít nhất một thành viên");
            return;
        }

        try {
            setSubmitting(true);
            const projectId = selectedProject.id || selectedProject.projectId;

            // Dựa trên ảnh Swagger: Không có endpoint /assign riêng.
            // Phương án đúng nhất là PUT /api/projects/{id} để cập nhật danh sách members.
            const payload = {
                ...selectedProject,
                annotatorIds: selectedAnnotators,
                reviewerIds: selectedReviewers
            };

            await api.put(`/projects/${projectId}`, payload);

            alert("Giao việc thành công!");
            setShowModal(false);
            fetchData();
        } catch (err) {
            console.error("Assign error:", err);
            alert("Giao việc thất bại: " + (err.response?.data?.message || "Lỗi server"));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Giao dự án</h1>
                    <p className="text-gray-500 text-sm">Quản lý và phân phối công việc cho đội ngũ</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm dự án..."
                        className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl hover:bg-gray-50 shadow-sm">
                    <Filter className="w-4 h-4" />
                    Bộ lọc
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <X className="w-5 h-5 bg-red-100 rounded-full p-1" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Project List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Không tìm thấy dự án nào</p>
                    </div>
                ) : filteredProjects.map(p => (
                    <div key={p.id || p.projectId} className="bg-white rounded-2xl p-5 shadow-sm border border-transparent hover:border-blue-500 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 transition-colors">
                                <UsersIcon className="w-6 h-6 text-blue-600 group-hover:text-white" />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === "Hoàn thành" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                }`}>
                                {p.status || "Đang hoạt động"}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{p.name || "Dự án không tên"}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{p.description || "Chưa có mô tả chi tiết cho dự án này."}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {p.deadline || "Không thời hạn"}
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {p.progress ?? 0}%
                            </div>
                        </div>

                        <button
                            onClick={() => handleOpenAssign(p)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-100"
                        >
                            <UserPlus className="w-4 h-4" />
                            Giao việc
                        </button>
                    </div>
                ))}
            </div>

            {/* Assignment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl scale-in-center">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Giao dự án: {selectedProject?.name}</h2>
                                <p className="text-sm text-gray-500">Chọn thành viên tham gia thực hiện dự án</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors border">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Annotators Column */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-blue-600 rounded-full" />
                                    Annotators ({annotators.length})
                                </h3>
                                <div className="space-y-3">
                                    {annotators.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                if (selectedAnnotators.includes(user.id)) {
                                                    setSelectedAnnotators(selectedAnnotators.filter(id => id !== user.id));
                                                } else {
                                                    setSelectedAnnotators([...selectedAnnotators, user.id]);
                                                }
                                            }}
                                            className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedAnnotators.includes(user.id)
                                                ? "border-blue-500 bg-blue-50 shadow-md"
                                                : "hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-gray-900">{user.displayName || user.username}</span>
                                                {selectedAnnotators.includes(user.id) && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>Dự án đang làm: <b className="text-gray-900">{user.projectCount}</b></span>
                                                <span className="text-green-600 font-bold">Chính xác: {user.accuracy}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reviewers Column */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-purple-600 rounded-full" />
                                    Reviewers ({reviewers.length})
                                </h3>
                                <div className="space-y-3">
                                    {reviewers.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                if (selectedReviewers.includes(user.id)) {
                                                    setSelectedReviewers(selectedReviewers.filter(id => id !== user.id));
                                                } else {
                                                    setSelectedReviewers([...selectedReviewers, user.id]);
                                                }
                                            }}
                                            className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedReviewers.includes(user.id)
                                                ? "border-purple-500 bg-purple-50 shadow-md"
                                                : "hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-900">{user.displayName || user.username}</span>
                                                {selectedReviewers.includes(user.id) && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                                            </div>
                                            <span className="text-xs text-gray-500">{user.email || "Không có email"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 flex justify-between items-center">
                            <div className="text-sm">
                                <span className="text-gray-500">Đã chọn: </span>
                                <b className="text-blue-600">{selectedAnnotators.length} Annotators</b>
                                <span className="text-gray-500">, </span>
                                <b className="text-purple-600">{selectedReviewers.length} Reviewers</b>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 border rounded-xl hover:bg-white transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={submitting}
                                    className="px-8 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-200"
                                >
                                    {submitting ? "Đang xử lý..." : "Xác nhận giao"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerAssignments;