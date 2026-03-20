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
  RotateCw
} from 'lucide-react';

const ReviewerTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [task, setTask] = useState({
    id: 'TASK-001',
    title: 'Gán nhãn ảnh xe hơi',
    description: 'Phân loại và gán nhãn các loại xe trong ảnh',
    type: 'image',
    status: 'in_progress',
    projectId: 'PRJ-001',
    projectName: 'Phân loại phương tiện',
    createdAt: '2026-01-20T10:00:00Z',
    deadline: '2026-02-10T23:59:59Z',
  });

  // Dynamic annotation data - expected to be an array of 3 for the new multi-annotator flow
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotatorIndex, setSelectedAnnotatorIndex] = useState(0);
  const [attempts, setAttempts] = useState(1);

  // Load annotation from API
  useEffect(() => {
    loadAnnotation();
  }, [taskId]);

  const loadAnnotation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reviewAPI.getAnnotationForReview(taskId);
      const data = response.data.data || response.data;
      
      let list = Array.isArray(data) ? data : (data.annotations || [data]);
      
      if (list.length < 3) {
        console.warn('Backend returned less than 3 annotations, generating mock data for demo');
        const base = list[0] || {
            id: 'ANN-BASE',
            annotatorName: 'Annotator 1',
            data: { 
                url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2',
                classification: 'sedan',
                labels: [{ id: 1, name: 'Car', x: 100, y: 50, width: 200, height: 150, confidence: 0.95, color: '#ef4444' }]
            },
            timeSpent: 420,
            status: 'pending_review',
            createdAt: new Date().toISOString()
        };
        
        list = [
          { ...base, id: 'ANN-001', annotatorName: 'Nguyễn Văn A', data: { ...base.data, classification: 'sedan' } },
          { ...base, id: 'ANN-002', annotatorName: 'Trần Thị B', data: { ...base.data, classification: 'sedan' } },
          { ...base, id: 'ANN-003', annotatorName: 'Lê Văn C', data: { ...base.data, classification: 'SUV' } },
        ];
      }
      
      setAnnotations(list);
      setAttempts(data.attempts || 1);
      
      if (data.task) {
        setTask(data.task);
      }
    } catch (err) {
      console.error('Error loading annotations from API:', err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu review');
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
    if (annotations.length < 3) return { type: 'incomplete', label: null };
    
    const labels = annotations.map(a => a.data.classification || JSON.stringify(a.data.labels));
    const counts = {};
    labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
    
    const majority = Object.entries(counts).find(([_, count]) => count >= 2);
    if (majority) {
      const annWithMajority = annotations.find(a => (a.data.classification || JSON.stringify(a.data.labels)) === majority[0]);
      return { type: 'majority', label: majority[0], count: majority[1], data: annWithMajority?.data };
    }
    
    return { type: 'conflict', label: null };
  };

  const consensus = getConsensus();
  const currentAnnotation = annotations[selectedAnnotatorIndex] || {};

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  {getTypeIcon(task.type)}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Phân loại Task</p>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{task.type} Task</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Dự án</p>
                  <p className="font-bold text-slate-700 leading-tight">{task.projectName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tiêu đề</p>
                  <p className="font-bold text-slate-700 leading-tight">{task.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hạn chót</p>
                  <p className="font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    {new Date(task.deadline).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Annotator Switcher */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">KẾT QUẢ TỪ 3 NHÓM</h2>
              </div>

              <div className="space-y-3">
                {annotations.map((ann, idx) => (
                  <button
                    key={ann.id}
                    onClick={() => setSelectedAnnotatorIndex(idx)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      selectedAnnotatorIndex === idx 
                        ? 'border-blue-500 bg-blue-50 shadow-md translate-x-1' 
                        : 'border-slate-50 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white ${
                        selectedAnnotatorIndex === idx ? 'bg-blue-600' : 'bg-slate-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-900 text-sm truncate w-32 uppercase">{ann.annotatorName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Nhãn: {ann.data.classification || 'Phức hợp'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 p-5 bg-slate-900 rounded-2xl text-white">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Trạng thái đồng thuận</p>
               {consensus.type === 'majority' ? (
                 <div>
                   <div className="flex items-center gap-2 text-emerald-400 mb-2">
                     <CheckCircle2 className="w-5 h-5" />
                     <span className="font-black text-sm uppercase">ĐỒNG THUẬN ({consensus.count}/3)</span>
                   </div>
                   <p className="text-xs font-bold text-slate-300">Duyệt nhãn phổ biến nhất</p>
                 </div>
               ) : (
                 <div>
                   <div className="flex items-center gap-2 text-rose-400 mb-2">
                     <AlertCircle className="w-5 h-5" />
                     <span className="font-black text-sm uppercase">CONFLICT (3 nhãn khác)</span>
                   </div>
                   <p className="text-xs font-bold text-slate-300">Yêu cầu can thiệp hoặc mở lại</p>
                 </div>
               )}
               <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-[10px] font-black uppercase">
                 <span className="text-slate-500">Lần nộp</span>
                 <span className={attempts >= 2 ? 'text-rose-400' : 'text-blue-400'}>{attempts}/2</span>
               </div>
              </div>
            </div>

            {/* Actions for Reviewer */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 overflow-hidden relative">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">HÀNH ĐỘNG HỆ THỐNG</h2>
              <div className="space-y-3">
                {consensus.type === 'majority' ? (
                  <button
                    onClick={() => handleOpenFeedbackModal('approve')}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100/50 flex flex-col items-center justify-center"
                  >
                    <span className="font-black uppercase tracking-tighter text-lg">DUYỆT ĐA SỐ</span>
                    <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest mt-1">Accept {consensus.count}/3 Majority</span>
                  </button>
                ) : (
                  <>
                    {attempts < 2 ? (
                      <button
                        onClick={() => handleOpenFeedbackModal('reopen')}
                        className="w-full py-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100/50 flex flex-col items-center justify-center"
                      >
                        <span className="font-black uppercase tracking-tighter text-lg">MỞ LẠI (RE-OPEN)</span>
                        <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest mt-1">Yêu cầu nộp lại bài</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenFeedbackModal('discard')}
                        className="w-full py-4 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100/50 flex flex-col items-center justify-center"
                      >
                        <span className="font-black uppercase tracking-tighter text-lg">HỦY BỎ (DISCARD)</span>
                        <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest mt-1">Hủy ảnh do ko đồng thuận</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleOpenFeedbackModal('reject')}
                  className="w-full py-3 border-2 border-slate-100 text-slate-400 rounded-xl hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-widest"
                >
                  Từ chối thủ công
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-8">
            {/* Visualizer */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">XEM CHI TIẾT BẢN GÁN NHÃN</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Hiển thị kết quả của {currentAnnotation.annotatorName}</p>
                </div>

                {task.type === 'image' && (
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl">
                    <button onClick={() => setZoom(z => Math.max(0.5, z-0.2))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black w-10 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z+0.2))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <button onClick={() => setShowLabels(!showLabels)} className={`p-2 rounded-lg transition-all ${showLabels ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600' }`}>
                      {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-slate-50 rounded-2xl overflow-hidden relative border-2 border-slate-100 min-h-[400px]">
                {task.type === 'image' && currentAnnotation.data.url && (
                    <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
                      <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
                         <img src={currentAnnotation.data.url} alt="Annotation content" className="max-w-none shadow-2xl rounded-sm" />
                         {showLabels && currentAnnotation.data.labels?.map((label, idx) => (
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
                )}

                {task.type === 'text' && currentAnnotation.data.text && (
                  <div className="p-10 h-full overflow-auto">
                    <div className="max-w-3xl mx-auto space-y-8">
                       <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm leading-relaxed text-slate-700 text-lg">
                         {currentAnnotation.data.text}
                       </div>
                       {currentAnnotation.data.entities && (
                         <div className="grid grid-cols-2 gap-4">
                            {currentAnnotation.data.entities.map((e, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                                <span className="font-black text-xs uppercase text-slate-400">{e.label}</span>
                                <span className="font-bold text-slate-800">{e.text}</span>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  </div>
                )}

                {task.type === 'video' && currentAnnotation.data.url && (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                     <video src={currentAnnotation.data.url} controls className="max-h-full" />
                  </div>
                )}

                {task.type === 'audio' && currentAnnotation.data.url && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white">
                     <div className="w-full max-w-2xl bg-slate-50 p-10 rounded-3xl border border-slate-100">
                        <Volume2 className="w-16 h-16 text-blue-500 mx-auto mb-8 animate-pulse" />
                        <audio src={currentAnnotation.data.url} controls className="w-full" />
                     </div>
                  </div>
                )}
              </div>

              {/* Data Meta */}
              <div className="mt-8 grid grid-cols-4 gap-6">
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Độ tin cậy</p>
                    <p className="text-xl font-black text-blue-600">{(currentAnnotation.data.confidence * 100 || 95).toFixed(0)}%</p>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Thời gian tập trung</p>
                    <p className="text-xl font-black text-purple-600">{formatTime(currentAnnotation.timeSpent)}</p>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Số thực thể</p>
                    <p className="text-xl font-black text-emerald-600">
                      {task.type === 'image' ? currentAnnotation.data.labels?.length || 0 :
                       task.type === 'text' ? currentAnnotation.data.entities?.length || 0 : 
                       'Đã nộp'}
                    </p>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Trình độ nhóm</p>
                    <p className="text-xl font-black text-orange-600 uppercase">Expert</p>
                 </div>
              </div>
            </div>

            {/* Feedback Summary if existing */}
            {currentAnnotation.data.notes && (
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 text-blue-700">
                 <div className="flex gap-4">
                    <MessageSquare className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1">Ghi chú từ Annotator</p>
                      <p className="font-semibold text-sm leading-relaxed">{currentAnnotation.data.notes}</p>
                    </div>
                 </div>
              </div>
            )}
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
                  <button onClick={handleCancel} className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-600 transition-all">Hủy</button>
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
