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

export default function AdminDashboard() {
  const stats = [
    {
      label: "Tổng người dùng",
      value: 6,
      icon: Users,
      trend: "+12%",
      color: "blue"
    },
    {
      label: "Tổng dự án",
      value: 4,
      icon: FolderKanban,
      trend: "+5%",
      color: "indigo"
    },
    {
      label: "Dự án hoàn thành",
      value: 1,
      icon: CheckCircle2,
      trend: "Ổn định",
      color: "emerald"
    },
    {
      label: "Tỷ lệ chính xác TB",
      value: "93.6%",
      icon: BarChart3,
      trend: "+2.4%",
      color: "amber"
    },
  ];

  const projects = [
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

  const userStats = [
    { role: "Admin", count: 1, color: "bg-indigo-500", icon: ShieldCheck },
    { role: "Manager", count: 1, color: "bg-blue-500", icon: Activity },
    { role: "Annotator", count: 3, color: "bg-green-500", icon: UserCheck },
    { role: "Reviewer", count: 1, color: "bg-emerald-500", icon: CheckCircle2 },
  ];

  const activities = [
    {
      title: "Tạo dự án mới",
      desc: "Đã tạo dự án 'Phân loại chó mèo'",
      time: "10:30",
      type: "create"
    },
    {
      title: "Phân công công việc",
      desc: "Đã giao 'Phân loại chó mèo' cho Trần Thị B",
      time: "11:00",
      type: "assign"
    },
    {
      title: "Cập nhật tiến độ",
      desc: "Đã hoàn thành 2/5 ảnh trong dự án",
      time: "14:00",
      type: "update"
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Quản trị Hệ thống
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Chào mừng trở lại! Dưới đây là tóm tắt hoạt động hôm nay.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm">
              <Clock className="w-4 h-4" />
              Lịch sử
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Plus className="w-4 h-4" />
              Thêm người dùng
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-[24px] shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-slate-100 group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                  {s.trend}
                </span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-semibold">{s.label}</p>
                <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-1">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recent Projects */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-premium border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-display font-extrabold text-slate-900">Tiến độ dự án</h2>
                  <p className="text-sm text-slate-500 font-medium">Theo dõi hoạt động gán nhãn thời gian thực</p>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {projects.map((p, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors`}>
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                          <p className="text-xs text-slate-500 font-medium">{p.desc}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${p.statusType === 'active' ? 'bg-emerald-50 text-emerald-600' :
                            p.statusType === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {p.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase leading-none">Cập nhật: {p.updated}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${p.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 min-w-[30px]">{p.progress}%</span>
                    </div>

                    {i !== projects.length - 1 && <div className="border-b border-slate-50 mt-6" />}
                  </div>
                ))}
              </div>

              <button className="w-full mt-8 py-3 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center gap-2">
                Xem tất cả dự án
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">

            {/* User Distribution */}
            <div className="bg-white rounded-[32px] p-8 shadow-premium border border-slate-100">
              <h2 className="text-xl font-display font-extrabold text-slate-900 mb-6 font-display">Phân bố nhân sự</h2>
              <div className="space-y-4">
                {userStats.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#fafbfc] border border-transparent hover:border-slate-100 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${u.color} text-white`}>
                        <u.icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{u.role}</span>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900">{u.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-[32px] p-8 shadow-premium border border-slate-100 overflow-hidden relative">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-display font-extrabold text-slate-900 font-display">Gần đây</h2>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="space-y-8 relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />

                {activities.map((a, i) => (
                  <div key={i} className="relative pl-10">
                    <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${a.type === 'create' ? 'bg-blue-500' : a.type === 'assign' ? 'bg-indigo-500' : 'bg-emerald-500'
                      }`}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
                        <span className="text-[10px] font-extrabold text-slate-400">{a.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50">
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 mx-auto">
                  Toàn bộ lịch sử
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
