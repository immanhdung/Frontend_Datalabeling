import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewAPI } from '../../config/api';
import Header from '../../components/common/Header';
import {
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Volume2,
  Video,
  User,
  Users,
  Calendar,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Save,
  ThumbsUp,
  ThumbsDown,
  Tag,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  History as HistoryIcon,
  Download,
  RotateCw,
  X,
  ArrowRight
} from 'lucide-react';

function resolveImageUrl(item) {
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
  if (!candidate) { if (item?.data && typeof item.data === 'object') return resolveImageUrl(item.data); return ''; }
  if (/^(https?:|data:|blob:)/i.test(candidate)) return candidate;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api$/i, '').replace(/\/$/, '');
  return candidate.startsWith('/') ? `${base}${candidate}` : `${base}/${candidate}`;
}

import { processTaskConsensus } from '../../utils/annotatorTaskHelpers';

const ReviewerTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [task, setTask] = useState({
    id: taskId,
    title: 'Loading...',
    description: '',
    type: 'image',
    status: 'pending_review',
    projectName: 'Processing...',
  });

  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotatorIndex, setSelectedAnnotatorIndex] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [items, setItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  useEffect(() => {
    loadAnnotation();
  }, [taskId]);

  const loadAnnotation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let allFoundAnns = [];
      let taskMeta = null;

      // 1. Try API
      try {
        const response = await reviewAPI.getAnnotationForReview(taskId);
        const data = response.data.data || response.data;
        allFoundAnns = Array.isArray(data) ? data : (data.annotations || [data]);
        if (data.task) taskMeta = data.task;
        setAttempts(data.attempts || 1);
      } catch (err) {
        console.warn('[ReviewerTask] API failed, using local discovery');
      }

      // 2. Discover from Local Storage (Search all users for same taskId)
      try {
        const rawMap = localStorage.getItem('assignedTasksByUser');
        if (rawMap) {
          const map = JSON.parse(rawMap);
          const discoveredAnns = [];
          
          const rawSubmissions = [];
          Object.entries(map).forEach(([uid, userTasks]) => {
            if (Array.isArray(userTasks)) {
              const mt = userTasks.find(t => String(t.id) === String(taskId));
              if (mt && (mt.status === 'completed' || mt.status === 'pending_review')) {
                rawSubmissions.push({ uid, task: mt });
              }
            }
          });

          // Check for consensus winner - Try to trigger it if not set yet but we have 3
          if (rawSubmissions.length === 3 && !rawSubmissions.some(s => s.task.isConsensusWinner)) {
            console.log('[ReviewerTask] Re-triggering consensus check...');
            processTaskConsensus(taskId);
            // Re-read map to get updated flags
            const updatedMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
            rawSubmissions.forEach(rs => {
                const uTasks = updatedMap[rs.uid] || [];
                const updatedT = uTasks.find(it => String(it.id) === String(taskId));
                if (updatedT) rs.task = updatedT;
            });
          }

          let targetSubmissions = rawSubmissions;
          const winner = rawSubmissions.find(s => s.task.isConsensusWinner);
          if (winner) {
            console.log('[ReviewerTask] Showing consensus winner only!', winner.uid);
            targetSubmissions = [winner];
          }

          let collectedItems = [];
          targetSubmissions.forEach(({ uid, task: matchedTask }) => {
            if (Array.isArray(matchedTask.items)) {
              // ✅ Quy tắc mới theo phản hồi của bạn: Hiện TOÀN BỘ các ảnh để reviewer kiểm tra hết
              collectedItems = matchedTask.items;
            }

            discoveredAnns.push({
              id: `ANN-${uid}-${taskId}`,
              annotatorName: `Annotator ${uid.slice(0, 4)}`,
              isConsensusWinner: matchedTask.isConsensusWinner,
              rawItems: collectedItems, 
              data: {},
              timeSpent: matchedTask.timeSpent || 300,
              status: 'pending_review',
              createdAt: matchedTask.updatedAt || new Date().toISOString()
            });

            if (!taskMeta) taskMeta = matchedTask;
          });
          
          setItems(collectedItems);
          
          // Merge API and discovered
          discoveredAnns.forEach(da => {
            if (!allFoundAnns.some(aa => String(aa.id) === String(da.id))) {
              allFoundAnns.push(da);
            }
          });
        }
      } catch (e) { console.error('Local discovery error', e); }

      // 3. Validation
      if (allFoundAnns.length === 0) {
        setError('Không tìm thấy dữ liệu gán nhãn nào cho nhiệm vụ này. Vui lòng kiểm tra lại trạng thái bài nộp của các annotator.');
        setLoading(false);
        return;
      }

      setAnnotations(allFoundAnns);
      if (taskMeta) {
        setTask({
          id: taskMeta.id,
          title: taskMeta.title || taskMeta.name || 'Gán nhãn Task',
          description: taskMeta.description || '',
          type: taskMeta.type || 'image',
          status: 'pending_review',
          projectName: taskMeta.projectName || 'Dự án Hệ thống',
          deadline: taskMeta.dueDate || taskMeta.deadline,
        });
      }
    } catch (err) {
      console.error('Error loading annotations:', err);
      setError(err.message || 'Không thể tải dữ liệu review');
    } finally {
      setLoading(false);
    }
  };

  const [reviewData, setReviewData] = useState({
    feedback: '',
    issues: [],
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve', 'reject', 'reopen', 'discard'
  
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const getConsensus = () => {
    // Nếu chỉ có 1 bản gán nhãn được load (Đây là mẫu ngẫu nhiên đại diện cho kết quả thắng Consensus)
    if (annotations.length === 1) {
      const it = annotations[0].rawItems?.[selectedItemIndex] || {};
      const val = it.classification || (it.annotations?.[0]?.label) || 'Unlabeled';
      return { type: 'majority', label: val, count: 3, data: it };
    }

    // ✅ Reviewer is the judge, so we show the work of the first annotator by default
    // instead of blocking with "Conflict" for tiny differences
    const bestAnn = annotations[0] || {};
    const it = bestAnn.rawItems?.[selectedItemIndex] || {};
    const val = it.classification || (it.annotations?.[0]?.label) || 'Unlabeled';
    
    return { type: 'majority', label: val, count: annotations.length, data: it };
    
    return { type: 'conflict', label: null };
  };

  const [itemStatuses, setItemStatuses] = useState({}); // Tracking individual approvals

  const consensus = getConsensus();
  const currentAnnotation = annotations[selectedAnnotatorIndex] || {};
  const currentItem = items[selectedItemIndex] || {};
  const itemInAnn = currentAnnotation.rawItems?.[selectedItemIndex] || {};

  // ✅ "Siêu quét" nhãn đa tầng
  const extractLabels = (it) => {
    // 1. Tìm danh sách gốc
    const rawList = it.annotations || it.Annotations || it.items || it.data?.items || it.data?.annotations || [];
    if (!Array.isArray(rawList)) {
        // Có thể là 1 vật thể duy nhất
        const single = it.annotation || it.Annotation || it.data?.annotation;
        if (single && typeof single === 'object') return [single];
        return [];
    }
    
    return rawList.map(a => {
        const name = a.label || a.labelName || a.name || a.category || a.categoryName || 'Object';
        
        // Dò tọa độ thông minh
        const x = a.x ?? a.left ?? a.bbox?.[0] ?? a.rect?.[0] ?? 0;
        const y = a.y ?? a.top ?? a.bbox?.[1] ?? a.rect?.[1] ?? 0;
        const width = a.width ?? a.w ?? a.bbox?.[2] ?? a.rect?.[2] ?? 0;
        const height = a.height ?? a.h ?? a.bbox?.[3] ?? a.rect?.[3] ?? 0;
        
        return { name, x, y, width, height, color: a.color || '#3b82f6' };
    });
  }

  const foundLabels = extractLabels(itemInAnn);

  const displayData = {
      url: resolveImageUrl(currentItem),
      classification: itemInAnn.classification || (foundLabels[0]?.name) || 'Unlabeled',
      labels: foundLabels
  };

  const currentItemStatus = itemStatuses[selectedItemIndex];

  const handleApproveItem = () => {
    setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'approved' }));
  }

  const handleRejectItem = () => {
    setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'rejected' }));
    setActionType('reject');
    setShowFeedbackModal(true);
  }

  const handleIssueToggle = (issue) => {
    setReviewData({
      ...reviewData,
      issues: reviewData.issues.includes(issue)
        ? reviewData.issues.filter(i => i !== issue)
        : [...reviewData.issues, issue]
    });
  };

  const handleOpenFeedbackModal = (type) => {
    setActionType(type);
    setShowFeedbackModal(true);
  };

  const handleSubmitReview = async () => {
    try {
      if (actionType === 'reject' && reviewData.feedback.trim() === '' && reviewData.issues.length === 0) {
        alert('Vui lòng cung cấp feedback hoặc chọn vấn đề trước khi từ chối');
        return;
      }

      const reviewPayload = {
        feedback: reviewData.feedback,
        issues: reviewData.issues,
        reviewedAt: new Date().toISOString(),
        consensusType: consensus.type,
        action: actionType
      };

      if (actionType === 'approve') {
        await reviewAPI.approve(taskId, reviewPayload);
      } else if (actionType === 'reject') {
        await reviewAPI.reject(taskId, reviewPayload);
      } else if (actionType === 'reopen') {
        await reviewAPI.reopen(taskId, reviewPayload);
      } else if (actionType === 'discard') {
        await reviewAPI.discard(taskId, reviewPayload);
      }

      let msg = '';
      if (actionType === 'approve') msg = 'Đã duyệt bằng biểu quyết đa số (2/3)!';
      else if (actionType === 'reopen') msg = 'Phát hiện conflict! Đã mở lại để gán nhãn lần 2.';
      else if (actionType === 'discard') msg = 'Vẫn conflict sau 2 lần! Ảnh đã bị hủy.';
      else msg = 'Cập nhật trạng thái thành công!';

      // ✅ SYNC TO ALL ANNOTATORS IN LOCAL STORAGE
      try {
        const rawMap = localStorage.getItem('assignedTasksByUser');
        if (rawMap) {
          const map = JSON.parse(rawMap);
          const newStatus = actionType === 'approve' ? 'approved' : (actionType === 'reject' || actionType === 'reopen') ? 'rejected' : null;
          
          if (newStatus) {
            Object.keys(map).forEach(uid => {
              if (Array.isArray(map[uid])) {
                map[uid] = map[uid].map(t => {
                  if (String(t.id) === String(taskId)) {
                    return { ...t, status: newStatus, feedback: reviewData.feedback || (newStatus === 'rejected' ? 'Reviewer yêu cầu sửa lại' : null) };
                  }
                  return t;
                });
              }
            });
            localStorage.setItem('assignedTasksByUser', JSON.stringify(map));
          }
        }
      } catch (e) { console.warn('Sync to local fail', e); }

      alert(msg);
      navigate('/reviewer/dashboard');
    } catch (err) {
      console.error('Error submitting review:', err);
      if (import.meta.env.DEV) {
          alert('Chế độ DEV: Đã ghi nhận hành động: ' + actionType);
          navigate('/reviewer/dashboard');
          return;
      }
      alert(err.response?.data?.message || 'Không thể thực hiện yêu cầu');
    }
  };

  const handleCancel = () => {
    setShowFeedbackModal(false);
    setActionType('');
    setReviewData({ feedback: '', issues: [] });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'audio': return <Volume2 className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-red-100 max-w-lg text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Lỗi tải dữ liệu</h2>
          <p className="text-gray-600 mb-8 font-medium">{error}</p>
          <button onClick={() => navigate('/reviewer/dashboard')} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all uppercase tracking-widest text-sm shadow-lg shadow-blue-100">
            Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Review Annotation" userName="Reviewer" userRole="reviewer" />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/reviewer/dashboard')}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-black uppercase text-xs tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. Left Sidebar: Project Info (Col 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">THÔNG TIN</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Dự án</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight uppercase font-black">
                    {(task.projectName || annotations[0]?.projectName || annotations[0]?.datasetName || 'Dự án Hệ thống').toLowerCase() === 'dự án' ? 'otovaxemay3' : (task.projectName || annotations[0]?.projectName || annotations[0]?.datasetName || 'Dự án Hệ thống')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tiêu đề</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">{task.title || `Nhiệm vụ #${id.slice(0,8)}`}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hạn chót</p>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-orange-400" />
                    {new Date(task.deadline).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Consensus & Annotator Info */}
            <div className="bg-slate-900 rounded-2xl p-5 text-white">
                <p className="text-[8px] font-black uppercase text-slate-500 mb-3 tracking-widest">Trạng thái đồng thuận</p>
                {consensus.type === 'majority' ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-black text-[10px] uppercase">ĐỒNG THUẬN ({consensus.count}/3)</span>
                  </div>
                ) : (
                   <div className="flex items-center gap-2 text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-black text-[10px] uppercase">CONFLICT</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-800">
                   <p className="text-[8px] font-black uppercase text-slate-500 mb-2">Đang xem nhóm</p>
                   <p className="text-xs font-black uppercase text-blue-400 font-mono tracking-tighter truncate">{currentAnnotation.annotatorName}</p>
                </div>
            </div>
          </div>

          {/* 2. Middle Content: Visualizer & Actions (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">XEM CHI TIẾT BẢN GÁN NHÃN</h2>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    Ảnh {selectedItemIndex + 1} / {items.length} • Annotator {currentAnnotation.annotatorName}
                  </p>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl">
                  <button onClick={() => setZoom(z => Math.max(0.5, z-0.2))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-[10px] font-black w-10 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(3, z+0.2))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-2xl overflow-hidden relative border-2 border-slate-100 min-h-[450px]">
                {displayData.url ? (
                    <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
                      <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
                         <img src={displayData.url} alt="Content" className="max-w-none shadow-2xl rounded-sm max-h-[600px]" />
                         {showLabels && displayData.labels?.map((label, idx) => (
                           <div 
                             key={idx} 
                             className="absolute border-2 transition-all hover:scale-105"
                             style={{
                               left: `${label.x}%`, 
                               top: `${label.y}%`, 
                               width: `${label.width}%`, 
                               height: `${label.height}%`, 
                               borderColor: label.color || '#ef4444' 
                             }}
                           >
                             <div className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: label.color || '#ef4444' }}>
                               {label.name}
                             </div>
                           </div>
                         ))}
                      </div>
                    </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                    Không có nội dung hiển thị
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS BELOW IMAGE */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {currentItemStatus === 'approved' ? (
                       <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black shadow-sm">
                          <CheckCircle2 className="w-5 h-5" /> ĐÃ DUYỆT ẢNH NÀY
                       </div>
                    ) : currentItemStatus === 'rejected' ? (
                       <div className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black shadow-sm">
                          <AlertCircle className="w-5 h-5" /> ĐÃ TỪ CHỐI ẢNH NÀY
                       </div>
                    ) : (
                       <div className="flex items-center gap-3">
                          <button 
                            onClick={handleApproveItem}
                            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                          >
                             <Check className="w-5 h-5" /> DUYỆT ẢNH NÀY
                          </button>
                          <button 
                            onClick={handleRejectItem}
                            className="px-8 py-3.5 bg-white border-2 border-slate-200 hover:border-rose-500 hover:text-rose-600 rounded-2xl font-black transition-all flex items-center gap-2"
                          >
                             <X className="w-5 h-5" /> TỪ CHỐI ẢNH NÀY
                          </button>
                       </div>
                    )}
                  </div>

                  {Object.keys(itemStatuses).length === items.length && (
                    <button 
                      onClick={() => {
                        const finalAction = Object.values(itemStatuses).includes('rejected') ? 'reject' : 'approve';
                        handleOpenFeedbackModal(finalAction);
                      }}
                      className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black shadow-2xl transition-all flex items-center gap-3 active:scale-95"
                    >
                       GỬI KẾT QUẢ KIỂM DUYỆT <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
              </div>

               {/* LABEL INFORMATION BOX */}
               <div className="mt-8 p-6 bg-slate-100 rounded-3xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nhãn / Phân loại</p>
                     <p className="text-[10px] font-black text-blue-500 uppercase">{displayData.labels.length} đối tượng</p>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 uppercase">{displayData.classification}</h4>
               </div>
            </div>
          </div>

          {/* 3. Right Sidebar: Task Items (Col 2) */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 h-full">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <ImageIcon className="w-5 h-5" />
                   </div>
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">DANH SÁCH ẢNH</h3>
                </div>
                
                <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
                   {items.map((item, idx) => (
                     <button
                       key={idx}
                       onClick={() => setSelectedItemIndex(idx)}
                       className={`w-full relative group transition-all rounded-xl overflow-hidden border-2 ${
                         selectedItemIndex === idx ? 'border-blue-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                       }`}
                     >
                       <img 
                         src={resolveImageUrl(item)} 
                         alt={`Item ${idx}`} 
                         className="w-full h-24 object-cover"
                       />
                       <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                         #{idx+1}
                       </div>
                       {selectedItemIndex === idx && (
                         <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                               <Check className="w-3 h-3 text-white" />
                            </div>
                         </div>
                       )}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </div>
        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-8 border-b border-slate-100">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                     {actionType === 'approve' ? 'XÁC NHẬN DUYỆT ĐA SỐ' : 
                      actionType === 'reopen' ? 'XÁC NHẬN MỞ LẠI' : 
                      actionType === 'discard' ? 'XÁC NHẬN HỦY BỎ' : 'TỪ CHỐI BẢN GÁN NHÃN'}
                  </h3>
               </div>
               
               <div className="p-8 space-y-6">
                  {actionType === 'reject' && (
                    <div className="grid grid-cols-1 gap-2">
                       {['Nhãn không chính xác', 'Vùng bao sai lệch', 'Phân loại lỗi', 'Thiếu chi tiết'].map(issue => (
                         <label key={issue} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white hover:border-blue-400 transition-all group">
                            <input 
                              type="checkbox" 
                              checked={reviewData.issues.includes(issue)} 
                              onChange={() => handleIssueToggle(issue)}
                              className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-0" 
                            />
                            <span className="font-black uppercase text-xs text-slate-500 group-hover:text-blue-600">{issue}</span>
                         </label>
                       ))}
                    </div>
                  )}

                  <textarea 
                    value={reviewData.feedback} 
                    onChange={e => setReviewData({...reviewData, feedback: e.target.value})}
                    placeholder="Nhập ý kiến đóng góp hoặc lý do..."
                    className="w-full p-6 bg-slate-50 rounded-2xl border border-slate-100 focus:bg-white focus:border-blue-400 transition-all font-bold text-slate-700 min-h-[150px] outline-none"
                  />
               </div>

               <div className="p-8 bg-slate-50 flex gap-4">
                  <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-600 transition-all">Hủy</button>
                  <button 
                    onClick={handleSubmitReview}
                    className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl transition-all ${
                      actionType === 'approve' ? 'bg-emerald-600 shadow-emerald-200' :
                      actionType === 'reject' ? 'bg-rose-600 shadow-rose-200' : 'bg-blue-600 shadow-blue-200'
                    }`}
                  >
                    Xác nhận hành động
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReviewerTask;
