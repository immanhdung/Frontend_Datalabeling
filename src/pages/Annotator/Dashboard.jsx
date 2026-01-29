import React, { useState } from 'react';
import StatsCard from '../../components/common/StatsCard';
import Header from '../../components/common/Header';

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <Header 
        title="Annotator Dashboard"
        userName="Annotator Name"
        userRole="annotator"
        onRefresh={handleRefresh}
        actionButton={
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Task mới
            </span>
          </button>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Tổng Tasks"
            value={stats.total}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
          />
          <StatsCard
            title="Đang làm"
            value={stats.inProgress}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="yellow"
          />
          <StatsCard
            title="Đã hoàn thành"
            value={stats.completed}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Được duyệt"
            value={stats.approved}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            color="green"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Gán nhãn ảnh</h3>
                <p className="text-sm text-gray-500 mt-1">Bounding box, Segmentation</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-4 rounded-lg group-hover:bg-green-200 transition-colors">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Gán nhãn văn bản</h3>
                <p className="text-sm text-gray-500 mt-1">NER, Classification</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-4 rounded-lg group-hover:bg-purple-200 transition-colors">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Gán nhãn âm thanh</h3>
                <p className="text-sm text-gray-500 mt-1">Transcription, Classification</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search, Filter, and Sort */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm task, project..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="recent">Mới nhất</option>
                  <option value="priority">Ưu tiên</option>
                  <option value="dueDate">Deadline</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {[
                { key: 'all', label: 'Tất cả', count: tasks.length },
                { key: 'pending', label: 'Chưa làm', count: tasks.filter(t => t.status === 'pending').length },
                { key: 'in_progress', label: 'Đang làm', count: tasks.filter(t => t.status === 'in_progress').length },
                { key: 'completed', label: 'Hoàn thành', count: tasks.filter(t => t.status === 'completed').length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === tab.key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <svg className="mx-auto w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-4 text-gray-500">Không tìm thấy task nào</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const statusBadge = getStatusBadge(task.status);
              const priorityBadge = getPriorityBadge(task.priority);
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and Type */}
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-3xl">{getTypeIcon(task.type)}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">{task.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">{task.projectName}</span>
                      </div>

                      {/* Progress Bar */}
                      {task.status === 'in_progress' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Tiến độ</span>
                            <span className="font-medium">{task.progress}% ({Math.floor(task.totalItems * task.progress / 100)}/{task.totalItems} items)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Badges and Info */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${priorityBadge.bg} ${priorityBadge.text}`}>
                          {priorityBadge.label}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {task.type}
                        </span>
                        {task.reviewStatus && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            task.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {task.reviewStatus === 'approved' ? '✓ Đã duyệt' : '✗ Cần sửa'}
                          </span>
                        )}
                      </div>

                      {/* Deadline Warning */}
                      {daysUntilDue <= 3 && daysUntilDue >= 0 && task.status !== 'completed' && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">Deadline: {daysUntilDue === 0 ? 'Hôm nay' : `Còn ${daysUntilDue} ngày`}</span>
                        </div>
                      )}

                      {/* Feedback */}
                      {task.feedback && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <span className="font-medium">Feedback từ Reviewer: </span>
                            {task.feedback}
                          </p>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-3">
                        <span>Cập nhật: {new Date(task.updatedAt).toLocaleString('vi-VN')}</span>
                        <span>Deadline: {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => handleStartTask(task.id)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Bắt đầu
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors whitespace-nowrap">
                          Tiếp tục
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <>
                          <button className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors whitespace-nowrap">
                            Xem lại
                          </button>
                          {task.reviewStatus === 'rejected' && (
                            <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors whitespace-nowrap">
                              Sửa lại
                            </button>
                          )}
                        </>
                      )}
                      <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap">
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default AnnotatorDashboard;
