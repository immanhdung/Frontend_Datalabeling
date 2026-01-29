import React, { useState, useEffect } from 'react';
import StatsCard from '../../components/common/StatsCard';
import Header from '../../components/common/Header';

const ReviewerDashboard = () => {
  // Mock data - thay bằng API call thực tế
  const [stats, setStats] = useState({
    total: 150,
    pending: 45,
    approved: 85,
    rejected: 20,
    completed: 105,
  });

  const [annotations, setAnnotations] = useState([
    {
      id: '1',
      taskId: 'TASK-001',
      taskTitle: 'Gán nhãn ảnh xe hơi',
      annotatorId: 'Ann-001',
      annotatorName: 'Nguyễn Văn A',
      data: {},
      status: 'pending_review',
      createdAt: '2026-01-28T10:00:00Z',
      type: 'image',
    },
    {
      id: '2',
      taskId: 'TASK-002',
      taskTitle: 'Phân loại văn bản tin tức',
      annotatorId: 'Ann-002',
      annotatorName: 'Trần Thị B',
      data: {},
      status: 'pending_review',
      createdAt: '2026-01-28T09:30:00Z',
      type: 'text',
    },
    {
      id: '3',
      taskId: 'TASK-003',
      taskTitle: 'Nhận diện đối tượng trong video',
      annotatorId: 'Ann-001',
      annotatorName: 'Nguyễn Văn A',
      data: {},
      status: 'approved',
      createdAt: '2026-01-27T14:20:00Z',
      reviewedAt: '2026-01-28T08:15:00Z',
      type: 'video',
    },
    {
      id: '4',
      taskId: 'TASK-004',
      taskTitle: 'Gán nhãn âm thanh',
      annotatorId: 'Ann-003',
      annotatorName: 'Lê Văn C',
      data: {},
      status: 'rejected',
      feedback: 'Thiếu nhãn cho một số phân đoạn quan trọng',
      createdAt: '2026-01-27T11:00:00Z',
      reviewedAt: '2026-01-27T16:30:00Z',
      type: 'audio',
    },
  ]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnnotations = annotations.filter((ann) => {
    const matchesFilter = filter === 'all' || ann.status === filter;
    const matchesSearch = 
      ann.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.annotatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.taskId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRefresh = () => {
    console.log('Refreshing data...');
    // TODO: Gọi API để refresh data
  };

  const handleApprove = (id) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, status: 'approved', reviewedAt: new Date().toISOString() } : ann
    ));
    setStats({ ...stats, approved: stats.approved + 1, pending: stats.pending - 1 });
  };

  const handleReject = (id, feedback) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, status: 'rejected', feedback, reviewedAt: new Date().toISOString() } : ann
    ));
    setStats({ ...stats, rejected: stats.rejected + 1, pending: stats.pending - 1 });
  };

  const getTypeIcon = (type) => {
    const icons = {
      image: '🖼️',
      text: '📝',
      audio: '🔊',
      video: '🎥',
    };
    return icons[type] || '📄';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ review' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã duyệt' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã từ chối' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <Header 
        title="Reviewer Dashboard"
        userName="Reviewer Name"
        userRole="reviewer"
        onRefresh={handleRefresh}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Tổng Annotations"
            value={stats.total}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="blue"
          />
          <StatsCard
            title="Chờ Review"
            value={stats.pending}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="yellow"
          />
          <StatsCard
            title="Đã Duyệt"
            value={stats.approved}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Từ Chối"
            value={stats.rejected}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
          />
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo task, annotator..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto">
                {[
                  { key: 'all', label: 'Tất cả', count: annotations.length },
                  { key: 'pending_review', label: 'Chờ review', count: annotations.filter(a => a.status === 'pending_review').length },
                  { key: 'approved', label: 'Đã duyệt', count: annotations.filter(a => a.status === 'approved').length },
                  { key: 'rejected', label: 'Đã từ chối', count: annotations.filter(a => a.status === 'rejected').length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
        </div>

        {/* Annotations List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Danh sách Annotations</h2>
            
            {filteredAnnotations.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-4 text-gray-500">Không tìm thấy annotation nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnotations.map((annotation) => {
                  const statusBadge = getStatusBadge(annotation.status);
                  return (
                    <div
                      key={annotation.id}
                      className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{getTypeIcon(annotation.type)}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-lg truncate">{annotation.taskTitle}</h3>
                              <p className="text-sm text-gray-500">Task ID: {annotation.taskId}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>{annotation.annotatorName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{new Date(annotation.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                              {annotation.type}
                            </span>
                          </div>

                          {annotation.feedback && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800">
                                <span className="font-medium">Feedback: </span>
                                {annotation.feedback}
                              </p>
                            </div>
                          )}

                          {annotation.reviewedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Reviewed: {new Date(annotation.reviewedAt).toLocaleString('vi-VN')}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                            Xem chi tiết
                          </button>
                          {annotation.status === 'pending_review' && (
                            <>
                              <button 
                                onClick={() => handleApprove(annotation.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                              >
                                ✓ Duyệt
                              </button>
                              <button 
                                onClick={() => {
                                  const feedback = prompt('Nhập lý do từ chối:');
                                  if (feedback) handleReject(annotation.id, feedback);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                              >
                                ✕ Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewerDashboard;
