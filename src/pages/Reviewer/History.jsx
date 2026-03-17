import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import useReviewHistory from '../../hooks/useReviewHistory';
import { mockReviewerHistory } from '../../mock/taskInbox';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  Volume2,
  Video,
  Clock,
  MessageSquare,
  Filter,
  Download,
  Search,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  FolderOpen,
  History
} from 'lucide-react';

const ReviewHistory = () => {
  const navigate = useNavigate();
  const { reviewHistory } = useReviewHistory();
  const historySource = useMemo(() => (reviewHistory.length > 0 ? reviewHistory : mockReviewerHistory), [reviewHistory]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  // Calculate statistics
  const stats = {
    total: historySource.length,
    approved: historySource.filter(r => r.decision === 'approved').length,
    rejected: historySource.filter(r => r.decision === 'rejected').length,
    avgReviewTime: historySource.length > 0
      ? (historySource.reduce((sum, r) => sum + r.reviewTime, 0) / historySource.length).toFixed(1)
      : '0',
    approvalRate: historySource.length > 0
      ? ((historySource.filter(r => r.decision === 'approved').length / historySource.length) * 100).toFixed(1)
      : '0',
    expired: historySource.filter(r => r.taskStatus === 'expired').length,
  };

  // Filter history
  const filteredHistory = historySource.filter((review) => {
    const matchesDecision = filter === 'all' || (filter === 'expired' ? review.taskStatus === 'expired' : review.decision === filter);
    const matchesSearch =
      (review.taskTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.annotatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.taskId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.projectName || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter
    const reviewDate = new Date(review.reviewedAt);
    const now = new Date();
    let matchesDate = true;

    if (dateFilter === 'today') {
      matchesDate = reviewDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = reviewDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = reviewDate >= monthAgo;
    }

    return matchesDecision && matchesSearch && matchesDate;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'audio': return <Volume2 className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const handleExport = () => {
    console.log('Exporting review history...');
    alert('Chức năng xuất dữ liệu đang được phát triển');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Lịch sử Review"
        userName="Reviewer"
        userRole="reviewer"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/reviewer')}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold group"
        >
          <div className="p-2 rounded-xl bg-white border shadow-sm group-hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Quay lại Dashboard
        </button>

        <div className="mb-8 relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-xl shadow-indigo-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold mb-2 text-white">Lịch sử đánh giá</h1>
              <p className="text-indigo-100 max-w-md">Theo dõi chi tiết tất cả các nhiệm vụ bạn đã review và phản hồi cho annotator.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                <p className="text-white/70 text-xs font-semibold mb-1 uppercase tracking-wider">Tổng Review</p>
                <p className="text-2xl font-black">{stats.total}</p>
              </div>
              <div className="bg-emerald-400/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-400/30">
                <p className="text-emerald-100 text-xs font-semibold mb-1 uppercase tracking-wider">Tỷ lệ duyệt</p>
                <p className="text-2xl font-black text-emerald-300">{stats.approvalRate}%</p>
              </div>
            </div>
          </div>

          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên task, annotator, dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-medium focus:ring-2 focus:ring-blue-600 outline-none min-w-[160px]"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày qua</option>
              <option value="month">30 ngày qua</option>
            </select>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-md shadow-slate-200 flex items-center justify-center gap-2 font-bold whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Xuất dữ liệu
            </button>
          </div>

          {/* Decision Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto bg-slate-50 p-1.5 rounded-2xl w-fit">
            {[
              { key: 'all', label: 'Tất cả', count: historySource.length },
              { key: 'approved', label: 'Đã duyệt', count: historySource.filter(r => r.decision === 'approved').length },
              { key: 'rejected', label: 'Đã từ chối', count: historySource.filter(r => r.decision === 'rejected').length },
              { key: 'expired', label: 'Task quá hạn', count: historySource.filter(r => r.taskStatus === 'expired').length },
            ].map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {tab.label}
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                    }`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Review History List */}
        <div className="space-y-6">
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="w-12 h-12 text-slate-300" />
              </div>
              <p className="text-2xl font-bold text-slate-400">Không tìm thấy lịch sử review</p>
              <p className="text-slate-500 mt-2">Thử thay đổi bộ lọc hoặc tìm kiếm lại nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {filteredHistory.map((review) => (
                <div
                  key={review.id}
                  className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 rounded-[1.25rem] ${review.type === 'image' ? 'bg-blue-50 text-blue-600' :
                      review.type === 'text' ? 'bg-emerald-50 text-emerald-600' :
                        review.type === 'audio' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                      {getTypeIcon(review.type)}
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${review.decision === 'approved'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                      {review.decision === 'approved' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          Đã duyệt
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 flex-shrink-0" />
                          Đã từ chối
                        </>
                      )}
                    </span>
                    {review.taskStatus === 'expired' && (
                      <span className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                        Task quá hạn
                      </span>
                    )}
                  </div>

                  <div className="flex-1 mb-4">
                    <h3 className="font-bold text-slate-900 text-xl mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{review.taskTitle}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <FolderOpen className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-500 line-clamp-1">{review.projectName}</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">Annotator: {review.annotatorName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Dành ra: {review.reviewTime}p</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-5 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium">Review lúc: {new Date(review.reviewedAt).toLocaleString('vi-VN')}</span>
                    </div>

                    {review.feedback && (
                      <div className={`p-4 rounded-2xl border ${review.decision === 'approved'
                        ? 'bg-emerald-50/50 border-emerald-100/50'
                        : 'bg-rose-50/50 border-rose-100/50'
                        }`}>
                        <div className="flex items-start gap-2.5">
                          <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${review.decision === 'approved' ? 'text-emerald-500' : 'text-rose-500'
                            }`} />
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${review.decision === 'approved' ? 'text-emerald-700' : 'text-rose-700'
                              }`}>
                              Feedback của bạn
                            </p>
                            <p className={`text-sm font-medium leading-relaxed ${review.decision === 'approved' ? 'text-emerald-800' : 'text-rose-800'
                              }`}>
                              "{review.feedback}"
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReviewHistory;
