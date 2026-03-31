
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FolderKanban,
  CheckCircle2,
  TrendingUp,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Activity,
  Database,
  ImageIcon
} from "lucide-react";
import api, {reviewAPI, statisticsAPI} from "../../config/api";
import {
  getProjectStatusMeta,
  sortProjectsByNewest,
  getProjectUpdatedAt,
  formatRelativeDateVi,
} from "../../utils/projectDashboardHelpers";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalDatasets: 0,
    totalImages: 0,
    recentProjects: [],
    userRoleCounts: {
      Admin: 0,
      Manager: 0,
      Annotator: 0,
      Reviewer: 0,
    },
    activities: [],
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const [
          statsRes,
          projectsRes,
          adminRes,
          managerRes,
          annotatorRes,
          reviewerRes,
        ] = await Promise.all([
          statisticsAPI.getProjectOverview().catch(() => ({ data: {} })),

          api.get("/projects").catch(() => ({ data: {} })),
          api.get("/users?role=admin").catch(() => ({ data: {} })),
          api.get("/users?role=manager").catch(() => ({ data: {} })),
          api.get("/users?role=annotator").catch(() => ({ data: {} })),
          api.get("/users?role=reviewer").catch(() => ({ data: {} })),
        ]);

        const projects = projectsRes?.data?.items || [];
        const stats = statsRes?.data || {};

        const totalUsers = stats.users || 0;
        const totalProjects = stats.projects || 0;
        const totalDatasets = stats.datasets || 0;
        const totalImages = stats.datasetItems || 0;

        const roleCounts = {
          Admin: adminRes?.data?.totalItems || 0,
          Manager: managerRes?.data?.totalItems || 0,
          Annotator: annotatorRes?.data?.totalItems || 0,
          Reviewer: reviewerRes?.data?.totalItems || 0,
        };

        const topProjects = sortProjectsByNewest(projects).slice(0, 4);
        const recentProjects = topProjects.length > 0
          ? await Promise.all(
              topProjects.map(async (p) => {
                  try {
                      const statusMeta = getProjectStatusMeta(p);
                      const pid = String(p.id || p.projectId);
                      const res = await statisticsAPI.getProjectOverview(pid);
                      console.log(res);
                      const stats = res?.data || {};
                      const progress = Math.round(stats.progress || 0);

                      return {
                          id: pid,
                          name: p?.name || p?.projectName || `Dự án #${pid.slice(0, 5)}`,
                          images: stats.totalDatasetItems || 0,
                          datasets: stats.totalDatasets || 0,
                          status: statusMeta.label,
                          statusType: statusMeta.statusType,
                          progress,
                          color: progress === 100
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

        // const combinedActivities = [];
        // projects.slice(0, 5).forEach(p => {
        //     combinedActivities.push({
        //         title: "Dự án mới",
        //         desc: `Dự án "${p.name || 'N/A'}" đã được tạo`,
        //         time: new Date(p.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        //         timestamp: new Date(p.createdAt || Date.now()).getTime(),
        //         type: "create"
        //     });
        // });

        // tasks.slice(0, 5).forEach(t => {
        //     if (t.status?.toLowerCase().includes('complete') || t.status?.toLowerCase().includes('submit')) {
        //         combinedActivities.push({
        //             title: "Hoàn thành task",
        //             desc: `Task "${t.title || 'gán nhãn'}" đã được nộp`,
        //             time: new Date(t.updatedAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        //             timestamp: new Date(t.updatedAt || Date.now()).getTime(),
        //             type: "update"
        //         });
        //     }
        // });

        // const sortedActivities = combinedActivities
        //     .sort((a, b) => b.timestamp - a.timestamp)
        //     .slice(0, 3);

        setDashboardStats({
          totalUsers,
          totalProjects,
          totalDatasets,
          totalImages,
          recentProjects,
          userRoleCounts: roleCounts,
          activities: []
          // activities: sortedActivities.length > 0 ? sortedActivities : [
          //   { title: "Hệ thống", desc: "Đang theo dõi hoạt động...", time: "--:--", type: "create" }
          // ],
        });
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const statsUI = [
    {
      label: "Tổng người dùng",
      value: dashboardStats.totalUsers,
      icon: Users,
      color: "blue"
    },
    {
      label: "Tổng dự án",
      value: dashboardStats.totalProjects,
      icon: FolderKanban,
      color: "indigo"
    },
    {
      label: "Tổng bộ dữ liệu",
      value: dashboardStats.totalDatasets,
      icon: Database,
      color: "indigo"
    },
    {
      label: "Tổng mẫu ảnh",
      value: dashboardStats.totalImages,
      icon: ImageIcon,
      color: "indigo"
    },
  ];

  const fallbackProjects = [
    {
      name: "Phân loại chó mèo",
      status: "Đang hoạt động",
      statusType: "active",
      desc: "Phân loại · 5 ảnh · 1 annotator",
      progress: 40,
      accuracy: "94.5%",
      updated: "2 giờ trước"
    },
    {
      name: "Nhận dạng phương tiện",
      status: "Đang hoạt động",
      statusType: "active",
      desc: "Đánh dấu · 3 ảnh · 2 annotator",
      progress: 50,
      accuracy: "95.8%",
      updated: "5 giờ trước"
    },
    {
      name: "Cảm xúc khuôn mặt",
      status: "Hoàn thành",
      statusType: "completed",
      desc: "Phân loại · 120 ảnh · 5 annotator",
      progress: 100,
      accuracy: "91.2%",
      updated: "Hôm qua"
    },
    {
      name: "Nhận dạng khối u",
      status: "Chờ xử lý",
      statusType: "pending",
      desc: "Đánh dấu · 2 ảnh · 0 annotator",
      progress: 0,
      accuracy: "N/A",
      updated: "3 ngày trước"
    },
  ];

  const projects = dashboardStats.recentProjects.length > 0 ? dashboardStats.recentProjects : fallbackProjects;

  const userStats = [
    { role: "Admin", count: dashboardStats.userRoleCounts.Admin, color: "bg-indigo-500", icon: ShieldCheck },
    { role: "Manager", count: dashboardStats.userRoleCounts.Manager, color: "bg-blue-500", icon: Activity },
    { role: "Annotator", count: dashboardStats.userRoleCounts.Annotator, color: "bg-green-500", icon: UserCheck },
    { role: "Reviewer", count: dashboardStats.userRoleCounts.Reviewer, color: "bg-emerald-500", icon: CheckCircle2 },
  ];

  const activities = dashboardStats.activities;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              Quản trị Hệ thống
            </h1>
            <p className="text-slate-500 text-lg font-medium mt-2">
              Chào mừng trở lại! Dưới đây là tóm tắt hoạt động hôm nay.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {statsUI.map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[28px] shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-slate-100 group">
              <div className="flex justify-between items-start mb-5">
                <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-8 h-8" />
                </div>

              </div>
              <div>
                <p className="text-slate-600 text-base font-bold uppercase tracking-wide">{s.label}</p>
                <h3 className="text-3xl font-display font-extrabold mt-1">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[32px] p-10 shadow-premium border border-slate-100">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-display font-extrabold text-slate-900">Tiến độ dự án</h2>
                  <p className="text-base text-slate-500 font-medium mt-1">Theo dõi hoạt động gán nhãn thời gian thực</p>
                </div>
                <button className="p-3 text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                {projects.map((p, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-6">
                        <div className={`p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors`}>
                          <FolderKanban className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold group-hover:text-blue-600 transition-colors">{p.name}</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">{p.datasets} bộ dữ liệu · {p.images} ảnh</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs uppercase tracking-wider font-extrabold px-4 py-1.5 rounded-full ${p.statusType === 'active' ? 'bg-emerald-50 text-emerald-600' :
                          p.statusType === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {p.status}
                        </span>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase">Cập nhật: {p.updated}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${p.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-700 min-w-[40px]">{p.progress}%</span>
                    </div>

                    {i !== projects.length - 1 && <div className="border-b border-slate-50 mt-8" />}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate("/admin/projects")}
                className="w-full mt-10 py-4.5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-base hover:bg-blue-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-100 flex items-center justify-center gap-2"
              >
                Xem tất cả dự án
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="space-y-10">
            <div className="bg-white rounded-[32px] p-10 shadow-premium border border-slate-100">
              <h2 className="text-2xl font-display font-extrabold text-slate-900 mb-8 font-display">Nhân sự</h2>
              <div className="space-y-5">
                {userStats.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#fafbfc] border border-transparent hover:border-slate-100 transition-all group">
                    <div className="flex items-center gap-2">
                      <div className={`p-3 rounded-xl ${u.color} text-white`}>
                        <u.icon className="w-5 h-5" />
                      </div>
                      <span className="text-lg font-bold text-slate-700 group-hover:text-slate-900 transition-colors uppercase tracking-wide">{u.role}</span>
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900">{u.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-[32px] p-10 shadow-premium border border-slate-100 overflow-hidden relative">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-display font-extrabold text-slate-900 font-display">Hoạt động gần đây</h2>
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>

              <div className="space-y-10 relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100" />

                {activities.map((a, i) => (
                  <div key={i} className="relative pl-12">
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${a.type === 'create' ? 'bg-blue-500' : a.type === 'assign' ? 'bg-indigo-500' : 'bg-emerald-500'
                      }`}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <h4 className="text-base font-bold text-slate-900">{a.title}</h4>
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{a.time}</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-slate-50">
                <button 
                  onClick={() => navigate("/admin/activity")}
                  className="text-base font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 mx-auto"
                >
                  Toàn bộ lịch sử
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
