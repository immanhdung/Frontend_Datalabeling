import { useState, useEffect } from 'react';
import api from '../../config/api';
import { taskAPI, userAPI } from '../../config/api';
import Header from '../../components/common/Header';
import { resolveApiData, upsertLocalAssignedTask } from '../../utils/annotatorTaskHelpers';

const MANUAL_ANNOTATOR_CANDIDATES_KEY = 'manualAnnotatorCandidates';

const AssignTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [rolesMap, setRolesMap] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTask, setSearchTask] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [manualAssignee, setManualAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, in_progress, completed
  const [message, setMessage] = useState({ type: '', text: '' });

  const getUserRole = (user) => {
    const mappedRoleById = rolesMap[String(user?.roleId ?? user?.role?.id ?? '')];
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
    user?.username ??
    user?.email ??
    null;
  const hasExplicitAnnotatorUser = users.some((user) => getUserRole(user) === 'annotator');

  const isAssignableAnnotator = (user) => {
    const role = getUserRole(user);
    if (role === 'annotator' || role === '') {
      return true;
    }

    // Fallback mode: if backend provides no annotator accounts, allow visible members for testing flow.
    return !hasExplicitAnnotatorUser;
  };

  const getUserDisplayName = (user) => user?.displayName ?? user?.name ?? user?.username ?? 'Unknown User';

  const buildManualCandidate = (identifier) => ({
    id: identifier,
    userId: identifier,
    username: identifier,
    displayName: identifier,
    email: identifier.includes('@') ? identifier : undefined,
    roleName: 'annotator',
    source: 'manual',
  });

  const getManualCandidates = () => {
    const defaults = ['annotator1'];
    try {
      const raw = localStorage.getItem(MANUAL_ANNOTATOR_CANDIDATES_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      const all = Array.isArray(saved) ? [...saved, ...defaults] : defaults;
      return [...new Set(all.filter(Boolean).map((item) => String(item).trim()))].map(buildManualCandidate);
    } catch (error) {
      return defaults.map(buildManualCandidate);
    }
  };

  const saveManualCandidate = (identifier) => {
    const normalized = String(identifier || '').trim();
    if (!normalized) {
      return;
    }
    try {
      const raw = localStorage.getItem(MANUAL_ANNOTATOR_CANDIDATES_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      const next = [...new Set([...(Array.isArray(saved) ? saved : []), normalized])];
      localStorage.setItem(MANUAL_ANNOTATOR_CANDIDATES_KEY, JSON.stringify(next));
    } catch (error) {
      // Ignore storage errors in fallback mode.
    }
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

  const mapProjectToTask = (project) => {
    const projectId = String(project?.id ?? project?._id ?? project?.projectId ?? '');
    return {
      id: `project-${projectId}`,
      name: project?.name || `Project #${projectId}`,
      description: project?.description || 'Task duoc tao tu project',
      status: project?.status || 'pending',
      project_name: project?.name || 'N/A',
      assigned_to: project?.assigned_to,
      __assignmentSource: 'project',
      __projectId: projectId,
      type: 'image',
      totalItems: project?.totalItems ?? 0,
    };
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
        setTasks(resolveApiData(tasksRes.value));
      } else {
        try {
          const projectsRes = await api.get('/projects');
          const projectsData = resolveApiData(projectsRes);
          const projects = Array.isArray(projectsData)
            ? projectsData
            : Array.isArray(projectsData?.items)
              ? projectsData.items
              : [];
          setTasks(projects.map(mapProjectToTask));
          showMessage('warning', 'Backend chua co endpoint tasks, dang dung project de assign cho annotator.');
        } catch (projectError) {
          setTasks([]);
          showMessage('warning', 'Backend hien tai chua ho tro endpoint tasks nen khong co du lieu task de assign.');
        }
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

      if (usersRes.status === 'fulfilled') {
        const apiUsers = toArrayData(usersRes.value);
        if (apiUsers.length > 0) {
          setUsers(dedupeUsers([...apiUsers, ...getManualCandidates()]));
        } else {
          const memberUsers = await fetchUsersFromProjectMembers();
          setUsers(dedupeUsers([...memberUsers, ...getManualCandidates()]));
          if (memberUsers.length > 0) {
            showMessage('warning', 'Khong lay duoc users tu /users, dang dung danh sach project members.');
          } else {
            showMessage('error', 'Khong co user de assign. Vui long kiem tra quyen manager hoac du lieu members.');
          }
        }
      } else {
        const memberUsers = await fetchUsersFromProjectMembers();
        setUsers(dedupeUsers([...memberUsers, ...getManualCandidates()]));
        if (memberUsers.length > 0) {
          showMessage('warning', 'Khong the tai /users, da fallback sang project members.');
        } else {
          showMessage('error', 'Khong the tai danh sach users');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Không thể tải dữ liệu');
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

    const currentRole = getUserRole(user);
    if (!isAssignableAnnotator(user)) {
      showMessage('warning', 'Chỉ có thể assign task cho annotator');
      return;
    }

    try {
      if (selectedTask.__assignmentSource === 'project') {
        upsertLocalAssignedTask(selectedTask, userId);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === selectedTask.id
              ? { ...task, assigned_to: userId }
              : task
          )
        );
        if (currentRole && currentRole !== 'annotator') {
          showMessage('warning', 'Khong co annotator trong he thong. Da assign theo fallback candidate mode.');
        } else {
          showMessage('success', 'Assign thanh cong cho annotator (che do local fallback).');
        }
      } else {
        await taskAPI.assign(selectedTask.id, userId);
        upsertLocalAssignedTask(selectedTask, userId);
        if (currentRole && currentRole !== 'annotator') {
          showMessage('warning', 'Khong co annotator trong he thong. Da assign theo fallback candidate mode.');
        } else {
          showMessage('success', 'Assign task thành công!');
        }

        // Reload tasks to update assigned status
        const tasksRes = await taskAPI.getAll();
        setTasks(resolveApiData(tasksRes));
      }
      
      // Clear selected task
      setSelectedTask(null);
    } catch (error) {
      console.error('Error assigning task:', error);
      upsertLocalAssignedTask(selectedTask, userId);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === selectedTask.id
            ? { ...task, assigned_to: userId }
            : task
        )
      );
      showMessage('warning', 'Backend chua ho tro assign API. Da luu assign local cho annotator.');
      setSelectedTask(null);
    }
  };

  const handleAssignByIdentifier = async () => {
    const identifier = manualAssignee.trim();
    if (!identifier) {
      showMessage('warning', 'Nhap username hoac email annotator truoc khi assign');
      return;
    }

    saveManualCandidate(identifier);
    setUsers((prevUsers) => dedupeUsers([buildManualCandidate(identifier), ...prevUsers]));

    await handleAssignTask({
      id: identifier,
      userId: identifier,
      username: identifier,
      email: identifier.includes('@') ? identifier : undefined,
      roleName: 'annotator',
      displayName: identifier,
    });
    setManualAssignee('');
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchSearch = task.name?.toLowerCase().includes(searchTask.toLowerCase()) ||
                       task.description?.toLowerCase().includes(searchTask.toLowerCase());
    const matchStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const userName = getUserDisplayName(user);
    const matchSearch = userName?.toLowerCase().includes(searchUser.toLowerCase()) ||
                       user.email?.toLowerCase().includes(searchUser.toLowerCase());
    const isAnnotatorCandidate = isAssignableAnnotator(user);
    return matchSearch && isAnnotatorCandidate;
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
            'bg-yellow-100 text-yellow-800'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {message.type === 'success' ? '✓' : message.type === 'error' ? '✗' : '⚠'}
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
                  placeholder="🔍 Tìm kiếm task..."
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
                  <p>Khong co task nao (co the backend chua ho tro endpoint tasks)</p>
                </div>
              ) : (
                filteredTasks.map(task => (
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

                    {task.project_name && (
                      <div className="mt-2 text-xs text-gray-500">
                        📁 {task.project_name}
                      </div>
                    )}
                  </div>
                ))
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
                {hasExplicitAnnotatorUser ? 'Annotators' : 'Assign Candidates'} ({filteredUsers.length})
              </h2>
              
              {/* Search and Filter */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm user..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhap annotator username/email, vd: annotator1"
                    value={manualAssignee}
                    onChange={(e) => setManualAssignee(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleAssignByIdentifier}
                    disabled={!selectedTask}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                      selectedTask
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Assign nhanh
                  </button>
                </div>
                
                <div className="w-full px-4 py-2 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm">
                  {hasExplicitAnnotatorUser ? 'Dang hien thi: Annotator' : 'Dang hien thi: Candidate mode (khong co annotator)'}
                </div>
              </div>

              {/* Selected Task Info */}
              {selectedTask && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">
                    📌 Đã chọn: <span className="font-bold">{selectedTask.name || `Task #${selectedTask.id}`}</span>
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Click vao annotator ben duoi de assign task nay
                  </p>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>Không có user nào</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={getUserId(user) || `${user.email}-${user.name}`}
                    onClick={() => handleAssignTask(user)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTask
                        ? 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                        : 'border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {getUserDisplayName(user)?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {getUserDisplayName(user)}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(getUserRole(user) || 'annotator')}`}>
                            {getUserRole(user) || 'annotator?'}
                          </span>
                        </div>
                        
                        {user.email && (
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        )}
                        
                        <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                          {user.tasks_count !== undefined && (
                            <span>📋 {user.tasks_count} tasks</span>
                          )}
                          {user.status && (
                            <span className={user.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                              {user.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">{tasks.length}</div>
            <div className="text-sm text-gray-600">Tổng Tasks</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Hoàn thành</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => getUserRole(u) === 'annotator').length}
            </div>
            <div className="text-sm text-gray-600">Annotators</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => getUserRole(u) === 'reviewer').length}
            </div>
            <div className="text-sm text-gray-600">Reviewers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignTasks;
