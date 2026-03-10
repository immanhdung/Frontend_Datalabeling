import { useState, useEffect } from 'react';
import api from '../../config/api';
import { taskAPI, userAPI } from '../../config/api';
import Header from '../../components/common/Header';
import {
  resolveApiData,
} from '../../utils/annotatorTaskHelpers';

const AssignTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [rolesMap, setRolesMap] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTask, setSearchTask] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, in_progress, completed
  const [message, setMessage] = useState({ type: '', text: '' });
  const [taskLoadFailed, setTaskLoadFailed] = useState(false);
  const [taskLoadStatusCode, setTaskLoadStatusCode] = useState(null);

  const getUserRole = (user) => {
    const mappedRoleById = rolesMap[
      String(user?.roleId ?? user?.roleID ?? user?.role_id ?? user?.role?.id ?? user?.role?.roleId ?? '')
    ];
    const rawRole = user?.roleName ?? user?.role?.name ?? user?.role ?? mappedRoleById;
    if (!rawRole) {
      return '';
    }
    return String(rawRole).toLowerCase();
  };

  const getUserId = (user) =>
    user?.id ??
    user?._id ??
    user?.userId ??
    user?.memberId ??
    user?.user?.id ??
    user?.user?.userId ??
    null;
  const isAnnotatorUser = (user) => getUserRole(user) === 'annotator';
  const keepAnnotatorsOnly = (userList) =>
    dedupeUsers(userList).filter((user) => isAnnotatorUser(user));

  const getUserDisplayName = (user) => user?.displayName ?? user?.name ?? user?.username ?? 'Unknown User';

  const getUserNickname = (user) => {
    const username = user?.username ?? user?.userName;
    if (username) {
      return String(username);
    }
    if (user?.email && String(user.email).includes('@')) {
      return String(user.email).split('@')[0];
    }
    return getUserDisplayName(user).replace(/\s+/g, '').toLowerCase();
  };

  const normalizeMemberAsUser = (member) => {
    const nestedUser = member?.user ?? member?.member ?? null;
    const userId =
      member?.userId ??
      member?.id ??
      member?.memberId ??
      nestedUser?.id ??
      nestedUser?._id ??
      nestedUser?.userId ??
      null;

    const roleName =
      member?.roleName ??
      member?.memberRole ??
      member?.projectRole ??
      member?.role?.name ??
      nestedUser?.roleName ??
      nestedUser?.role?.name ??
      nestedUser?.role ??
      '';

    return {
      id: userId,
      userId,
      roleId: member?.roleId ?? nestedUser?.roleId,
      roleName,
      displayName:
        member?.displayName ??
        member?.fullName ??
        member?.name ??
        nestedUser?.displayName ??
        nestedUser?.fullName ??
        nestedUser?.name ??
        nestedUser?.username ??
        member?.username,
      username: member?.username ?? nestedUser?.username,
      email: member?.email ?? nestedUser?.email,
      status: member?.status ?? nestedUser?.status,
    };
  };

  const dedupeUsers = (userList) => {
    const byId = {};
    userList.forEach((user) => {
      const key = String(
        getUserId(user) ?? user?.email ?? user?.username ?? user?.displayName ?? user?.name ?? ''
      ).trim();
      if (!key) {
        return;
      }
      byId[key] = { ...byId[key], ...user };
    });
    return Object.values(byId);
  };

  const fetchUsersFromProjectMembers = async () => {
    const projectsRes = await api.get('/projects');
    const projects = toArrayData(projectsRes);
    if (projects.length === 0) {
      return [];
    }

    const membersResults = await Promise.allSettled(
      projects
        .map((project) => project?.id ?? project?._id ?? project?.projectId)
        .filter(Boolean)
        .map((projectId) => api.get(`/projects/${projectId}/members`))
    );

    const members = membersResults
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => toArrayData(result.value));

    return dedupeUsers(members.map(normalizeMemberAsUser));
  };

  const fetchMemberUsersSafe = async () => {
    try {
      return await fetchUsersFromProjectMembers();
    } catch {
      return [];
    }
  };

  const toArrayData = (response) => {
    const data = resolveApiData(response);
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    return [];
  };

  // Load tasks and users
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes, rolesRes] = await Promise.allSettled([
        taskAPI.getAll(),
        userAPI.getAll(),
        api.get('/roles')
      ]);

      if (tasksRes.status === 'fulfilled') {
        setTaskLoadFailed(false);
        setTaskLoadStatusCode(null);
        setTasks(resolveApiData(tasksRes.value));
      } else {
        setTaskLoadFailed(true);
        setTaskLoadStatusCode(Number(tasksRes?.reason?.response?.status) || null);
        setTasks([]);
      }

      if (rolesRes.status === 'fulfilled') {
        const roles = toArrayData(rolesRes.value);
        const nextRolesMap = {};
        roles.forEach((role) => {
          const roleId = role?.id ?? role?.roleId;
          const roleName = role?.roleName ?? role?.name;
          if (roleId && roleName) {
            nextRolesMap[String(roleId)] = String(roleName).toLowerCase();
          }
        });
        setRolesMap(nextRolesMap);
      }

      const memberUsers = await fetchMemberUsersSafe();
      if (usersRes.status === 'fulfilled') {
        const apiUsers = toArrayData(usersRes.value);
        const mergedUsers = dedupeUsers([...apiUsers, ...memberUsers]);
        setUsers(keepAnnotatorsOnly(mergedUsers));
      } else {
        setUsers(keepAnnotatorsOnly(memberUsers));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (user) => {
    const userId = getUserId(user);
    if (!selectedTask) {
      showMessage('warning', 'Vui lòng chọn một task trước');
      return;
    }

    if (!userId) {
      showMessage('error', 'Không tìm thấy ID của annotator');
      return;
    }

    if (!isAnnotatorUser(user)) {
      showMessage('warning', 'Chỉ có thể assign task cho annotator');
      return;
    }

    try {
      const projectId = selectedTask?.projectId ?? selectedTask?.project?.id ?? selectedTask?.__projectId;
      await taskAPI.assign(selectedTask.id, userId, projectId);
      showMessage('success', 'Assign task thành công!');

      // Reload tasks to update assigned status
      const tasksRes = await taskAPI.getAll();
      setTasks(resolveApiData(tasksRes));
      
      // Clear selected task
      setSelectedTask(null);
    } catch (error) {
      console.error('Error assigning task:', error);
      showMessage('error', error?.response?.data?.message || 'Assign task thất bại');
      setSelectedTask(null);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const sourceTasks = tasks;
  const sourceUsers = users;

  // Filter tasks
  const filteredTasks = sourceTasks.filter(task => {
    const matchSearch = task.name?.toLowerCase().includes(searchTask.toLowerCase()) ||
                       task.description?.toLowerCase().includes(searchTask.toLowerCase());
    const matchStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Filter users
  const filteredUsers = sourceUsers.filter(user => {
    const userName = getUserDisplayName(user);
    const matchSearch = userName?.toLowerCase().includes(searchUser.toLowerCase()) ||
                       user.email?.toLowerCase().includes(searchUser.toLowerCase());
    return matchSearch && isAnnotatorUser(user);
  });

  const normalizeTaskStatus = (status) => String(status || 'pending').toLowerCase();

  const getAssignedAnnotatorCount = (task) => {
    const byTaskMetadata = Array.isArray(task?.assignedAnnotatorIds)
      ? task.assignedAnnotatorIds.filter(Boolean).map((id) => String(id))
      : [];

    if (byTaskMetadata.length > 0) {
      return new Set(byTaskMetadata).size;
    }
    return task?.assigned_to || task?.assignedTo || task?.assigneeId || task?.annotatorId ? 1 : 0;
  };

  const getTaskAssigneeId = (task) =>
    task?.assigned_to ??
    task?.assignedTo ??
    task?.annotatorId ??
    task?.assigneeId ??
    task?.userId ??
    null;

  const usersWithTaskStats = filteredUsers.map((user) => {
    const uid = String(getUserId(user) ?? '');
    const assignedTasks = sourceTasks.filter((task) => String(getTaskAssigneeId(task) ?? '') === uid);
    const inProgressTasks = assignedTasks.filter((task) => {
      const status = normalizeTaskStatus(task.status);
      return status === 'in_progress' || status === 'review';
    });
    const completedTasks = assignedTasks.filter((task) => normalizeTaskStatus(task.status) === 'completed');
    const pendingTasks = assignedTasks.filter((task) => normalizeTaskStatus(task.status) === 'pending');
    const hasTask = assignedTasks.length > 0;
    const isWorking = inProgressTasks.length > 0;

    return {
      ...user,
      __stats: {
        hasTask,
        isWorking,
        assignedCount: assignedTasks.length,
        inProgressCount: inProgressTasks.length,
        pendingCount: pendingTasks.length,
        completedCount: completedTasks.length,
      },
    };
  });

  const sortedUsers = [...usersWithTaskStats].sort((a, b) => {
    if (a.__stats.hasTask === b.__stats.hasTask) {
      return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
    }
    return a.__stats.hasTask ? -1 : 1;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'annotator': return 'bg-green-100 text-green-800';
      case 'reviewer': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Assign Tasks" role="Manager" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Assign Tasks" role="Manager" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-800' :
            message.type === 'info' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {message.type === 'success' ? '✓' : message.type === 'error' ? '✗' : message.type === 'info' ? 'i' : '⚠'}
              </span>
              {message.text}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Hướng dẫn:</strong> Chọn một task ở cột bên trái, sau đó click vào annotator ở cột bên phải để assign task.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - TASKS */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Tasks ({filteredTasks.length})
              </h2>
              
              {/* Search and Filter */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Tìm kiếm task..."
                  value={searchTask}
                  onChange={(e) => setSearchTask(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="review">Review</option>
                </select>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>
                    {taskLoadFailed
                      ? taskLoadStatusCode === 401 || taskLoadStatusCode === 403
                            ? 'Không tải được task do token không hợp lệ/hết hạn. Vui lòng đăng nhập lại.'
                            : 'Không tải được danh sách task. Vui lòng kiểm tra token/API.'
                          : 'Chưa có task nào.'}
                  </p>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const assignedAnnotatorCount = getAssignedAnnotatorCount(task);

                  return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTask?.id === task.id
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1">
                        {task.name || `Task #${task.id}`}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status || 'pending'}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>ID: {task.id}</span>
                      {task.assigned_to && (
                        <span className="text-green-600 font-medium">
                          ✓ Đã assign
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-indigo-600 font-medium">
                      Đã assign: {assignedAnnotatorCount} annotator{assignedAnnotatorCount > 1 ? 's' : ''}
                    </div>

                    {task.project_name && (
                      <div className="mt-2 text-xs text-gray-500">
                        {task.project_name}
                      </div>
                    )}
                  </div>
                )})
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - USERS */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Annotators ({filteredUsers.length})
              </h2>
              
              {/* Search and Filter */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Tìm kiếm annotator..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <div className="w-full px-4 py-2 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm">
                  Đang hiển thị: chỉ annotator
                </div>
              </div>

              {/* Selected Task Info */}
              {selectedTask && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">
                    Đã chọn: <span className="font-bold">{selectedTask.name || `Task #${selectedTask.id}`}</span>
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Click vào annotator bên dưới để assign task này
                  </p>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {sortedUsers.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500 border border-dashed rounded-lg">
                  Không có annotator nào. Hãy tạo annotator trong trang Admin &gt; Users.
                </div>
              )}
              {sortedUsers.map((user) => (
                <div
                  key={getUserId(user) || `${user.email}-${user.name}`}
                  onClick={() => handleAssignTask(user)}
                  className={`p-3 border-2 rounded-lg transition-all bg-white ${
                    selectedTask
                      ? 'border-gray-200 hover:border-green-500 hover:bg-green-50 cursor-pointer'
                      : 'border-gray-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
                      {getUserDisplayName(user)?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {getUserDisplayName(user)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.__stats.hasTask ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {user.__stats.hasTask ? 'Đã có task' : 'Chưa có task'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(getUserRole(user) || 'annotator')}`}>
                            {getUserRole(user) || 'annotator?'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-indigo-700 font-semibold mt-0.5 truncate">
                        @{getUserNickname(user)}
                      </p>

                      {user.email && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {user.email}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {user.__stats.assignedCount} task
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Đang làm: {user.__stats.inProgressCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          Chưa làm: {user.__stats.pendingCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Xong: {user.__stats.completedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">{sourceTasks.length}</div>
            <div className="text-sm text-gray-600">Tổng Tasks</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">
              {sourceTasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Hoàn thành</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-blue-600">
              {sourceUsers.filter(u => getUserRole(u) === 'annotator').length}
            </div>
            <div className="text-sm text-gray-600">Annotators</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sourceUsers.filter(u => getUserRole(u) === 'reviewer').length}
            </div>
            <div className="text-sm text-gray-600">Reviewers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignTasks;






