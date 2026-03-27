import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { reviewAPI } from '../../config/api';
import { mockReviewerInboxAnnotations } from '../../mock/taskInbox';
import {
  Search,
  Clock,
  AlertCircle,
  Eye,
  Image,
  FileText,
  Volume2,
  Video,
  Filter,
} from 'lucide-react';

const getTypeIcon = (type) => {
  switch (type) {
    case 'image':
      return <Image className="w-5 h-5" />;
    case 'text':
      return <FileText className="w-5 h-5" />;
    case 'audio':
      return <Volume2 className="w-5 h-5" />;
    case 'video':
      return <Video className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

export default function ReviewInbox() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadPendingReviews = async () => {
      try {
        setLoading(true);
        setError('');

        let allFound = [];

        try {
          const response = await reviewAPI.getPendingReviews();
          const data = response?.data?.data || response?.data || [];
          if (Array.isArray(data)) allFound = [...data];
        } catch (err) {
          console.warn('[ReviewInbox] API failed');
        }
        try {
          const rawMap = localStorage.getItem('assignedTasksByUser');
          if (rawMap) {
            const map = JSON.parse(rawMap);
            Object.values(map).forEach(userTasks => {
              if (Array.isArray(userTasks)) {
                userTasks.forEach(t => {
                  if (t.status === 'completed' || t.status === 'pending_review') {
                    if (!allFound.some(ex => String(ex.id) === String(t.id))) {
                      allFound.push({
                        ...t,
                        taskTitle: t.title || t.projectName || 'Task Review',
                        annotatorName: t.assignedTo || 'Annotator',
                        status: 'pending_review'
                      });
                    }
                  }
                });
              }
            });
          }
        } catch (e) { }

        setItems(allFound);
      } catch (err) {
        setItems([]);
        setError(err?.response?.data?.message || 'Không thể tải task review từ API.');
      } finally {
        setLoading(false);
      }
    };

    loadPendingReviews();
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          String(item.taskTitle || '').toLowerCase().includes(keyword) ||
          String(item.annotatorName || '').toLowerCase().includes(keyword) ||
          String(item.projectName || '').toLowerCase().includes(keyword) ||
          String(item.taskId || '').toLowerCase().includes(keyword);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const statusWeight = (x) => {
          if (x.status === 'expired') return 0;
          if (x.status === 'pending_review') return 1;
          return 2;
        };

        const diff = statusWeight(a) - statusWeight(b);
        if (diff !== 0) return diff;

        return new Date(a.dueDate || a.createdAt).getTime() - new Date(b.dueDate || b.createdAt).getTime();
      });
  }, [items, searchTerm, statusFilter]);

  const stats = {
    total: items.length,
    pending: items.filter((x) => x.status === 'pending_review').length,
    expired: items.filter((x) => x.status === 'expired').length,
    done: items.filter((x) => x.status === 'approved' || x.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Nhận task review" userName="Reviewer" userRole="reviewer" />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-12 relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 text-white shadow-2xl shadow-blue-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2">Hộp thư Review</h1>
              <p className="text-white/80 font-medium max-w-lg">
                Các nhiệm vụ gán nhãn đã hoàn thành và đang chờ bạn phê duyệt. Hãy kiểm tra kỹ lưỡng để đảm bảo chất lượng dữ liệu.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Đang chờ</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black leading-none">{stats.pending}</span>
                  <span className="text-xs font-bold text-white/40 pb-1">Task</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[-5%] w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] pointer-events-none" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Tổng số task', val: stats.total, color: 'blue', icon: Eye },
            { label: 'Chờ duyệt', val: stats.pending, color: 'indigo', icon: Clock },
            { label: 'Quá hạn', val: stats.expired, color: 'rose', icon: AlertCircle },
            { label: 'Đã hoàn thành', val: stats.done, color: 'emerald', icon: Eye },
          ].map((s, i) => (
            <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-${s.color}-50 text-${s.color}-600`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-3xl font-black text-slate-900">{s.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 mb-10">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 relative group">
              <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm task, annotator, dự án..."
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all font-bold text-slate-700"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
                <Filter className="w-5 h-5" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-6 py-4 border border-slate-100 rounded-[1.5rem] bg-slate-50 text-sm font-black text-slate-600 uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending_review">Đang chờ Duyệt</option>
                <option value="expired">Đã quá hạn</option>
                <option value="approved">Đã phê duyệt</option>
                <option value="rejected">Đã từ chối</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-10 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-800 text-sm font-bold flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-64 bg-white rounded-[3rem] border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-24 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">Hộp thư trống</h3>
            <p className="text-slate-400 font-medium mt-2">Chưa có nhiệm vụ nào phù hợp với tìm kiếm của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredItems.map((item) => {
              const dueDays = getDaysUntilDue(item.dueDate);
              const isExpired = item.status === 'expired' || (dueDays !== null && dueDays < 0);

              const dueBadgeClass =
                dueDays === null
                  ? 'bg-slate-50 text-slate-400'
                  : isExpired
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : dueDays <= 2
                      ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100';

              const dueLabel =
                dueDays === null
                  ? 'Không có deadline'
                  : dueDays < 0
                    ? `Quá hạn ${Math.abs(dueDays)} ngày`
                    : dueDays === 0
                      ? 'Hết hạn hôm nay'
                      : `Còn ${dueDays} ngày`;

              return (
                <div
                  key={item.id}
                  className="group bg-white border border-slate-50 rounded-[3rem] p-8 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 relative overflow-hidden active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-6 mb-8">
                    <div className="flex items-center gap-5 min-w-0">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner ${item.type === 'image' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{item.projectName}</span>
                          <div className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{String(item.id).slice(-6)}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{item.taskTitle}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Trạng thái
                      </p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-blue-500'} animate-pulse`} />
                        <span className="text-xs font-black text-slate-700 uppercase">
                          {item.status === 'pending_review' ? 'Chờ review' : isExpired ? 'Đã quá hạn' : item.status}
                        </span>
                      </div>
                    </div>
                    <div className={`rounded-2xl p-4 border ${dueBadgeClass}`}>
                      <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" /> Hạn chót
                      </p>
                      <span className="text-xs font-black uppercase">{dueLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border-2 border-white shadow-sm">
                        {item.annotatorName?.charAt(0) || 'A'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Người gán nhãn</span>
                        <span className="text-xs font-bold text-slate-700">{item.annotatorName || 'Annotator'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/reviewer/task/${item.id}`)}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <Eye className="w-4 h-4" />
                      Mở Task
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-12 -translate-y-12 -z-10 group-hover:scale-150 transition-transform duration-700" />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
