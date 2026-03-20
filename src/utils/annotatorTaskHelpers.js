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
  const directAssignee =
    task?.assignedTo ??
    task?.AssignedTo ??
    task?.assigned_to ??
    task?.assigneeId ??
    task?.AssigneeId ??
    task?.annotatorId ??
    task?.AnnotatorId ??
    task?.assignee ??
    task?.Assignee ??
    task?.user ??
    task?.member ??
    task?.Member;

  if (typeof directAssignee === 'object' && directAssignee !== null) {
    return (
      directAssignee.id ??
      directAssignee.Id ??
      directAssignee._id ??
      directAssignee.userId ??
      directAssignee.UserId
    );
  }
  return directAssignee;
};

export const normalizeTask = (task, assignedUserId = undefined) => {
  const taskId = String(
    task?.id ??
    task?.Id ??
    task?._id ??
    task?.assignmentId ??
    task?.AssignmentId ??
    task?.taskId ??
    task?.TaskId ??
    ''
  );

  const rawStatus = String(task?.status || task?.Status || '').toLowerCase();
  let normalizedStatus = rawStatus;

  if (['assigned', 'unassigned', 'opened', 'open', 'new', 'todo'].includes(rawStatus)) {
    normalizedStatus = 'pending';
    // ✅ If progress > 0, it should be in "Đang làm" (in_progress)
    const progressVal = Number(task?.progress ?? task?.Progress ?? 0);
    if (progressVal > 0) {
      normalizedStatus = 'in_progress';
    }
  } else if (['in_progress', 'inprogress', 'incomplete', 'incompleted', 'doing', 'working'].includes(rawStatus)) {
    normalizedStatus = 'in_progress';
  } else if (['approved', 'accepted', 'success', 'passed'].includes(rawStatus)) {
    normalizedStatus = 'approved'; // ✅ Hoàn thành
  } else if (['rejected', 'failed', 'rework', 'needs_correction', 'conflict'].includes(rawStatus)) {
    normalizedStatus = 'rejected'; // ✅ Nhãn sai
  } else if (['completed', 'closed', 'done', 'submitted', 'pending_review', 'reviewing', 'finished', 'resolved'].includes(rawStatus)) {
    normalizedStatus = 'completed'; // Unified as "waiting for approval" / "finished"
  } else if (!rawStatus) {
    normalizedStatus = 'pending';
  }

  // ✅ Auto-expire if deadline passed and not completed
  const dueDateStr = task?.dueDate ?? task?.DueDate ?? task?.due_date ?? task?.deadline ?? task?.expiresAt;
  if (dueDateStr && normalizedStatus !== 'completed') {
    if (new Date(dueDateStr) < new Date()) {
      normalizedStatus = 'expired';
    }
  }

  return {
    ...task,
    id: taskId,
    title:
      task?.title ||
      task?.Title ||
      task?.name ||
      task?.Name ||
      task?.projectName ||
      task?.ProjectName ||
      task?.project?.name ||
      (taskId ? `Nhiệm vụ #${taskId.slice(0, 8)}` : 'Nhiệm vụ'),
    description: task?.description ?? task?.Description ?? '',
    type: task?.type ?? task?.MediaType ?? task?.mediaType ?? 'image',
    status: normalizedStatus,
    priority: task?.priority ?? task?.Priority ?? 'medium',
    projectName:
      task?.projectName ??
      task?.ProjectName ??
      task?.project_name ??
      task?.project?.name ??
      task?.project?.projectName ??
      'Dự án',
    projectId:
      task?.projectId ??
      task?.ProjectId ??
      task?.project?.id ??
      task?.project?.projectId ??
      null,
    datasetName:
      task?.datasetName ??
      task?.DatasetName ??
      task?.dataset_name ??
      task?.dataset?.name ??
      task?.dataset?.datasetName ??
      'Bộ dữ liệu',
    datasetId:
      task?.datasetId ??
      task?.DatasetId ??
      task?.dataset?.id ??
      task?.dataset?.datasetId ??
      null,
    createdAt:
      task?.createdAt ??
      task?.CreatedAt ??
      task?.created_at ??
      task?.assignedAt ??
      new Date().toISOString(),
    updatedAt:
      task?.updatedAt ??
      task?.UpdatedAt ??
      task?.updated_at ??
      task?.createdAt ??
      new Date().toISOString(),
    dueDate:
      task?.dueDate ??
      task?.DueDate ??
      task?.due_date ??
      task?.deadline ??
      task?.expiresAt ??
      task?.expiredAt ??
      // Default 7 days from now if no due date
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: task?.progress ?? task?.Progress ?? 0,
    totalItems:
      task?.totalItems ??
      task?.TotalItems ??
      task?.total_items ??
      task?.items?.length ??
      0,
    reviewStatus: task?.reviewStatus ?? task?.ReviewStatus ?? task?.review_status,
    feedback: task?.feedback ?? task?.Feedback,
    items: task?.items ?? task?.Items ?? [],
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

  const userIds = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];

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
      (existingTask) =>
        String(existingTask?.id ?? existingTask?._id) !== String(normalizedTask.id)
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
      assignedAt: new Date().toISOString(),
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

/**
 * Fetch tasks assigned to the current user from API.
 * Strategy: Get all tasks from API, filter by current user's IDs.
 * The API returns all tasks visible to the user (annotator sees only their own).
 */
export const fetchAssignedTasksForUser = async (taskApi, userIdOrIds) => {
  if (!userIdOrIds) {
    return [];
  }

  const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
  const stringIds = ids.map((id) => String(id).toLowerCase().trim());

  const isMatch = (task) => {
    const assignedId = String(getTaskAssigneeId(task) || '').toLowerCase().trim();
    if (!assignedId) return false;
    return stringIds.includes(assignedId);
  };

  let mergedTasks = [];

  // Try getMyTasks first (annotator-scoped)
  try {
    const myTasksResponse = await taskApi.getMyTasks();
    const myTasks = resolveApiData(myTasksResponse);
    if (import.meta.env.DEV && myTasks.length > 0) {
      console.log('[Tasks] API Sample:', myTasks[0]);
    }
    // For annotators: the API already returns only their tasks, so include all
    const normalized = normalizeTasks(myTasks);
    // Try with filter first, if none match include all (annotator scope)
    const filtered = normalized.filter(isMatch);
    mergedTasks = filtered.length > 0 ? filtered : normalized;
  } catch (err) {
    console.warn('[Tasks] getMyTasks failed:', err?.message || err);
  }

  // If still empty, try getAll
  if (mergedTasks.length === 0) {
    try {
      const allTasksResponse = await taskApi.getAll();
      const allTasks = resolveApiData(allTasksResponse);
      const normalized = normalizeTasks(allTasks);
      const filtered = normalized.filter(isMatch);
      mergedTasks = filtered.length > 0 ? filtered : normalized;
    } catch (err2) {
      console.warn('[Tasks] getAll failed:', err2?.message || err2);
    }
  }

  // Final fallback: local storage
  if (mergedTasks.length === 0) {
    const local = getLocalAssignedTasksForUser(ids);
    if (local.length > 0) {
      console.log('[Tasks] Using offline local fallback');
      mergedTasks = normalizeTasks(local);
    }
  }

  return mergedTasks;
};

/**
 * Automated consensus logic (called when 1 of the 3 annotators submits)
 */
export const processTaskConsensus = (taskId) => {
  try {
    const taskMap = getAssignedTasksByUserMap();
    const submissions = [];

    // Find all submissions for this taskId across all users
    Object.entries(taskMap).forEach(([uid, tasks]) => {
      if (!Array.isArray(tasks)) return;
      const t = tasks.find(item => String(item.id || item._id || '') === String(taskId));
      if (t && (t.status === 'completed' || t.status === 'pending_review' || t.status === 'done' || t.status === 'rejected')) {
        submissions.push({ userId: uid, task: t });
      }
    });

    // We only trigger consensus when we have exactly 3 submissions
    if (submissions.length === 3) {
      console.log(`[Consensus] 3 submissions found for task ${taskId}. Processing items...`);

      const allItemsCount = submissions[0].task.items?.length || 0;
      const updatedItemsPerUser = submissions.map(s => JSON.parse(JSON.stringify(s.task.items || [])));
      let hasGlobalConflict = false;

      // Check consensus for EACH item
      for (let i = 0; i < allItemsCount; i++) {
        const itemLabels = submissions.map(s => {
          const it = s.task.items?.[i] || {};
          const classification = it.classification || (it.annotations?.[0]?.label);
          if (classification) return classification;

          const cleanAnns = (it.annotations || []).map(a => ({
            label: a.label || a.labelName,
            x: Math.round(a.x || 0),
            y: Math.round(a.y || 0),
            w: Math.round(a.width || 0),
            h: Math.round(a.height || 0)
          })).sort((a, b) => a.label.localeCompare(b.label) || a.x - b.x);

          return JSON.stringify(cleanAnns);
        });

        const counts = {};
        itemLabels.forEach(l => counts[l] = (counts[l] || 0) + 1);
        const majorityValue = Object.entries(counts).find(([_, count]) => count >= 2);

        if (!majorityValue) {
          // Item i is a CONFLICT
          hasGlobalConflict = true;
          submissions.forEach((_, uIdx) => {
            if (updatedItemsPerUser[uIdx][i]) updatedItemsPerUser[uIdx][i].isConflict = true;
          });
        } else {
          // Item i has a winner
          const labelVal = majorityValue[0];
          const winnerIdxs = itemLabels.map((l, idx) => l === labelVal ? idx : -1).filter(idx => idx !== -1);
          const winnerOfItemIdx = winnerIdxs[Math.floor(Math.random() * winnerIdxs.length)];

          submissions.forEach((_, uIdx) => {
            if (updatedItemsPerUser[uIdx][i]) {
              updatedItemsPerUser[uIdx][i].isConsensusWinner = (uIdx === winnerOfItemIdx);
              updatedItemsPerUser[uIdx][i].consensusLabel = labelVal;
              updatedItemsPerUser[uIdx][i].isConflict = false;
            }
          });
        }
      }

      if (hasGlobalConflict) {
        // ❌ CONFLICT (at least one item failed)
        console.warn(`[Consensus] Global conflict detected for task ${taskId}.`);

        submissions.forEach((s, idx) => {
          const updatedTask = {
            ...s.task,
            items: updatedItemsPerUser[idx],
            status: 'rejected',
            feedback: 'Conflict! Một số ảnh có kết quả gán nhãn khác nhau. Vui lòng bấm "Làm lại" để gán nhãn lại các ảnh bị đỏ.',
            updatedAt: new Date().toISOString()
          };
          upsertLocalAssignedTask(updatedTask, s.userId);
        });
      } else {
        // ✅ ALL ITEMS HAVE MAJORITY
        console.log(`[Consensus] All items reached consensus for task ${taskId}.`);

        submissions.forEach((s, idx) => {
          const updatedTask = {
            ...s.task,
            items: updatedItemsPerUser[idx],
            isConsensusWinner: idx === 0, // Simplified: pick first as winner
            status: 'completed',
            updatedAt: new Date().toISOString()
          };
          upsertLocalAssignedTask(updatedTask, s.userId);
        });
      }
    }
  } catch (e) {
    console.error('[Consensus] Error processing consensus:', e);
  }
};
