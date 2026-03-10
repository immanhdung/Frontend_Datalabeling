import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, annotationAPI } from '../../config/api';
import {
  fetchAssignedTasksForUser,
  getCurrentUser,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getLocalAssignedTasksForUser,
  getTaskAssigneeId,
  normalizeTask,
  resolveApiData,
  upsertLocalAssignedTask,
} from '../../utils/annotatorTaskHelpers';
import {
  ArrowLeft,
  Save,
  Send,
  Zap,
  Trash2,
  Plus,
  Minus,
  Square,
  Tag,
  Type,
  Image as ImageIcon,
  Volume2,
  Video,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

const AnnotatorTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load task from API
  const [task, setTask] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageScale, setImageScale] = useState(1);

  const readAnnotatorTasks = () => {
    try {
      const raw = localStorage.getItem('annotatorTasks');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const upsertAnnotatorTask = (nextTask) => {
    const existing = readAnnotatorTasks();
    const merged = [
      nextTask,
      ...existing.filter((item) => String(item?.id ?? item?._id) !== String(nextTask?.id ?? nextTask?._id)),
    ];
    localStorage.setItem('annotatorTasks', JSON.stringify(merged));
  };

  const generateMockItems = (type, total) => {
    const items = [];
    for (let i = 0; i < Math.min(total, 10); i++) {
      items.push({
        id: `item-${i + 1}`,
        type,
        data: getMockData(type, i),
        annotations: [],
        status: 'pending',
      });
    }
    return items;
  };

  const getMockData = (type, index) => {
    switch (type) {
      case 'image':
        return {
          url: `https://picsum.photos/seed/${index + 42}/800/600`, // Better mock images
          width: 800,
          height: 600,
        };
      case 'text':
        return {
          content: `Đây là văn bản mẫu số ${index + 1}. Nội dung văn bản này cần được phân loại hoặc gán nhãn các thực thể như tên người, địa điểm, tổ chức, v.v. Ví dụ: Công ty Apple Inc. được thành lập bởi Steve Jobs tại California vào năm 1976.`,
        };
      case 'audio':
        return {
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: 180,
        };
      case 'video':
        return {
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          duration: 10,
        };
      default:
        return {};
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = getCurrentUser();
      const currentUserId = getCurrentUserId();
      const currentUserIdentifiers = getCurrentUserIdentifiers();
      const myLocalTasks = getLocalAssignedTasksForUser(currentUserIdentifiers);
      const localTask = myLocalTasks.find(
        (taskItem) => String(taskItem.id ?? taskItem._id) === String(taskId)
      );

      const getLocalAssignedTaskById = () => {
        if (!currentUserId && currentUserIdentifiers.length === 0) return null;
        const matchedTask = myLocalTasks.find(
          (taskItem) => String(taskItem.id ?? taskItem._id) === String(taskId)
        );
        return matchedTask || null;
      };

      try {
        const myTasks = await fetchAssignedTasksForUser(taskAPI, currentUserId);
        const isAssignedToMe =
          myTasks.some((taskItem) => String(taskItem.id ?? taskItem._id) === String(taskId)) ||
          Boolean(localTask);

        if (!isAssignedToMe) {
          setError('Bạn không có quyền truy cập task này. Nhiệm vụ chưa được giao cho bạn.');
          setLoading(false);
          return;
        }

        const response = await taskAPI.getById(taskId);
        const taskData = normalizeTask(resolveApiData(response));

        const assigneeId = getTaskAssigneeId(taskData);
        if (assigneeId && currentUserId && String(assigneeId) !== String(currentUserId) && !localTask) {
          setError('Nhiệm vụ này không được giao cho bạn.');
          setLoading(false);
          return;
        }

        if (!taskData.items || taskData.items.length === 0) {
          taskData.items = generateMockItems(taskData.type, taskData.totalItems || 10);
        }

        setTask(taskData);
        if (taskData.items[0]?.annotations) {
          setAnnotations(taskData.items[0].annotations);
        }

      } catch (apiError) {
        if (taskId.startsWith('demo-')) {
          const demoTask = {
            id: taskId,
            title: 'Gán nhãn bộ dữ liệu xe cộ',
            description: 'Phân loại và vẽ khung bao quanh các phương tiện giao thông trên đường phố.',
            type: 'image',
            status: 'pending',
            priority: 'high',
            projectName: 'Urban Mobility Project',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress: 0,
            totalItems: 12,
            assignedTo: currentUser?.id || currentUser?._id,
          };

          demoTask.items = generateMockItems(demoTask.type, demoTask.totalItems);
          setTask(demoTask);
        } else {
          const localTask = getLocalAssignedTaskById();
          if (localTask) {
            const hydratedLocalTask = {
              ...normalizeTask(localTask, currentUserId),
              items: localTask.items || generateMockItems(localTask.type ?? 'image', localTask.totalItems ?? 10),
            };

            setTask(hydratedLocalTask);
            if (hydratedLocalTask.items[0]?.annotations) {
              setAnnotations(hydratedLocalTask.items[0].annotations);
            }
          } else {
            throw apiError;
          }
        }
      }

    } catch (err) {
      console.error('Error loading task:', err);
      setError(err.response?.data?.message || 'Không thể tải nhiệm vụ. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  const labels = task?.type === 'image'
    ? ['Xe hơi', 'Người đi bộ', 'Xe đạp', 'Xe tải', 'Xe máy', 'Đèn giao thông']
    : task?.type === 'text'
      ? ['Tên người', 'Địa điểm', 'Tổ chức', 'Thời gian', 'Sản phẩm']
      : task?.type === 'audio'
        ? ['Tiếng nói', 'Âm nhạc', 'Tiếng ồn', 'Yên lặng']
        : ['Đi bộ', 'Chạy', 'Đứng', 'Ngồi'];

  const labelColors = {
    'Xe hơi': '#3b82f6',
    'Người đi bộ': '#10b981',
    'Xe đạp': '#f59e0b',
    'Xe tải': '#ef4444',
    'Xe máy': '#8b5cf6',
    'Đèn giao thông': '#ec4899',
    'Tên người': '#3b82f6',
    'Địa điểm': '#10b981',
    'Tổ chức': '#f59e0b',
    'Thời gian': '#ef4444',
    'Sản phẩm': '#8b5cf6',
  };

  const handleMouseDown = (e) => {
    if (!selectedLabel || task?.type !== 'image') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / imageScale;
    const y = (e.clientY - rect.top) / imageScale;
    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / imageScale;
    const y = (e.clientY - rect.top) / imageScale;
    setCurrentBox({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleMouseUp = () => {
    if (currentBox && currentBox.width > 5 && currentBox.height > 5) {
      const newAnnotation = {
        id: Date.now(),
        label: selectedLabel,
        type: 'bbox',
        ...currentBox,
        color: labelColors[selectedLabel] || '#3b82f6',
      };
      setAnnotations([...annotations, newAnnotation]);
    }
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentBox(null);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText && selectedLabel) {
      const newAnnotation = {
        id: Date.now(),
        label: selectedLabel,
        type: 'entity',
        text: selectedText,
        color: labelColors[selectedLabel] || '#3b82f6',
      };
      setAnnotations([...annotations, newAnnotation]);
      selection.removeAllRanges();
    }
  };

  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
  };

  const handleSave = async () => {
    try {
      if (task && task.items) {
        const currentUserId = getCurrentUserId();
        const updatedItems = [...task.items];
        updatedItems[currentItemIndex] = {
          ...updatedItems[currentItemIndex],
          annotations,
          status: 'annotated',
        };

        try {
          await annotationAPI.create({
            taskId: task.id,
            itemIndex: currentItemIndex,
            annotations: annotations,
            status: 'annotated'
          });
        } catch (apiErr) {
          console.warn('API save failed, using local fallback');
        }

        const updatedTask = {
          ...task,
          status: calculateProgress(updatedItems) >= 100 ? 'completed' : 'in_progress',
          items: updatedItems,
          progress: calculateProgress(updatedItems),
          updatedAt: new Date().toISOString(),
        };

        upsertAnnotatorTask(updatedTask);
        if (currentUserId) {
          upsertLocalAssignedTask(updatedTask, currentUserId);
        }
        setTask(updatedTask);
      }
      return true;
    } catch (err) {
      console.error('Error saving:', err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (annotations.length === 0) {
      alert('Vui lòng thêm ít nhất một nhãn trước khi tiếp tục!');
      return;
    }

    const saved = await handleSave();
    if (!saved) {
      alert('Không thể lưu tiến độ. Vui lòng thử lại.');
      return;
    }

    if (currentItemIndex < task.items.length - 1) {
      const nextIndex = currentItemIndex + 1;
      setCurrentItemIndex(nextIndex);
      setAnnotations(task.items[nextIndex]?.annotations || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      try {
        await taskAPI.submit(taskId, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          items: task.items
        });
      } catch (apiErr) {
        console.warn('API submit failed');
      }

      const currentUserId = getCurrentUserId();
      const completedTask = {
        ...task,
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100,
        reviewStatus: 'pending_review',
        updatedAt: new Date().toISOString(),
      };

      upsertAnnotatorTask(completedTask);
      if (currentUserId) {
        upsertLocalAssignedTask(completedTask, currentUserId);
      }
      navigate('/annotator/dashboard');
    }
  };

  const calculateProgress = (items) => {
    const annotated = items.filter(item => item.status === 'annotated').length;
    return Math.round((annotated / items.length) * 100);
  };

  const renderAnnotationTool = () => {
    if (!task) return null;
    const currentItem = task.items?.[currentItemIndex];
    if (!currentItem) return null;

    switch (task.type) {
      case 'image':
        return (
          <div className="flex flex-col items-center gap-6">
            <div className="relative border-4 border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50 shadow-inner group transition-all max-w-full">
              <img
                ref={imageRef}
                src={currentItem.data.url}
                alt="Workspace"
                className="w-full h-auto select-none"
                style={{ transform: `scale(${imageScale})`, transformOrigin: 'top left' }}
              />
              <canvas
                ref={canvasRef}
                width={currentItem.data.width}
                height={currentItem.data.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute inset-0 cursor-crosshair z-10"
                style={{ transform: `scale(${imageScale})`, transformOrigin: 'top left' }}
              />
              {annotations.map(ann => (
                <div
                  key={ann.id}
                  className="absolute border-2 z-20 pointer-events-none transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                  style={{
                    left: ann.x * imageScale,
                    top: ann.y * imageScale,
                    width: ann.width * imageScale,
                    height: ann.height * imageScale,
                    borderColor: ann.color,
                  }}
                >
                  <span
                    className="absolute -top-7 left-[-2px] px-2 py-0.5 text-[10px] font-black text-white rounded-t shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: ann.color }}
                  >
                    <Tag className="w-3 h-3" />
                    {ann.label.toUpperCase()}
                  </span>
                </div>
              ))}
              {currentBox && (
                <div
                  className="absolute border-2 border-dashed z-20 pointer-events-none"
                  style={{
                    left: currentBox.x * imageScale,
                    top: currentBox.y * imageScale,
                    width: currentBox.width * imageScale,
                    height: currentBox.height * imageScale,
                    borderColor: labelColors[selectedLabel] || '#3b82f6',
                  }}
                />
              )}
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <button
                onClick={() => setImageScale(Math.max(0.5, imageScale - 0.2))}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="Thu nhỏ"
              >
                <Minus className="w-4 h-4 text-slate-500" />
              </button>
              <span className="px-4 text-sm font-bold text-slate-700 min-w-[70px] text-center">
                {Math.round(imageScale * 100)}%
              </span>
              <button
                onClick={() => setImageScale(Math.min(3, imageScale + 0.2))}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="Phóng to"
              >
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
              <div className="w-px h-6 bg-slate-100 mx-1"></div>
              <button
                onClick={() => setImageScale(1)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                title="Đặt lại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-6">
            <div
              className="p-10 bg-white border-2 border-slate-100 rounded-[2.5rem] text-xl leading-[1.8] text-slate-800 shadow-sm hover:shadow-md transition-shadow"
              onMouseUp={handleTextSelection}
            >
              {currentItem.data.content}
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <Zap className="w-5 h-5 text-blue-500" />
              <p className="text-sm font-medium text-blue-700">
                Mẹo: Bôi đen một đoạn văn bản và chọn nhãn bên phải để gán nhãn thực thể.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Loại nhiệm vụ này hiện đang được hỗ trợ cơ bản.</p>
          </div>
        );
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <p className="text-slate-600 font-bold animate-pulse">Chào mừng tới Workspace...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-slate-100 text-center max-w-lg w-full">
        <div className="w-20 h-20 bg-red-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
          <X className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">Ối! Có lỗi rồi</h2>
        <p className="text-slate-500 leading-relaxed mb-10">{error}</p>
        <div className="flex gap-4">
          <button onClick={() => navigate('/annotator/dashboard')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Quay lại</button>
          <button onClick={loadTask} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Thử lại</button>
        </div>
      </div>
    </div>
  );

  const currentItem = task.items?.[currentItemIndex];
  const itemProgress = task.items ? Math.round(((currentItemIndex + 1) / task.items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-6 overflow-hidden">
            <button
              onClick={() => navigate('/annotator/dashboard')}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Workshop</span>
                <p className="text-xs font-bold text-slate-400 truncate tracking-tight">{task.projectName}</p>
              </div>
              <h1 className="text-xl font-black text-slate-900 truncate tracking-tight">{task.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="hidden lg:flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiến độ nhiệm vụ</p>
                <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">{itemProgress}%</span>
              </div>
              <div className="w-48 bg-slate-100 rounded-full h-1.5 shadow-inner">
                <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${itemProgress}%` }}></div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 font-bold transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Lưu nháp</span>
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-100"
              >
                <span className="hidden sm:inline">Tiếp theo</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Main workspace */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 min-h-[700px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Khu vực gán nhãn</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nhiệm vụ: {currentItemIndex + 1} / {task.items?.length || 0}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentItemIndex === 0}
                    onClick={() => {
                      const prev = currentItemIndex - 1;
                      setCurrentItemIndex(prev);
                      setAnnotations(task.items[prev]?.annotations || []);
                    }}
                    className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 rounded-2xl transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="px-5 flex items-center font-black text-slate-800 bg-slate-50 rounded-2xl border border-slate-100">
                    {currentItemIndex + 1}
                  </div>
                  <button
                    disabled={currentItemIndex === task.items.length - 1}
                    onClick={() => {
                      const next = currentItemIndex + 1;
                      setCurrentItemIndex(next);
                      setAnnotations(task.items[next]?.annotations || []);
                    }}
                    className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 rounded-2xl transition-all rotate-180"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative py-4">
                {renderAnnotationTool()}
              </div>
            </div>
          </div>

          {/* Optimized Sidebar */}
          <div className="space-y-8 h-fit lg:sticky lg:top-28">
            {/* Label Selector */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 group">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-900 tracking-tight">Bộ nhãn</h3>
                <Tag className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {labels.map(label => (
                  <button
                    key={label}
                    onClick={() => setSelectedLabel(label)}
                    className={`group/btn relative px-5 py-4 rounded-2xl text-left font-bold transition-all overflow-hidden ${selectedLabel === label
                        ? 'bg-slate-900 text-white shadow-xl translate-x-1'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: labelColors[label] || '#333' }}></div>
                        <span className="text-sm">{label}</span>
                      </div>
                      {selectedLabel === label ? (
                        <Check className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <span className="text-[10px] text-slate-300 group-hover/btn:text-slate-500 font-black">CHỌN</span>
                      )}
                    </div>
                    {selectedLabel === label && (
                      <div className="absolute top-0 right-0 w-16 h-full bg-indigo-600/10 skew-x-[-20deg] translate-x-8"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Annotations List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-900 tracking-tight">
                  Nhãn đã gán
                </h3>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl text-xs font-black">
                  {annotations.length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {annotations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                    <div className="w-16 h-16 border-2 border-dashed border-slate-400 rounded-3xl flex items-center justify-center mb-4">
                      <Tag className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Chưa có nhãn nào
                    </p>
                  </div>
                ) : (
                  annotations.map(ann => (
                    <div
                      key={ann.id}
                      className="group/ann flex items-center justify-between p-4 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:border-slate-100 transition-all border border-transparent rounded-2xl"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ann.color }}
                        />
                        <div className="overflow-hidden">
                          <p className="text-[13px] font-black text-slate-900 truncate tracking-tight uppercase">{ann.label}</p>
                          {ann.text && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[140px]">
                              "{ann.text}"
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              {task.feedback && (
                <div className="mt-8 p-5 bg-amber-50 border border-amber-100 rounded-[1.5rem]">
                  <div className="flex items-center gap-2 mb-2 text-amber-700">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-wider">Phản hồi từ quản lý</span>
                  </div>
                  <p className="text-xs font-bold text-amber-900 leading-relaxed italic">
                    "{task.feedback}"
                  </p>
                </div>
              )}
            </div>

            {/* Help Card */}
            <div className="bg-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="font-black mb-4 tracking-tight">Hướng dẫn nhanh</h4>
                <ul className="text-xs font-medium text-indigo-100/70 space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                    <span>Chọn một nhãn từ danh sách "Bộ nhãn" phía trên.</span>
                  </li>
                  {task.type === 'image' && (
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                      <span>Nhấn phím chuột trái và kéo trên ảnh để tạo khung bao.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                    <span>Gán nhãn cho tất cả các đối tượng mục tiêu trong bức ảnh này.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                    <span>Nhấn "Tiếp theo" để hoàn thành và lưu tiến độ.</span>
                  </li>
                </ul>
              </div>
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};


export default AnnotatorTask;
