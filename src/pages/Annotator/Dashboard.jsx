
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';
import { taskAPI } from '../../config/api';
import {
  fetchAssignedTasksForUser,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getLocalAssignedTasksForUser,
  normalizeTasks,
} from '../../utils/annotatorTaskHelpers';
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
  Calendar,
  Play
} from "lucide-react";

const AnnotatorDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const loadMyAssignedTasks = async () => {
      const currentUserId = getCurrentUserId();
      const currentUserIdentifiers = getCurrentUserIdentifiers();

      try {
        setLoading(true);
        setError('');

        if (!currentUserId) {
          setTasks([]);
          setError('Không tìm thấy thông tin người dùng hiện tại. Vui lòng đăng nhập lại.');
          return;
        }

        let assignedTasks = await fetchAssignedTasksForUser(taskAPI, currentUserId);

        if (assignedTasks.length === 0) {
          const localAssignedTasks = getLocalAssignedTasksForUser(currentUserIdentifiers);
          if (localAssignedTasks.length > 0) {
            assignedTasks = normalizeTasks(localAssignedTasks, currentUserId);
          }
        }

        setTasks(assignedTasks);
      } catch (loadError) {
        console.error('Failed to load assigned tasks:', loadError);
        const statusCode = loadError?.response?.status;
        if (statusCode === 401) {
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (statusCode === 403) {
          setError('Tài khoản chưa có quyền đọc danh sách task.');
        } else {
          setError('Không thể tải danh sách task được assign.');
        }
        const localAssignedTasks = getLocalAssignedTasksForUser(currentUserIdentifiers);

        if (Array.isArray(localAssignedTasks) && localAssignedTasks.length > 0) {
          const normalizedLocalTasks = normalizeTasks(localAssignedTasks, currentUserId);
          setTasks(normalizedLocalTasks);
          setError('');
        } else {
          setTasks([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMyAssignedTasks();
  }, []);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.status === 'completed');
    return {
      total: tasks.length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: completedTasks.length,
      approved: completedTasks.filter((task) => task.reviewStatus === 'approved').length,
    };
  }, [tasks]);

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
    window.location.reload();
  };

  const handleStartTask = (taskId) => {
    navigate(`/annotator/tasks/${taskId}`);
  };

  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Annotator Dashboard"
        userName="Annotator"
        userRole="annotator"
        onRefresh={handleRefresh}
        actionButton={
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" />
            Task mới
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center mb-6">
            <p className="text-gray-600 font-medium">Đang tải task được assign...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Tasks được assign"
            value={stats.total}
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Đang làm"
            value={stats.inProgress}
            icon={<Zap className="w-6 h-6" />}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          <StatsCard
            title="Đã hoàn thành"
            value={stats.completed}
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatsCard
            title="Được duyệt"
            value={stats.approved}
            icon={<ThumbsUp className="w-6 h-6" />}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Image className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Gán nhãn ảnh</h3>
                <p className="text-sm text-gray-500">Bounding box, Segmentation</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Gán nhãn văn bản</h3>
                <p className="text-sm text-gray-500">NER, Classification</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Volume2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Gán nhãn âm thanh</h3>
                <p className="text-sm text-gray-500">Transcription, Classification</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm task, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium text-gray-700"
            >
              <option value="recent">Mới nhất</option>
              <option value="priority">Ưu tiên</option>
              <option value="dueDate">Deadline</option>
            </select>
          </div>

          <div className="flex gap-3 overflow-x-auto">
            {[
              { key: 'all', label: 'Tất cả', count: tasks.length },
              { key: 'pending', label: 'Chưa làm', count: tasks.filter(t => t.status === 'pending').length },
              { key: 'in_progress', label: 'Đang làm', count: tasks.filter(t => t.status === 'in_progress').length },
              { key: 'completed', label: 'Hoàn thành', count: tasks.filter(t => t.status === 'completed').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
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

        {/* Tasks List */}
        <div className="space-y-6">
          {!loading && filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-500">Bạn chưa có task nào được assign</p>
            </div>
          ) : !loading ? (
            filteredTasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6"
                >
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-lg ${
                          task.type === 'image' ? 'bg-blue-100' :
                          task.type === 'text' ? 'bg-green-100' :
                          task.type === 'audio' ? 'bg-purple-100' : 'bg-orange-100'
                        }`}>
                          {task.type === 'image' && <Image className="w-6 h-6 text-blue-600" />}
                          {task.type === 'text' && <FileText className="w-6 h-6 text-green-600" />}
                          {task.type === 'audio' && <Volume2 className="w-6 h-6 text-purple-600" />}
                          {task.type === 'video' && <Video className="w-6 h-6 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-xl mb-1">{task.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 font-medium">{task.projectName}</span>
                      </div>

                      {task.status === 'in_progress' && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 font-medium mb-2">
                            <span>Tiến độ</span>
                            <span>{task.progress}% · {Math.floor(task.totalItems * task.progress / 100)}/{task.totalItems} items</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.status === 'pending' ? 'Chưa làm' :
                           task.status === 'in_progress' ? 'Đang làm' : 'Hoàn thành'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority === 'high' ? 'Ưu tiên cao' :
                           task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 uppercase">
                          {task.type}
                        </span>
                        {task.reviewStatus && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            task.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {task.reviewStatus === 'approved' ? '✓ Đã duyệt' : '✗ Cần sửa'}
                          </span>
                        )}
                      </div>

                      {daysUntilDue <= 3 && daysUntilDue >= 0 && task.status !== 'completed' && (
                        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-semibold text-orange-800">
                            Deadline: {daysUntilDue === 0 ? 'Hôm nay' : `Còn ${daysUntilDue} ngày`}
                          </span>
                        </div>
                      )}

                      {task.feedback && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                          <p className="text-sm text-red-900">
                            <span className="font-semibold">Feedback từ Reviewer: </span>
                            {task.feedback}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
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

                    <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
                      {task.status === 'pending' && (
                        <button 
                          onClick={() => handleStartTask(task.id)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Bắt đầu
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => handleStartTask(task.id)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-all"
                        >
                          Tiếp tục
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-semibold transition-all"
                          >
                            Xem lại
                          </button>
                          {task.reviewStatus === 'rejected' && (
                            <button
                              onClick={() => handleStartTask(task.id)}
                              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-semibold transition-all"
                            >
                              Sửa lại
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-all"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default AnnotatorDashboard;

