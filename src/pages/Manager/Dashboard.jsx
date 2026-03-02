import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { projectAPI, taskAPI, userAPI } from '../../config/api';
import Header from '../../components/common/Header';
import StatsCard from '../../components/common/StatsCard';

const ManagerDashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalAnnotators: 0,
    totalReviewers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [projectsRes, tasksRes, usersRes] = await Promise.all([
        projectAPI.getAll(),
        taskAPI.getAll(),
        userAPI.getAll(),
      ]);

      const projects = projectsRes.data.data || projectsRes.data || [];
      const tasks = tasksRes.data.data || tasksRes.data || [];
      const users = usersRes.data.data || usersRes.data || [];

      setStats({
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        totalAnnotators: users.filter(u => u.role === 'annotator').length,
        totalReviewers: users.filter(u => u.role === 'reviewer').length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Assign Tasks',
      description: 'Chia task cho annotators và reviewers',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      link: '/manager/assign-tasks',
      color: 'purple',
      badge: stats.pendingTasks || null,
    },
    {
      title: 'Projects',
      description: 'Quản lý tất cả các projects',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      link: '/manager/projects',
      color: 'blue',
      badge: stats.totalProjects || null,
    },
    {
      title: 'Datasets',
      description: 'Quản lý datasets và data sources',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      link: '/manager/datasets',
      color: 'green',
      badge: null,
    },
    {
      title: 'Create Project',
      description: 'Tạo project mới',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      link: '/manager/create-project',
      color: 'indigo',
      badge: null,
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
    };
    return colors[color] || colors.purple;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Manager Dashboard" role="Manager" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Manager Dashboard" role="Manager" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chào mừng, Manager! 👋
          </h1>
          <p className="text-gray-600">
            Quản lý projects, tasks và team của bạn
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Projects"
            value={stats.totalProjects}
            icon="📁"
            color="blue"
          />
          <StatsCard
            title="Total Tasks"
            value={stats.totalTasks}
            icon="📋"
            color="purple"
          />
          <StatsCard
            title="Completed Tasks"
            value={stats.completedTasks}
            icon="✅"
            color="green"
          />
          <StatsCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            icon="⏳"
            color="yellow"
          />
          <StatsCard
            title="Annotators"
            value={stats.totalAnnotators}
            icon="👥"
            color="green"
          />
          <StatsCard
            title="Reviewers"
            value={stats.totalReviewers}
            icon="🔍"
            color="blue"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className={`relative bg-gradient-to-br ${getColorClasses(action.color)} rounded-xl shadow-lg p-6 text-white hover:shadow-2xl transform hover:scale-105 transition-all duration-200`}
              >
                {action.badge && (
                  <div className="absolute top-4 right-4 bg-white text-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                    {action.badge}
                  </div>
                )}
                <div className="mb-4">
                  {action.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{action.title}</h3>
                <p className="text-white/90 text-sm">{action.description}</p>
                <div className="mt-4 flex items-center text-sm font-semibold">
                  Đi đến →
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity / Info */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Tổng quan</h2>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Tỷ lệ hoàn thành tasks</span>
              <span className="font-bold text-green-600">
                {stats.totalTasks > 0 
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Tasks đang chờ</span>
              <span className="font-bold text-yellow-600">{stats.pendingTasks}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Tổng số team members</span>
              <span className="font-bold text-purple-600">
                {stats.totalAnnotators + stats.totalReviewers}
              </span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>💡 Tip:</strong> Sử dụng trang "Assign Tasks" để nhanh chóng phân công công việc cho team members của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
