import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Zap,
  ThumbsUp,
  Image,
  FileText,
  Volume2,
  Video,
  AlertCircle,
  Plus,
  Search,
  Folder,
  TrendingUp,
  Calendar
} from "lucide-react";

const AnnotatorDashboard = () => {
  // Mock data
  const [stats, setStats] = useState({
    total: 200,
    pending: 65,
    inProgress: 15,
    completed: 120,
    approved: 95,
    rejected: 15,
  });

  const [tasks, setTasks] = useState([
    {
      id: 'task-1',
      title: 'Gán nhãn hình ảnh xe hơi - Dataset 001',
      description: 'Xác định và vẽ bounding box cho các loại xe trong ảnh',
      type: 'image',
      status: 'pending',
      priority: 'high',
      projectName: 'Autonomous Driving',
      createdAt: '2026-01-28T10:00:00Z',
      updatedAt: '2026-01-28T10:00:00Z',
      dueDate: '2026-02-05T23:59:59Z',
      progress: 0,
      totalItems: 150,
    },
    {
      id: 'task-2',
      title: 'Phân loại văn bản tin tức',
      description: 'Phân loại các bài báo theo danh mục: Thể thao, Kinh tế, Giải trí, Chính trị',
      type: 'text',
      status: 'in_progress',
      priority: 'medium',
      projectName: 'News Classification',
      createdAt: '2026-01-27T14:30:00Z',
      updatedAt: '2026-01-29T09:15:00Z',
      dueDate: '2026-02-10T23:59:59Z',
      progress: 45,
      totalItems: 500,
    },
    {
      id: 'task-3',
      title: 'Transcription âm thanh cuộc gọi',
      description: 'Chuyển đổi các file âm thanh cuộc gọi thành văn bản',
      type: 'audio',
      status: 'completed',
      priority: 'low',
      projectName: 'Call Center Analytics',
      createdAt: '2026-01-25T08:00:00Z',
      updatedAt: '2026-01-28T16:45:00Z',
      completedAt: '2026-01-28T16:45:00Z',
      dueDate: '2026-02-15T23:59:59Z',
      progress: 100,
      totalItems: 80,
      reviewStatus: 'approved',
    },
    {
      id: 'task-4',
      title: 'Gán nhãn video người đi bộ',
      description: 'Theo dõi và gán nhãn người đi bộ trong video',
      type: 'video',
      status: 'completed',
      priority: 'high',
      projectName: 'Pedestrian Detection',
      createdAt: '2026-01-24T10:00:00Z',
      updatedAt: '2026-01-27T18:30:00Z',
      completedAt: '2026-01-27T18:30:00Z',
      dueDate: '2026-02-01T23:59:59Z',
      progress: 100,
      totalItems: 30,
      reviewStatus: 'rejected',
      feedback: 'Một số frame bị thiếu annotations, vui lòng kiểm tra lại',
    },
  ]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, priority, dueDate

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortBy === 'dueDate') {
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });

  const handleRefresh = () => {
    console.log('Refreshing data...');
    // TODO: Gọi API để refresh data
  };

  const handleStartTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'in_progress', updatedAt: new Date().toISOString() } : task
    ));
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
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ Chưa làm' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: '🔄 Đang làm' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Hoàn thành' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { bg: 'bg-red-100', text: 'text-red-800', label: '🔴 Cao' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🟡 Trung bình' },
      low: { bg: 'bg-green-100', text: 'text-green-800', label: '🟢 Thấp' },
    };
    return badges[priority] || { bg: 'bg-gray-100', text: 'text-gray-800', label: priority };
  };

  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const statsData = [
    {
      label: "Tổng Tasks",
      value: stats.total,
      icon: CheckCircle2,
      color: "blue"
    },
    {
      label: "Đang làm",
      value: stats.inProgress,
      icon: Zap,
      color: "amber"
    },
    {
      label: "Đã hoàn thành",
      value: stats.completed,
      icon: CheckCircle2,
      color: "emerald"
    },
    {
      label: "Được duyệt",
      value: stats.approved,
      icon: ThumbsUp,
      color: "indigo"
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              Dashboard Annotator
            </h1>
            <p className="text-slate-500 text-lg font-medium mt-2">
              Chào mừng trở lại! Quản lý và hoàn thành các task của bạn.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Clock className="w-5 h-5" />
              Làm mới
            </button>
            <button className="flex items-center gap-2.5 px-6 py-3 bg-green-600 text-white text-lg rounded-xl font-bold hover:bg-green-700 transition-all shadow-md shadow-green-200">
              <Plus className="w-5 h-5" />
              Task mới
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="bg-white p-8 rounded-[24px] shadow-premium hover:shadow-premium-hover transition-all text-left group border border-slate-100">
            <div className="flex items-center gap-5">
              <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-100 transition-colors">
                <Image className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-slate-900">Gán nhãn ảnh</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Bounding box, Segmentation</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-8 rounded-[24px] shadow-premium hover:shadow-premium-hover transition-all text-left group border border-slate-100">
            <div className="flex items-center gap-5">
              <div className="bg-green-50 p-4 rounded-2xl group-hover:bg-green-100 transition-colors">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-slate-900">Gán nhãn văn bản</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">NER, Classification</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-8 rounded-[24px] shadow-premium hover:shadow-premium-hover transition-all text-left group border border-slate-100">
            <div className="flex items-center gap-5">
              <div className="bg-purple-50 p-4 rounded-2xl group-hover:bg-purple-100 transition-colors">
                <Volume2 className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-slate-900">Gán nhãn âm thanh</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Transcription, Classification</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-[32px] p-8 shadow-premium border border-slate-100">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm task, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-base font-bold text-slate-700"
            >
              <option value="recent">Mới nhất</option>
              <option value="priority">Ưu tiên</option>
              <option value="dueDate">Deadline</option>
            </select>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'Tất cả', count: tasks.length },
              { key: 'pending', label: 'Chưa làm', count: tasks.filter(t => t.status === 'pending').length },
              { key: 'in_progress', label: 'Đang làm', count: tasks.filter(t => t.status === 'in_progress').length },
              { key: 'completed', label: 'Hoàn thành', count: tasks.filter(t => t.status === 'completed').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                  filter === tab.key
                    ? 'bg-green-600 text-white shadow-md shadow-green-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-[32px] shadow-premium p-16 text-center border border-slate-100">
              <div className="inline-flex p-6 rounded-full bg-slate-50 mb-6">
                <CheckCircle2 className="w-16 h-16 text-slate-400" />
              </div>
              <p className="text-xl font-bold text-slate-500">Không tìm thấy task nào</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const statusBadge = getStatusBadge(task.status);
              const priorityBadge = getPriorityBadge(task.priority);
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-[32px] shadow-premium hover:shadow-premium-hover transition-all p-10 border border-slate-100"
                >
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 w-full">
                      {/* Title and Type */}
                      <div className="flex items-start gap-5 mb-5">
                        <div className={`p-4 rounded-2xl ${
                          task.type === 'image' ? 'bg-blue-50' :
                          task.type === 'text' ? 'bg-green-50' :
                          task.type === 'audio' ? 'bg-purple-50' : 'bg-orange-50'
                        }`}>
                          {task.type === 'image' && <Image className="w-8 h-8 text-blue-600" />}
                          {task.type === 'text' && <FileText className="w-8 h-8 text-green-600" />}
                          {task.type === 'audio' && <Volume2 className="w-8 h-8 text-purple-600" />}
                          {task.type === 'video' && <Video className="w-8 h-8 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-2xl mb-2">{task.title}</h3>
                          <p className="text-base text-slate-600 font-medium line-clamp-2">{task.description}</p>
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="flex items-center gap-3 mb-5 px-5 py-3 bg-slate-50 rounded-2xl w-fit">
                        <Folder className="w-5 h-5 text-slate-400" />
                        <span className="text-base text-slate-700 font-bold">{task.projectName}</span>
                      </div>

                      {/* Progress Bar */}
                      {task.status === 'in_progress' && (
                        <div className="mb-5">
                          <div className="flex items-center justify-between text-sm text-slate-600 font-bold mb-2">
                            <span className="uppercase tracking-wide">Tiến độ</span>
                            <span className="text-base">{task.progress}% · {Math.floor(task.totalItems * task.progress / 100)}/{task.totalItems} items</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3">
                            <div 
                              className="bg-green-600 h-3 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Badges and Info */}
                      <div className="flex flex-wrap items-center gap-3 mb-5">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                          task.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                          task.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {statusBadge.label}
                        </span>
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                          task.priority === 'high' ? 'bg-red-50 text-red-700' :
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {priorityBadge.label}
                        </span>
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {task.type}
                        </span>
                        {task.reviewStatus && (
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                            task.reviewStatus === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {task.reviewStatus === 'approved' ? '✓ Đã duyệt' : '✗ Cần sửa'}
                          </span>
                        )}
                      </div>

                      {/* Deadline Warning */}
                      {daysUntilDue <= 3 && daysUntilDue >= 0 && task.status !== 'completed' && (
                        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl mb-4">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-bold text-orange-800">
                            Deadline: {daysUntilDue === 0 ? 'Hôm nay' : `Còn ${daysUntilDue} ngày`}
                          </span>
                        </div>
                      )}

                      {/* Feedback */}
                      {task.feedback && (
                        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl mb-4">
                          <p className="text-sm text-red-900 font-medium">
                            <span className="font-extrabold">Feedback từ Reviewer: </span>
                            {task.feedback}
                          </p>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Cập nhật: {new Date(task.updatedAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Deadline: {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => handleStartTask(task.id)}
                          className="px-8 py-3.5 bg-green-600 text-white rounded-2xl hover:bg-green-700 text-base font-bold transition-all whitespace-nowrap shadow-md shadow-green-200"
                        >
                          Bắt đầu
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 text-base font-bold transition-all whitespace-nowrap shadow-md shadow-blue-200">
                          Tiếp tục
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <>
                          <button className="px-8 py-3.5 bg-slate-600 text-white rounded-2xl hover:bg-slate-700 text-base font-bold transition-all whitespace-nowrap shadow-md">
                            Xem lại
                          </button>
                          {task.reviewStatus === 'rejected' && (
                            <button className="px-8 py-3.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 text-base font-bold transition-all whitespace-nowrap shadow-md shadow-orange-200">
                              Sửa lại
                            </button>
                          )}
                        </>
                      )}
                      <button className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 text-base font-bold transition-all whitespace-nowrap">
                        Chi tiết
                      </button>
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

export default AnnotatorDashboard;
