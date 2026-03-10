import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { taskAPI } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
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
  Search,
  Folder,
  Calendar,
  Play,
  History,
  FolderOpen,
  ThumbsDown,
  XCircle,
  Eye,
  BarChart3
} from "lucide-react";

const ReviewerDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const loadMyReviewTasks = async () => {
      try {
        setLoading(true);
        setError("");

        let fetchedTasks = [];
        try {
          const res = await taskAPI.getAll();
          fetchedTasks = res.data?.items || res.data || [];
        } catch (apiErr) {
          console.warn("API task fetch failed", apiErr);
        }

        // Add local ones first (they might have more recent local progress)
        let localTasks = [];
        try {
          const localRaw = localStorage.getItem('annotatorTasks') || localStorage.getItem('reviewerTasks');
          if (localRaw) {
            localTasks = JSON.parse(localRaw);
          }
        } catch (e) { }

        const mergedMap = new Map();
        localTasks.forEach(task => {
          if (task.id) mergedMap.set(String(task.id), task);
        });

        fetchedTasks.forEach(task => {
          if (task.id || task.taskId) {
            const id = String(task.id || task.taskId);
            const existing = mergedMap.get(id);
            mergedMap.set(id, {
              ...existing,
              ...task,
            });
          }
        });

        let allTasks = Array.from(mergedMap.values()).map(t => ({
          ...t,
          id: String(t.id || t.taskId),
          title: t.title || t.name || t.taskTitle || "Nhiệm vụ chưa đặt tên",
          type: t.type || t.taskType || "image",
          status: t.status || "pending",
          reviewStatus: t.reviewStatus || "pending",
          projectName: t.projectName || t.project?.name || "Dự án N/A",
          priority: t.priority || "medium",
          progress: t.progress || 0,
          dueDate: t.dueDate || new Date().toISOString()
        }));

        // Ensure proper statuses between Annotator and Reviewer views
        allTasks = allTasks.map(t => {
          let revStatus = t.reviewStatus || "pending";
          let displayStatus = t.status || "pending";

          // If annotator marks as completed and it hasn't been reviewed, it becomes pending_review
          if (displayStatus === 'completed' && (revStatus === 'pending' || !t.reviewStatus)) {
            revStatus = "pending_review";
          }

          // If it's explicitly in a review process, it must be considered completed by annotator
          if (['pending_review', 'approved'].includes(revStatus)) {
            displayStatus = "completed";
          }

          return {
            ...t,
            reviewStatus: revStatus,
            status: displayStatus,
            dueDate: t.dueDate || new Date(Date.now() + 86400000).toISOString()
          };
        });

        // STRICT FILTER: Reviewer only gets to see tasks that the annotator has COMPLETELY finished
        const reviewerVisibleTasks = allTasks.filter(t =>
          t.status === 'completed' && ["pending_review", "approved", "rejected"].includes(t.reviewStatus)
        );

        setTasks(reviewerVisibleTasks);
      } catch (loadError) {
        console.error("Failed to load review tasks:", loadError);
        setError("Không thể đồng bộ danh sách nhiệm vụ. Vui lòng kiểm tra kết nối.");
      } finally {
        setLoading(false);
      }
    };

    loadMyReviewTasks();
  }, []);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.reviewStatus === "pending_review" || (task.status === "completed" && task.reviewStatus === "pending")).length,
      approved: tasks.filter((task) => task.reviewStatus === "approved").length,
      rejected: tasks.filter((task) => task.reviewStatus === "rejected").length,
    };
  }, [tasks]);

  const filteredTasks = tasks
    .filter((task) => {
      let matchesTab = true;
      if (activeTab === "pending_review") {
        matchesTab = task.reviewStatus === "pending_review" || (task.status === "completed" && task.reviewStatus === "pending");
      } else if (activeTab !== "all") {
        matchesTab = task.reviewStatus === activeTab;
      }

      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.projectName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === "dueDate") {
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else {
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      }
    });

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleStartReview = (taskId) => {
    navigate(`/reviewer/task/${taskId}`);
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 99;
    const days = Math.ceil(
      (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Reviewer Dashboard"
        userName="Reviewer"
        userRole="reviewer"
        onRefresh={handleRefresh}
      />

      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, nhiệm vụ review..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-violet-600 focus:bg-white transition-all text-slate-800"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reviewer/history')}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 font-bold text-sm"
            >
              <History className="w-4 h-4" />
              Lịch sử Review
            </button>
            <button
              onClick={() => navigate('/reviewer/analytics')}
              className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all flex items-center gap-2 font-bold text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              Thống kê
            </button>
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
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-medium focus:ring-2 focus:ring-violet-600 outline-none"
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
        <div className="mb-10 text-center md:text-left relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-violet-700 via-purple-700 to-violet-800 text-white shadow-xl shadow-purple-200 cursor-default">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold mb-2">Chào mừng trở lại! 👋</h1>
              <p className="text-violet-100/80 max-w-md">Bạn có {stats.pending} nhiệm vụ đang cần kiểm duyệt (review). Đảm bảo chất lượng dữ liệu nhé!</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
                <p className="text-white/70 text-sm font-medium mb-1">Cần Review</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <div className="bg-emerald-400/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-emerald-400/30">
                <p className="text-emerald-100 text-sm font-medium mb-1">Đã Duyệt</p>
                <p className="text-3xl font-bold text-emerald-300">{stats.approved}</p>
              </div>
              <div className="bg-rose-400/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-rose-400/30">
                <p className="text-rose-100 text-sm font-medium mb-1">Từ Chối</p>
                <p className="text-3xl font-bold text-rose-300">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-fuchsia-400/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Filters/Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex-wrap">
          {[
            { key: "pending_review", label: "Cần Review", icon: Clock },
            { key: "approved", label: "Đã duyệt", icon: CheckCircle2 },
            { key: "rejected", label: "Từ chối", icon: XCircle },
            { key: "all", label: "Tất cả", icon: Folder },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive
                  ? "bg-violet-50 text-violet-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-violet-600" : "text-slate-400"}`} />
                {tab.label}
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-violet-200 text-violet-800" : "bg-slate-100 text-slate-500"
                  }`}>
                  {tab.key === "all" ? stats.total : stats[tab.key] || 0}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-violet-600 rounded-t-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => (
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
            <p className="text-2xl font-bold text-slate-400">Không có nhiệm vụ nào {activeTab !== 'all' && 'trong mục này'}</p>
            <p className="text-slate-500 mt-2">Dữ liệu hoàn toàn sạch sẽ!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              const urgencyColor = daysUntilDue <= 3 ? "text-red-500" : "text-amber-500";

              return (
                <div
                  key={task.id}
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
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${task.reviewStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        task.reviewStatus === 'rejected' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {task.reviewStatus === 'approved' && <ThumbsUp className="w-3 h-3" />}
                        {task.reviewStatus === 'rejected' && <ThumbsDown className="w-3 h-3" />}
                        {(task.reviewStatus === 'pending_review' || (task.status === "completed" && task.reviewStatus === "pending")) ? <Clock className="w-3 h-3" /> : null}
                        {task.reviewStatus === 'approved' ? 'Đã duyệt' :
                          task.reviewStatus === 'rejected' ? 'Đã từ chối' : 'Cần Review'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-xl mb-2 line-clamp-1 group-hover:text-violet-600 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <Folder className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500 font-semibold">{task.projectName}</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">{task.description || "Nhiệm vụ cần được kiểm tra chất lượng nhãn dữ liệu."}</p>
                    {task.annotatorName && (
                      <p className="text-xs text-slate-400 mb-2 font-medium">Người gán nhãn: {task.annotatorName}</p>
                    )}
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-medium">Cập nhật: {new Date(task.updatedAt || task.createdAt || Date.now()).toLocaleDateString('vi-VN')}</span>
                        </div>
                        {daysUntilDue <= 3 && daysUntilDue >= 0 && task.reviewStatus !== 'approved' && (
                          <span className={`text-[11px] font-black ${urgencyColor}`}>
                            {daysUntilDue === 0 ? 'Gấp!' : `CÒN ${daysUntilDue} NGÀY`}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {(!task.reviewStatus || task.reviewStatus === 'pending_review' || task.reviewStatus === 'pending') ? (
                          <button
                            onClick={() => handleStartReview(task.id)}
                            className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 shadow-lg shadow-violet-100 font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4 fill-white" />
                            Review Ngay
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartReview(task.id)}
                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold transition-all"
                          >
                            Xem lại kết quả
                          </button>
                        )}
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

export default ReviewerDashboard;
