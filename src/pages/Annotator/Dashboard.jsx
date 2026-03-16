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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Dashboard" userName="Annotator" userRole="annotator" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 p-8 rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-xl shadow-indigo-200">
          <h1 className="text-3xl font-extrabold mb-2">Tổng quan công việc</h1>
          <p className="text-indigo-100/80">Dashboard chỉ hiển thị thống kê. Danh sách task nằm ở mục Nhiệm vụ gán nhãn.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
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
