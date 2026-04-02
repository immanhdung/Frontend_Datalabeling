
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FolderKanban,
  CheckCircle2,
  BarChart3,
  Plus,
  Clock,
  TrendingUp,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Activity
} from "lucide-react";
import api from "../../config/api";
import {
  toArrayData,
  isCompletedProject,
  getProjectStatusMeta,
  getProjectItemCount,
  getProjectTypeLabel,
  sortProjectsByNewest,
  getProjectUpdatedAt,
  formatRelativeDateVi,
} from "../../utils/projectDashboardHelpers";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalManagers: 0,
    totalAnnotators: 0,
    totalReviewers: 0,
    totalProjects: 0,
    recentProjects: [],
    activities: [],
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [projectsRes, usersRes, rolesRes] = await Promise.all([
          api.get("/projects", { params: { PageSize: 1000 } }).catch(() => ({ data: [] })),
          api.get("/users", { params: { PageSize: 1000 } }).catch(() => ({ data: [] })),
          api.get("/roles").catch(() => ({ data: [] })),
        ]);

        const projects = toArrayData(projectsRes?.data || projectsRes);
        const users = toArrayData(usersRes?.data || usersRes);
        const roles = toArrayData(rolesRes?.data || rolesRes);

        const projectCount = projects.length;
        const userCount = users.length;

        const roleMap = {};
        roles.forEach(r => {
          const id = String(r.id || r.roleId || "");
          const name = String(r.name || r.roleName || "").toLowerCase();
          if (id && name) roleMap[id] = name;
        });

        const managers = users.filter(u => {
          const rName = String(u.roleName || u.role?.name || "").toLowerCase();
          const rId = String(u.roleId || u.role?.id || "");
          return rName === "manager" || roleMap[rId] === "manager" || rName === "quản lý";
        }).length;

        const annotators = users.filter(u => {
          const rName = String(u.roleName || u.role?.name || "").toLowerCase();
          const rId = String(u.roleId || u.role?.id || "");
          return rName === "annotator" || roleMap[rId] === "annotator" || rName === "người gán nhãn";
        }).length;

        const reviewers = users.filter(u => {
          const rName = String(u.roleName || u.role?.name || "").toLowerCase();
          const rId = String(u.roleId || u.role?.id || "");
          return rName === "reviewer" || roleMap[rId] === "reviewer" || rName === "người kiểm duyệt";
        }).length;

        // Recent Projects logic
        const recentProjects = sortProjectsByNewest(projects).slice(0, 4).map((project) => {
          const statusMeta = getProjectStatusMeta(project);
          const itemCount = getProjectItemCount(project);
          return {
            name: project?.name || "Dự án không tên",
            status: statusMeta.label,
            statusType: statusMeta.statusType,
            desc: `${getProjectTypeLabel(project)} · ${itemCount} ảnh`,
            progress: statusMeta.statusType === "completed" ? 100 : statusMeta.statusType === "active" ? 50 : 0,
            updated: formatRelativeDateVi(getProjectUpdatedAt(project)),
          };
        });

        // Activities synthesis
        const combinedActivities = [];
        projects.slice(0, 5).forEach(p => {
          combinedActivities.push({
            title: "Dự án mới",
            desc: `Dự án "${p.name || 'N/A'}" đã được tạo`,
            time: new Date(p.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(p.createdAt || Date.now()).getTime(),
            type: "create"
          });
        });

        setDashboardStats({
          totalUsers: userCount,
          totalProjects: projectCount,
          totalManagers: managers,
          totalAnnotators: annotators,
          totalReviewers: reviewers,
          recentProjects,
          activities: combinedActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3)
        });
      } catch (err) {
        console.error("Admin Dashboard load error:", err);
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
      label: "Tổng Manager",
      value: dashboardStats.totalManagers,
      icon: ShieldCheck,
      color: "indigo"
    },
    {
      label: "Tổng Annotator",
      value: dashboardStats.totalAnnotators,
      icon: UserCheck,
      color: "emerald"
    },
    {
      label: "Tổng Reviewer",
      value: dashboardStats.totalReviewers,
      icon: Activity,
      color: "amber"
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
    { role: "Manager", count: dashboardStats.totalManagers, color: "bg-blue-500", icon: ShieldCheck },
    { role: "Annotator", count: dashboardStats.totalAnnotators, color: "bg-green-500", icon: UserCheck },
    { role: "Reviewer", count: dashboardStats.totalReviewers, color: "bg-emerald-500", icon: Activity },
  ];

  const activities = dashboardStats.activities;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              Quản trị hệ thống
            </h1>
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
                  <h2 className="text-2xl font-display font-extrabold text-slate-900"> Dự án gần đây</h2>
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
                        </div>
                      </div>
                      <div className="text-right">
                      </div>
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
              <h2 className="text-2xl font-display font-extrabold text-slate-900 mb-8 font-display">Phân bố nhân sự</h2>
              <div className="space-y-5">
                {userStats.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-[#fafbfc] border border-transparent hover:border-slate-100 transition-all group">
                    <div className="flex items-center gap-4">
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
                <h2 className="text-2xl font-display font-extrabold text-slate-900 font-display">Gần đây</h2>
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
