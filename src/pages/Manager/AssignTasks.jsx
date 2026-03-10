import React, { useState, useEffect, useMemo } from 'react';
import api from '../../config/api';
import { taskAPI, userAPI, roleAPI } from '../../config/api';
import Header from '../../components/common/Header';
import {
  assignLocalTaskToUser,
  getAssignedTasksByUserMap,
  resolveApiData,
} from '../../utils/annotatorTaskHelpers';
import {
  Search,
  CheckCircle2,
  Users,
  ClipboardList,
  ShieldCheck,
  UserCheck,
  FolderKanban,
  CheckSquare
} from 'lucide-react';

const DEV_USERS_KEY = 'devAdminUsers';
const DEV_PREVIEW_TASKS_KEY = 'devPreviewManagerTasks';
const DEV_UI_PREVIEW_TASKS = [
  { id: 'preview-task-1', name: 'Vehicle Bounding Box', status: 'in_progress', description: 'Gan nhan xe tai giao lo.', project_name: 'Traffic VN' },
  { id: 'preview-task-2', name: 'Road Sign Classification', status: 'pending', description: 'Phan loai bien bao giao thong.', project_name: 'Traffic VN' },
  { id: 'preview-task-3', name: 'Helmet Detection', status: 'completed', description: 'Danh dau nguoi doi non bao hiem.', project_name: 'Safety Cam' },
];

