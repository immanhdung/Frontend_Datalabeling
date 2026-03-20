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

        // 1. API
        try {
          const response = await reviewAPI.getPendingReviews();
          const data = response?.data?.data || response?.data || [];
          if (Array.isArray(data)) allFound = [...data];
        } catch (err) {
          console.warn('[ReviewInbox] API failed');
        }

        // 2. Discover from Local storage
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
        } catch (e) {}

        setItems(allFound.length > 0 ? allFound : mockReviewerInboxAnnotations);
      } catch (err) {
        setItems(mockReviewerInboxAnnotations);
        setError(err?.response?.data?.message || 'Không thể tải task review từ API, đang dùng mock data.');
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
    <div className="min-h-screen bg-gray-50">
      <Header title="Nhận task review" userName="Reviewer" userRole="reviewer" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase">Tổng task</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase">Chờ review</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase">Quá hạn</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase">Đã xử lý</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.done}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm task, annotator, dự án..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="pending_review">Chờ review</option>
                <option value="expired">Quá hạn</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-40 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
            Chưa có task review phù hợp bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const dueDays = getDaysUntilDue(item.dueDate);
              const dueBadgeClass =
                dueDays === null
                  ? 'bg-slate-100 text-slate-600'
                  : dueDays < 0
                    ? 'bg-rose-100 text-rose-700'
                    : dueDays <= 2
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700';

              const dueLabel =
                dueDays === null
                  ? 'Không có deadline'
                  : dueDays < 0
                    ? `Quá hạn ${Math.abs(dueDays)} ngày`
                    : dueDays === 0
                      ? 'Hết hạn hôm nay'
                      : `Còn ${dueDays} ngày`;

              return (
                <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">{item.taskTitle}</h3>
                        <p className="text-xs text-slate-500 truncate">{item.projectName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${dueBadgeClass}`}>
                      {dueLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                    <span>Annotator: {item.annotatorName || 'N/A'}</span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${item.status === 'expired' ? 'bg-rose-100 text-rose-700' : item.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.status === 'pending_review' ? 'Chờ review' : item.status === 'expired' ? 'Quá hạn' : item.status}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => navigate(`/reviewer/task/${item.id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      Mở task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
