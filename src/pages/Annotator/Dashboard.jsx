import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import { taskAPI } from '../../config/api';
import {
  fetchAssignedTasksForUser,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getLocalAssignedTasksForUser,
  normalizeTasks,
} from '../../utils/annotatorTaskHelpers';
import {
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Folder,
  Image as ImageIcon,
  FileText,
  Volume2,
  Video,
  ThumbsUp,
  Play,
  FolderOpen
} from 'lucide-react';

const MOCK_PROJECTS = [
  {
    id: 'mock-1',
    title: 'Phân loại phương tiện giao thông TP.HCM',
    projectName: 'HCMC Traffic AI',
    description: 'Gán nhãn các loại xe trong ảnh camera giao thông.',
    type: 'image',
    status: 'pending',
    priority: 'high',
    progress: 0,
    totalItems: 5,
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: 'Nhận diện văn bản y tế',
    projectName: 'Medical OCR',
    description: 'Trích xuất thông tin từ đơn thuốc và bệnh án.',
    type: 'text',
    status: 'in_progress',
    priority: 'medium',
    progress: 40,
    totalItems: 10,
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const getDaysUntilDue = (dueDate) =>
  Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export default function AnnotatorDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const loadTasks = async () => {
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

        let apiTasks = [];
        try {
          apiTasks = await fetchAssignedTasksForUser(taskAPI, currentUserIdentifiers);
          console.log("AnnotatorDashboard: Raw API Tasks:", apiTasks);
        } catch (apiErr) {

          console.warn('API task fetch failed, fallback local/mock', apiErr);
        }

        const localAssignedTasks = getLocalAssignedTasksForUser(currentUserIdentifiers);
        const normalizedLocalTasks = normalizeTasks(localAssignedTasks, currentUserId);

        const mergedMap = new Map();

        MOCK_PROJECTS.forEach((task) => {
          mergedMap.set(String(task.id), { ...task, isMock: true });
        });

        normalizedLocalTasks.forEach((task) => {
          if (task.id) {
            const existing = mergedMap.get(String(task.id));
            mergedMap.set(String(task.id), { ...existing, ...task });
          }
        });

        apiTasks.forEach((task) => {
          if (task.id) {
            const existing = mergedMap.get(String(task.id));
            mergedMap.set(String(task.id), {
              ...existing,
              ...task,
              items: task.items?.length > 0 ? task.items : existing?.items || task.items,
            });
          }
        });

        setTasks(Array.from(mergedMap.values()));
      } catch (loadError) {
        console.error('Failed to load assigned tasks:', loadError);
        setError('Không thể đồng bộ danh sách nhiệm vụ. Vui lòng kiểm tra kết nối.');

        const localTasks = getLocalAssignedTasksForUser(currentUserIdentifiers);
        const fallbackLocal = normalizeTasks(localTasks, currentUserId);
        setTasks(fallbackLocal.length > 0 ? fallbackLocal : MOCK_PROJECTS);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    expired: tasks.filter((task) => task.status === 'expired').length,
  }), [tasks]);

  const urgentTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => task.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesTab = activeTab === 'all' || task.status === activeTab;
      return matchesTab;
    });
  }, [tasks, activeTab]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleStartTask = (taskId) => {
    navigate(`/annotator/tasks/${taskId}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Dashboard" userName="Annotator" userRole="annotator" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 p-8 rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-xl shadow-indigo-200">
          <h1 className="text-3xl font-extrabold mb-2">Tổng quan công việc</h1>
          <p className="text-indigo-100/80">Dashboard chỉ hiển thị thống kê. Danh sách task nằm ở mục Nhiệm vụ gán nhãn.</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Tổng nhiệm vụ</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Chờ làm</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{stats.pending}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Đang làm</p>
            <p className="text-3xl font-black text-blue-700 mt-2">{stats.inProgress}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Hoàn thành</p>
            <p className="text-3xl font-black text-emerald-700 mt-2">{stats.completed}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Quá hạn</p>
            <p className="text-3xl font-black text-rose-700 mt-2">{stats.expired}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900">Task sắp đến hạn</h2>
            <button
              onClick={() => navigate('/annotator/tasks')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-sm"
            >
              Mở danh sách nhiệm vụ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : urgentTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Hiện chưa có task cần xử lý.</p>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map((task) => {
                const days = getDaysUntilDue(task.dueDate);
                const label =
                  days < 0
                    ? `Quá hạn ${Math.abs(days)} ngày`
                    : days === 0
                      ? 'Hết hạn hôm nay'
                      : `Còn ${days} ngày`;

                return (
                  <div key={task.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                    <div>
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.projectName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${days < 0 ? 'text-rose-600' : days <= 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-slate-400 inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
