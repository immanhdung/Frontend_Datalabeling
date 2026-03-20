
import React, { useState, useEffect } from 'react';
import { reviewAPI } from '../../config/api';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';
import useReviewHistory from '../../hooks/useReviewHistory';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";

const ReviewerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { reviewHistory } = useReviewHistory();

  const isEndpointMissing = (err) => {
    const status = Number(err?.response?.status);
    return import.meta.env.DEV && (status === 404 || status === 405 || status === 501);
  };

  // Load annotations from API
  const [annotations, setAnnotations] = useState([]);

  // Load data from API on mount
  useEffect(() => {
    loadAnnotations();
  }, []);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load pending reviews from API
      const response = await reviewAPI.getPendingReviews();
      const raw = response?.data?.data ?? response?.data ?? [];
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.results)
            ? raw.results
            : [];

      setAnnotations(data);
      
      // Also save to localStorage as backup
      localStorage.setItem('reviewerAnnotations', JSON.stringify(data));
    } catch (err) {
      console.error('Error loading annotations from API:', err);
      setAnnotations([]);
      if (isEndpointMissing(err)) {
        setError('Endpoint review ch\u01b0a s\u1eb5n s\u00e0ng tr\u00ean backend. Vui l\u00f2ng ki\u1ec3m tra API.');
      } else {
        setError(err.response?.data?.message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch review');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnnotations();
  };

  // Calculate statistics from actual data
  const stats = {
    total: annotations.length,
    pending: annotations.filter(a => a.status === 'pending_review').length,
    approved: annotations.filter(a => a.status === 'approved').length,
    rejected: annotations.filter(a => a.status === 'rejected').length,
    completed: annotations.filter(a => a.status === 'approved' || a.status === 'rejected').length,
    todayReviews: reviewHistory.filter(r => {
      const reviewDate = new Date(r.reviewedAt);
      const today = new Date();
      return reviewDate.toDateString() === today.toDateString();
    }).length,
    avgReviewTime: reviewHistory.length > 0 
      ? (reviewHistory.reduce((sum, r) => sum + r.reviewTime, 0) / reviewHistory.length).toFixed(1)
      : 0,
    approvalRate: reviewHistory.length > 0
      ? ((reviewHistory.filter(r => r.decision === 'approved').length / reviewHistory.length) * 100).toFixed(1)
      : 0,
  };

  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Reviewer Dashboard"
          userName="Reviewer"
          userRole="reviewer"
          onRefresh={handleRefresh}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Reviewer Dashboard"
        userName="Reviewer"
        userRole="reviewer"
        onRefresh={handleRefresh}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">Lỗi tải dữ liệu</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={loadAnnotations}
                className="mt-2 text-red-700 hover:text-red-900 font-semibold text-sm underline"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Tổng annotation"
            value={stats.total}
            icon={<FileText className="w-6 h-6" />}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Chờ Review"
            value={stats.pending}
            icon={<Clock className="w-6 h-6" />}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          <StatsCard
            title="Đã Duyệt"
            value={stats.approved}
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatsCard
            title="Từ Chối"
            value={stats.rejected}
            icon={<XCircle className="w-6 h-6" />}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
          />
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Hôm nay</p>
                <p className="text-3xl font-bold">{stats.todayReviews}</p>
                <p className="text-blue-100 text-sm mt-1">mục đã xử lý</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-4 rounded-lg">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Tỷ lệ duyệt</p>
                <p className="text-3xl font-bold">{stats.approvalRate}%</p>
                <p className="text-green-100 text-sm mt-1">mẫu được duyệt</p>
              </div>
              <div className="bg-green-400 bg-opacity-30 p-4 rounded-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">TB thời gian</p>
                <p className="text-3xl font-bold">{stats.avgReviewTime}m</p>
                <p className="text-purple-100 text-sm mt-1">mỗi lần duyệt</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-4 rounded-lg">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

      </main>

    </div>
  );
};

export default ReviewerDashboard;








