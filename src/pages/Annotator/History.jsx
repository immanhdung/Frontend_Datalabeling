import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { History, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { mockAnnotatorInboxTasks } from "../../mock/taskInbox";

const getCurrentUser = () => {
  const userRaw = localStorage.getItem("user");
  return userRaw ? JSON.parse(userRaw) : null;
};

const getAssignedTasksFromLocal = (userId) => {
  const assignedRaw = localStorage.getItem("assignedTasksByUser");
  const assignedMap = assignedRaw ? JSON.parse(assignedRaw) : {};
  const assignedTasks = assignedMap[String(userId)] || [];
  return Array.isArray(assignedTasks) ? assignedTasks : [];
};

const getAnnotatorTaskStore = () => {
  const taskRaw = localStorage.getItem("annotatorTasks");
  const tasks = taskRaw ? JSON.parse(taskRaw) : [];
  return Array.isArray(tasks) ? tasks : [];
};

const normalizeTask = (task) => ({
  id: String(task.id ?? task._id ?? ""),
  title: task.title ?? task.name ?? `Task #${task.id ?? task._id ?? ""}`,
  projectName: task.projectName ?? task.project_name ?? task.project?.name ?? "N/A",
  status: task.status ?? "pending",
  updatedAt: task.updatedAt ?? task.updated_at ?? task.createdAt ?? new Date().toISOString(),
  dueDate: task.dueDate ?? task.due_date ?? task.deadline ?? null,
  expiredAt: task.expiredAt ?? task.expired_at ?? null,
  progress: task.progress ?? 0,
  totalItems: task.totalItems ?? task.total_items ?? task.items?.length ?? 0,
});

export default function AnnotatorHistory() {
  const navigate = useNavigate();

  const historyTasks = useMemo(() => {
    const currentUser = getCurrentUser();
    const currentUserId = currentUser?.id ?? currentUser?._id;

    if (!currentUserId) {
      return [];
    }

    const assignedTasks = getAssignedTasksFromLocal(currentUserId).map(normalizeTask);
    const annotatorTasks = getAnnotatorTaskStore().map(normalizeTask);

    const mergedMap = new Map();
    [...assignedTasks, ...annotatorTasks].forEach((task) => {
      mergedMap.set(task.id, task);
    });

    const mergedTasks = Array.from(mergedMap.values());
    const sourceTasks = mergedTasks.length > 0 ? mergedTasks : mockAnnotatorInboxTasks.map(normalizeTask);

    return sourceTasks
      .filter((task) => ["in_progress", "completed", "expired"].includes(task.status))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Lịch sử hoạt động" userName="Annotator" userRole="annotator" />

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 mb-10 overflow-hidden relative">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
              <History className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hành trình gán nhãn</h2>
              <p className="text-slate-500 font-medium">Theo dõi các nhiệm vụ bạn đã và đang thực hiện.</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-50/50 to-transparent"></div>
        </div>

        {historyTasks.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-slate-500 font-black text-lg">Chưa có dữ liệu lịch sử</p>
            <p className="text-slate-400 text-sm mt-2">Bắt đầu thực hiện nhiệm vụ đầu tiên để xem lịch sử ở đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {historyTasks.map((task) => (
              <div
                key={task.id}
                className="group bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      ) : task.status === 'expired' ? (
                        <AlertCircle className="w-7 h-7 text-rose-500" />
                      ) : (
                        <Clock className="w-7 h-7 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{task.title}</h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">{task.projectName}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(task.expiredAt || task.updatedAt).toLocaleString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : task.status === 'expired' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                          {task.status === 'completed' ? 'Hoàn thành' : task.status === 'expired' ? 'Quá hạn' : 'Đang làm'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden lg:block text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tiến độ</p>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-black text-slate-700">{task.progress}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/annotator/tasks/${task.id}`)}
                      className="px-6 py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-indigo-600 transform group-hover:translate-x-1 transition-all shadow-lg"
                    >
                      MỞ LẠI NHIỆM VỤ
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full translate-x-16 translate-y-16 scale-0 group-hover:scale-100 transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
