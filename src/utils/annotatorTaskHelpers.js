const readJsonStorage = (key, fallbackValue) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallbackValue;
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

export const resolveImageUrl = (item) => {
  if (!item) return '';
  const nested = item?.datasetItem || item?.DatasetItem;
  if (nested) { const u = resolveImageUrl(nested); if (u) return u; }
  const candidate =
    item?.storageUri || item?.StorageUri ||
    item?.thumbnailUrl || item?.previewUrl ||
    item?.imageUrl || item?.ImageUrl ||
    item?.url || item?.Url ||
    item?.path || item?.Path ||
    item?.filePath || item?.mediaUrl || '';
  if (!candidate) { 
    if (item?.data && typeof item.data === 'object') return resolveImageUrl(item.data); 
    return ''; 
  }
  if (/^(https?:|data:|blob:)/i.test(candidate)) return candidate;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api$/i, '').replace(/\/$/, '');
  return candidate.startsWith('/') ? `${base}${candidate}` : `${base}/${candidate}`;
};

export const getCurrentUser = () => readJsonStorage('user', null);

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
    task?.assignedTo ?? task?.AssignedTo ?? task?.assigned_to ??
    task?.assigneeId ?? task?.AssigneeId ?? task?.annotatorId ??
    task?.AnnotatorId ?? task?.assignee ?? task?.Assignee ??
    task?.user ?? task?.member ?? task?.Member;

  if (typeof directAssignee === 'object' && directAssignee !== null) {
    return directAssignee.id ?? directAssignee.Id ?? directAssignee._id ??
      directAssignee.userId ?? directAssignee.UserId;
  }
  return directAssignee;
};

