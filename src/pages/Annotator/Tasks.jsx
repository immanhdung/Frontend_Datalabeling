import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { taskAPI } from '../../config/api';
import {
  fetchAssignedTasksForUser,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getLocalAssignedTasksForUser,
  normalizeTasks,
} from '../../utils/annotatorTaskHelpers';
import {
  CheckCircle2, Clock, Zap, ThumbsUp,
  Image as ImageIcon, FileText, Volume2, Video,
  AlertCircle, Search, Folder, Calendar, Tag,
  Play, FolderOpen, RefreshCw, Database,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'pending', label: 'Chờ làm', icon: Clock },
  { key: 'in_progress', label: 'Đang làm', icon: Zap },
  { key: 'completed', label: 'Chờ duyệt', icon: CheckCircle2 },
  { key: 'approved', label: 'Hoàn thành', icon: ThumbsUp },
  { key: 'rejected', label: 'Nhãn sai', icon: AlertCircle },
  { key: 'all', label: 'Tất cả', icon: Folder },
];
const TYPE_ICONS = { image: ImageIcon, text: FileText, audio: Volume2, video: Video };
const TYPE_COLORS = {
  image: 'bg-blue-50 text-blue-600', text: 'bg-emerald-50 text-emerald-600',
  audio: 'bg-purple-50 text-purple-600', video: 'bg-orange-50 text-orange-600',
};
const PRIORITY_STYLES = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' };
const PRIORITY_LABELS = { high: 'Ưu tiên cao', medium: 'Trung bình', low: 'Thấp' };

function getDaysUntilDue(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}
function formatDateTime(s) {
  if (!s) return 'N/A';
  try { return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return 'N/A'; }
}

