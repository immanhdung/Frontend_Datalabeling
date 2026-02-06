import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Image,
  FileText as FileTextIcon,
  Volume2,
  Video,
  User,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Filter,
  X,
  Calendar,
  TrendingUp,
  BarChart3,
  History,
  AlertCircle
} from "lucide-react";

const ReviewerDashboard = () => {
  const navigate = useNavigate();

  // Review history - load from localStorage
  const [reviewHistory, setReviewHistory] = useState(() => {
    const saved = localStorage.getItem('reviewHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Save review history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('reviewHistory', JSON.stringify(reviewHistory));
  }, [reviewHistory]);

  const [annotations, setAnnotations] = useState([
    {
      id: '1',
      taskId: 'TASK-001',
      taskTitle: 'Gán nhãn ảnh xe hơi',
      annotatorId: 'Ann-001',
      annotatorName: 'Nguyễn Văn A',
      projectName: 'Phân loại phương tiện',
      data: {},
      status: 'pending_review',
      createdAt: '2026-01-28T10:00:00Z',
      type: 'image',
      priority: 'high',
    },
    {
      id: '2',
      taskId: 'TASK-002',
      taskTitle: 'Phân loại văn bản tin tức',
      annotatorId: 'Ann-002',
      annotatorName: 'Trần Thị B',
      projectName: 'Phân loại văn bản',
      data: {},
      status: 'pending_review',
      createdAt: '2026-01-28T09:30:00Z',
      type: 'text',
      priority: 'medium',
    },
    {
      id: '3',
      taskId: 'TASK-003',
      taskTitle: 'Nhận diện đối tượng trong video',
      annotatorId: 'Ann-001',
      annotatorName: 'Nguyễn Văn A',
      projectName: 'Phân loại phương tiện',
      data: {},
      status: 'approved',
      createdAt: '2026-01-27T14:20:00Z',
      reviewedAt: '2026-01-28T08:15:00Z',
      type: 'video',
      priority: 'low',
    },
    {
      id: '4',
      taskId: 'TASK-004',
      taskTitle: 'Gán nhãn âm thanh',
      annotatorId: 'Ann-003',
      annotatorName: 'Lê Văn C',
      projectName: 'Nhận diện âm thanh',
      data: {},
      status: 'rejected',
      feedback: 'Thiếu nhãn cho một số phân đoạn quan trọng',
      createdAt: '2026-01-27T11:00:00Z',
      reviewedAt: '2026-01-27T16:30:00Z',
      type: 'audio',
      priority: 'high',
    },
    {
      id: '5',
      taskId: 'TASK-005',
      taskTitle: 'Gán nhãn ảnh động vật',
      annotatorId: 'Ann-002',
      annotatorName: 'Trần Thị B',
      projectName: 'Phân loại động vật',
      data: {},
      status: 'pending_review',
      createdAt: '2026-02-05T14:20:00Z',
      type: 'image',
      priority: 'high',
    },
    {
      id: '6',
      taskId: 'TASK-006',
      taskTitle: 'Phân tích cảm xúc văn bản',
      annotatorId: 'Ann-001',
      annotatorName: 'Nguyễn Văn A',
      projectName: 'Phân loại văn bản',
      data: {},
      status: 'approved',
      createdAt: '2026-02-04T10:00:00Z',
      reviewedAt: '2026-02-05T09:30:00Z',
      type: 'text',
      priority: 'medium',
    },
  ]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    annotator: '',
    project: '',
    type: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
  });

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingAnnotationId, setRejectingAnnotationId] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Get unique values for filter dropdowns
  const uniqueAnnotators = [...new Set(annotations.map(a => a.annotatorName))];
  const uniqueProjects = [...new Set(annotations.map(a => a.projectName))];
  const uniqueTypes = [...new Set(annotations.map(a => a.type))];
  const uniquePriorities = ['high', 'medium', 'low'];

  const filteredAnnotations = annotations.filter((ann) => {
    const matchesFilter = filter === 'all' || ann.status === filter;
    const matchesSearch = 
      ann.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.annotatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.taskId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Advanced filters
    const matchesAnnotator = !advancedFilters.annotator || ann.annotatorName === advancedFilters.annotator;
    const matchesProject = !advancedFilters.project || ann.projectName === advancedFilters.project;
    const matchesType = !advancedFilters.type || ann.type === advancedFilters.type;
    const matchesPriority = !advancedFilters.priority || ann.priority === advancedFilters.priority;
    
    const matchesDateFrom = !advancedFilters.dateFrom || 
      new Date(ann.createdAt) >= new Date(advancedFilters.dateFrom);
    const matchesDateTo = !advancedFilters.dateTo || 
      new Date(ann.createdAt) <= new Date(advancedFilters.dateTo);
    
    return matchesFilter && matchesSearch && matchesAnnotator && 
           matchesProject && matchesType && matchesPriority && 
           matchesDateFrom && matchesDateTo;
  });

  const handleRefresh = () => {
    console.log('Refreshing data...');
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      annotator: '',
      project: '',
      type: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveAdvancedFilters = Object.values(advancedFilters).some(val => val !== '');

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

  const handleApprove = (id) => {
    const annotation = annotations.find(ann => ann.id === id);
    const now = new Date().toISOString();
    
    // Update annotation status
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, status: 'approved', reviewedAt: now } : ann
    ));
    
    // Add to review history
    const historyEntry = {
      id: `REV-${Date.now()}`,
      annotationId: annotation.id,
      taskId: annotation.taskId,
      taskTitle: annotation.taskTitle,
      annotatorName: annotation.annotatorName,
      projectName: annotation.projectName,
      decision: 'approved',
      feedback: 'Đã duyệt',
      reviewedAt: now,
      reviewTime: Math.floor(Math.random() * 10) + 3, // Mock review time
      type: annotation.type,
    };
    
    setReviewHistory([historyEntry, ...reviewHistory]);
  };

  const handleReject = (id, feedback) => {
    const annotation = annotations.find(ann => ann.id === id);
    const now = new Date().toISOString();
    
    // Update annotation status
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, status: 'rejected', feedback, reviewedAt: now } : ann
    ));
    
    // Add to review history
    const historyEntry = {
      id: `REV-${Date.now()}`,
      annotationId: annotation.id,
      taskId: annotation.taskId,
      taskTitle: annotation.taskTitle,
      annotatorName: annotation.annotatorName,
      projectName: annotation.projectName,
      decision: 'rejected',
      feedback: feedback,
      reviewedAt: now,
      reviewTime: Math.floor(Math.random() * 10) + 3, // Mock review time
      type: annotation.type,
    };
    
    setReviewHistory([historyEntry, ...reviewHistory]);
  };

  const openRejectModal = (id) => {
    setRejectingAnnotationId(id);
    setRejectFeedback('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectingAnnotationId(null);
    setRejectFeedback('');
  };

  const submitReject = () => {
    if (rejectFeedback.trim()) {
      handleReject(rejectingAnnotationId, rejectFeedback);
      closeRejectModal();
    }
  };

  const handleViewDetails = (annotationId) => {
    navigate(`/reviewer/task/${annotationId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Reviewer Dashboard"
        userName="Reviewer"
        userRole="reviewer"
        onRefresh={handleRefresh}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Tổng Annotations"
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
                <p className="text-blue-100 text-sm mt-1">reviews hoàn thành</p>
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
                <p className="text-green-100 text-sm mt-1">annotations được duyệt</p>
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
                <p className="text-purple-100 text-sm mt-1">mỗi review</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-4 rounded-lg">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/reviewer/history')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-semibold"
            >
              <History className="w-4 h-4" />
              Lịch sử Review
            </button>
            <button
              onClick={() => navigate('/reviewer/analytics')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 font-semibold"
            >
              <BarChart3 className="w-4 h-4" />
              Thống kê
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search and Advanced Filter Toggle */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo task, annotator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  showAdvancedFilters || hasActiveAdvancedFilters
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                Bộ lọc nâng cao
                {hasActiveAdvancedFilters && (
                  <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                    {Object.values(advancedFilters).filter(v => v !== '').length}
                  </span>
                )}
              </button>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annotator
                    </label>
                    <select
                      value={advancedFilters.annotator}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, annotator: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tất cả</option>
                      {uniqueAnnotators.map((ann, idx) => (
                        <option key={idx} value={ann}>{ann}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dự án
                    </label>
                    <select
                      value={advancedFilters.project}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, project: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tất cả</option>
                      {uniqueProjects.map((proj, idx) => (
                        <option key={idx} value={proj}>{proj}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại
                    </label>
                    <select
                      value={advancedFilters.type}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tất cả</option>
                      {uniqueTypes.map((type, idx) => (
                        <option key={idx} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Độ ưu tiên
                    </label>
                    <select
                      value={advancedFilters.priority}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, priority: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tất cả</option>
                      {uniquePriorities.map((pri, idx) => (
                        <option key={idx} value={pri}>
                          {pri === 'high' ? 'Cao' : pri === 'medium' ? 'Trung bình' : 'Thấp'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={advancedFilters.dateFrom}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={advancedFilters.dateTo}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {hasActiveAdvancedFilters && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">{filteredAnnotations.length}</span> kết quả được tìm thấy
                    </p>
                    <button
                      onClick={handleClearAdvancedFilters}
                      className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      <X className="w-4 h-4" />
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Status Filter Tabs */}
            <div className="flex gap-3 overflow-x-auto">{[
              { key: 'all', label: 'Tất cả', count: annotations.length },
              { key: 'pending_review', label: 'Chờ review', count: annotations.filter(a => a.status === 'pending_review').length },
              { key: 'approved', label: 'Đã duyệt', count: annotations.filter(a => a.status === 'approved').length },
              { key: 'rejected', label: 'Đã từ chối', count: annotations.filter(a => a.status === 'rejected').length },
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
        </div>

        {/* Annotations List */}
        <div className="space-y-6">
          {filteredAnnotations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-500">Không tìm thấy annotation nào</p>
            </div>
          ) : (
            filteredAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-lg ${
                        annotation.type === 'image' ? 'bg-blue-100' :
                        annotation.type === 'text' ? 'bg-green-100' :
                        annotation.type === 'audio' ? 'bg-purple-100' : 'bg-orange-100'
                      }`}>
                        {annotation.type === 'image' && <Image className="w-6 h-6 text-blue-600" />}
                        {annotation.type === 'text' && <FileTextIcon className="w-6 h-6 text-green-600" />}
                        {annotation.type === 'audio' && <Volume2 className="w-6 h-6 text-purple-600" />}
                        {annotation.type === 'video' && <Video className="w-6 h-6 text-orange-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-xl mb-1">{annotation.taskTitle}</h3>
                        <p className="text-sm text-gray-600">Task ID: {annotation.taskId}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{annotation.annotatorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{new Date(annotation.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        annotation.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                        annotation.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {annotation.status === 'pending_review' ? 'Chờ review' :
                         annotation.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 uppercase">
                        {annotation.type}
                      </span>
                      {annotation.priority && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          annotation.priority === 'high' ? 'bg-red-100 text-red-800' :
                          annotation.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {annotation.priority === 'high' ? 'Ưu tiên cao' :
                           annotation.priority === 'medium' ? 'Ưu tiên TB' : 'Ưu tiên thấp'}
                        </span>
                      )}
                    </div>

                    {annotation.feedback && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-3">
                        <p className="text-sm text-red-900">
                          <span className="font-semibold">Feedback: </span>
                          {annotation.feedback}
                        </p>
                      </div>
                    )}

                    {annotation.reviewedAt && (
                      <p className="text-xs text-gray-500">
                        Reviewed: {new Date(annotation.reviewedAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
                    <button 
                      onClick={() => handleViewDetails(annotation.id)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Xem chi tiết
                    </button>
                    {annotation.status === 'pending_review' && (
                      <>
                        <button 
                          onClick={() => handleApprove(annotation.id)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Duyệt
                        </button>
                        <button 
                          onClick={() => openRejectModal(annotation.id)}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Từ chối gán nhãn</h3>
                <button
                  onClick={closeRejectModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối *
              </label>
              <textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="Nhập lý do từ chối gán nhãn này..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows="4"
              />
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Vui lòng cung cấp lý do rõ ràng để annotator có thể cải thiện.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeRejectModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
              >
                Hủy
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectFeedback.trim()}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-all"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerDashboard;
