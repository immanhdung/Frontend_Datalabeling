import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewAPI } from '../../config/api';
import Header from '../../components/common/Header';
import useReviewHistory from '../../hooks/useReviewHistory';
import {
  getPendingReviewerTasks,
  markReviewerTaskReviewed,
  getAssignedTasksByUserMap,
} from '../../utils/annotatorTaskHelpers';
import {
  FileText, Clock, CheckCircle2, XCircle,
  Image, FileText as FileTextIcon, Volume2, Video,
  Search, Eye, ThumbsUp, ThumbsDown,
  Calendar, History, AlertCircle,
  Folder, Users, RefreshCw, CheckSquare,
} from 'lucide-react';

const ReviewerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { reviewHistory, setReviewHistory } = useReviewHistory();

  const [annotations, setAnnotations] = useState([]);
  const [activeTab, setActiveTab] = useState('pending_review');
  const [searchTerm, setSearchTerm] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    todayReviews: 0,
  });

  const loadAnnotations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let allFoundAnnotations = [];
      let backendHistory = [];
      try {
        const response = await reviewAPI.getPendingReviews();
        const apiData = response.data?.data || response.data || [];
        if (Array.isArray(apiData)) allFoundAnnotations = [...apiData];

        const allRes = await reviewAPI.getAll({ PageSize: 1000 });
        const historyData = allRes.data?.data || allRes.data || [];
        if (Array.isArray(historyData)) {
          backendHistory = historyData.filter(ann => ann.status === 'Approved' || ann.status === 'Rejected');
        }
      } catch (err) {
        console.warn('[Reviewer] API fetch failed, using local fallback');
      }

      // Format backend history to match reviewHistory shape
      if (backendHistory.length > 0) {
        const actionType = 'approve';
        const historyEntries = backendHistory.map(h => {
          const taskId = String(h.taskId || h.id || '');
          const candidates = [h.projectName, h.datasetName, h.project?.name, h.projectTitle, h.title]
            .filter(name => name && typeof name === 'string' && name.toLowerCase() !== 'dự án');

          return {
            id: `BACKEND-${h.id}`,
            annotationId: taskId,
            taskTitle: h.taskTitle || h.title || `Nhiệm vụ #${taskId.slice(0, 8)}`,
            annotatorName: h.annotatorName || 'Annotator',
            projectName: candidates[0] || 'Dự án Hệ thống',
            decision: String(h.status).toLowerCase(),
            reviewedAt: h.createdAt || h.updatedAt || new Date().toISOString(),
            itemCount: h.itemCount || 0
          };
        });

        setReviewHistory(prev => {
          const existingIds = new Set(prev.map(p => String(p.annotationId || '')));
          const uniqueNew = historyEntries.filter(b => b.annotationId && !existingIds.has(String(b.annotationId)));
          return [...prev, ...uniqueNew];
        });
      }

      const localReviewTasks = getPendingReviewerTasks();
      localReviewTasks.forEach(task => {
        if (!allFoundAnnotations.some(ann => String(ann.id) === String(task.id))) {
          allFoundAnnotations.push({
            ...task,
            taskTitle: task.title,
            annotatorName: `${task.annotatorCount || 3} Annotators`,
            status: 'pending_review',
            itemCount: task.items?.length || 0,
            isConsensusTask: true,
          });
        }
      });

      try {
        const rawTaskMap = localStorage.getItem('assignedTasksByUser');
        if (rawTaskMap) {
          const taskMap = JSON.parse(rawTaskMap);
          Object.values(taskMap).forEach(userTasks => {
            if (!Array.isArray(userTasks)) return;
            userTasks.forEach(t => {
              if (
                (t.status === 'completed' || t.status === 'pending_review' || t.status === 'submitted') &&
                !allFoundAnnotations.some(ann => String(ann.id) === String(t.id))
              ) {
                const candidates = [t.projectName, t.datasetName, t.project?.name, t.title]
                  .filter(name => name && name.toLowerCase() !== 'dự án');
                const realProjectName = candidates[0] || 'Dự án Hệ thống';

                allFoundAnnotations.push({
                  ...t,
                  taskTitle: (t.title && !t.title.includes('Nhiệm vụ')) ? t.title : `Nhiệm vụ #${String(t.id).slice(0, 8)}`,
                  projectName: realProjectName,
                  annotatorName: t.assignedTo || 'Annotator',
                  status: 'pending_review',
                  itemCount: Array.isArray(t.items) ? t.items.length : 0,
                  isConsensusTask: true,
                });
              }
            });
          });
        }
      } catch (e) {
        console.error('[Reviewer] Local task scan failed:', e);
      }

      const pendingOnly = allFoundAnnotations.filter(ann => {
        const annId = String(ann.id || '').trim().toLowerCase();
        return !reviewHistory.some(h => String(h.annotationId || '').trim().toLowerCase() === annId);
      });

      setAnnotations(pendingOnly);
      updateStats(pendingOnly, reviewHistory);
    } catch (err) {
      console.error('Error loading reviewer data:', err);
      setError('Không thể tải dữ liệu review.');
    } finally {
      setLoading(false);
    }
  }, [reviewHistory]);

  const updateStats = (anns, history) => {
    const today = new Date().toDateString();
    const todayReviews = history.filter(h => new Date(h.reviewedAt).toDateString() === today).length;
    const approvedCount = history.filter(h => String(h.decision).toLowerCase() === 'approved').length;
    const pendingCount = anns.length;

    setStats({
      total: pendingCount + history.length,
      pending: pendingCount,
      approved: approvedCount,
      todayReviews,
    });
  };

  useEffect(() => {
    loadAnnotations();
    const handleUpdate = () => loadAnnotations();
    window.addEventListener('reviewHistoryUpdated', handleUpdate);
    window.addEventListener('assignedTasksUpdated', handleUpdate);
    window.addEventListener('newReviewTask', handleUpdate);
    window.addEventListener('consensusProcessed', handleUpdate);
    return () => {
      window.removeEventListener('reviewHistoryUpdated', handleUpdate);
      window.removeEventListener('assignedTasksUpdated', handleUpdate);
      window.removeEventListener('newReviewTask', handleUpdate);
      window.removeEventListener('consensusProcessed', handleUpdate);
    };
  }, [reviewHistory.length]);

  const combinedAnnotations = useMemo(() => {
    const pending = annotations.map(a => ({ ...a, status: a.status || 'pending_review' }));
    const history = reviewHistory.map(h => ({
      ...h,
      id: h.annotationId,
      status: h.decision === 'approved' ? 'approved' : 'rejected',
      isHistory: true,
      createdAt: h.reviewedAt,
      itemCount: h.itemCount || 0
    }));
    return [...pending, ...history];
  }, [annotations, reviewHistory]);

  const filteredAnnotations = useMemo(() => {
    return combinedAnnotations.filter((ann) => {
      const status = String(ann.status || '').toLowerCase();
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'pending_review' && (status === 'pending_review' || status === 'pending')) ||
        (activeTab === 'approved' && status === 'approved');

      const matchesSearch =
        String(ann.taskTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(ann.annotatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(ann.projectName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [combinedAnnotations, activeTab, searchTerm]);

  const handleApprove = async (ann) => {
    try {
      const now = new Date().toISOString();

      try { await reviewAPI.approve(ann.id, { feedback: 'Duyệt', reviewedAt: now }); } catch { }

      const historyEntry = {
        id: `REV-${Date.now()}`,
        annotationId: ann.id,
        taskTitle: ann.taskTitle,
        annotatorName: ann.annotatorName,
        projectName: ann.projectName,
        decision: 'approved',
        reviewedAt: now,
        reviewTime: 5,
      };
      const newHistory = [historyEntry, ...reviewHistory];
      localStorage.setItem('reviewHistory', JSON.stringify(newHistory));
      setReviewHistory(newHistory);
      window.dispatchEvent(new CustomEvent('reviewHistoryUpdated'));
      markReviewerTaskReviewed(ann.id, 'approved');
      loadAnnotations();
    } catch (err) {
      console.error('Approve failed', err);
    }
  };

  const [rejectId, setRejectId] = useState(null);
  const [rejectAnn, setRejectAnn] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');

  const submitReject = () => {
    if (!rejectFeedback.trim()) return;
    const now = new Date().toISOString();

    const historyEntry = {
      id: `REV-${Date.now()}`,
      annotationId: rejectId,
      taskTitle: rejectAnn?.taskTitle,
      annotatorName: rejectAnn?.annotatorName,
      projectName: rejectAnn?.projectName,
      decision: 'rejected',
      feedback: rejectFeedback,
      reviewedAt: now,
      reviewTime: 8,
    };
    const newHistory = [historyEntry, ...reviewHistory];
    localStorage.setItem('reviewHistory', JSON.stringify(newHistory));
    setReviewHistory(newHistory);
    window.dispatchEvent(new CustomEvent('reviewHistoryUpdated'));

    markReviewerTaskReviewed(rejectId, 'rejected', rejectFeedback);

    setRejectId(null);
    setRejectAnn(null);
    setRejectFeedback('');
    loadAnnotations();
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      <Header title="Trung tâm Review" userName="Reviewer" userRole="reviewer" />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-12 relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-2xl shadow-blue-200">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2">Xin chào, Reviewer!</h1>
              <p className="text-blue-100 font-medium opacity-90 max-w-lg">
                Kiểm tra các bản gán nhãn đã đạt đồng thuận và phê duyệt kết quả cuối cùng.
              </p>
            </div>

          </div>
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-30%] left-[-5%] w-64 h-64 bg-indigo-400/20 rounded-full blur-[80px]" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
          {[
            { label: 'Cần Review', val: stats.pending, icon: Clock, color: 'blue', desc: 'Chờ duyệt ngay' },
            { label: 'Đã Duyệt', val: stats.approved, icon: CheckCircle2, color: 'emerald', desc: 'Tổng cộng' },
          ].map((s, i) => (
            <div key={i} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                <s.icon className="w-7 h-7" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{s.val}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
            {[
              { id: 'pending_review', label: 'Chờ duyệt', count: stats.pending },
              { id: 'approved', label: 'Đã Duyệt', count: stats.approved },
              { id: 'all', label: 'Tất cả', count: stats.total },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t.label}
                <span className="ml-2 text-[10px] opacity-50">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Tìm theo tên task hoặc dự án..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold text-sm"
            />
          </div>
        </div>

        {/* Main List */}
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest">Đang tải hộp thư review...</p>
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-20 text-center">
              <History className="w-20 h-20 text-slate-100 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">Hộp thư trống</h3>
              <p className="text-slate-400 font-medium mt-2">
                Chưa có nhiệm vụ nào cần review.
                {activeTab === 'pending_review' && ' Hệ thống sẽ thông báo khi 3 annotator nộp bài và đạt đồng thuận.'}
              </p>
            </div>
          ) : (
            filteredAnnotations.map((ann, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group overflow-hidden relative">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center shrink-0 shadow-inner ${ann.type === 'image' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                      {ann.type === 'image' ? <Image className="w-10 h-10" /> : <FileTextIcon className="w-10 h-10" />}
                    </div>
                    <div className="min-w-0">
                      {/* Consensus badge */}
                      {ann.isConsensusTask && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-emerald-100">
                          <CheckSquare className="w-3 h-3" /> Đã qua đồng thuận
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-1.5 font-black uppercase tracking-widest text-[10px] text-blue-500">
                        <Folder className="w-3 h-3" /> {ann.taskTitle}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {ann.projectName}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        {ann.itemCount > 0 && (
                          <>
                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                              <Image className="w-3.5 h-3.5" />
                              {ann.itemCount} ảnh đồng thuận
                            </div>
                          </>
                        )}
                        <div className="w-1 h-1 bg-slate-200 rounded-full" />
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(ann.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {ann.status === 'pending_review' || ann.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(ann)}
                          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 transition-all flex items-center gap-2"
                        >
                          <ThumbsUp className="w-5 h-5" /> Duyệt
                        </button>
                        <button
                          onClick={() => { setRejectId(ann.id); setRejectAnn(ann); }}
                          className="px-8 py-4 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-black transition-all flex items-center gap-2"
                        >
                          <ThumbsDown className="w-5 h-5" /> Từ chối
                        </button>
                      </>
                    ) : (
                      <span className={`px-6 py-3 rounded-2xl font-black text-sm ${ann.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                        {ann.status === 'approved' ? 'ĐÃ DUYỆT' : 'ĐÃ TỪ CHỐI'}
                      </span>
                    )}
                    {(ann.status === 'pending_review' || ann.status === 'pending') && (
                      <button
                        onClick={() => navigate(`/reviewer/task/${ann.id}`)}
                        className="p-4 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl transition-all border border-slate-100"
                      >
                        <Eye className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 -z-10" />
              </div>
            ))
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl max-w-xl w-full border border-slate-100">
            <h3 className="text-3xl font-black text-slate-900 mb-2">Lý do từ chối 🚩</h3>
            <p className="text-slate-500 font-medium mb-8">
              Cung cấp feedback để annotator có thể sửa lại chính xác.
            </p>

            <textarea
              value={rejectFeedback}
              onChange={e => setRejectFeedback(e.target.value)}
              placeholder="Ví dụ: Bounding box chưa bao phủ đúng đối tượng..."
              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-rose-100 focus:border-rose-500 transition-all outline-none font-medium h-40"
              autoFocus
            />

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setRejectId(null); setRejectAnn(null); setRejectFeedback(''); }}
                className="flex-1 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-3xl font-black transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectFeedback.trim()}
                className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-3xl font-black shadow-xl shadow-rose-200 transition-all disabled:opacity-30"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerDashboard;
