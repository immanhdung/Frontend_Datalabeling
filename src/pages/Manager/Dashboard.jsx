import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Plus,
    FolderOpen,
    Clock,
    CheckCircle2,
    Users,
    Database,
    ShieldCheck,
    BarChart3,
    ArrowRight,
    MoreVertical,
    Calendar,
    Image as ImageIcon
} from "lucide-react";
import api, { statisticsAPI } from "../../config/api";
import {
    toArrayData,
    isActiveProject,
    isCompletedProject,
    normalizeProjectStatus,
    getProjectStatusMeta,
    getProjectItemCount,
    getProjectTypeLabel,
    sortProjectsByNewest,
    getProjectUpdatedAt,
    formatRelativeDateVi,
} from "../../utils/projectDashboardHelpers";
import { resolveApiData as resolveHelperData, getAssignedTasksByUserMap } from "../../utils/annotatorTaskHelpers";

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [projectList, setProjectList] = useState([]);
    const [taskStats, setTaskStats] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [statsData, setStatsData] = useState({
        totalProjects: 0,
        totalDatasets: 0,
        reviewers: 0,
        annotators: 0,
        completedProjects: 0,
        activeProjects: 0
    });

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);

                const results = await Promise.allSettled([
                    api.get("/projects", { params: { PageSize: 1000, pageSize: 1000 } }),
                    api.get("/datasets", { params: { PageSize: 1000, pageSize: 1000, page: 1 } }),
                    api.get("/users", { params: { PageSize: 1000, pageSize: 1000 } }),
                    api.get("/roles", { params: { PageSize: 1000, pageSize: 1000 } }),
                    api.get("/tasks", { params: { PageSize: 1000, pageSize: 1000 } }).catch(() => ({ data: [] })),
                ]);

                const projRes = results[0];
                const dataRes = results[1];
                const usrRes = results[2];
                const roleRes = results[3];
                const taskRes = results[4];

                const apiProjects = projRes.status === "fulfilled" ? toArrayData(projRes.value?.data) : [];
                const apiDatasets = dataRes.status === "fulfilled" ? toArrayData(dataRes.value?.data) : [];
                const users = usrRes.status === "fulfilled" ? toArrayData(usrRes.value?.data) : [];
                const roles = roleRes.status === "fulfilled" ? toArrayData(roleRes.value?.data) : [];
                const apiTasks = taskRes.status === "fulfilled" ? toArrayData(taskRes.value?.data) : [];

                const projectsMeta = [...apiProjects];
                const seenPids = new Set(apiProjects.map(p => String(p.id || p.projectId)));

                const localTasksMap = getAssignedTasksByUserMap();
                const allLocalTasks = Object.values(localTasksMap).flat();

                allLocalTasks.forEach(t => {
                    const pid = String(t.projectId || t.project?.id || "");
                    if (pid && !seenPids.has(pid)) {
                        projectsMeta.push({
                            id: pid,
                            name: t.projectName || t.project?.name || `Dự án #${pid.slice(0, 5)}`,
                            status: t.project?.status || 'Active',
                            type: t.project?.type || 'Image',
                        });
                        seenPids.add(pid);
                    }
                });

                const datasetsMeta = [...apiDatasets];
                const seenDids = new Set(apiDatasets.map(d => String(d.id || d.datasetId)));
                allLocalTasks.forEach(t => {
                    const did = String(t.datasetId || t.dataset?.id || "");
                    if (did && !seenDids.has(did)) {
                        datasetsMeta.push({
                            id: did,
                            name: t.datasetName || t.dataset?.name || `Dataset #${did.slice(0, 5)}`,
                        });
                        seenDids.add(did);
                    }
                });

                setProjectList(projectsMeta);

                const roleMap = {};
                roles.forEach(r => {
                    const id = String(r.id || r.roleId || "");
                    const name = String(r.name || r.roleName || "").toLowerCase();
                    if (id && name) roleMap[id] = name;
                });

                const reviewersCount = users.filter(u => {
                    const rName = String(u.roleName || u.role?.name || "").toLowerCase();
                    const rId = String(u.roleId || u.role?.id || "");
                    return rName === "reviewer" || roleMap[rId] === "reviewer" || rName === "người kiểm duyệt";
                }).length;

                const annotatorsCount = users.filter(u => {
                    const rName = String(u.roleName || u.role?.name || "").toLowerCase();
                    const rId = String(u.roleId || u.role?.id || "");
                    return rName === "annotator" || roleMap[rId] === "annotator" || rName === "người gán nhãn";
                }).length;

                setStatsData({
                    totalProjects: projectsMeta.length,
                    totalDatasets: datasetsMeta.length,
                    reviewers: reviewersCount,
                    annotators: annotatorsCount,
                });

                const topProjects = sortProjectsByNewest(projects).slice(0, 3);
                setTaskStats(topProjects.map(proj => ({
                    name: proj.name || "Dự án không tên",
                    percent: 0, // Placeholder as system overview is complex
                    status: "Đang hoạt động"
                })));

            } catch (err) {
                console.error("Manager Dashboard dynamic load error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);


    const statsUI = [
        {
            label: "Dự án",
            value: statsData.totalProjects,
            icon: FolderOpen,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            label: "Datasets",
            value: statsData.totalDatasets,
            icon: Database,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
        {
            label: "Reviewers",
            value: statsData.reviewers,
            icon: ShieldCheck,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
        },
        {
            label: "Annotators",
            value: statsData.annotators,
            icon: Users,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
        },
    ];

    const fallbackProjects = [
        {
            name: "Phân loại chó mèo",
            type: "Phân loại",
            images: 5,
            status: "Đang hoạt động",
            statusType: "active",
            updated: "2 giờ trước"
        },
        {
            name: "Nhận dạng phương tiện",
            type: "Đánh dấu",
            images: 120,
            status: "Đang hoạt động",
            statusType: "active",
            updated: "5 giờ trước"
        },
        {
            name: "Cảm xúc khuôn mặt",
            type: "Phân loại",
            images: 450,
            status: "Hoàn thành",
            statusType: "completed",
            updated: "Hôm qua"
        },
    ];

    const projects = projectList.length > 0
        ? sortProjectsByNewest(projectList).slice(0, 3).map((project) => {
            const statusMeta = getProjectStatusMeta(project);
            return {
                id: project?.id || project?.projectId,
                name: project?.name || project?.projectName || `Dự án #${String(project?.id || project?.projectId).slice(0, 5)}`,
                type: getProjectTypeLabel(project),
                images: getProjectItemCount(project),
                status: statusMeta.label,
                statusType: statusMeta.statusType,
                updated: formatRelativeDateVi(getProjectUpdatedAt(project)),
            };
        })
        : [];

    const progress = taskStats.length > 0 ? taskStats : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-500 font-bold">Đang tải dữ liệu thực tế...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfdfe] p-4 md:p-10 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-display font-extrabold tracking-tight">
                            Quản lý Dự án
                        </h1>
                        <p className="text-slate-500 text-lg font-medium mt-2">
                            Thống kê dự án
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/manager/projects/create")}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white text-lg rounded-[20px] font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <Plus className="w-6 h-6" />
                        Tạo dự án mới
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {statsUI.map((s, i) => (
                        <div key={i} className="bg-white p-8 rounded-[28px] border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-5">
                                <div className={`p-4 rounded-2xl ${s.bgColor} ${s.color} group-hover:scale-110 transition-transform`}>
                                    <s.icon className="w-8 h-8" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-display font-extrabold mt-1">{s.value}</h3>
                                <p className="text-slate-600 text-base font-bold uppercase tracking-wide mt-1">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-10">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-premium p-10">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-2xl font-display font-extrabold">Dự án gần đây</h2>
                                <p className="text-base text-slate-500 font-medium mt-1">Danh sách các dự án</p>
                            </div>
                            <button className="p-3 text-slate-400 hover:text-slate-900 transition-colors">
                                <MoreVertical className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {projects.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                    <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold">Chưa có dự án nào</p>
                                </div>
                            ) : projects.map((p, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(`/manager/projects/${p.id}`)}
                                    className="group flex items-center justify-between p-6 border border-slate-50 rounded-[24px] hover:border-blue-100 hover:bg-blue-50/10 transition-all duration-300 cursor-pointer"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold group-hover:text-blue-700 transition-colors">{p.name}</h4>

                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">

                                        <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                            <ArrowRight className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => navigate("/manager/projects")}
                            className="w-full mt-10 py-4.5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-base hover:bg-blue-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-100"
                        >
                            Xem tất cả dự án
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
function TrendingUp({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
    );
}
