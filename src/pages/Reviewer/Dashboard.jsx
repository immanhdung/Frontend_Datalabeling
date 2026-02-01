import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";

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

  const statsData = [
    {
      label: "Tổng Annotations",
      value: stats.total,
      icon: FileText,
      color: "blue"
    },
    {
      label: "Chờ Review",
      value: stats.pending,
      icon: Clock,
      color: "amber"
    },
    {
      label: "Đã Duyệt",
      value: stats.approved,
      icon: CheckCircle2,
      color: "emerald"
    },
    {
      label: "Từ Chối",
      value: stats.rejected,
      icon: XCircle,
      color: "red"
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              Dashboard Reviewer
            </h1>
            <p className="text-slate-500 text-lg font-medium mt-2">
              Xem xét và duyệt các annotations từ annotators.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw className="w-5 h-5" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {statsData.map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[28px] shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-slate-100 group">
              <div className="flex justify-between items-start mb-5">
                <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-8 h-8" />
                </div>
              </div>
              <div>
                <p className="text-slate-600 text-base font-bold uppercase tracking-wide">{s.label}</p>
                <h3 className="text-3xl font-display font-extrabold mt-1">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-[32px] p-8 shadow-premium border border-slate-100">
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            {/* Search */}
            <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo task, annotator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'Tất cả', count: annotations.length },
              { key: 'pending_review', label: 'Chờ review', count: annotations.filter(a => a.status === 'pending_review').length },
              { key: 'approved', label: 'Đã duyệt', count: annotations.filter(a => a.status === 'approved').length },
              { key: 'rejected', label: 'Đã từ chối', count: annotations.filter(a => a.status === 'rejected').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
            <div className="bg-white rounded-[32px] shadow-premium p-16 text-center border border-slate-100">
              <div className="inline-flex p-6 rounded-full bg-slate-50 mb-6">
                <FileText className="w-16 h-16 text-slate-400" />
              </div>
              <p className="text-xl font-bold text-slate-500">Không tìm thấy annotation nào</p>
            </div>
          ) : (
            filteredAnnotations.map((annotation) => {
              const statusBadge = getStatusBadge(annotation.status);
              return (
                <div
                  key={annotation.id}
                  className="bg-white rounded-[32px] shadow-premium hover:shadow-premium-hover transition-all p-10 border border-slate-100"
                >
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start gap-5 mb-5">
                        <div className={`p-4 rounded-2xl ${
                          annotation.type === 'image' ? 'bg-blue-50' :
                          annotation.type === 'text' ? 'bg-green-50' :
                          annotation.type === 'audio' ? 'bg-purple-50' : 'bg-orange-50'
                        }`}>
                          {annotation.type === 'image' && <Image className="w-8 h-8 text-blue-600" />}
                          {annotation.type === 'text' && <FileTextIcon className="w-8 h-8 text-green-600" />}
                          {annotation.type === 'audio' && <Volume2 className="w-8 h-8 text-purple-600" />}
                          {annotation.type === 'video' && <Video className="w-8 h-8 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-2xl mb-2">{annotation.taskTitle}</h3>
                          <p className="text-base text-slate-600 font-medium">Task ID: {annotation.taskId}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600 mb-5">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-bold">{annotation.annotatorName}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{new Date(annotation.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mb-5">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                          annotation.status === 'pending_review' ? 'bg-yellow-50 text-yellow-700' :
                          annotation.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {statusBadge.label}
                        </span>
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {annotation.type}
                        </span>
                      </div>

                      {annotation.feedback && (
                        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl mb-4">
                          <p className="text-sm text-red-900 font-medium">
                            <span className="font-extrabold">Feedback: </span>
                            {annotation.feedback}
                          </p>
                        </div>
                      )}

                      {annotation.reviewedAt && (
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                          Reviewed: {new Date(annotation.reviewedAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
                      <button className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 text-base font-bold transition-all whitespace-nowrap shadow-md shadow-blue-200 flex items-center justify-center gap-2">
                        <Eye className="w-5 h-5" />
                        Xem chi tiết
                      </button>
                      {annotation.status === 'pending_review' && (
                        <>
                          <button 
                            onClick={() => handleApprove(annotation.id)}
                            className="px-8 py-3.5 bg-green-600 text-white rounded-2xl hover:bg-green-700 text-base font-bold transition-all whitespace-nowrap shadow-md shadow-green-200 flex items-center justify-center gap-2"
                          >
                            <ThumbsUp className="w-5 h-5" />
                            Duyệt
                          </button>
                          <button 
                            onClick={() => {
                              const feedback = prompt('Nhập lý do từ chối:');
                              if (feedback) handleReject(annotation.id, feedback);
                            }}
                            className="px-8 py-3.5 bg-red-600 text-white rounded-2xl hover:bg-red-700 text-base font-bold transition-all whitespace-nowrap shadow-md shadow-red-200 flex items-center justify-center gap-2"
                          >
                            <ThumbsDown className="w-5 h-5" />
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerDashboard;
