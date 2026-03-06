const readJsonStorage = (key, fallbackValue) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallbackValue;
    }
    return JSON.parse(rawValue);
  } catch (error) {
    return fallbackValue;
  }
};

export const resolveApiData = (response) => response?.data?.data || response?.data || [];

export const getCurrentUser = () => {
  return readJsonStorage('user', null);
};

export const getCurrentUserId = () => {
  const currentUser = getCurrentUser();
  return currentUser?.id ?? currentUser?._id ?? null;
};

export const getTaskAssigneeId = (task) => {
  const directAssignee = task?.assignedTo ?? task?.assigned_to ?? task?.assigneeId ?? task?.annotatorId;
  if (typeof directAssignee === 'object' && directAssignee !== null) {
    return directAssignee.id ?? directAssignee._id;
  }
  return directAssignee;
};

export const normalizeTask = (task, assignedUserId = undefined) => ({
  ...task,
  id: String(task?.id ?? task?._id ?? ''),
  title: task?.title ?? task?.name ?? `Task #${task?.id ?? task?._id ?? ''}`,
  description: task?.description ?? '',
  type: task?.type ?? 'image',
  status: task?.status ?? 'pending',
  priority: task?.priority ?? 'medium',
  projectName: task?.projectName ?? task?.project_name ?? task?.project?.name ?? 'N/A',
  createdAt: task?.createdAt ?? task?.created_at ?? new Date().toISOString(),
  updatedAt: task?.updatedAt ?? task?.updated_at ?? task?.createdAt ?? new Date().toISOString(),
  dueDate: task?.dueDate ?? task?.due_date ?? task?.deadline ?? task?.createdAt ?? new Date().toISOString(),
  progress: task?.progress ?? 0,
  totalItems: task?.totalItems ?? task?.total_items ?? task?.items?.length ?? 0,
  reviewStatus: task?.reviewStatus ?? task?.review_status,
  feedback: task?.feedback,
  assignedTo:
    assignedUserId !== undefined
      ? String(assignedUserId)
      : getTaskAssigneeId(task),
});

export const normalizeTasks = (tasks, assignedUserId = undefined) => {
  if (!Array.isArray(tasks)) {
    return [];
  }
  return tasks.map((task) => normalizeTask(task, assignedUserId));
};

export const getAssignedTasksByUserMap = () => {
  return readJsonStorage('assignedTasksByUser', {});
};

export const getLocalAssignedTasksForUser = (userId) => {
  if (!userId) {
    return [];
  }
  const taskMap = getAssignedTasksByUserMap();
  const tasks = taskMap[String(userId)] || [];
  return Array.isArray(tasks) ? tasks : [];
};

export const upsertLocalAssignedTask = (task, userId) => {
  if (!userId || !task) {
    return;
  }

  const taskMap = getAssignedTasksByUserMap();
  const key = String(userId);
  const currentTasks = Array.isArray(taskMap[key]) ? taskMap[key] : [];
  const normalizedTask = normalizeTask(task, userId);

  taskMap[key] = [
    normalizedTask,
    ...currentTasks.filter(
      (existingTask) => String(existingTask?.id ?? existingTask?._id) !== String(normalizedTask.id)
    ),
  ];

  localStorage.setItem('assignedTasksByUser', JSON.stringify(taskMap));
};

export const fetchAssignedTasksForUser = async (taskApi, userId) => {
  if (!userId) {
    return [];
  }

  try {
    const myTasksResponse = await taskApi.getMyTasks();
    const myTasks = resolveApiData(myTasksResponse);
    return normalizeTasks(myTasks).filter(
      (task) => String(task.assignedTo) === String(userId)
    );
  } catch (myTaskError) {
    const allTasksResponse = await taskApi.getAll();
    const allTasks = resolveApiData(allTasksResponse);
    return normalizeTasks(allTasks).filter(
      (task) => String(task.assignedTo) === String(userId)
    );
  }
};
