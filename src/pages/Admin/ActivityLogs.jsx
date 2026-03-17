import React, { useState, useMemo, useEffect } from 'react';
import Header from '../../components/common/Header';
import api, { userAPI, taskAPI, reviewAPI } from '../../config/api';
import { toArrayData } from '../../utils/projectDashboardHelpers';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ShieldCheck, 
  Zap, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2,
  Clock,
  ChevronDown,
  Loader2
} from 'lucide-react';

const ROLE_COLORS = {
  Admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Reviewer: 'bg-purple-100 text-purple-700 border-purple-200',
  Annotator: 'bg-blue-100 text-blue-700 border-blue-200',
};

const TYPE_ICONS = {
  create: { icon: PlusCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  complete: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
  reject: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  approve: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  update: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  assign: { icon: User, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  start: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  delete: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRealActivities = async () => {
    try {
      setLoading(true);
      
      // Fetch all required entities to synthesize logs
      const [usersRes, projectsRes, tasksRes, reviewsRes] = await Promise.all([
        api.get("/users").catch(() => ({ data: [] })),
        api.get("/projects").catch(() => ({ data: [] })),
        api.get("/tasks").catch(() => ({ data: [] })),
        api.get("/reviews").catch(() => ({ data: [] })),
      ]);

      const users = toArrayData(usersRes?.data);
      const projects = toArrayData(projectsRes?.data);
      const tasks = toArrayData(tasksRes?.data);
      const reviews = toArrayData(reviewsRes?.data);

      const combinedLogs = [];

      // 1. User creation logs
      users.forEach(u => {
        if (u) {
          combinedLogs.push({
            id: `user-${u.id || u._id}`,
            user: "Hệ thống",
            role: "Admin",
            activity: `Đã tạo người dùng mới: ${u.displayName || u.username || u.email} (${u.role || 'N/A'})`,
            timestamp: u.createdAt || u.created_at || new Date().toISOString(),
            type: "create"
          });
        }
      });

      // 2. Project creation logs
      projects.forEach(p => {
        if (p) {
          combinedLogs.push({
            id: `project-${p.id || p._id}`,
            user: p.owner?.username || p.ownerDisplayName || "Manager",
            role: "Manager",
            activity: `Đã tạo dự án mới: ${p.name || p.title || 'N/A'}`,
            timestamp: p.createdAt || p.created_at || new Date().toISOString(),
            type: "create"
          });
        }
      });

      // 3. Task assignment logs
      tasks.forEach(t => {
        if (t) {
          combinedLogs.push({
            id: `task-${t.id || t._id}`,
            user: "Manager",
            role: "Manager",
            activity: `Đã giao nhiệm vụ "${t.title || 'Gán nhãn'}" cho ${t.assignedTo?.username || t.assignedToDisplayName || 'Annotator'}`,
            timestamp: t.createdAt || t.created_at || new Date().toISOString(),
            type: "assign"
          });
          
          if (t.status === 'Completed' || t.status === 'Submitted' || t.status === 'hoàn thành') {
            combinedLogs.push({
              id: `task-comp-${t.id || t._id}`,
              user: t.assignedTo?.username || t.assignedToDisplayName || "Annotator",
              role: "Annotator",
              activity: `Đã nộp bài gán nhãn cho nhiệm vụ: ${t.title || 'N/A'}`,
              timestamp: t.updatedAt || t.updated_at || new Date().toISOString(),
              type: "complete"
            });
          }
        }
      });

      // 4. Review logs
      reviews.forEach(r => {
        if (r) {
          combinedLogs.push({
            id: `review-${r.id || r._id}`,
            user: r.reviewedBy?.username || r.reviewerDisplayName || "Reviewer",
            role: "Reviewer",
            activity: `Đã ${String(r.status).toLowerCase().includes('approve') ? 'phê duyệt' : 'từ chối'} kết quả gán nhãn nhiệm vụ`,
            timestamp: r.updatedAt || r.updated_at || new Date().toISOString(),
            type: String(r.status).toLowerCase().includes('approve') ? "approve" : "reject"
          });
        }
      });

      // Sort by timestamp descending
      const sortedLogs = combinedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(sortedLogs);
    } catch (err) {
      console.error("Error fetching real activities:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealActivities();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.activity.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.user.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All' || log.role === roleFilter;
      const matchesType = typeFilter === 'All' || log.type === typeFilter;
      return matchesSearch && matchesRole && matchesType;
    });
  }, [logs, searchTerm, roleFilter, typeFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRealActivities();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} ${day}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Nhật ký hoạt động" userName="Admin" userRole="admin" />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Banner */}
        <div className="mb-10 relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white shadow-2xl shadow-slate-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-black tracking-widest uppercase">Admin Audit Logs</span>
              </div>
              <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight">Ghi nhận mọi hành động hệ thống</h1>
              <p className="text-slate-400 text-lg font-medium leading-relaxed">
                Theo dõi chi tiết các hoạt động của người dùng dựa trên dữ liệu thực tế từ hệ thống.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Hôm nay</p>
                <p className="text-4xl font-black">{logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Tổng số</p>
                <p className="text-4xl font-black">{logs.length}</p>
              </div>
            </div>
          </div>
          
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row gap-6 items-end lg:items-center justify-between">
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm kiếm người dùng hoặc nội dung hoạt động..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all text-slate-700 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            <div className="relative shrink-0">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-4 h-4" />
               </div>
               <select 
                 value={roleFilter}
                 onChange={(e) => setRoleFilter(e.target.value)}
                 className="pl-10 pr-10 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-600 cursor-pointer appearance-none"
               >
                 <option value="All">Tất cả vai trò</option>
                 <option value="Admin">Admin</option>
                 <option value="Manager">Manager</option>
                 <option value="Reviewer">Reviewer</option>
                 <option value="Annotator">Annotator</option>
               </select>
               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Zap className={`w-5 h-5 fill-current ${isRefreshing ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logs Table/List */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Chi tiết hoạt động</h3>
            <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
              {filteredLogs.length} Kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Hành động</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Người thực hiện</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Vai trò</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ngày giờ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="text-slate-500 font-bold">Đang tải dữ liệu thực tế...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      <div className="max-w-xs mx-auto">
                         <ClipboardList className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                         <p className="text-slate-400 font-bold italic">Không tìm thấy hoạt động thực tế nào.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const TypeInfo = TYPE_ICONS[log.type] || TYPE_ICONS.update;
                    const Icon = TypeInfo.icon;
                    return (
                      <tr key={log.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${TypeInfo.bg} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`w-6 h-6 ${TypeInfo.color}`} />
                            </div>
                            <p className="text-sm font-bold text-slate-800 tracking-tight leading-snug">{log.activity}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                 <User className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="text-sm font-semibold text-slate-600">{log.user}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex justify-center">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${ROLE_COLORS[log.role] || 'bg-slate-100 text-slate-600'}`}>
                                {log.role}
                              </span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="inline-flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2 text-indigo-600 font-black text-sm">
                                 <Clock className="w-3.5 h-3.5" />
                                 {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                 <Calendar className="w-3 h-3" />
                                 {new Date(log.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </div>
                           </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Dữ liệu được tổng hợp từ Projects, Tasks và Users của hệ thống</p>
             <div className="flex gap-2">
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all">Xuất Excel</button>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all">Xuất PDF</button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}