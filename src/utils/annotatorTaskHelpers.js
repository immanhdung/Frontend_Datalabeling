const readJsonStorage = (key, fallbackValue) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallbackValue;
    }
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

export const resolveApiData = (response) => {
  const root = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.tasks)) return root.tasks;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.results)) return root.results;
  return root || [];
};

export const getCurrentUser = () => {
  return readJsonStorage('user', null);
};

export const getCurrentUserId = () => {
  const currentUser = getCurrentUser();
  return (
    currentUser?.id ??
    currentUser?._id ??
    currentUser?.userId ??
    currentUser?.username ??
    currentUser?.email ??
    null
  );
};

export const getCurrentUserIdentifiers = () => {
  const currentUser = getCurrentUser();
  const candidates = [
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.username,
    currentUser?.email,
  ];

  return [...new Set(candidates.filter(Boolean).map((value) => String(value)))];
};

export const getTaskAssigneeId = (task) => {
  const directAssignee = task?.assignedTo ?? task?.AssignedTo ?? task?.assigned_to ?? task?.assigneeId ?? task?.AssigneeId ?? task?.annotatorId ?? task?.AnnotatorId ?? task?.assignee ?? task?.Assignee ?? task?.user ?? task?.member ?? task?.Member;
  if (typeof directAssignee === 'object' && directAssignee !== null) {
    return directAssignee.id ?? directAssignee.Id ?? directAssignee._id ?? directAssignee.userId ?? directAssignee.UserId;
  }
  return directAssignee;
};

export const normalizeTask = (task, assignedUserId = undefined) => {
  const taskId = String(task?.id ?? task?.Id ?? task?._id ?? task?.assignmentId ?? task?.AssignmentId ?? task?.taskId ?? task?.TaskId ?? '');
  return {
    ...task,
    id: taskId,
    title: task?.title || task?.Title || (taskId ? `Task #${taskId.slice(0, 8)}` : 'Nhiệm vụ'),
    description: task?.description ?? task?.Description ?? '',
    type: task?.type ?? task?.MediaType ?? 'image',
    status: (() => {
      const s = String(task?.status || task?.Status || '').toLowerCase();
      if (s === 'assigned' || s === 'unassigned' || s === 'opened') return 'pending';
      if (s === 'incompleted' || s === 'in_progress' || s === 'incomplete') return 'in_progress';
      if (s === 'completed' || s === 'closed') return 'completed';
      return s || 'pending';
    })(),
    priority: task?.priority ?? task?.Priority ?? 'medium',
    projectName: task?.projectName ?? task?.ProjectName ?? task?.project_name ?? task?.project?.name ?? task?.project?.projectName ?? 'Dự án',
    datasetName: task?.datasetName ?? task?.DatasetName ?? task?.dataset_name ?? task?.dataset?.name ?? task?.dataset?.datasetName ?? 'Bộ dữ liệu',
    createdAt: task?.createdAt ?? task?.CreatedAt ?? task?.created_at ?? new Date().toISOString(),
    updatedAt: task?.updatedAt ?? task?.UpdatedAt ?? task?.updated_at ?? task?.createdAt ?? new Date().toISOString(),
    dueDate: task?.dueDate ?? task?.DueDate ?? task?.due_date ?? task?.deadline ?? task?.createdAt ?? new Date().toISOString(),
    progress: task?.progress ?? task?.Progress ?? 0,
    totalItems: task?.totalItems ?? task?.TotalItems ?? task?.total_items ?? task?.items?.length ?? 0,
    reviewStatus: task?.reviewStatus ?? task?.ReviewStatus ?? task?.review_status,
    feedback: task?.feedback ?? task?.Feedback,
    assignedTo:
      assignedUserId !== undefined
        ? String(assignedUserId)
        : getTaskAssigneeId(task),
  };
};

export const normalizeTasks = (tasks, assignedUserId = undefined) => {
  if (!Array.isArray(tasks)) {
    return [];
  }
  return tasks.map((task) => normalizeTask(task, assignedUserId));
};

export const getAssignedTasksByUserMap = () => {
  return readJsonStorage('assignedTasksByUser', {});
};

export const getLocalAssignedTasksForUser = (userIdOrIds) => {
  if (!userIdOrIds) {
    return [];
  }

  const userIds = Array.isArray(userIdOrIds)
    ? userIdOrIds
    : [userIdOrIds];

  const taskMap = getAssignedTasksByUserMap();
  const safeTasks = userIds.flatMap((userId) => {
    const tasks = taskMap[String(userId)] || [];
    return Array.isArray(tasks) ? tasks : [];
  });
  const taskById = {};

  safeTasks.forEach((task) => {
    const taskId = String(task?.id ?? task?._id ?? '');
    if (!taskId) {
      return;
    }
    taskById[taskId] = task;
  });

  return Object.values(taskById);
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

export const assignLocalTaskToUser = (task, userId) => {
  if (!task || !userId) {
    return;
  }

  const taskMap = getAssignedTasksByUserMap();
  const targetUserKey = String(userId);
  const targetTasks = Array.isArray(taskMap[targetUserKey]) ? taskMap[targetUserKey] : [];
  const existingTask = targetTasks.find(
    (item) => String(item?.id ?? item?._id) === String(task?.id ?? task?._id)
  );

  const normalizedTask = normalizeTask(
    {
      ...task,
      status: existingTask?.status ?? 'pending',
      progress: existingTask?.progress ?? 0,
      reviewStatus: existingTask?.reviewStatus,
      items: existingTask?.items ?? task?.items,
      assigned_to: userId,
      assignedTo: userId,
      updatedAt: new Date().toISOString(),
    },
    userId
  );

  taskMap[targetUserKey] = [
    normalizedTask,
    ...targetTasks.filter(
      (item) => String(item?.id ?? item?._id) !== String(normalizedTask.id)
    ),
  ];

  localStorage.setItem('assignedTasksByUser', JSON.stringify(taskMap));
};

export const fetchAssignedTasksForUser = async (taskApi, userIdOrIds) => {
  if (!userIdOrIds) {
    return [];
  }

  const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
  const stringIds = ids.map(id => String(id).toLowerCase().trim());
  const isMatch = (task) => {
     const assignedId = String(getTaskAssigneeId(task) || '').toLowerCase().trim();
     return stringIds.includes(assignedId);
  };
  
  let mergedTasks = [];

  try {
    const myTasksResponse = await taskApi.getMyTasks();
    const myTasks = resolveApiData(myTasksResponse);
    if (myTasks.length > 0) console.log("Task API Sample:", myTasks[0]);
    mergedTasks = normalizeTasks(myTasks).filter(isMatch);
  } catch (err) {
    console.warn("getMyTasks failed, trying getAll", err);
  }

  // Try getAll if still empty or failed
  if (mergedTasks.length === 0) {
    try {
      const allTasksResponse = await taskApi.getAll();
      const allTasks = resolveApiData(allTasksResponse);
      if (allTasks.length > 0 && mergedTasks.length === 0) console.log("All Tasks Sample:", allTasks[0]);
      mergedTasks = normalizeTasks(allTasks).filter(isMatch);
    } catch (err2) {
      console.warn("getAll failed for tasks", err2);
    }
  }

  // Final fallback to local storage
  if (mergedTasks.length === 0) {
    const local = getLocalAssignedTasksForUser(ids);
    if (local.length > 0) {
      console.log("Using local offline tasks fallback");
      mergedTasks = normalizeTasks(local);
    }
  }

  return mergedTasks;
};