export const normalizeTask = (task, assignedUserId = undefined) => {
  const taskId = String(
    task?.id ?? task?.Id ?? task?._id ?? task?.assignmentId ??
    task?.AssignmentId ?? task?.taskId ?? task?.TaskId ?? ''
  );

  const rawStatus = String(task?.status || task?.Status || '').toLowerCase();
  let normalizedStatus = rawStatus;

  if (['assigned', 'unassigned', 'opened', 'open', 'new', 'todo'].includes(rawStatus)) {
    normalizedStatus = 'pending';
    const progressVal = Number(task?.progress ?? task?.Progress ?? 0);
    if (progressVal > 0) normalizedStatus = 'in_progress';
  } else if (['in_progress', 'inprogress', 'incomplete', 'incompleted', 'doing', 'working'].includes(rawStatus)) {
    normalizedStatus = 'in_progress';
  } else if (['approved', 'accepted', 'success', 'passed'].includes(rawStatus)) {
    normalizedStatus = 'approved';
  } else if (['rejected', 'failed', 'rework', 'needs_correction', 'conflict'].includes(rawStatus)) {
    normalizedStatus = 'rejected';
  } else if (['completed', 'closed', 'done', 'submitted', 'pending_review', 'reviewing', 'finished', 'resolved'].includes(rawStatus)) {
    normalizedStatus = 'completed';
  } else if (!rawStatus) {
    normalizedStatus = 'pending';
  }

  const dueDateStr = task?.dueDate ?? task?.DueDate ?? task?.due_date ?? task?.deadline ?? task?.expiresAt;
  if (dueDateStr && normalizedStatus !== 'completed' && normalizedStatus !== 'approved' && normalizedStatus !== 'rejected') {
    if (new Date(dueDateStr) < new Date()) normalizedStatus = 'expired';
  }

  return {
    ...task,
    id: taskId,
    title:
      task?.title || task?.Title || task?.name || task?.Name ||
      task?.projectName || task?.ProjectName || task?.project?.name ||
      (taskId ? `Nhiệm vụ #${taskId.slice(0, 8)}` : 'Nhiệm vụ'),
    description: task?.description ?? task?.Description ?? '',
    type: task?.type ?? task?.MediaType ?? task?.mediaType ?? 'image',
    status: normalizedStatus,
    priority: task?.priority ?? task?.Priority ?? 'medium',
    projectName:
      task?.projectName ?? task?.ProjectName ?? task?.project_name ??
      task?.project?.name ?? task?.project?.projectName ?? 'Dự án',
    projectId:
      task?.projectId ?? task?.ProjectId ?? task?.project?.id ??
      task?.project?.projectId ?? null,
    datasetName:
      task?.datasetName ?? task?.DatasetName ?? task?.dataset_name ??
      task?.dataset?.name ?? task?.dataset?.datasetName ?? 'Bộ dữ liệu',
    datasetId:
      task?.datasetId ?? task?.DatasetId ?? task?.dataset?.id ??
      task?.dataset?.datasetId ?? null,
    createdAt:
      task?.createdAt ?? task?.CreatedAt ?? task?.created_at ??
      task?.assignedAt ?? new Date().toISOString(),
    updatedAt:
      task?.updatedAt ?? task?.UpdatedAt ?? task?.updated_at ??
      task?.createdAt ?? new Date().toISOString(),
    dueDate:
      task?.dueDate ?? task?.DueDate ?? task?.due_date ?? task?.deadline ??
      task?.expiresAt ?? task?.expiredAt ??
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: task?.progress ?? task?.Progress ?? 0,
    totalItems:
      task?.totalItems ?? task?.TotalItems ?? task?.total_items ??
      task?.items?.length ?? 0,
    processedCount:
      task?.processedCount ??
      (Array.isArray(task?.items || task?.Items)
        ? (task?.items || task?.Items).filter((it) =>
            ['done', 'completed', 'skipped', 'submitted', 'hoan thanh', 'hoàn thành'].includes(
              String(it.status || '').toLowerCase()
            )
          ).length
        : Math.round(((task?.progress ?? task?.Progress ?? 0) * (task?.totalItems ?? 0)) / 100)),
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
  if (!Array.isArray(tasks)) return [];
  return tasks.map((task) => normalizeTask(task, assignedUserId));
};

export const getAssignedTasksByUserMap = () => readJsonStorage('assignedTasksByUser', {});

export const getLocalAssignedTasksForUser = (userIdOrIds) => {
  if (!userIdOrIds) return [];
  const userIds = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
  const taskMap = getAssignedTasksByUserMap();
  const safeTasks = userIds.flatMap((userId) => {
    const tasks = taskMap[String(userId)] || [];
    return Array.isArray(tasks) ? tasks : [];
  });
  const taskById = {};
  safeTasks.forEach((task) => {
    const taskId = String(task?.id ?? task?._id ?? '');
    if (!taskId) return;
    taskById[taskId] = task;
  });
  return Object.values(taskById);
};

export const upsertLocalAssignedTask = (task, userId) => {
  if (!userId || !task) return;
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
  if (!task || !userId) return;
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

export const fetchAssignedTasksForUser = async (taskApi, userIdOrIds) => {
  if (!userIdOrIds) return [];
  const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
  const stringIds = ids.map((id) => String(id).toLowerCase().trim());

  const isMatch = (task) => {
    const assignedId = String(getTaskAssigneeId(task) || '').toLowerCase().trim();
    if (!assignedId) return false;
    return stringIds.includes(assignedId);
  };

  let mergedTasks = [];

  try {
    const myTasksResponse = await taskApi.getMyTasks();
    const myTasks = resolveApiData(myTasksResponse);
    const normalized = normalizeTasks(myTasks);
    const filtered = normalized.filter(isMatch);
    mergedTasks = filtered.length > 0 ? filtered : normalized;
  } catch (err) {
    console.warn('[Tasks] getMyTasks failed:', err?.message || err);
  }

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

  if (mergedTasks.length === 0) {
    const local = getLocalAssignedTasksForUser(ids);
    if (local.length > 0) mergedTasks = normalizeTasks(local);
  }

  return mergedTasks;
};

/**
 * Get a label fingerprint for an item's annotation from a submission.
 * Used for comparing across annotators.
 */
const getItemLabelFingerprint = (item) => {
  if (!item) return '__empty__';
  // Classification-type task
  if (item.classification) return String(item.classification).trim().toLowerCase();
  // Bounding box task - use sorted label list as fingerprint
  const anns = Array.isArray(item.annotations) ? item.annotations : [];
  if (anns.length === 0) return '__empty__';
  const labels = anns
    .map(a => String(a.label || a.labelName || '').trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return labels.join('|');
};

/**
 * Core consensus processing.
 * Called after any annotator submits. Checks if we have 3 submissions for a task.
 *
 * Rules:
 * - Need exactly 3 submissions (status: completed/done/pending_review)
 * - For each image:
 *   - If 2+ annotators agree → majority win → random 1 winner among agreeing annotators
 *   - If all 3 disagree → conflict → annotators must redo that image
 * - After processing:
 *   - Non-conflict images: status stays 'completed', isConflict=false, winner selected
 *   - Conflict images: task status → 'rejected', isConflict=true for those items
 * 
 * Returns: { hasConflict: boolean, conflictCount: number, totalItems: number }
 */
export const processTaskConsensus = (taskId) => {
  try {
    const taskMap = getAssignedTasksByUserMap();
    const submissions = [];

    // Collect all submissions for this taskId across all users
    Object.entries(taskMap).forEach(([uid, tasks]) => {
      if (!Array.isArray(tasks)) return;
      const t = tasks.find(
        item => String(item.id || item._id || '') === String(taskId)
      );
      if (
        t &&
        (
          t.status === 'completed' ||
          t.status === 'pending_review' ||
          t.status === 'done' ||
          t.status === 'submitted'
        )
      ) {
        submissions.push({ userId: uid, task: t });
      }
    });

    console.log(`[Consensus] Found ${submissions.length} submission(s) for task ${taskId}`);

    // Need exactly 3 submissions to process consensus
    if (submissions.length < 3) {
      console.log(`[Consensus] Waiting for more submissions (${submissions.length}/3)`);
      return { hasConflict: false, conflictCount: 0, totalItems: 0, ready: false };
    }

    // Use first 3 submissions
    const threeSubmissions = submissions.slice(0, 3);
    const itemCount = Math.max(
      ...threeSubmissions.map(s => (s.task.items || []).length),
      0
    );

    if (itemCount === 0) {
      console.warn('[Consensus] No items found in submissions');
      return { hasConflict: false, conflictCount: 0, totalItems: 0, ready: true };
    }

    console.log(`[Consensus] Processing ${itemCount} items across 3 annotators`);

    // Deep copy items for each annotator
    const updatedItemsPerUser = threeSubmissions.map(s =>
      JSON.parse(JSON.stringify(s.task.items || []))
    );

    let hasAnyConflict = false;
    let conflictCount = 0;

    // Process each item
    for (let i = 0; i < itemCount; i++) {
      const fingerprints = threeSubmissions.map(s => {
        const item = (s.task.items || [])[i];
        return getItemLabelFingerprint(item);
      });

      console.log(`[Consensus] Item ${i} fingerprints:`, fingerprints);

      // Count occurrences of each fingerprint
      const counts = {};
      fingerprints.forEach(fp => {
        counts[fp] = (counts[fp] || 0) + 1;
      });

      // Find majority (2 or 3 agreeing)
      const majorityEntry = Object.entries(counts).find(([_, count]) => count >= 2);

      if (majorityEntry) {
        // Has majority - find which annotators agree
        const majorityFingerprint = majorityEntry[0];
        const agreeingIndices = fingerprints
          .map((fp, idx) => fp === majorityFingerprint ? idx : -1)
          .filter(idx => idx !== -1);

        // Randomly pick one winner among agreeing annotators
        const winnerIdx = agreeingIndices[Math.floor(Math.random() * agreeingIndices.length)];

        console.log(`[Consensus] Item ${i}: majority "${majorityFingerprint}", winner index: ${winnerIdx}`);

        // Mark items
        threeSubmissions.forEach((_, uIdx) => {
          if (updatedItemsPerUser[uIdx][i]) {
            updatedItemsPerUser[uIdx][i].isConflict = false;
            updatedItemsPerUser[uIdx][i].isConsensusWinner = (uIdx === winnerIdx);
            updatedItemsPerUser[uIdx][i].consensusLabel = majorityFingerprint;
          }
        });
      } else {
        // All 3 differ → conflict
        hasAnyConflict = true;
        conflictCount++;
        console.warn(`[Consensus] Item ${i}: CONFLICT - all 3 annotators disagree`);

        threeSubmissions.forEach((_, uIdx) => {
          if (updatedItemsPerUser[uIdx][i]) {
            updatedItemsPerUser[uIdx][i].isConflict = true;
            updatedItemsPerUser[uIdx][i].isConsensusWinner = false;
            updatedItemsPerUser[uIdx][i].consensusLabel = null;
          }
        });
      }
    }

    // Determine non-conflict items (those that have a consensus winner)
    // These are ready for reviewer
    const nonConflictWinnerItems = [];
    for (let i = 0; i < itemCount; i++) {
      for (let uIdx = 0; uIdx < 3; uIdx++) {
        const item = updatedItemsPerUser[uIdx][i];
        if (item && item.isConsensusWinner && !item.isConflict) {
          nonConflictWinnerItems.push({ itemIndex: i, userIdx: uIdx, item });
          break; // Only take one winner per item
        }
      }
    }

    // Save updated tasks back to storage
    threeSubmissions.forEach((s, idx) => {
      const hasConflictsForThisUser = updatedItemsPerUser[idx].some(it => it.isConflict);

      const newStatus = hasAnyConflict ? 'rejected' : 'completed';
      const feedback = hasAnyConflict
        ? `Có ${conflictCount} ảnh bị conflict (3 annotator gán nhãn khác nhau). Vui lòng bấm "Làm lại" để gán nhãn lại những ảnh được đánh dấu đỏ.`
        : null;

      const updatedTask = {
        ...s.task,
        items: updatedItemsPerUser[idx],
        status: newStatus,
        feedback: feedback,
        hasConflict: hasAnyConflict,
        conflictCount,
        nonConflictItems: nonConflictWinnerItems.map(w => w.itemIndex),
        updatedAt: new Date().toISOString(),
      };

      upsertLocalAssignedTask(updatedTask, s.userId);
    });

    // If there are non-conflict items, create a "reviewer task" in local storage
    // so the reviewer can see the items ready for review
    if (nonConflictWinnerItems.length > 0) {
      const baseTask = threeSubmissions[0].task;
      createReviewerTask(taskId, baseTask, nonConflictWinnerItems, threeSubmissions, updatedItemsPerUser);
    }

    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('consensusProcessed', {
      detail: { taskId, hasConflict: hasAnyConflict, conflictCount, totalItems: itemCount }
    }));

    console.log(`[Consensus] Done. hasConflict=${hasAnyConflict}, conflictCount=${conflictCount}/${itemCount}`);

    return {
      hasConflict: hasAnyConflict,
      conflictCount,
      totalItems: itemCount,
      nonConflictCount: itemCount - conflictCount,
      ready: true
    };
  } catch (e) {
    console.error('[Consensus] Error processing consensus:', e);
    return { hasConflict: false, conflictCount: 0, totalItems: 0, ready: false };
  }
};

/**
 * Creates a reviewer task in localStorage for non-conflict items.
 * The reviewer will see this as a pending_review task.
 */
const createReviewerTask = (taskId, baseTask, winnerItems, submissions, updatedItemsPerUser) => {
  try {
    // Build winner items list for the reviewer
    const reviewItems = winnerItems.map(({ itemIndex, userIdx }) => {
      const item = updatedItemsPerUser[userIdx][itemIndex];
      return {
        ...item,
        taskItemId: item.taskItemId || item.id,
        isConsensusWinner: true,
        isConflict: false,
        itemIndex,
        winningAnnotatorIdx: userIdx,
        winningAnnotatorId: submissions[userIdx].userId,
      };
    });

    const reviewerTaskKey = `reviewerTask_${taskId}`;
    const reviewerTask = {
      id: taskId,
      taskId,
      title: baseTask.title || baseTask.name || `Task #${String(taskId).slice(0, 8)}`,
      projectName: baseTask.projectName || baseTask.project?.name || 'Dự án',
      projectId: baseTask.projectId,
      datasetName: baseTask.datasetName || 'Bộ dữ liệu',
      type: baseTask.type || 'image',
      status: 'pending_review',
      annotatorCount: 3,
      annotatorIds: submissions.map(s => s.userId),
      items: reviewItems,
      totalItems: reviewItems.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(reviewerTaskKey, JSON.stringify(reviewerTask));

    // Also add to a "pending reviews" list
    const pendingReviews = readJsonStorage('pendingReviewTasks', []);
    const filtered = pendingReviews.filter(id => id !== taskId);
    filtered.unshift(taskId);
    localStorage.setItem('pendingReviewTasks', JSON.stringify(filtered));

    // Dispatch event for reviewer dashboard
    window.dispatchEvent(new CustomEvent('newReviewTask', { detail: { taskId } }));

    console.log(`[Consensus] Created reviewer task for ${reviewItems.length} non-conflict items`);
  } catch (e) {
    console.error('[Consensus] Error creating reviewer task:', e);
  }
};

/**
 * Get all pending reviewer tasks from localStorage
 */
export const getPendingReviewerTasks = () => {
  try {
    const pendingIds = readJsonStorage('pendingReviewTasks', []);
    return pendingIds
      .map(taskId => {
        const task = readJsonStorage(`reviewerTask_${taskId}`, null);
        return task;
      })
      .filter(Boolean)
      .filter(t => t.status === 'pending_review');
  } catch {
    return [];
  }
};

/**
 * Get a specific reviewer task
 */
export const getReviewerTask = (taskId) => {
  return readJsonStorage(`reviewerTask_${taskId}`, null);
};

/**
 * Mark a reviewer task as reviewed (approved/rejected)
 */
export const markReviewerTaskReviewed = (taskId, decision, feedback = '') => {
  try {
    const task = readJsonStorage(`reviewerTask_${taskId}`, null);
    if (!task) return;

    const updatedTask = {
      ...task,
      status: decision === 'approved' ? 'approved' : 'rejected',
      reviewDecision: decision,
      reviewFeedback: feedback,
      reviewedAt: new Date().toISOString(),
    };
    localStorage.setItem(`reviewerTask_${taskId}`, JSON.stringify(updatedTask));

    // Update pending list
    const pendingReviews = readJsonStorage('pendingReviewTasks', []);
    localStorage.setItem(
      'pendingReviewTasks',
      JSON.stringify(pendingReviews.filter(id => id !== taskId))
    );

    // Update annotator tasks with reviewer decision
    const taskMap = getAssignedTasksByUserMap();
    Object.keys(taskMap).forEach(uid => {
      if (Array.isArray(taskMap[uid])) {
        taskMap[uid] = taskMap[uid].map(t => {
          if (String(t.id || t._id || '') === String(taskId)) {
            return {
              ...t,
              status: decision === 'approved' ? 'approved' : 'rejected',
              reviewStatus: decision,
              feedback: feedback || (decision === 'approved' ? 'Đã được duyệt' : 'Reviewer từ chối'),
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        });
      }
    });
    localStorage.setItem('assignedTasksByUser', JSON.stringify(taskMap));

    window.dispatchEvent(new CustomEvent('reviewTaskUpdated', { detail: { taskId, decision } }));
  } catch (e) {
    console.error('[Review] Error marking task reviewed:', e);
  }
};

/**
 * Check how many submissions exist for a task
 */
export const getSubmissionCount = (taskId) => {
  const taskMap = getAssignedTasksByUserMap();
  let count = 0;
  Object.values(taskMap).forEach(tasks => {
    if (!Array.isArray(tasks)) return;
    const found = tasks.find(
      t => String(t.id || t._id || '') === String(taskId) &&
        (t.status === 'completed' || t.status === 'pending_review' || t.status === 'done' || t.status === 'submitted')
    );
    if (found) count++;
  });
  return count;
};
