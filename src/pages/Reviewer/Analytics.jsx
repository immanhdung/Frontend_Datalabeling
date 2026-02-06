import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
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
  Image,
  Volume2,
  Video,
} from 'lucide-react';

const Analytics = () => {
  const navigate = useNavigate();

  // Load review history from localStorage
  const [reviewHistory] = useState(() => {
    const saved = localStorage.getItem('reviewHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate overall statistics
  const totalReviews = reviewHistory.length;
  const approvedCount = reviewHistory.filter(r => r.decision === 'approved').length;
  const rejectedCount = reviewHistory.filter(r => r.decision === 'rejected').length;
  const approvalRate = totalReviews > 0 ? ((approvedCount / totalReviews) * 100).toFixed(1) : 0;
  const avgReviewTime = totalReviews > 0 
    ? (reviewHistory.reduce((sum, r) => sum + r.reviewTime, 0) / totalReviews).toFixed(1)
    : 0;

  // Group by date (last 7 days)
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

  // Group by annotator
  const reviewsByAnnotator = reviewHistory.reduce((acc, review) => {
    const name = review.annotatorName;
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

  // Group by type
  const reviewsByType = reviewHistory.reduce((acc, review) => {
    const type = review.type;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type]++;
    return acc;
  }, {});

  const typeIcons = {
    image: Image,
    text: FileText,
    audio: Volume2,
    video: Video,
  };

  const typeColors = {
    image: 'bg-blue-500',
    text: 'bg-green-500',
    audio: 'bg-purple-500',
    video: 'bg-orange-500',
  };

  const typeLabels = {
    image: 'Hình ảnh',
    text: 'Văn bản',
    audio: 'Âm thanh',
    video: 'Video',
  };

  // Calculate percentage for pie chart
  const typeData = Object.entries(reviewsByType).map(([type, count]) => ({
    type,
    count,
    percentage: ((count / totalReviews) * 100).toFixed(1),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Phân tích & Thống kê"
        userName="Reviewer"
        userRole="reviewer"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/reviewer/dashboard')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại Dashboard
        </button>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-blue-100 text-sm">Tổng reviews</p>
                <p className="text-3xl font-bold">{totalReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-green-100 text-sm">Đã duyệt</p>
                <p className="text-3xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-red-100 text-sm">Đã từ chối</p>
                <p className="text-3xl font-bold">{rejectedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <p className="text-purple-100 text-sm">Tỷ lệ duyệt</p>
                <p className="text-3xl font-bold">{approvalRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Review Trend Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Xu hướng review (7 ngày qua)</h2>
            </div>
            
            <div className="space-y-3">
              {reviewsByDate.map(({ date, count }) => (
                <div key={date} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600">
                    {new Date(date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {count} reviews
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Annotator Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Hiệu suất Annotator</h2>
            </div>

            <div className="space-y-4">
              {Object.entries(reviewsByAnnotator).map(([name, stats]) => {
                const approvalRate = ((stats.approved / stats.total) * 100).toFixed(0);
                return (
                  <div key={name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{name}</span>
                      <span className="text-sm text-gray-500">{stats.total} reviews</span>
                    </div>
                    
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ width: `${approvalRate}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        {stats.approved} duyệt
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-500" />
                        {stats.rejected} từ chối
                      </span>
                      <span className="font-semibold">{approvalRate}%</span>
                    </div>
                  </div>
                );
              })}

              {Object.keys(reviewsByAnnotator).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Chưa có dữ liệu annotator</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Phân bố theo loại annotation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {typeData.map(({ type, count, percentage }) => {
              const Icon = typeIcons[type] || FileText;
              const colorClass = typeColors[type] || 'bg-gray-500';
              const label = typeLabels[type] || type;

              return (
                <div key={type} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${colorClass} w-12 h-12 rounded-lg flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-sm text-gray-500">{percentage}%</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {typeData.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <PieChart className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>Chưa có dữ liệu review</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Thông tin khác</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Thời gian review TB</p>
              <p className="text-2xl font-bold text-gray-900">{avgReviewTime} phút</p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Hôm nay</p>
              <p className="text-2xl font-bold text-gray-900">
                {reviewHistory.filter(r => {
                  const reviewDate = new Date(r.reviewedAt);
                  const today = new Date();
                  return reviewDate.toDateString() === today.toDateString();
                }).length} reviews
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Tuần này</p>
              <p className="text-2xl font-bold text-gray-900">
                {reviewHistory.filter(r => {
                  const reviewDate = new Date(r.reviewedAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return reviewDate >= weekAgo;
                }).length} reviews
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
