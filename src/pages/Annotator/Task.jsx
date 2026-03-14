import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, annotationAPI } from '../../config/api';
import {
  fetchAssignedTasksForUser,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getTaskAssigneeId,
  normalizeTask,
  resolveApiData,
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
  AlertCircle
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
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUserId = getCurrentUserId();
      const currentUserIdentifiers = getCurrentUserIdentifiers();

      // 1. Try to fetch task lists (API + Local) to verify assignment
      const myTasks = await fetchAssignedTasksForUser(taskAPI, currentUserIdentifiers);
      const assignedTask = myTasks.find(
        (taskItem) => String(taskItem.id ?? taskItem._id) === String(taskId)
      );

      if (!assignedTask) {
        setError('Bạn không có quyền truy cập task này. Task chưa được assign cho bạn.');
        return;
      }

      let taskData = null;

      // 2. Determine if it's a mock task or real task
      if (String(taskId).startsWith('mock-')) {
        // Use the one already found in merged list
        taskData = normalizeTask(assignedTask);
      } else {
        // Try fetching full details from API for real tasks
        try {
          const response = await taskAPI.getById(taskId);
          taskData = normalizeTask(resolveApiData(response));
        } catch (apiErr) {
          console.warn("Could not fetch task details from API, using list data", apiErr);
          taskData = normalizeTask(assignedTask);
        }
      }

      if (!taskData) {
        setError('Không thể tìm thấy chi tiết task.');
        return;
      }

      // 3. Last check for assignee
      const assigneeId = getTaskAssigneeId(taskData);
      if (assigneeId && currentUserId && String(assigneeId) !== String(currentUserId)) {
        // Double check identifiers
        if (!currentUserIdentifiers.includes(String(assigneeId))) {
          setError('Task này không được assign cho bạn.');
          return;
        }
      }

      if (!Array.isArray(taskData.items) || taskData.items.length === 0) {
        setError('Task chưa có item để gán nhãn.');
        setTask(taskData);
        return;
      }

      setTask(taskData);
      // If we've started before, we might want to resume at the first non-completed item
      const firstUnprocessedIndex = taskData.items.findIndex(item => !item.status || item.status === 'pending');
      const resumeIndex = firstUnprocessedIndex !== -1 ? firstUnprocessedIndex : 0;
      
      setCurrentItemIndex(resumeIndex);
      setAnnotations(taskData.items[resumeIndex]?.annotations || []);
      
    } catch (err) {
      console.error('Error loading task:', err);
      setError(err.message || 'Không thể tải task. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const labels = task?.type === 'image' 
    ? ['Car', 'Person', 'Bicycle', 'Truck', 'Motorcycle']
    : task?.type === 'text'
    ? ['PERSON', 'LOCATION', 'ORGANIZATION', 'DATE', 'PRODUCT']
    : task?.type === 'audio'
    ? ['Speech', 'Music', 'Noise', 'Silence']
    : ['Walking', 'Running', 'Standing', 'Sitting'];

  const labelColors = {
    'Car': '#3b82f6',
    'Person': '#10b981',
    'Bicycle': '#f59e0b',
    'Truck': '#ef4444',
    'Motorcycle': '#8b5cf6',
    'PERSON': '#3b82f6',
    'LOCATION': '#10b981',
    'ORGANIZATION': '#f59e0b',
    'DATE': '#ef4444',
    'PRODUCT': '#8b5cf6',
  };

  // Image annotation handlers
  const handleMouseDown = (e) => {
    if (task?.type !== 'image') return;
    
    if (!selectedLabel) {
      alert("Vui lòng chọn một nhãn trước khi vẽ!");
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Correct for scaling
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);

    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);

    setCurrentBox({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleMouseUp = () => {
    if (currentBox && currentBox.width > 10 && currentBox.height > 10) {
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

  // Text annotation handler
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
      // Save annotations to current item
      if (task && task.items) {
        const updatedItems = [...task.items];
        updatedItems[currentItemIndex] = {
          ...updatedItems[currentItemIndex],
          annotations,
          status: 'annotated',
        };

        await annotationAPI.create({
          taskId: task.id,
          itemIndex: currentItemIndex,
          annotations: annotations,
          status: 'annotated'
        });

        const updatedTask = {
          ...task,
          status: calculateProgress(updatedItems) >= 100 ? 'completed' : 'in_progress',
          items: updatedItems,
          progress: calculateProgress(updatedItems),
          updatedAt: new Date().toISOString(),
        };
        setTask(updatedTask);
      }
      alert('Đã lưu annotations!');
    } catch (err) {
      console.error('Error saving annotations:', err);
      alert('Không thể lưu annotations');
    }
  };

  const handleSkip = () => {
    setShowSkipModal(true);
  };

  const confirmSkip = async () => {
    if (!skipReason.trim()) {
      alert("Vui lòng nhập lý do bỏ qua!");
      return;
    }

    try {
      if (task && task.items) {
        const updatedItems = [...task.items];
        updatedItems[currentItemIndex] = {
          ...updatedItems[currentItemIndex],
          status: 'skipped',
          skipReason: skipReason,
          annotations: [] // Clear annotations if skipped? Or keep?
        };

        const updatedTask = {
          ...task,
          items: updatedItems,
          progress: calculateProgress(updatedItems),
          updatedAt: new Date().toISOString(),
          status: calculateProgress(updatedItems) >= 100 ? 'completed' : 'in_progress',
        };

        setTask(updatedTask);
        
        // Save to local/API
        await annotationAPI.create({
          taskId: task.id,
          itemIndex: currentItemIndex,
          status: 'skipped',
          reason: skipReason
        });

        // Update local storage if it's a mock/local task
        const currentUserId = getCurrentUserId();
        const taskMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
        const key = String(currentUserId);
        if (taskMap[key]) {
          taskMap[key] = taskMap[key].map(t => 
            String(t.id) === String(task.id) ? updatedTask : t
          );
          localStorage.setItem('assignedTasksByUser', JSON.stringify(taskMap));
        }

        setShowSkipModal(false);
        setSkipReason("");

        // Move to next if available
        if (currentItemIndex < task.items.length - 1) {
          setCurrentItemIndex(currentItemIndex + 1);
          setAnnotations(task.items[currentItemIndex + 1]?.annotations || []);
        }
      }
    } catch (err) {
      console.error('Error skipping item:', err);
      alert('Không thể bỏ qua item này');
    }
  };

  const calculateProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const processed = items.filter(item => item.status === 'annotated' || item.status === 'skipped').length;
    return Math.round((processed / items.length) * 100);
  };

  const handleSubmit = async () => {
    try {
      const isAllProcessed = task.items.every(item => item.status === 'annotated' || item.status === 'skipped');
      
      if (!isAllProcessed) {
        // Find first unfinished item
        const firstUnfinished = task.items.findIndex(item => item.status === 'pending' || !item.status);
        setCurrentItemIndex(firstUnfinished);
        setAnnotations(task.items[firstUnfinished]?.annotations || []);
        alert('Bạn phải hoàn thành hoặc bỏ qua (có lý do) tất cả các ảnh mới được nộp!');
        return;
      }

      const confirmSubmit = window.confirm('Bạn đã hoàn thành tất cả các mục. Bạn có muốn nộp dự án không?');
      if (!confirmSubmit) return;

      setLoading(true);
      await taskAPI.submit(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        items: task.items
      });

      // Update local storage
      const currentUserId = getCurrentUserId();
      const taskMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
      const key = String(currentUserId);
      if (taskMap[key]) {
        taskMap[key] = taskMap[key].map(t => 
          String(t.id) === String(taskId) ? { ...t, status: 'completed' } : t
        );
        localStorage.setItem('assignedTasksByUser', JSON.stringify(taskMap));
      }

      alert('Đã nộp dự án thành công!');
      navigate('/annotator/dashboard');
    } catch (err) {
      console.error('Error submitting task:', err);
      alert('Không thể nộp dự án. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    // Save current annotations for current item
    if (annotations.length === 0 && task.items[currentItemIndex].status !== 'skipped') {
      alert('Vui lòng gán nhãn hoặc chọn Skip trước khi sang hình tiếp theo!');
      return;
    }

    const updatedItems = [...task.items];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      annotations,
      status: updatedItems[currentItemIndex].status === 'skipped' ? 'skipped' : 'annotated',
    };

    const updatedTask = {
      ...task,
      items: updatedItems,
      progress: calculateProgress(updatedItems),
    };
    setTask(updatedTask);

    // Save progress to local storage (for persistence)
    const currentUserId = getCurrentUserId();
    const taskMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
    const key = String(currentUserId);
    if (taskMap[key]) {
      taskMap[key] = taskMap[key].map(t => 
        String(t.id) === String(task.id) ? updatedTask : t
      );
      localStorage.setItem('assignedTasksByUser', JSON.stringify(taskMap));
    }

    if (currentItemIndex < task.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setAnnotations(task.items[currentItemIndex + 1]?.annotations || []);
    } else {
      alert('Đây là hình cuối cùng. Nhấn Submit để nộp dự án.');
    }
  };

  const handlePrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setAnnotations(task.items[currentItemIndex - 1]?.annotations || []);
    }
  };

  const renderAnnotationTool = () => {
    if (!task) return null;

    const currentItem = task.items?.[currentItemIndex];
    if (!currentItem) return null;

    switch (task.type) {
      case 'image':
        return (
          <div className="space-y-4">
            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <img 
                ref={imageRef}
                src={currentItem.data.url}
                alt="Annotation"
                className="w-full h-auto"
                style={{ transform: `scale(${imageScale})`, transformOrigin: 'top left' }}
              />
              <canvas
                ref={canvasRef}
                width={currentItem.data.width}
                height={currentItem.data.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute inset-0 cursor-crosshair"
                style={{ transform: `scale(${imageScale})`, transformOrigin: 'top left' }}
              />
              {/* Draw existing annotations */}
              {annotations.map(ann => (
                <div
                  key={ann.id}
                  className="absolute border-2 pointer-events-none"
                  style={{
                    left: ann.x * imageScale,
                    top: ann.y * imageScale,
                    width: ann.width * imageScale,
                    height: ann.height * imageScale,
                    borderColor: ann.color,
                  }}
                >
                  <span 
                    className="absolute -top-6 left-0 px-2 py-1 text-xs font-bold text-white rounded"
                    style={{ backgroundColor: ann.color }}
                  >
                    {ann.label}
                  </span>
                </div>
              ))}
              {/* Draw current box while drawing */}
              {currentBox && (
                <div
                  className="absolute border-2 border-dashed pointer-events-none"
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

            {/* Zoom controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setImageScale(Math.max(0.5, imageScale - 0.1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">{Math.round(imageScale * 100)}%</span>
              <button
                onClick={() => setImageScale(Math.min(2, imageScale + 0.1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImageScale(1)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div 
              className="p-6 bg-white border-2 border-gray-300 rounded-lg text-lg leading-relaxed"
              onMouseUp={handleTextSelection}
            >
              {currentItem.data.content}
            </div>
            <p className="text-sm text-gray-600">
              💡 Chọn văn bản và chọn nhãn để gán nhãn entity
            </p>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <div className="p-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
              <audio controls className="w-full">
                <source src={currentItem.data.url} type="audio/mpeg" />
              </audio>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                💡 Nghe audio và phân loại hoặc transcribe nội dung
              </p>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="bg-black rounded-lg overflow-hidden">
              <video controls className="w-full">
                <source src={currentItem.data.url} type="video/mp4" />
              </video>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                💡 Xem video và gán nhãn các object/action theo frame
              </p>
            </div>
          </div>
        );

      default:
        return <div>Unsupported task type</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi tải task</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={loadTask}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => navigate('/annotator/dashboard')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải task...</p>
        </div>
      </div>
    );
  }

  const progress = task.items ? Math.round(((currentItemIndex + 1) / task.items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/annotator/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
              <p className="text-sm text-gray-600">{task.projectName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold"
            >
              <Save className="w-4 h-4" />
              Lưu nháp
            </button>
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all font-semibold"
            >
              <RotateCcw className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-bold shadow-lg ${
                task.items?.every(item => item.status === 'annotated' || item.status === 'skipped')
                  ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Send className="w-4 h-4" />
              Nộp dự án
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {/* Progress bar and Navigation */}
        <div className="max-w-7xl mx-auto mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
              <span>Tiến độ: Item {currentItemIndex + 1} / {task.items?.length || 0}</span>
              <span>{progress}% hoàn thành</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentItemIndex === 0}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm">
              {currentItemIndex + 1}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold"
            >
              Hình tiếp theo
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Annotation area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Annotation Tool</h2>
              {renderAnnotationTool()}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Label selector */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn nhãn</h3>
              <div className="space-y-2">
                {labels.map(label => (
                  <button
                    key={label}
                    onClick={() => setSelectedLabel(label)}
                    className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-all ${
                      selectedLabel === label
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{label}</span>
                      {selectedLabel === label && <Check className="w-5 h-5" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Annotations list */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Annotations ({annotations.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {annotations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Chưa có annotation nào
                  </p>
                ) : (
                  annotations.map(ann => (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: ann.color }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{ann.label}</p>
                          {ann.text && (
                            <p className="text-xs text-gray-600 truncate max-w-[150px]">
                              "{ann.text}"
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-bold text-blue-900 mb-2">Hướng dẫn</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Chọn nhãn từ danh sách</li>
                {task.type === 'image' && (
                  <>
                    <li>• Click và kéo để vẽ bounding box</li>
                    <li>• Dùng zoom để xem chi tiết</li>
                  </>
                )}
                {task.type === 'text' && (
                  <li>• Bôi đen văn bản để gán nhãn</li>
                )}
                <li>• Nhấn "Hình tiếp theo" để lưu và chuyển tiếp</li>
                <li>• Quá trình này được ghi nhận khi tất cả các hình ảnh đều có nhãn hoặc lý do bỏ qua</li>
              </ul>
            </div>

            {/* Debug/Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="font-bold text-slate-700 mb-2">Trạng thái Item</h4>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${task.items[currentItemIndex]?.status === 'annotated' ? 'bg-green-500' : task.items[currentItemIndex]?.status === 'skipped' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                <span className="text-sm font-medium text-slate-600">
                  {task.items[currentItemIndex]?.status === 'annotated' ? 'Đã gán nhãn' : 
                   task.items[currentItemIndex]?.status === 'skipped' ? 'Đã bỏ qua' : 'Chưa xử lý'}
                </span>
              </div>
              {task.items[currentItemIndex]?.skipReason && (
                <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 italic text-xs text-amber-700">
                  Lý do skip: "{task.items[currentItemIndex].skipReason}"
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Skip Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Lý do bỏ qua ảnh</h3>
              <button 
                onClick={() => setShowSkipModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Vui lòng cho biết lý do bạn muốn bỏ qua hình ảnh này (ví dụ: ảnh mờ, không có đối tượng cần gán nhãn, v.v.)
            </p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Nhập lý do tại đây..."
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all resize-none mb-6 h-32 text-slate-700"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowSkipModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmSkip}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
              >
                Xác nhận Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotatorTask;
