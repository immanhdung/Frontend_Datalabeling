import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, annotationAPI } from '../../config/api';
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
          url: `https://via.placeholder.com/800x600/3b82f6/ffffff?text=Image+${index + 1}`,
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
      
      // Get current user info
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      try {
        // First, verify this task is assigned to current user by getting my tasks
        const myTasksResponse = await taskAPI.getMyTasks();
        const myTasks = myTasksResponse.data.data || myTasksResponse.data || [];
        const isAssignedToMe = myTasks.some(t => t.id === taskId || t._id === taskId);
        
        if (!isAssignedToMe) {
          setError('Bạn không có quyền truy cập task này. Task chưa được assign cho bạn.');
          setLoading(false);
          return;
        }
        
        // Load the specific task
        const response = await taskAPI.getById(taskId);
        const taskData = response.data.data || response.data;
        
        // Double-check: Verify task is assigned to current user
        if (taskData.assignedTo && currentUser && 
            taskData.assignedTo !== currentUser.id && 
            taskData.assignedTo !== currentUser._id) {
          setError('Task này không được assign cho bạn.');
          setLoading(false);
          return;
        }
        
        // Initialize mock items if not exists
        if (!taskData.items) {
          taskData.items = generateMockItems(taskData.type, taskData.totalItems || 10);
        }
        
        setTask(taskData);
        
        // Load existing annotations for current item
        if (taskData.items[0]?.annotations) {
          setAnnotations(taskData.items[0].annotations);
        }
        
      } catch (apiError) {
        // API not ready - check if this is a demo task
        if (taskId.startsWith('demo-')) {
          console.warn('⚠️ API không khả dụng, tạo demo task:', apiError.message);
          
          // Create demo task
          const demoTask = {
            id: taskId,
            title: 'Demo: Gán nhãn hình ảnh xe hơi',
            description: 'Task demo - Xác định và vẽ bounding box cho các loại xe trong ảnh',
            type: 'image',
            status: 'pending',
            priority: 'high',
            projectName: 'Demo Project',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress: 0,
            totalItems: 10,
            assignedTo: currentUser?.id || currentUser?._id,
          };
          
          demoTask.items = generateMockItems(demoTask.type, demoTask.totalItems);
          setTask(demoTask);
          
        } else {
          throw apiError; // Re-throw if not demo task
        }
      }
      
    } catch (err) {
      console.error('Error loading task from API:', err);
      
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError('Bạn không có quyền truy cập task này.');
      } else if (err.response?.status === 404) {
        setError('Task không tồn tại hoặc chưa được assign cho bạn.');
      } else {
        setError(err.response?.data?.message || 'Không thể tải task. Vui lòng thử lại.');
      }
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
    if (!selectedLabel || task?.type !== 'image') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / imageScale;
    const y = (e.clientY - rect.top) / imageScale;

    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
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

        // Try to save via API
        try {
          await annotationAPI.create({
            taskId: task.id,
            itemIndex: currentItemIndex,
            annotations: annotations,
            status: 'annotated'
          });
        } catch (apiErr) {
          console.warn('API save failed, using localStorage fallback:', apiErr);
        }

        // Update task in localStorage (fallback)
        const savedTasks = localStorage.getItem('annotatorTasks');
        if (savedTasks) {
          const tasks = JSON.parse(savedTasks);
          const updatedTasks = tasks.map(t => 
            t.id === taskId 
              ? { ...t, items: updatedItems, progress: calculateProgress(updatedItems) }
              : t
          );
          localStorage.setItem('annotatorTasks', JSON.stringify(updatedTasks));
          setTask({ ...task, items: updatedItems });
        }
      }
      alert('Đã lưu annotations!');
    } catch (err) {
      console.error('Error saving annotations:', err);
      alert('Không thể lưu annotations');
    }
  };

  const handleSubmit = async () => {
    try {
      if (annotations.length === 0) {
        alert('Vui lòng thêm ít nhất một annotation trước khi submit!');
        return;
      }
      await handleSave();
      
      // Move to next item or complete task
      if (currentItemIndex < task.items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
        setAnnotations(task.items[currentItemIndex + 1]?.annotations || []);
      } else {
        alert('Đã hoàn thành tất cả items! Task sẽ được gửi đi review.');
        
        // Try to submit via API
        try {
          await taskAPI.submit(taskId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            items: task.items
          });
        } catch (apiErr) {
          console.warn('API submit failed, using localStorage fallback:', apiErr);
        }
        
        // Mark task as completed (localStorage fallback)
        const savedTasks = localStorage.getItem('annotatorTasks');
        if (savedTasks) {
          const tasks = JSON.parse(savedTasks);
          const completedTask = tasks.find(t => t.id === taskId);
          const updatedTasks = tasks.map(t => 
            t.id === taskId 
              ? { ...t, status: 'completed', completedAt: new Date().toISOString(), progress: 100, reviewStatus: 'pending_review' }
              : t
          );
          localStorage.setItem('annotatorTasks', JSON.stringify(updatedTasks));

          // Create annotation for reviewer (localStorage compatibility)
          if (completedTask) {
            const reviewerAnnotations = JSON.parse(localStorage.getItem('reviewerAnnotations') || '[]');
            const newAnnotation = {
              id: `ann-${Date.now()}`,
              taskId: completedTask.id,
              taskTitle: completedTask.title,
              annotatorName: 'Annotator User', // You can replace with actual user name
              projectName: completedTask.projectName,
              type: completedTask.type,
              status: 'pending_review',
              priority: completedTask.priority,
              createdAt: new Date().toISOString(),
              data: {
                totalItems: completedTask.totalItems,
                completedItems: completedTask.items?.length || 0,
                annotations: completedTask.items?.map(item => item.annotations).flat() || [],
              },
            };
            reviewerAnnotations.unshift(newAnnotation);
            localStorage.setItem('reviewerAnnotations', JSON.stringify(reviewerAnnotations));
          }
        }
        navigate('/annotator/dashboard');
      }
    } catch (err) {
      console.error('Error submitting task:', err);
      alert('Không thể submit task');
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

  const currentItem = task.items?.[currentItemIndex];
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Lưu
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit & Next
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-7xl mx-auto mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Item {currentItemIndex + 1} / {task.items?.length || 0}</span>
            <span>{progress}% hoàn thành</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
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
                <li>• Nhấn "Lưu" để lưu tiến độ</li>
                <li>• Nhấn "Submit" để chuyển item tiếp theo</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnnotatorTask;
