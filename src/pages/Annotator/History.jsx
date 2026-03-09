import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { History, Clock, CheckCircle2, AlertCircle } from "lucide-react";

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

    return Array.from(mergedMap.values())
      .filter((task) => task.status === "in_progress" || task.status === "completed")
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Lịch sử dự án" userName="Annotator" userRole="annotator" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <History className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Task đã và đang thực hiện</h2>
          </div>
          <p className="text-sm text-gray-500">
            Danh sách này lấy từ tiến độ local hiện có của annotator.
          </p>
        </div>

        {historyTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-14 h-14 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Chưa có lịch sử task để hiển thị</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-500">{task.projectName}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(task.updatedAt).toLocaleString("vi-VN")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {task.progress}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/annotator/tasks/${task.id}`)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Mở task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
