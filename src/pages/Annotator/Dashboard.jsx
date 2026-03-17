
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
  Image as ImageIcon,
  FileText,
  Volume2,
  Video,
  AlertCircle,
  Plus,
  Search,
  Folder,
  Calendar,
  Play,
  FolderOpen
} from "lucide-react";

const AnnotatorDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const loadMyAssignedTasks = async () => {
      const currentUserId = getCurrentUserId();
      const currentUserIdentifiers = getCurrentUserIdentifiers();

      try {
        setLoading(true);
        setError("");

        if (!currentUserId) {
          setTasks([]);
          setError("Không tìm thấy thông tin người dùng hiện tại. Vui lòng đăng nhập lại.");
          return;
        }

        // 1. Fetch from API
        let apiTasks = [];
        try {
          apiTasks = await fetchAssignedTasksForUser(taskAPI, currentUserIdentifiers);
          console.log("AnnotatorDashboard: Raw API Tasks:", apiTasks);
        } catch (apiErr) {
          console.warn("API task fetch failed", apiErr);
          setError("Không thể tải danh sách nhiệm vụ từ server. Vui lòng kiểm tra kết nối.");
        }

        console.log("AnnotatorDashboard: Final tasks set:", apiTasks);
        setTasks(apiTasks);
      } catch (loadError) {
        console.error("Failed to load assigned tasks:", loadError);
        setError("Không thể đồng bộ danh sách nhiệm vụ. Vui lòng kiểm tra kết nối.");
      } finally {
        setLoading(false);
      }
    };

    loadMyAssignedTasks();
  }, []);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.status === "completed");
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      completed: completedTasks.length,
      approved: completedTasks.filter((task) => task.reviewStatus === "approved")
        .length,
    };
  }, [tasks]);

  const filteredTasks = tasks
    .filter((task) => {
      const matchesTab = activeTab === "all" || task.status === activeTab;
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === "dueDate") {
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
    const days = Math.ceil(
      (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, nhiệm vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              title="Làm mới"
            >
              <Zap className="w-5 h-5" />
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="recent">Mới nhất</option>
              <option value="priority">Ưu tiên</option>
              <option value="dueDate">Gần hạn</option>
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-10 text-center md:text-left relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-xl shadow-indigo-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold mb-2">Chào mừng trở lại, Annotator! 👋</h1>
              <p className="text-indigo-100/80 max-w-md">Bạn có {stats.pending} nhiệm vụ đang chờ bắt đầu. Hãy cùng nhau gán nhãn dữ liệu thôi nào!</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
                <p className="text-white/70 text-sm font-medium mb-1">Cần làm</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
                <p className="text-white/70 text-sm font-medium mb-1">Đang thực hiện</p>
                <p className="text-3xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="bg-emerald-400/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-emerald-400/30">
                <p className="text-emerald-100 text-sm font-medium mb-1">Hoàn thành</p>
                <p className="text-3xl font-bold text-emerald-300">{stats.completed}</p>
              </div>
            </div>
          </div>

          {/* Abstract shapes for background */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Filters/Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex-wrap">
          {[
            { key: "pending", label: "Chờ làm", icon: Clock },
            { key: "in_progress", label: "Đang làm", icon: Zap },
            { key: "completed", label: "Hoàn thành", icon: CheckCircle2 },
            { key: "all", label: "Tất cả", icon: Folder },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-500"
                  }`}>
                  {tab.key === "all" ? stats.total : stats[tab.key] || 0}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white h-72 rounded-3xl border border-slate-100"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra lỗi</h3>
            <p className="text-slate-600 mb-8">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              Thử lại ngay
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-2xl font-bold text-slate-400">Không có nhiệm vụ nào trong mục này</p>
            <p className="text-slate-500 mt-2">Bạn đã hoàn thành tốt mọi việc rồi đấy!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task, index) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              const urgencyColor = daysUntilDue <= 3 ? "text-red-500" : "text-amber-500";

              return (
                <div
                  key={task.id || `task-${index}`}
                  className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 rounded-[1.25rem] ${task.type === 'image' ? 'bg-blue-50 text-blue-600' :
                      task.type === 'text' ? 'bg-emerald-50 text-emerald-600' :
                        task.type === 'audio' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                      {task.type === 'image' && <ImageIcon className="w-6 h-6" />}
                      {task.type === 'text' && <FileText className="w-6 h-6" />}
                      {task.type === 'audio' && <Volume2 className="w-6 h-6" />}
                      {task.type === 'video' && <Video className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                        {task.priority === 'high' ? 'Ưu tiên cao' :
                          task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                      </span>
                      {task.reviewStatus && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${task.reviewStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {task.reviewStatus === 'approved' ? <ThumbsUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {task.reviewStatus === 'approved' ? 'Đã duyệt' : 'Cần sửa'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-xl mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                    <div className="flex flex-col gap-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500 font-semibold">{task.projectName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">{task.datasetName}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-6">{task.description}</p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50">
                    {task.status === 'in_progress' && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span>Tiến độ gán nhãn</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 shadow-inner">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Đã gán: {Math.floor(task.totalItems * task.progress / 100)}/{task.totalItems} items</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-medium">Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        {daysUntilDue <= 3 && daysUntilDue >= 0 && task.status !== 'completed' && (
                          <span className={`text-[11px] font-black ${urgencyColor}`}>
                            {daysUntilDue === 0 ? 'Hết hạn hôm nay!' : `CÒN ${daysUntilDue} NGÀY`}
                          </span>
                        )}
                      </div>

                      {task.feedback && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl mb-2">
                          <p className="text-[11px] text-red-700 italic">
                            <span className="font-bold not-italic">Feedback: </span>"{task.feedback}"
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            Bắt đầu ngay
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold transition-all"
                          >
                            Tiếp tục làm
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold transition-all"
                          >
                            {task.reviewStatus === 'rejected' ? 'Sửa lại nhiệm vụ' : 'Xem chi tiết'}
                          </button>
                        )}
                        <button
                          onClick={() => handleStartTask(task.id)}
                          className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                          title="Chi tiết"
                        >
                          <FolderOpen className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};


export default AnnotatorDashboard;

