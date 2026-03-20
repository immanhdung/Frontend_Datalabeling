import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { taskAPI } from '../../config/api';
import {
  fetchAssignedTasksForUser,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getLocalAssignedTasksForUser,
  normalizeTasks,
} from '../../utils/annotatorTaskHelpers';
import {
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Folder,
  Image as ImageIcon,
  FileText,
  Volume2,
  Video,
  ThumbsUp,
  Play,
  FolderOpen
} from 'lucide-react';

// No mock projects needed

const getDaysUntilDue = (dueDate) =>
  Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export default function AnnotatorDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const loadTasks = async () => {
      const currentUserId = getCurrentUserId();
      const currentUserIdentifiers = getCurrentUserIdentifiers();

      try {
        setLoading(true);
        setError('');

        if (!currentUserId) {
          setError('Không tìm thấy thông tin người dùng hiện tại.');
          return;
        }

        let apiTasks = [];
        try {
          apiTasks = await fetchAssignedTasksForUser(taskAPI, currentUserIdentifiers);
        } catch (apiErr) {
          console.warn('API task fetch failed', apiErr);
        }

        const localAssignedTasks = getLocalAssignedTasksForUser(currentUserIdentifiers);
        const normalizedLocalTasks = normalizeTasks(localAssignedTasks, currentUserId);

        const mergedMap = new Map();

        // 1. Local tasks first
        normalizedLocalTasks.forEach((task) => {
          if (task.id) mergedMap.set(String(task.id), task);
        });

        // 2. API tasks overlay (API is source of truth, but don't overwrite advanced local status)
        apiTasks.forEach((task) => {
          if (task.id) {
            const ex = mergedMap.get(String(task.id));
            const localIsAdv = ex && ['completed', 'approved', 'rejected', 'expired'].includes(ex.status);
            mergedMap.set(String(task.id), {
              ...ex,
              ...task,
              ...(localIsAdv ? { status: ex.status, progress: ex.progress } : {}),
              items: task.items?.length > 0 ? task.items : (ex?.items || []),
            });
          }
        });

        const finalTasks = normalizeTasks(Array.from(mergedMap.values()), currentUserId);
        setTasks(finalTasks);
      } catch (loadError) {
        console.error('Failed to load tasks:', loadError);
        setError('Không thể tải danh sách nhiệm vụ.');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    approved: tasks.filter((task) => task.status === 'approved').length,
    rejected: tasks.filter((task) => task.status === 'rejected').length,
    expired: tasks.filter((task) => task.status === 'expired').length,
  }), [tasks]);

  const urgentTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => task.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesTab = activeTab === 'all' || task.status === activeTab;
        return matchesTab;
      })
      .sort((a, b) => {
        const dateA = new Date(a.assignedAt || a.updatedAt || a.createdAt);
        const dateB = new Date(b.assignedAt || b.updatedAt || b.createdAt);
        return dateB - dateA; // Mới nhất trên đầu
      });
  }, [tasks, activeTab]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleStartTask = (task) => {
    navigate(`/annotator/tasks/${task.id}`, { state: { task } });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Dashboard" userName="Annotator" userRole="annotator" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-10 p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-900 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl font-black mb-4 tracking-tight">Tổng quan hiệu suất</h1>
            <p className="text-indigo-100/90 text-lg leading-relaxed">
              Chào mừng bạn trở lại! Hệ thống đã ghi nhận các thống kê mới nhất về tiến độ gán nhãn của bạn. 
              Hãy kiểm tra các mục tiêu cần hoàn thành trong ngày hôm nay.
            </p>
          </div>
          
          {/* Decorative background circles */}
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[15%] w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Stats Grid - 6 Columns for 6 statuses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-12">
          {[
            { label: 'Tổng nhiệm vụ', count: stats.total, color: 'indigo', icon: Folder },
            { label: 'Chờ làm', count: stats.pending, color: 'amber', icon: Clock },
            { label: 'Đang làm', count: stats.inProgress, color: 'blue', icon: Zap },
            { label: 'Chờ duyệt', count: stats.completed, color: 'purple', icon: CheckCircle2 },
            { label: 'Hoàn thành', count: stats.approved || 0, color: 'emerald', icon: ThumbsUp },
            { label: 'Quá hạn', count: stats.expired, color: 'rose', icon: AlertCircle },
          ].map((item, idx) => {
            const Icon = item.icon;
            const colors = {
              indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
              amber: 'bg-amber-50 text-amber-600 border-amber-100',
              blue: 'bg-blue-50 text-blue-600 border-blue-100',
              purple: 'bg-purple-50 text-purple-600 border-purple-100',
              emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
              rose: 'bg-rose-50 text-rose-600 border-rose-100'
            };
            return (
              <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${colors[item.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                <p className={`text-4xl font-black mt-2 ${item.color === 'indigo' ? 'text-slate-900' : colors[item.color].split(' ')[1]}`}>
                  {item.count}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Urgent Tasks */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nhiệm vụ sắp đến hạn</h2>
                  <p className="text-slate-500 text-sm mt-1">Các task cần ưu tiên xử lý trước để tránh quá hạn</p>
                </div>
                <button
                  onClick={() => navigate('/annotator/tasks')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Tất cả nhiệm vụ
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="h-20 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
                  ))}
                </div>
              ) : urgentTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-lg font-bold text-slate-400">Bạn đã hoàn thành mọi task gấp!</p>
                  <p className="text-slate-400 text-sm mt-1">Danh sách đang trống.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {urgentTasks.map((task) => {
                    const days = getDaysUntilDue(task.dueDate);
                    const isUrgent = days <= 2;
                    const isOverdue = days < 0;

                    return (
                      <div 
                        key={task.id} 
                        onClick={() => navigate(`/annotator/tasks/${task.id}`, { state: { task } })}
                        className="flex flex-col justify-between group cursor-pointer bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 rounded-3xl p-5 transition-all duration-300 hover:shadow-lg"
                      >
                        <div className="mb-4">
                          <div className="flex items-start justify-between mb-2">
                             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isOverdue ? 'bg-rose-100 text-rose-600' : isUrgent ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                {isOverdue ? 'Quá hạn' : isUrgent ? 'Gấp' : 'Bình thường'}
                             </div>
                             <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{task.projectName || task.title}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate uppercase tracking-tight">
                            {task.title && !task.title.startsWith('Task #') ? task.title : `ID: #${task.id?.slice(0, 8)}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100/50 mt-auto">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold">{new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <span className={`text-[11px] font-black ${isOverdue ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-slate-400'}`}>
                            {isOverdue ? `${Math.abs(days)}d past` : `${days}d left`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Mini Status / Info Card */}
          <div className="lg:col-span-1 space-y-8">
             <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col h-full">
                <h3 className="text-xl font-black mb-2">Mẹo gán nhãn</h3>
                <p className="text-indigo-100/80 text-sm leading-relaxed mb-8 italic">
                  "Sự đồng thuận cao giữa các annotator giúp dữ liệu trở nên giá trị hơn. Hãy đảm bảo bạn đọc kỹ hướng dẫn trước khi bắt đầu."
                </p>
                
                <div className="mt-auto pt-8 border-t border-indigo-500/30">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                         <ThumbsUp className="w-7 h-7" />
                      </div>
                      <div>
                         <p className="text-xs font-black text-indigo-200 uppercase tracking-widest">Tỷ lệ đồng thuận</p>
                         <p className="text-3xl font-black">94.8%</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
