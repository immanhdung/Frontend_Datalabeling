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
import api, { taskAPI } from '../../config/api';
import { 
  normalizeTask, 
  resolveApiData 
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
        const taskRes = await taskAPI.getById(taskId);
        const rawTask = resolveApiData(taskRes);
        const normalized = normalizeTask(Array.isArray(rawTask) ? rawTask[0] : rawTask);
        
        // Try to fetch project name if missing
        if (!normalized.projectName || normalized.projectName === 'Dự án') {
          try {
            const projRes = await api.get(`/projects/${normalized.projectId}`, { validateStatus: () => true });
            if (projRes.status === 200) {
              const p = projRes.data?.data || projRes.data || {};
              normalized.projectName = p.name || p.projectName || normalized.projectName;
              normalized.dueDate = p.deadline || p.dueDate || normalized.dueDate;
            }
          } catch {}
        }

        setTask(normalized);

        // 2. Fetch Task Items
        const itemsRes = await taskAPI.getItems(taskId);
        const rawItems = resolveApiData(itemsRes);
        setItems(Array.isArray(rawItems) ? rawItems : []);
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

  const annotatedItems = items.filter(it => {
    const s = String(it.status || '').toLowerCase();
    return s === 'done' || s === 'completed';
  });
  const skippedItems = items.filter(it => String(it.status).toLowerCase() === 'skipped');
  const remainingCount = items.length - annotatedItems.length - skippedItems.length;
  const progressPercent = items.length > 0 ? Math.round(((annotatedItems.length + skippedItems.length) / items.length) * 100) : 0;

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
            <p className="text-4xl font-black text-emerald-600">{annotatedItems.length}</p>
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
                const isDone = s === 'done' || s === 'completed';
                const isSkipped = s === 'skipped';
                
                return (
                  <div 
                    key={idx}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isDone ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-500' :
                      isSkipped ? 'bg-amber-50 text-amber-600 border-2 border-amber-400' :
                      'bg-slate-50 text-slate-400 border-2 border-slate-100'
                    }`}
                  >
                    {idx + 1}
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