export default function AssignTasks() {
  const [tasks, setTasks] = useState([]);
  const [previewTasks, setPreviewTasks] = useState(() => {
    try {
      const raw = localStorage.getItem(DEV_PREVIEW_TASKS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEV_UI_PREVIEW_TASKS;
    } catch {
      return DEV_UI_PREVIEW_TASKS;
    }
  });

  const [users, setUsers] = useState([]);
  const [rolesMap, setRolesMap] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTask, setSearchTask] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [assigning, setAssigning] = useState(false);

  const readLocalDevUsers = () => {
    if (!import.meta.env.DEV) return [];
    try {
      const raw = localStorage.getItem(DEV_USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getUserRole = (user) => {
    const roleId = String(user?.roleId ?? user?.roleID ?? user?.role_id ?? user?.role?.id ?? user?.role?.roleId ?? '');
    const mappedRoleById = rolesMap[roleId];
    const rawRole = user?.roleName ?? user?.role?.name ?? user?.role ?? mappedRoleById ?? '';
    return String(rawRole).toLowerCase();
  };

  const getUserId = (user) => user?.id ?? user?._id ?? user?.userId ?? user?.username ?? user?.email ?? null;
  const isAnnotatorUser = (user) => {
    const role = getUserRole(user);
    if (role === 'admin' || role === 'manager') return false;
    if (role.includes('annotator') || role.includes('labeler')) return true;
    // Username hint fallback
    const name = String(user?.username || user?.displayName || '').toLowerCase();
    if (name.includes('annotator') || name.includes('labeler') || name.includes('ann')) return true;
    // If ambiguous (staff or empty), count as annotator only if not already appearing as reviewer elsewhere
    return (role.includes('staff') || role === '');
  };

  const isReviewerUser = (user) => {
    const role = getUserRole(user);
    if (role === 'admin' || role === 'manager') return false;
    if (role.includes('reviewer') || role.includes('checker')) return true;
    // Username hint fallback
    const name = String(user?.username || user?.displayName || '').toLowerCase();
    if (name.includes('reviewer') || name.includes('checker') || name.includes('rev')) return true;
    return false;
  };
  const getUserDisplayName = (user) => user?.displayName ?? user?.name ?? user?.username ?? user?.full_name ?? 'Unknown User';

  const normalizeMemberAsUser = (member) => {
    const nestedUser = member?.user ?? member?.member ?? null;
    const userId = member?.userId ?? member?.id ?? member?.memberId ?? nestedUser?.id ?? nestedUser?._id ?? nestedUser?.userId ?? null;
    const roleName = member?.roleName ?? member?.memberRole ?? member?.projectRole ?? member?.role?.name ?? nestedUser?.roleName ?? nestedUser?.role?.name ?? nestedUser?.role ?? '';
    return {
      id: userId,
      userId,
      roleId: member?.roleId ?? nestedUser?.roleId,
      roleName,
      displayName: member?.displayName ?? member?.fullName ?? member?.name ?? nestedUser?.displayName ?? nestedUser?.fullName ?? nestedUser?.name ?? nestedUser?.username ?? member?.username,
      username: member?.username ?? nestedUser?.username,
      email: member?.email ?? nestedUser?.email,
      status: member?.status ?? nestedUser?.status,
    };
  };

  const dedupeUsers = (userList) => {
    const byId = {};
    userList.forEach((user) => {
      const key = String(getUserId(user) ?? user?.email ?? user?.username ?? user?.displayName ?? user?.name ?? '').trim();
      if (!key) return;
      byId[key] = { ...byId[key], ...user };
    });
    return Object.values(byId);
  };

  const fetchUsersFromProjectMembers = async () => {
    const projectsRes = await api.get('/projects');
    const projects = toArrayData(projectsRes);
    if (projects.length === 0) return [];
    const membersResults = await Promise.allSettled(
      projects.map(p => {
        const pid = p?.id ?? p?._id ?? p?.projectId;
        if (!pid) return Promise.reject("No project ID");
        return api.get(`/projects/${pid}/members`);
      })
    );
    const members = membersResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .flatMap(r => toArrayData(r.value));
    return dedupeUsers(members.map(normalizeMemberAsUser));
  };

  const toArrayData = (response) => {
    const data = resolveApiData(response);
    return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  };

  const mapProjectToTask = (project) => {
    const projectId = String(project?.id ?? project?._id ?? project?.projectId ?? '');
    return {
      id: `project-${projectId}`,
      name: project?.name || `Project #${projectId}`,
      description: project?.description || 'Task tạo từ project',
      status: project?.status || 'pending',
      project_name: project?.name || 'N/A',
      assigned_to: project?.assigned_to,
      __assignmentSource: 'project',
      __projectId: projectId,
    };
  };
  const loadData = async () => {
    const query = new URLSearchParams(window.location.search);
    const preselectedProjectId = query.get('projectId');

    try {
      setLoading(true);
      const [tasksRes, usersRes, rolesRes] = await Promise.allSettled([
        taskAPI.getAll(),
        userAPI.getAll(),
        roleAPI.getAll()
      ]);

      if (tasksRes.status === 'fulfilled') {
        const t = resolveApiData(tasksRes.value);
        setTasks(t);
        if (preselectedProjectId) {
          const found = t.find(it => String(it.id) === preselectedProjectId);
          if (found) setSelectedTask(found);
        }
      } else {
        try {
          const projectsRes = await api.get('/projects');
          const projects = toArrayData(projectsRes);
          const mappedTasks = projects.map(mapProjectToTask);
          setTasks(mappedTasks);
          if (preselectedProjectId) {
            const found = mappedTasks.find(it => String(it.id) === preselectedProjectId);
            if (found) setSelectedTask(found);
          }
        } catch {
          setTasks([]);
        }
      }

      if (rolesRes.status === 'fulfilled') {
        const roles = toArrayData(rolesRes.value);
        const nextRolesMap = {};
        roles.forEach(role => {
          const rid = role?.id ?? role?.roleId;
          const rname = String(role?.roleName ?? role?.name ?? '').toLowerCase();
          if (rid) nextRolesMap[String(rid)] = rname;
        });
        setRolesMap(nextRolesMap);
      } else {
        setRolesMap({ '1': 'admin', '2': 'manager', '3': 'annotator', '4': 'reviewer' });
      }

      const apiUsers = usersRes.status === 'fulfilled' ? toArrayData(usersRes.value) : [];
      let projectMembers = [];
      try {
        projectMembers = await fetchUsersFromProjectMembers();
      } catch (e) {
        console.warn("Project members fetch failed (expected if API restricted)", e);
      }

      let allUsers = dedupeUsers([...apiUsers, ...projectMembers, ...readLocalDevUsers()]);

      if (allUsers.length === 0 && import.meta.env.DEV) {
        allUsers = [
          { id: 'dev-ann-1', userId: 'dev-ann-1', username: 'annotator1', displayName: 'Annotator 1', roleName: 'annotator', __isLocalDev: true },
          { id: 'dev-ann-2', userId: 'dev-ann-2', username: 'annotator2', displayName: 'Annotator 2', roleName: 'annotator', __isLocalDev: true },
          { id: 'dev-rev-1', userId: 'dev-rev-1', username: 'reviewer1', displayName: 'Reviewer 1', roleName: 'reviewer', __isLocalDev: true },
          { id: 'dev-rev-2', userId: 'dev-rev-2', username: 'reviewer2', displayName: 'Reviewer 2', roleName: 'reviewer', __isLocalDev: true },
        ];
      }
      console.log("DEBUG: Final allUsers list:", allUsers);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error load data', error);
      showMessage('error', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleAssignSubmit = async () => {
    if (!selectedTask) {
      showMessage('warning', 'Vui lòng chọn 1 dự án cần giao.');
      return;
    }
    if (selectedAnnotators.length === 0 && selectedReviewers.length === 0) {
      showMessage('warning', 'Vui lòng chọn ít nhất 1 người để giao việc.');
      return;
    }

    setAssigning(true);
    const allSelectedIds = [...selectedAnnotators, ...selectedReviewers];
    let successCount = 0;

    try {
      const isPreviewTask = String(selectedTask?.id || '').startsWith('preview-');

      for (const uid of allSelectedIds) {
        // Luôn ghi local cache để annotator có thể thấy ở tab pending
        assignLocalTaskToUser(selectedTask, uid);
        successCount++;

        if (!isPreviewTask && selectedTask.__assignmentSource !== 'project') {
          try {
            await taskAPI.assign(selectedTask.id, uid);
          } catch (e) {
            console.warn("Backend assign faied for", uid, e);
          }
        }
      }

      if (isPreviewTask) {
        const nextPreview = (tasks.length === 0 ? previewTasks : tasks).map(t =>
          t.id === selectedTask.id ? { ...t, assigned_to: allSelectedIds[0], assignedAnnotatorIds: allSelectedIds } : t
        );
        setPreviewTasks(nextPreview);
        localStorage.setItem(DEV_PREVIEW_TASKS_KEY, JSON.stringify(nextPreview));
      }

      showMessage('success', `Đã giao việc thành công cho ${successCount} nhân sự!`);
      setSelectedAnnotators([]);
      setSelectedReviewers([]);
      setSelectedTask(null);

      // Refresh to get updated stats
      loadData();
    } catch (err) {
      showMessage('error', 'Giao việc thất bại. Đã có lỗi xảy ra.');
    } finally {
      setAssigning(false);
    }
  };

  // derived data
  const shouldUseDevPreview = import.meta.env.DEV && tasks.length === 0;
  const sourceTasks = shouldUseDevPreview ? previewTasks : tasks;
  const localAssignedByUser = getAssignedTasksByUserMap();

  const usersWithStats = useMemo(() => {
    return users.map(user => {
      const uid = String(getUserId(user) || '');
      const localTasks = Array.isArray(localAssignedByUser[uid]) ? localAssignedByUser[uid] : [];
      const apiTasks = sourceTasks.filter(t => [t.assigned_to, t.assigneeId, t.annotatorId].includes(uid));
      const totalTasks = [...localTasks, ...apiTasks];
      const uniqueTaskIds = new Set(totalTasks.map(t => t.id || t._id));

      return {
        ...user,
        __stats: {
          taskCount: uniqueTaskIds.size
        }
      };
    }).sort((a, b) => b.__stats.taskCount - a.__stats.taskCount);
  }, [users, localAssignedByUser, sourceTasks]);

  const filteredUsers = useMemo(() => {
    return usersWithStats.filter(u => {
      if (!searchUser) return true;
      const search = searchUser.toLowerCase();
      return (
        getUserDisplayName(u).toLowerCase().includes(search) ||
        String(u.username || '').toLowerCase().includes(search) ||
        String(u.email || '').toLowerCase().includes(search)
      );
    });
  }, [usersWithStats, searchUser]);

  const annotators = filteredUsers.filter(u => isAnnotatorUser(u));
  const reviewers = filteredUsers.filter(u => isReviewerUser(u));

  const filteredTasks = sourceTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchTask && !(t.name || '').toLowerCase().includes(searchTask.toLowerCase())) return false;
    return true;
  });

  const toggleSelection = (userId, type) => {
    if (type === 'annotator') {
      setSelectedAnnotators(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    } else {
      setSelectedReviewers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    }
  };

  const isTaskSelected = (id) => selectedTask?.id === id;

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Giao Việc (Assignment)" role="Manager" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header title="Giao Việc (Assignment)" role="Manager" />

      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8">
        {/* Banner Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border font-medium flex items-center animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100' :
            message.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            } shadow-sm`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <ClipboardList className="w-5 h-5 mr-3" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* COLUMN 1: TASKS */}
          <div className="xl:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <FolderKanban className="w-6 h-6 text-indigo-600" />
                Dự án / Tasks
                <span className="bg-indigo-100 text-indigo-700 text-xs py-1 px-2.5 rounded-full">{filteredTasks.length}</span>
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm dự án..."
                    value={searchTask}
                    onChange={(e) => setSearchTask(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Mới (Pending)</option>
                  <option value="in_progress">Đang làm</option>
                  <option value="review">Chờ duyệt</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <ClipboardList className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">Không có dự án nào</p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isTaskSelected(task.id)
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                      : 'border-slate-100 hover:border-indigo-300 hover:shadow-sm bg-white'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`font-bold text-sm ${isTaskSelected(task.id) ? 'text-indigo-900' : 'text-slate-900'} line-clamp-2 pr-2`}>
                        {task.name || `Task #${task.id}`}
                      </h3>
                      {isTaskSelected(task.id) && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {task.status || 'pending'}
                      </span>
                      {task.project_name && (
                        <span className="text-[10px] font-bold text-slate-400 truncate">
                          • {task.project_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2 & 3: RESOURCES */}
          <div className="xl:col-span-8 flex flex-col h-[calc(100vh-140px)] relative">

            {/* Action Bar */}
            <div className="absolute -top-14 right-0 flex items-center justify-end z-10 w-full mb-4 gap-4">
              {selectedTask ? (
                <div className="flex items-center justify-between w-full bg-indigo-900 text-white px-6 py-3 rounded-2xl shadow-xl shadow-indigo-900/20">
                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Đang chọn giao việc</span>
                    <span className="font-bold text-lg truncate max-w-md">{selectedTask.name}</span>
                  </div>
                  <button
                    onClick={handleAssignSubmit}
                    disabled={assigning || (selectedAnnotators.length === 0 && selectedReviewers.length === 0)}
                    className="ml-4 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                  >
                    {assigning ? 'Đang xử lý...' : `Giao cho ${selectedAnnotators.length + selectedReviewers.length} người`}
                  </button>
                </div>
              ) : (
                <div className="w-full bg-white/60 backdrop-blur-md border border-slate-200 border-dashed px-6 py-4 rounded-2xl text-center">
                  <span className="text-slate-500 font-medium text-sm">👈 Vui lòng chọn một dự án bên trái để bắt đầu giao việc</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full pt-6">
              {/* Annotators List */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                  <div className="flex-1 mr-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      Annotator
                      <span className="bg-emerald-100 text-emerald-700 text-xs py-0.5 px-2 rounded-full">{annotators.length}</span>
                    </h3>
                  </div>
                  <div className="relative w-32 md:w-40">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {annotators.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 text-sm">Không có Annotator nào</p>
                  ) : (
                    annotators.map(user => {
                      const uid = getUserId(user);
                      const isSelected = selectedAnnotators.includes(uid);
                      return (
                        <div
                          key={uid}
                          onClick={() => toggleSelection(uid, 'annotator')}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100 hover:border-emerald-200 bg-white'
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                            }`}>
                            {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                            {getUserDisplayName(user).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate text-sm">{getUserDisplayName(user)}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email || `@${user.username}`}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-xs font-bold text-slate-400 uppercase">Đang làm</span>
                            <span className="font-black text-emerald-600 text-lg leading-none">{user.__stats.taskCount}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Reviewers List */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-violet-50/30">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-violet-600" />
                    Reviewer
                    <span className="bg-violet-100 text-violet-700 text-xs py-0.5 px-2 rounded-full">{reviewers.length}</span>
                  </h3>
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-lg">Đã chọn: {selectedReviewers.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {reviewers.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 text-sm">Không có Reviewer nào</p>
                  ) : (
                    reviewers.map(user => {
                      const uid = getUserId(user);
                      const isSelected = selectedReviewers.includes(uid);
                      return (
                        <div
                          key={uid}
                          onClick={() => toggleSelection(uid, 'reviewer')}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-violet-500 bg-violet-50/50 shadow-sm' : 'border-slate-100 hover:border-violet-200 bg-white'
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-violet-500 border-violet-500' : 'bg-white border-slate-300'
                            }`}>
                            {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                            {getUserDisplayName(user).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate text-sm">{getUserDisplayName(user)}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email || `@${user.username}`}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-xs font-bold text-slate-400 uppercase">Dự án</span>
                            <span className="font-black text-violet-600 text-lg leading-none">{user.__stats.taskCount}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
