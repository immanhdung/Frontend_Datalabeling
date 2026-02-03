import React, { useState, useEffect } from 'react';
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
  ThumbsDown
} from "lucide-react";

const ReviewerDashboard = () => {
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

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
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
          </div>

          <div className="flex gap-3 overflow-x-auto">
            {[
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
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-all flex items-center justify-center gap-2">
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
                          onClick={() => {
                            const feedback = prompt('Nhập lý do từ chối:');
                            if (feedback) handleReject(annotation.id, feedback);
                          }}
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
    </div>
  );
};

export default ReviewerDashboard;