export default function AnnotatorTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [projectsCache, setProjectsCache] = useState({});

  const loadTasks = async () => {
    const uid = getCurrentUserId();
    const identifiers = getCurrentUserIdentifiers();
    setLoading(true); setError('');
    try {
      if (!uid) { setError('Không tìm thấy thông tin người dùng.'); setLoading(false); return; }
      let apiTasks = [];
      try { apiTasks = await fetchAssignedTasksForUser(taskAPI, identifiers); } catch { }
      const localTasks = getLocalAssignedTasksForUser(identifiers);
      const normalizedLocal = normalizeTasks(localTasks, uid);
      const map = new Map();
      normalizedLocal.forEach(t => { if (t.id) map.set(String(t.id), t); });
      apiTasks.forEach(t => {
        if (t.id) {
          const ex = map.get(String(t.id));
          const localIsAdv = ex && ['completed', 'approved', 'rejected', 'expired'].includes(ex.status);
          const localProgress = ex?.progress || 0;
          const apiProgress = t.progress || 0;

          map.set(String(t.id), {
            ...ex,
            ...t,
            // Ưu tiên progress lớn nhất giữa Local và API
            progress: localIsAdv ? ex.progress : Math.max(localProgress, apiProgress),
            // Giữ nguyên status tiến bộ hơn
            status: localIsAdv ? ex.status : (localProgress > apiProgress ? 'in_progress' : t.status),
            // Quan trọng: Phải giữ totalItems từ local nếu API trả về 0
            totalItems: t.totalItems || ex?.totalItems || 0,
            items: (t.items && t.items.length > 0 ? t.items : ex?.items || []).map(apiIt => {
              const iid = String(apiIt.taskItemId || apiIt.id || '');
              const localIt = (ex?.items || []).find(li => String(li.taskItemId || li.id || '') === iid) || {};
              return {
                ...apiIt,
                ...localIt,
                ...apiIt,
                isConflict: localIt.isConflict,
                isConsensusWinner: localIt.isConsensusWinner,
                consensusLabel: localIt.consensusLabel
              };
            })
          });
        }
      });
      const finalTasks = normalizeTasks(Array.from(map.values()), uid);
      setTasks(finalTasks);

      // Fetch project name + deadline (annotator có thể bị 403)
      // Fallback: dùng projectName và dueDate đã lưu trong task (từ localStorage)
      const pids = [...new Set(finalTasks.map(t => t.projectId).filter(Boolean).map(String))];
      if (pids.length > 0) {
        const cache = {};
        // Pre-fill cache từ task data (đã có sẵn trong localStorage)
        finalTasks.forEach(t => {
          if (t.projectId && !cache[String(t.projectId)]) {
            cache[String(t.projectId)] = {
              name: t.projectName || '',
              deadline: t.dueDate || null,
            };
          }
        });
        // Thử fetch từ API để có data mới nhất (nếu có quyền)
        await Promise.allSettled(pids.map(async pid => {
          try {
            const res = await api.get(`/projects/${pid}`, { validateStatus: () => true });
            if (res.status === 200 || res.status === 201) {
              const p = res.data?.data || res.data || {};
              const name = p.name || p.projectName || '';
              const deadline = p.deadline || p.dueDate || p.endDate || null;
              if (name || deadline) {
                cache[pid] = { name: name || cache[pid]?.name || '', deadline: deadline || cache[pid]?.deadline || null };
              }
            }
            // 403: giữ nguyên cache từ localStorage
          } catch { }
        }));
        setProjectsCache(cache);
      }
    } catch (err) {
      setError('Không thể tải danh sách nhiệm vụ.');
      const local = getLocalAssignedTasksForUser(getCurrentUserIdentifiers());
      setTasks(normalizeTasks(local, getCurrentUserId()));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed' || t.status === 'pending_review').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  }), [tasks]);

  const filteredTasks = useMemo(() => tasks
    .filter(t => {
      let matchTab = activeTab === 'all' || t.status === activeTab;
      if (activeTab === 'completed') {
        matchTab = t.status === 'completed' || t.status === 'pending_review';
      }
      const kw = searchTerm.toLowerCase();
      const matchSearch = !kw || [t.title, t.projectName, t.datasetName].some(s => String(s || '').toLowerCase().includes(kw));
      return matchTab && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') { const o = { high: 0, medium: 1, low: 2 }; return (o[a.priority] ?? 1) - (o[b.priority] ?? 1); }
      if (sortBy === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
      const dateA = new Date(a.assignedAt || a.updatedAt || a.createdAt);
      const dateB = new Date(b.assignedAt || b.updatedAt || b.createdAt);
      return dateB - dateA; // Default: Recent assigned on top
    }), [tasks, activeTab, searchTerm, sortBy]);

  const handleStart = (task) => navigate(`/annotator/tasks/${task.id}`, { state: { task, isRework: task.status === 'rejected' } });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm nhiệm vụ, dự án..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadTasks} className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl"><RefreshCw className="w-5 h-5" /></button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-medium outline-none">
              <option value="recent">Mới nhất</option>
              <option value="priority">Ưu tiên</option>
              <option value="dueDate">Gần hạn</option>
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-xl shadow-indigo-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold mb-2">Nhiệm vụ gán nhãn</h1>
              <p className="text-indigo-100/80 max-w-md">Danh sách nhiệm vụ được giao cho bạn.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {[['Cần làm', stats.pending], ['Đang làm', stats.inProgress]].map(([l, v]) => (
                <div key={l} className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
                  <p className="text-white/70 text-sm mb-1">{l}</p><p className="text-3xl font-bold">{v}</p>
                </div>
              ))}
              <div className="bg-emerald-400/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-emerald-400/30">
                <p className="text-emerald-100 text-sm mb-1">Chờ duyệt</p>
                <p className="text-3xl font-bold text-emerald-300">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex-wrap">
          {STATUS_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = tab.key === 'all' ? stats.total : (stats[tab.key === 'in_progress' ? 'inProgress' : tab.key] ?? 0);
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="bg-white h-72 rounded-3xl border border-slate-100" />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-12 text-center max-w-2xl mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-slate-600 mb-6">{error}</p>
            <button onClick={loadTasks} className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold">Thử lại</button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-2xl font-bold text-slate-400">{tasks.length === 0 ? 'Chưa có nhiệm vụ nào được giao' : 'Không có nhiệm vụ trong mục này'}</p>
            <p className="text-slate-500 mt-2">{tasks.length === 0 ? 'Manager sẽ giao việc cho bạn sớm!' : 'Thử chuyển tab khác.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => {
              const TypeIcon = TYPE_ICONS[task.type] || ImageIcon;
              const typeColor = TYPE_COLORS[task.type] || 'bg-slate-50 text-slate-600';
              const pInfo = projectsCache[String(task.projectId)] || {};
              // ✅ Tên project thực tế
              const displayName = pInfo.name || task.projectName || 'Dự án';
              // ✅ Deadline project thực tế (manager đặt khi tạo project)
              const displayDeadline = pInfo.deadline || task.dueDate;
              const days = getDaysUntilDue(displayDeadline);
              const urgency = days !== null && days <= 3 ? 'text-red-500' : 'text-amber-500';

              return (
                <div key={task.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 rounded-[1.25rem] ${typeColor}`}><TypeIcon className="w-6 h-6" /></div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                        {PRIORITY_LABELS[task.priority] || 'Trung bình'}
                      </span>
                      {task.reviewStatus && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${task.reviewStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {task.reviewStatus === 'approved' ? <ThumbsUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {task.reviewStatus === 'approved' ? 'Đã duyệt' : 'Cần sửa'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    {/* ✅ Ưu tiên hiển thị tên Project làm tiêu đề chính */}
                    <h3 className="font-bold text-slate-900 text-xl mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {displayName}
                    </h3>

                    {/* Progress Bar moved here */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-tight">

                        <span>{task.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${task.status === 'approved' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                          style={{ width: `${task.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-500 font-semibold truncate">
                          {task.title && !task.title.startsWith('Task #') ? task.title : `Nhiệm vụ #${task.id?.slice(0, 8)}`}
                        </span>
                      </div>
                      {task.datasetName && task.datasetName !== 'Bộ dữ liệu' && (
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-400 truncate">{task.datasetName}</span>
                        </div>
                      )}
                    </div>
                    {task.description && <p className="text-sm text-slate-500 line-clamp-2 mb-4">{task.description}</p>}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-50 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Giao việc: {formatDateTime(task.createdAt || task.assignedAt)}</span>
                    </div>

                    {/* ✅ Hạn: deadline project thực tế */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Hạn: {displayDeadline ? new Date(displayDeadline).toLocaleDateString('vi-VN') : 'N/A'}</span>
                      </div>
                      {days !== null && days <= 3 && days >= 0 && task.status !== 'completed' && (
                        <span className={`text-[11px] font-black ${urgency}`}>{days === 0 ? 'Hết hạn hôm nay!' : `CÒN ${days} NGÀY`}</span>
                      )}
                    </div>

                    {task.feedback && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
                        <p className="text-[11px] text-red-700 italic"><span className="font-bold not-italic">Feedback: </span>"{task.feedback}"</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <button onClick={() => handleStart(task)} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 font-bold flex items-center justify-center gap-2">
                          <Play className="w-4 h-4 fill-current" /> Bắt đầu ngay
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button onClick={() => handleStart(task)} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold flex items-center justify-center gap-2">
                          <Zap className="w-4 h-4" /> Tiếp tục làm
                        </button>
                      )}
                      {task.status === 'rejected' && (
                        <button
                          onClick={() => handleStart(task)}
                          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 shadow-lg font-bold flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" /> Làm lại
                        </button>
                      )}
                      {(task.status === 'completed' || task.status === 'pending_review') && (
                        <button onClick={() => navigate(`/annotator/tasks/${task.id}/details`)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> {task.reviewStatus === 'rejected' ? 'Chờ sửa' : 'Xem chi tiết'}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/annotator/tasks/${task.id}/details`)}
                        className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 border border-slate-100"
                        title="Xem chi tiết"
                      >
                        <FolderOpen className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
