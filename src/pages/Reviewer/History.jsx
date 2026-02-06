import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  FileText,
  Image,
  Volume2,
  Video,
  Clock,
  MessageSquare,
  Filter,
  Download,
  Search,
  TrendingUp,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

const ReviewHistory = () => {
  const navigate = useNavigate();

  // Load review history from localStorage - sync with Dashboard
  const [reviewHistory, setReviewHistory] = useState(() => {
    const saved = localStorage.getItem('reviewHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Reload data when component mounts or when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('reviewHistory');
      if (saved) {
        setReviewHistory(JSON.parse(saved));
      }
    };

    // Listen for custom event from other components
    window.addEventListener('reviewHistoryUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('reviewHistoryUpdated', handleStorageChange);
    };
  }, []);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  // Calculate statistics
  const stats = {
    total: reviewHistory.length,
    approved: reviewHistory.filter(r => r.decision === 'approved').length,
    rejected: reviewHistory.filter(r => r.decision === 'rejected').length,
    avgReviewTime: reviewHistory.length > 0 
      ? (reviewHistory.reduce((sum, r) => sum + r.reviewTime, 0) / reviewHistory.length).toFixed(1)
      : '0',
    approvalRate: reviewHistory.length > 0
      ? ((reviewHistory.filter(r => r.decision === 'approved').length / reviewHistory.length) * 100).toFixed(1)
      : '0',
  };

  // Filter history
  const filteredHistory = reviewHistory.filter((review) => {
    const matchesDecision = filter === 'all' || review.decision === filter;
    const matchesSearch = 
      review.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.annotatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.projectName.toLowerCase().includes(searchTerm.toLowerCase());

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
      case 'image': return <Image className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'audio': return <Volume2 className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleExport = () => {
    console.log('Exporting review history...');
    alert('Chức năng xuất dữ liệu đang được phát triển');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Lịch sử Review"
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
          <span className="font-semibold">Quay lại Dashboard</span>
        </button>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tổng reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Từ chối</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tỷ lệ duyệt</p>
                <p className="text-2xl font-bold text-purple-600">{stats.approvalRate}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">TB thời gian</p>
                <p className="text-2xl font-bold text-orange-600">{stats.avgReviewTime}m</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo task, annotator, dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày qua</option>
              <option value="month">30 ngày qua</option>
            </select>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Xuất dữ liệu
            </button>
          </div>

          {/* Decision Filter Tabs */}
          <div className="flex gap-3 overflow-x-auto">
            {[
              { key: 'all', label: 'Tất cả', count: reviewHistory.length },
              { key: 'approved', label: 'Đã duyệt', count: reviewHistory.filter(r => r.decision === 'approved').length },
              { key: 'rejected', label: 'Đã từ chối', count: reviewHistory.filter(r => r.decision === 'rejected').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Review History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-500">Không tìm thấy lịch sử review</p>
              <p className="text-gray-400 mt-2">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
            </div>
          ) : (
            filteredHistory.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-lg ${
                        review.type === 'image' ? 'bg-blue-100' :
                        review.type === 'text' ? 'bg-green-100' :
                        review.type === 'audio' ? 'bg-purple-100' : 'bg-orange-100'
                      }`}>
                        {getTypeIcon(review.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{review.taskTitle}</h3>
                            <p className="text-sm text-gray-600">Task ID: {review.taskId}</p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            review.decision === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {review.decision === 'approved' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Đã duyệt
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Đã từ chối
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{review.annotatorName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span>{review.projectName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{new Date(review.reviewedAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{review.reviewTime} phút</span>
                          </div>
                        </div>

                        {/* Feedback */}
                        {review.feedback && (
                          <div className={`p-3 rounded-lg border mb-3 ${
                            review.decision === 'approved'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-start gap-2">
                              <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                review.decision === 'approved' ? 'text-green-600' : 'text-red-600'
                              }`} />
                              <div className="flex-1">
                                <p className={`text-sm font-semibold mb-1 ${
                                  review.decision === 'approved' ? 'text-green-900' : 'text-red-900'
                                }`}>
                                  Feedback:
                                </p>
                                <p className={`text-sm ${
                                  review.decision === 'approved' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {review.feedback}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Issues */}
                        {review.issues && review.issues.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Vấn đề:</p>
                              <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {review.issues.map((issue, idx) => (
                                  <li key={idx}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ReviewHistory;
