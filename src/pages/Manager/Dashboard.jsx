import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Plus,
    FolderOpen,
    Clock,
    CheckCircle2,
    Users,
    BarChart3,
    ArrowRight,
    MoreVertical,
    Calendar,
    Image as ImageIcon
} from "lucide-react";
import api from "../../config/api";
import {
    toArrayData,
    isActiveProject,
    isCompletedProject,
    getProjectStatusMeta,
    getProjectItemCount,
    getProjectTypeLabel,
    sortProjectsByNewest,
    getProjectUpdatedAt,
    formatRelativeDateVi,
} from "../../utils/projectDashboardHelpers";

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [projectList, setProjectList] = useState([]);
    const [taskStats, setTaskStats] = useState([]);
    const [statsData, setStatsData] = useState({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        annotators: 0,
    });

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);
                const [projectsRes, usersRes, rolesRes, tasksRes] = await Promise.allSettled([
                    api.get("/projects"),
                    api.get("/users"),
                    api.get("/roles"),
                    api.get("/tasks"),
                ]);

                const projects = projectsRes.status === "fulfilled" ? toArrayData(projectsRes.value?.data) : [];
                const users = usersRes.status === "fulfilled" ? toArrayData(usersRes.value?.data) : [];
                const roles = rolesRes.status === "fulfilled" ? toArrayData(rolesRes.value?.data) : [];
                const tasks = tasksRes.status === "fulfilled" ? toArrayData(tasksRes.value?.data) : [];

                setProjectList(projects);

                // 1. Role mapping for annotator count
                const roleMap = {};
                roles.forEach((role) => {
                    const id = role?.id ?? role?.roleId;
                    const name = role?.roleName ?? role?.name;
                    if (id && name) roleMap[String(id)] = String(name).toLowerCase();
                });

                const annotatorCount = users.filter((u) => {
                    const rId = String(u?.roleId ?? u?.role?.id ?? "");
                    const rName = String(u?.roleName ?? u?.role?.name ?? u?.role ?? "").toLowerCase();
                    return rName === "annotator" || roleMap[rId] === "annotator";
                }).length;

                // 2. Project stats
                const activeCount = projects.filter(isActiveProject).length;
                const completedCount = projects.filter(isCompletedProject).length;

                setStatsData({
                    totalProjects: projects.length,
                    activeProjects: activeCount,
                    completedProjects: completedCount,
                    annotators: annotatorCount,
                });

                // 3. Project Progress calculation
                const projectProgressMap = projects.slice(0, 3).map(proj => {
                    const pid = String(proj.id || proj.projectId);
                    const projTasks = tasks.filter(t => String(t.projectId || t.project?.id || "") === pid);
                    
                    const total = projTasks.length;
                    const done = projTasks.filter(t => 
                        ['completed', 'submitted', 'done', 'hoàn thành'].includes(String(t.status || "").toLowerCase())
                    ).length;
                    
                    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                    
                    return {
                        name: proj.name || "Dự án không tên",
                        done,
                        total,
                        percent,
                        status: percent === 100 ? "Đã xong" : percent > 0 ? "Đang thực hiện" : "Chờ xử lý",
                        color: percent === 100 ? "bg-emerald-500" : percent > 0 ? "bg-blue-500" : "bg-slate-300"
                    };
                });
                
                setTaskStats(projectProgressMap);

            } catch (err) {
                console.error("Manager Dashboard data load error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const statsUI = [
        {
            label: "Tổng dự án",
            value: statsData.totalProjects,
            icon: FolderOpen,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            trend: "Dữ liệu thực tế"
        },
        {
            label: "Đang hoạt động",
            value: statsData.activeProjects,
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            trend: "Dữ liệu thực tế"
        },
        {
            label: "Hoàn thành",
            value: statsData.completedProjects,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            trend: "Dữ liệu thực tế"
        },
        {
            label: "Annotators",
            value: statsData.annotators,
            icon: Users,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
            trend: "Dữ liệu thực tế"
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
                name: project?.name || "Dự án không tên",
                type: getProjectTypeLabel(project),
                images: getProjectItemCount(project),
                status: statusMeta.label,
                statusType: statusMeta.statusType,
                updated: formatRelativeDateVi(getProjectUpdatedAt(project)),
            };
        })
        : fallbackProjects;

    const fallbackProgress = [
        { name: "Phân loại chó mèo", done: 2, total: 5, percent: 40, status: "Đang thực hiện", color: "bg-blue-500" },
        { name: "Nhận dạng phương tiện", done: 0, total: 3, percent: 0, status: "Chờ xử lý", color: "bg-slate-300" },
    ];
    const progress = taskStats.length > 0 ? taskStats : fallbackProgress;

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
                            Giám sát tiến độ và điều phối annotators hiệu quả.
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                                <p className="text-sm text-slate-400 font-medium mt-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    {s.trend}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[32px] border border-slate-100 shadow-premium p-10">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-2xl font-display font-extrabold">Dự án gần đây</h2>
                                    <p className="text-base text-slate-500 font-medium mt-1">Danh sách các dự án đang quản lý</p>
                                </div>
                                <button className="p-3 text-slate-400 hover:text-slate-900 transition-colors">
                                    <MoreVertical className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {projects.map((p, i) => (
                                    <div key={i} className="group flex items-center justify-between p-6 border border-slate-50 rounded-[24px] hover:border-blue-100 hover:bg-blue-50/10 transition-all duration-300 cursor-pointer">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold group-hover:text-blue-700 transition-colors">{p.name}</h4>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mt-1.5">
                                                    <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" />{p.type}</span>
                                                    <span>•</span>
                                                    <span>{p.images} ảnh</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="hidden md:block text-right">
                                                <span className={`text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider ${p.statusType === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                                <p className="text-xs text-slate-400 font-bold mt-2 uppercase flex items-center justify-end gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    {p.updated}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                <ArrowRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-10 py-4.5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-base hover:bg-blue-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-100">
                                Xem tất cả dự án
                            </button>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="bg-white rounded-[32px] border border-slate-100 shadow-premium p-10">
                            <div className="flex items-center justify-between mb-10">
                                <h2 className="text-2xl font-display font-extrabold">Tiến độ gán nhãn</h2>
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                            </div>

                            <div className="space-y-10">
                                {progress.map((p, i) => (
                                    <div key={i} className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="max-w-[180px]">
                                                <p className="text-lg font-bold text-slate-800 leading-tight truncate">{p.name}</p>
                                                <p className="text-sm text-slate-500 font-medium mt-1.5">{p.done}/{p.total} hoàn thành</p>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.status}</span>
                                        </div>
                                        <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out rounded-full ${p.color}`}
                                                style={{ width: `${p.percent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-500 uppercase tracking-wider">{p.percent}% HOÀN TẤT</span>
                                            {p.percent < 100 && <span className="text-blue-600 font-extrabold text-sm cursor-pointer hover:underline uppercase">Hối thúc →</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-10 text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
                            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative border-b border-white/20 pb-6 mb-6">
                                <Calendar className="w-8 h-8 mb-4" />
                                <h3 className="text-2xl font-display font-extrabold">Báo cáo hàng tuần</h3>
                                <p className="text-blue-100 text-base font-medium mt-2 underline decoration-blue-300 underline-offset-4 cursor-pointer">Sẵn sàng để xem</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">Hôm nay</p>
                                    <p className="text-3xl font-display font-bold">+24 nhãn</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-blue-100 font-bold uppercase tracking-wider">Hiệu suất</p>
                                    <p className="text-3xl font-display font-bold">96.4%</p>
                                </div>
                            </div>
                        </div>
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
