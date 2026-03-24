import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Database, 
  Folder, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon,
  Loader2,
  Calendar,
  Zap,
  Tag,
  Play
} from 'lucide-react';
import api, { taskAPI, projectAPI } from '../../config/api';
import { 
  normalizeTask, 
  resolveApiData,
  resolveImageUrl,
  getLocalAssignedTasksForUser,
  getCurrentUserIdentifiers
} from '../../utils/annotatorTaskHelpers';

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Task Info
        let apiTaskData = {};
        try {
          const taskRes = await taskAPI.getById(taskId);
          apiTaskData = resolveApiData(taskRes);
          if (Array.isArray(apiTaskData)) apiTaskData = apiTaskData[0];
        } catch (e) {
          console.warn('[TaskDetails] getById failed:', e.message);
        }

        const normalized = normalizeTask(apiTaskData);
        
        // Merge with local data to get the latest progress/status
        const identifiers = getCurrentUserIdentifiers();
        const localTasks = getLocalAssignedTasksForUser(identifiers);
        const localMatch = localTasks.find(t => String(t.id) === String(taskId));
        
        if (localMatch) {
           const localNorm = normalizeTask(localMatch);
           // Ưu tiên progress/status tiến bộ hơn từ local
           normalized.progress = Math.max(normalized.progress || 0, localNorm.progress || 0);
           if (['completed', 'approved', 'rejected', 'in_progress'].includes(localNorm.status)) {
              normalized.status = localNorm.status;
           }
           normalized.totalItems = normalized.totalItems || localNorm.totalItems || 0;
           normalized.processedCount = Math.max(normalized.processedCount || 0, localNorm.processedCount || 0);
           normalized.projectName = normalized.projectName || localNorm.projectName;
           normalized.guideline = normalized.guideline || localNorm.guideline;
        }

        // Try to fetch project details (name, guideline) if still missing
        if (!normalized.projectName || normalized.projectName === 'Dự án' || !normalized.guideline) {
          try {
            const projRes = await api.get(`/projects/${normalized.projectId}`, { validateStatus: () => true });
            if (projRes.status === 200) {
              const p = projRes.data?.data || projRes.data || {};
              normalized.projectName = normalized.projectName === 'Dự án' ? (p.name || p.projectName || normalized.projectName) : normalized.projectName;
              normalized.dueDate = p.deadline || p.dueDate || normalized.dueDate;
              if (!normalized.guideline) normalized.guideline = p.guideline || "";
            }
          } catch {}
          
          if (!normalized.guideline) {
             try {
                const guideRes = await api.get(`/guidelines/projects/${normalized.projectId}`).catch(() => ({ data: null }));
                const gRaw = guideRes?.data?.data || guideRes?.data;
                normalized.guideline = (typeof gRaw === 'string' ? gRaw : gRaw?.content || gRaw?.guideline || gRaw?.text) || "";
             } catch {}
          }
        }

        setTask(normalized);

        // 2. Fetch Task Items
        let apiItems = [];
        try {
          // Try both APIs sequentially or in parallel
          const [itemsRes, projItemsRes] = await Promise.allSettled([
            taskAPI.getItems(taskId),
            normalized.projectId ? projectAPI.getTaskItems(normalized.projectId) : Promise.reject('No project ID')
          ]);
          
          let list1 = itemsRes.status === 'fulfilled' ? resolveApiData(itemsRes.value) : [];
          let list2 = projItemsRes.status === 'fulfilled' ? resolveApiData(projItemsRes.value) : [];
          
          if (!Array.isArray(list1)) list1 = [];
          if (!Array.isArray(list2)) list2 = [];
          
          // Merge based on ID
          const itemMap = new Map();
          [...list1, ...list2].forEach(item => {
             const key = String(item?.taskItemId || item?.id || '').trim().toLowerCase();
             if (key && !itemMap.has(key)) itemMap.set(key, item);
          });
          apiItems = Array.from(itemMap.values());
        } catch (e) {
          console.warn('[TaskDetails] getItems/getTaskItems failed');
        }

        const localItems = Array.isArray(localMatch?.items) ? localMatch.items : [];

        if (apiItems.length > 0) {
          const merged = apiItems.map((apiItem, idx) => {
            const apiId = String(apiItem?.taskItemId || apiItem?.id || apiItem?.itemId || '').trim().toLowerCase();
            const apiUrl = resolveImageUrl(apiItem);
            
            // Tìm localItem bằng ID hoặc URL hoặc theo thứ tự (index)
            const localItem = localItems.find(li => {
               const lid = String(li?.taskItemId || li?.id || li?.itemId || '').trim().toLowerCase();
               const lUrl = resolveImageUrl(li);
               
               if (lid && lid === apiId) return true;
               if (apiUrl && lUrl && apiUrl === lUrl) return true;
               return false;
            }) || (localItems.length === apiItems.length ? localItems[idx] : null);
            
            if (localItem) {
               const lStatus = String(localItem.status || '').toLowerCase();
               const isLocalBetter = ['done', 'completed', 'skipped', 'submitted', 'pending_review', 'rejected', 'approved'].includes(lStatus);
               const hasWork = lStatus === 'done' || lStatus === 'completed' || lStatus === 'approved' || (Array.isArray(localItem.annotations) && localItem.annotations.length > 0);
               
               if (isLocalBetter || hasWork) {
                  return { 
                    ...apiItem, 
                    ...localItem, 
                    status: (localItem.status === 'pending' && hasWork) ? 'done' : localItem.status 
                  };
               }
            }
            return apiItem;
          });
          setItems(merged);
        } else {
          setItems(localItems);
        }
      } catch (err) {
        console.error('Failed to load task details:', err);
        setError('Không thể tải thông tin chi tiết nhiệm vụ.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-slate-50 p-10 flex flex-col items-center justify-center">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
            <Tag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Lỗi tải dữ liệu</h2>
          <p className="text-slate-500 mb-8">{error || 'Nhiệm vụ không tồn tại.'}</p>
          <button onClick={() => navigate('/annotator/tasks')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-slate-900 transition-all">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const processedItems = items.filter(it => 
    ['done', 'completed', 'skipped', 'submitted', 'hoan thanh', 'hoàn thành'].includes(
      String(it.status || '').toLowerCase()
    )
  );
  
  const totalItems = items.length || task.totalItems || 0;
  
  // Lấy giá trị lớn nhất giữa việc đếm từng ảnh và thông số tiến độ của task
  const countFromItems = processedItems.length;
  const countFromProgress = Math.round(((task.progress || 0) * totalItems) / 100);
  const finalProcessedCount = Math.max(countFromItems, countFromProgress);
  
  const remainingCount = Math.max(0, totalItems - finalProcessedCount);
  const progressPercent = Math.max(
    totalItems > 0 ? Math.round((finalProcessedCount / totalItems) * 100) : 0,
    task.progress || 0
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/annotator/tasks')}
              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">{task.projectName || 'Chi tiết nhiệm vụ'}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-bold">
                <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> #{task.id?.slice(0, 8)}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="flex items-center gap-1.5"><Database className="w-4 h-4" /> {task.datasetName}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate(`/annotator/tasks/${taskId}`)}
            className="px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" /> Tiếp tục làm việc
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tổng số ảnh</p>
            <p className="text-4xl font-black text-slate-900">{items.length}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Đã gán nhãn</p>
            <p className="text-4xl font-black text-emerald-600">{finalProcessedCount}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Chưa gán nhãn</p>
            <p className="text-4xl font-black text-amber-600">{remainingCount}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tiến độ</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-black text-indigo-600">{progressPercent}%</p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-indigo-600" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Guideline Section */}
        {task.guideline && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-[3rem] p-10 mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-black text-indigo-900 mb-4">
               <Database className="w-6 h-6" /> Hướng dẫn gán nhãn
            </h2>
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 text-indigo-900/80 font-medium whitespace-pre-line leading-relaxed border border-white/50">
               {task.guideline}
            </div>
          </div>
        )}

        {/* Image Grid Section */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden mb-12">
          <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Chi tiết trạng thái ảnh</h2>
              <p className="text-xs font-bold text-slate-400 grow mt-1">Trực quan hóa tiến độ xử lý từng tệp dữ liệu</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-xs font-bold text-slate-500">Đã xong</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                <span className="text-xs font-bold text-slate-500">Skip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded-full" />
                <span className="text-xs font-bold text-slate-500">Chờ làm</span>
              </div>
            </div>
          </div>

          <div className="p-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
              {items.map((item, idx) => {
                const s = String(item.status || '').toLowerCase();
                const isApproved = s === 'approved' || s === 'completed';
                const isDone = s === 'done' || isApproved;
                const isSkipped = s === 'skipped';
                const isRejected = s === 'rejected';
                const url = resolveImageUrl(item);
                
                return (
                  <div 
                    key={idx}
                    className={`aspect-square rounded-xl flex items-center justify-center relative overflow-hidden transition-all border-2 ${
                      isApproved ? 'border-emerald-500 bg-emerald-50' :
                      isRejected ? 'border-rose-400 bg-rose-50' :
                      isSkipped ? 'border-amber-400 bg-amber-50' :
                      'border-slate-100 bg-slate-50'
                    }`}
                  >
                    {url ? (
                      <img 
                        src={url} 
                        alt={`item-${idx}`} 
                        className={`w-full h-full object-cover ${(isDone || isSkipped || isRejected) ? 'opacity-100' : 'opacity-40'}`}
                      />
                    ) : (
                       <span className={`text-xs font-black ${isDone ? 'text-emerald-600' : isSkipped ? 'text-amber-600' : isRejected ? 'text-rose-600' : 'text-slate-400'}`}>
                         {idx + 1}
                       </span>
                    )}
                    
                    {/* Overlay status marker */}
                    <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      isApproved ? 'bg-emerald-500' :
                      isRejected ? 'bg-rose-500' :
                      isSkipped ? 'bg-amber-400' :
                      'bg-slate-300'
                    }`} />
                    
                    {/* Index marker */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-[2px] text-[8px] font-black text-white px-1 py-0.5 text-center">
                      {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dataset Preview Placeholder */}
        <div className="rounded-[3rem] bg-slate-900 p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-white text-3xl font-extrabold mb-4">Sẵn sàng gán nhãn tiếp?</h3>
            <p className="text-indigo-200/70 mb-8 max-w-lg mx-auto font-medium">Bạn đang làm rất tốt! Hãy tiếp tục gán nhãn để hoàn thành dự án đúng hạn.</p>
            <button 
              onClick={() => navigate(`/annotator/tasks/${taskId}`)}
              className="px-12 py-4 bg-white text-slate-900 rounded-2xl font-black shadow-xl shadow-black/20 hover:scale-105 transition-all"
            >
              Bắt đầu ngay
            </button>
          </div>
          <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-50%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />
        </div>
      </div>
    </div>
  );
}
