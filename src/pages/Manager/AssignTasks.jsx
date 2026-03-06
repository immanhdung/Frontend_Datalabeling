import { useState, useEffect } from 'react';
import { taskAPI, userAPI } from '../../config/api';
import Header from '../../components/common/Header';
import { resolveApiData, upsertLocalAssignedTask } from '../../utils/annotatorTaskHelpers';

const AssignTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTask, setSearchTask] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, annotator, reviewer
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, in_progress, completed
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load tasks and users
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes] = await Promise.all([
        taskAPI.getAll(),
        userAPI.getAll()
      ]);

      setTasks(resolveApiData(tasksRes));
      setUsers(resolveApiData(usersRes));
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (userId) => {
    if (!selectedTask) {
      showMessage('warning', 'Vui lòng chọn một task trước');
      return;
    }

    try {
      await taskAPI.assign(selectedTask.id, userId);
      upsertLocalAssignedTask(selectedTask, userId);
      showMessage('success', 'Assign task thành công!');
      
      // Reload tasks to update assigned status
      const tasksRes = await taskAPI.getAll();
      setTasks(resolveApiData(tasksRes));
      
      // Clear selected task
      setSelectedTask(null);
    } catch (error) {
      console.error('Error assigning task:', error);
      showMessage('error', error.response?.data?.message || 'Không thể assign task');
    }
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
    const matchSearch = user.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
                       user.email?.toLowerCase().includes(searchUser.toLowerCase());
    const matchRole = filterRole === 'all' || user.role === filterRole;
    return matchSearch && matchRole;
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
                <strong>Hướng dẫn:</strong> Chọn một task ở cột bên trái, sau đó click vào user ở cột bên phải để assign task cho họ.
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
                  <p>Không có task nào</p>
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
                Annotators & Reviewers ({filteredUsers.length})
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
                
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tất cả roles</option>
                  <option value="annotator">Annotator</option>
                  <option value="reviewer">Reviewer</option>
                </select>
              </div>

              {/* Selected Task Info */}
              {selectedTask && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">
                    📌 Đã chọn: <span className="font-bold">{selectedTask.name || `Task #${selectedTask.id}`}</span>
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Click vào user bên dưới để assign task này
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
                    key={user.id}
                    onClick={() => handleAssignTask(user.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTask
                        ? 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                        : 'border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {user.name || 'Unknown User'}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
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
              {users.filter(u => u.role === 'annotator').length}
            </div>
            <div className="text-sm text-gray-600">Annotators</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'reviewer').length}
            </div>
            <div className="text-sm text-gray-600">Reviewers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignTasks;
