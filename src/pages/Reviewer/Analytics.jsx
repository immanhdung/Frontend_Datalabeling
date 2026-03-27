import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import useReviewHistory from '../../hooks/useReviewHistory';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  FileText,
  Image as ImageIcon,
  Volume2,
  Video,
  Activity
} from 'lucide-react';

const Analytics = () => {
  const navigate = useNavigate();
  const { reviewHistory } = useReviewHistory();

  const totalReviews = reviewHistory.length;
  const approvedCount = reviewHistory.filter(r => r.decision === 'approved').length;
  const rejectedCount = reviewHistory.filter(r => r.decision === 'rejected').length;
  const approvalRate = totalReviews > 0 ? ((approvedCount / totalReviews) * 100).toFixed(1) : 0;
  const avgReviewTime = totalReviews > 0
    ? (reviewHistory.reduce((sum, r) => sum + r.reviewTime, 0) / totalReviews).toFixed(1)
    : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const reviewsByDate = last7Days.map(date => {
    const count = reviewHistory.filter(r => {
      const reviewDate = new Date(r.reviewedAt).toISOString().split('T')[0];
      return reviewDate === date;
    }).length;
    return { date, count };
  });

  const maxCount = Math.max(...reviewsByDate.map(d => d.count), 1);

  const reviewsByAnnotator = reviewHistory.reduce((acc, review) => {
    const name = review.annotatorName || 'Unknown';
    if (!acc[name]) {
      acc[name] = { approved: 0, rejected: 0, total: 0 };
    }
    acc[name].total++;
    if (review.decision === 'approved') {
      acc[name].approved++;
    } else {
      acc[name].rejected++;
    }
    return acc;
  }, {});

  const annotatorList = Object.entries(reviewsByAnnotator).sort((a, b) => b[1].total - a[1].total);

  const reviewsByType = reviewHistory.reduce((acc, review) => {
    const type = review.type || 'image';
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type]++;
    return acc;
  }, {});

  const typeIcons = {
    image: ImageIcon,
    text: FileText,
    audio: Volume2,
    video: Video,
  };

  const typeColors = {
    image: { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-500' },
    text: { bg: 'bg-emerald-100', text: 'text-emerald-600', fill: 'bg-emerald-500' },
    audio: { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-500' },
    video: { bg: 'bg-orange-100', text: 'text-orange-600', fill: 'bg-orange-500' },
  };

  const typeLabels = {
    image: 'Hình ảnh',
    text: 'Văn bản',
    audio: 'Âm thanh',
    video: 'Video',
  };

  const typeData = Object.entries(reviewsByType).map(([type, count]) => ({
    type,
    count,
    percentage: ((count / totalReviews) * 100).toFixed(1),
  }));

  const todayCount = useMemo(() => {
    return reviewHistory.filter(r => {
      const reviewDate = new Date(r.reviewedAt);
      const today = new Date();
      return reviewDate.toDateString() === today.toDateString();
    }).length;
  }, [reviewHistory]);

  const thisWeekCount = useMemo(() => {
    return reviewHistory.filter(r => {
      const reviewDate = new Date(r.reviewedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reviewDate >= weekAgo;
    }).length;
  }, [reviewHistory]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Phân tích & Thống kê"
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

        <div className="mb-8 relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-indigo-800 via-blue-800 to-indigo-900 text-white shadow-xl shadow-indigo-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold mb-2 text-white flex items-center gap-3">
                <Activity className="w-8 h-8 opacity-80" /> Báo cáo Hiệu suất
              </h1>
              <p className="text-indigo-100 max-w-md">Theo dõi năng suất làm việc của bạn và chất lượng nhãn dữ liệu từ các annotators.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                <p className="text-white/70 text-xs font-semibold mb-1 uppercase tracking-wider">Tuần này</p>
                <p className="text-2xl font-black">{thisWeekCount}</p>
              </div>
            </div>
          </div>

          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-[1.25rem]">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider">Tổng Reviews</p>
            <p className="text-4xl font-black text-slate-800">{totalReviews}</p>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-[1.25rem]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider">Đã Duyệt</p>
            <p className="text-4xl font-black text-slate-800">{approvedCount}</p>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-[1.25rem]">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider">Bị Từ Chối</p>
            <p className="text-4xl font-black text-slate-800">{rejectedCount}</p>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-[1.25rem]">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider">Tỷ Lệ Duyệt</p>
            <p className="text-4xl font-black text-slate-800">{approvalRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Review Trend Chart */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Xu hướng review (7 ngày qua)</h2>
            </div>

            <div className="space-y-4">
              {reviewsByDate.map(({ date, count }) => (
                <div key={date} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {new Date(date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden ring-1 ring-inset ring-slate-200/50">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-4 text-xs font-bold text-slate-800 mix-blend-color-burn">
                      {count > 0 ? `${count} reviews` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Annotator Performance */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Hiệu suất Annotator</h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px] custom-scrollbar">
              {annotatorList.map(([name, stats]) => {
                const approvalRateNum = stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : 0;
                return (
                  <div key={name} className="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-800 text-base">{name}</span>
                      <span className="text-xs font-bold text-slate-500 px-3 py-1 bg-white rounded-full border border-slate-200">{stats.total} reviews</span>
                    </div>

                    <div className="flex gap-2 mb-3 items-center">
                      <div className="flex-1 bg-rose-100 rounded-full h-2.5 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 rounded-full animate-pulse-slow"
                          style={{ width: `${approvalRateNum}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-600 w-10 text-right">{approvalRateNum}%</span>
                    </div>

                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {stats.approved} duyệt
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-50 text-rose-700">
                        <XCircle className="w-3.5 h-3.5" />
                        {stats.rejected} từ chối
                      </span>
                    </div>
                  </div>
                );
              })}

              {annotatorList.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <Users className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-semibold">Chưa có dữ liệu Annotator</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Type Distribution */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 lg:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <PieChart className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Phân bố Annotation</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {typeData.map(({ type, count, percentage }) => {
                const Icon = typeIcons[type] || FileText;
                const colors = typeColors[type] || { bg: 'bg-slate-100', text: 'text-slate-600', fill: 'bg-slate-500' };
                const label = typeLabels[type] || type;

                return (
                  <div key={type} className="border border-slate-100 rounded-[1.5rem] p-6 hover:shadow-md hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`${colors.bg} ${colors.text} w-14 h-14 rounded-2xl flex items-center justify-center shrink-0`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-3xl font-black text-slate-800">{count}</p>
                        <p className="text-sm font-bold text-slate-400">{label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${colors.fill}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-500">{percentage}%</span>
                    </div>
                  </div>
                );
              })}

              {typeData.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <PieChart className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">Chưa có dữ liệu review</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-[2rem] p-8 text-white shadow-lg shadow-orange-200 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
              <Clock className="w-12 h-12 mb-4 opacity-90" />
              <p className="text-orange-100 font-semibold mb-1 uppercase tracking-wider text-sm">Thời gian Review TB</p>
              <p className="text-4xl font-black">{avgReviewTime} / phút</p>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-center items-center flex-1">
              <Calendar className="w-10 h-10 mb-3 text-blue-500" />
              <p className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-sm">Review Hôm Nay</p>
              <p className="text-3xl font-black text-slate-800">{todayCount} Task</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
