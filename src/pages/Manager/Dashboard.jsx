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
    Image as ImageIcon,
    FolderKanban
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";
import api, { statisticsAPI } from "../../config/api";
import {
    toArrayData,
    getProjectStatusMeta,
    sortProjectsByNewest,
    getProjectUpdatedAt,
    formatRelativeDateVi,
} from "../../utils/projectDashboardHelpers";
import { resolveApiData as resolveHelperData } from "../../utils/annotatorTaskHelpers";

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [recentProjects, setRecentProjects] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [statsData, setStatsData] = useState({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        incompletedProjects: 0,
        weeklyAnnotations: 0,
        weeklyReviews: 0,
        todayAnnotations: 0,
        todayReviews: 0,
    });

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);

                const [managerRes, projRes] = await Promise.all([
                    statisticsAPI.getManagerStats(),
                    api.get("/projects", { params: { PageSize: 1000, pageSize: 1000 } })
                ]);

                const managerStats = managerRes?.data;
                const projects = toArrayData(projRes?.data);
                const topProjects = sortProjectsByNewest(projects).slice(0, 3);
                const recentProjects = topProjects.length > 0
                    ? await Promise.all(
                        topProjects.map(async (p) => {
                            try {
                                const statusMeta = getProjectStatusMeta(p);
                                const pid = String(p.id || p.projectId);
                                const res = await statisticsAPI.getProjectOverview(pid);
                                const stats = resolveHelperData(res) || {};
                                const percent = Math.round(stats.progress || 0);
    
                                return {
                                    id: pid,
                                    name: p?.name || p?.projectName || `Dự án #${pid.slice(0, 5)}`,
                                    images: stats.totalDatasetItems || 0,
                                    datasets: stats.totalDatasets || 0,
                                    done: stats.completedTaskItems || 0,
                                    total: stats.totalTaskItems || 0,
                                    status: statusMeta.label,
                                    statusType: statusMeta.statusType,
                                    percent,
                                    color: percent === 100
                                        ? "bg-emerald-500"
                                        : "bg-blue-500",
                                    updated: formatRelativeDateVi(getProjectUpdatedAt(p)),
                                };
                            } catch (e) {
                                console.error("Project overview error:", e);
                            }
                        })
                    )
                    : [];

                setRecentProjects(recentProjects);
                
                setStatsData({
                    totalProjects: managerStats?.totalProjects ?? 0,
                    activeProjects: managerStats?.activeProjects ?? 0,
                    completedProjects: managerStats?.completedProjects ?? 0,
                    incompletedProjects: managerStats?.incompletedProjects ?? 0,
                    
                    weeklyAnnotations: managerStats?.weeklyAnnotations ?? 0,
                    weeklyReviews: managerStats?.weeklyReviews ?? 0,
                    todayAnnotations: managerStats?.todayAnnotations ?? 0,
                    todayReviews: managerStats?.todayReviews ?? 0,
                });
                
                const weekly = managerStats?.weeklyPerformance || [];

                setWeeklyData(weekly.map(w => ({
                    day: new Date(w.date || w.Date).toLocaleDateString('vi-VN', { weekday: 'short' }),
                    annotations: w.annotations ?? w.Annotations ?? 0,
                    reviews: w.reviews ?? w.Reviews ?? 0,
                    annotationRate: w.annotationRate ?? w.AnnotationRate ?? 0,
                    reviewRate: w.reviewRate ?? w.ReviewRate ?? 0,
                })));

            } catch (err) {
                console.error("Manager Dashboard load error:", err);
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
        },
        {
            label: "Đang hoạt động",
            value: statsData.activeProjects,
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
        {
            label: "Chưa hoàn thành",
            value: statsData.incompletedProjects,
            icon: BarChart3,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
        },
        {
            label: "Hoàn thành",
            value: statsData.completedProjects,
            icon: CheckCircle2,
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

                <div className="bg-white rounded-[32px] p-8 shadow-premium border border-slate-100">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                        <h3 className="text-2xl font-extrabold">Hiệu suất tuần</h3>
                        <p className="text-slate-500 text-sm font-medium">
                            Annotation & Review trong 7 ngày gần đây
                        </p>
                        </div>
                    </div>

                    {/* KPI */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-blue-50 rounded-2xl p-4">
                        <p className="text-sm text-blue-600 font-bold uppercase">Annotations</p>
                        <p className="text-2xl font-black text-blue-700">
                            {statsData?.weeklyAnnotations || 0}
                        </p>
                        </div>

                        <div className="bg-emerald-50 rounded-2xl p-4">
                        <p className="text-sm text-emerald-600 font-bold uppercase">Reviews</p>
                        <p className="text-2xl font-black text-emerald-700">
                            {statsData?.weeklyReviews || 0}
                        </p>
                        </div>
                    </div>

                    {/* COLUMN CHART */}
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} barGap={6}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />

                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const row = payload[0].payload;

                                        return (
                                            <div className="bg-white p-3 rounded-xl shadow border text-sm">
                                            <p className="font-bold mb-1">{label}</p>

                                            <p className="text-blue-600">
                                                Annotations: {row.annotations} ({row.annotationRate}%)
                                            </p>

                                            <p className="text-emerald-600">
                                                Reviews: {row.reviews} ({row.reviewRate}%)
                                            </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Bar dataKey="annotations" name="Annotations" fill="#2563eb" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="reviews" name="Reviews" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-2">
                        <div className="flex justify-center items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-600" />
                            <span className="text-sm">Annotations</span>
                        </div>

                        <div className="flex justify-center items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span className="text-sm">Reviews</span>
                        </div>
                    </div>

                    {/* Today stats */}
                    <div className="grid grid-cols-2 gap-6 mt-6">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase">Hôm nay</p>
                            <p className="text-lg font-black text-blue-600">
                            +{statsData?.todayAnnotations || 0} nhãn
                            </p>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase">Hôm nay</p>
                            <p className="text-lg font-black text-emerald-600">
                            +{statsData?.todayReviews || 0} review
                            </p>
                        </div>
                    </div>
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
                                {recentProjects.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">Chưa có dự án nào</p>
                                    </div>
                                ) : recentProjects.map((p, i) => (
                                    <div
                                        key={i}
                                        onClick={() => navigate(`/manager/projects/${p.id}`)}
                                        className="group flex items-center justify-between p-6 border border-slate-50 rounded-[24px] hover:border-blue-100 hover:bg-blue-50/10 transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                <FolderKanban className="w-7 h-7 text-slate-400 group-hover:text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold group-hover:text-blue-700 transition-colors">{p.name}</h4>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mt-1.5">
                                                    <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" />{p.datasets} bộ dữ liệu</span>
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

                            <button
                                onClick={() => navigate("/manager/projects")}
                                className="w-full mt-10 py-4.5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-base hover:bg-blue-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-100"
                            >
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
                                {recentProjects.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50/50 rounded-[24px] border border-dashed border-slate-100">
                                        <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Chưa có tiến độ thực tế</p>
                                    </div>
                                ) : recentProjects.map((p, i) => (
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
                                        </div>
                                    </div>
                                ))}
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
