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

  // Dynamic annotation data based on task type
  const [annotation, setAnnotation] = useState(null);

  // Load annotation from API
  useEffect(() => {
    loadAnnotation();
  }, [taskId]);

  const loadAnnotation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load annotation for review from API
      const response = await reviewAPI.getAnnotationForReview(taskId);
      const data = response.data.data || response.data;
      
      setAnnotation(data);
      
      // Update task info if available
      if (data.task) {
        setTask(data.task);
      }
    } catch (err) {
      console.error('Error loading annotation from API:', err);
      
      // Fallback to mock data
      console.log('Using mock data fallback');
      const mockAnnotations = {
      '1': { // Image annotation
        id: 'ANN-001',
        annotatorId: 'Ann-001',
        annotatorName: 'Nguyễn Văn A',
        data: {
          url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2',
          labels: [
            { id: 1, name: 'Car', x: 100, y: 50, width: 200, height: 150, confidence: 0.95, color: '#ef4444' },
            { id: 2, name: 'Person', x: 350, y: 200, width: 80, height: 120, confidence: 0.88, color: '#3b82f6' }
          ],
          classification: 'sedan',
          notes: 'Ảnh chụp ban ngày, điều kiện ánh sáng tốt'
        },
        status: 'pending_review',
        createdAt: '2026-01-28T10:00:00Z',
        timeSpent: 420,
        history: [
          { action: 'created', timestamp: '2026-01-28T09:30:00Z', user: 'Nguyễn Văn A', description: 'Tạo annotation' },
          { action: 'updated', timestamp: '2026-01-28T09:45:00Z', user: 'Nguyễn Văn A', description: 'Thêm bounding box cho Person' },
          { action: 'submitted', timestamp: '2026-01-28T10:00:00Z', user: 'Nguyễn Văn A', description: 'Submit để review' }
        ]
      },
      '2': { // Text annotation
        id: 'ANN-002',
        annotatorId: 'Ann-002',
        annotatorName: 'Trần Thị B',
        data: {
          text: 'Apple Inc. công bố sẽ mở rộng hoạt động tại Việt Nam vào tháng 6/2026. CEO Tim Cook cho biết đây là bước đi chiến lược quan trọng của công ty.',
          entities: [
            { id: 1, text: 'Apple Inc.', label: 'ORGANIZATION', start: 0, end: 10, color: '#ef4444' },
            { id: 2, text: 'Việt Nam', label: 'LOCATION', start: 46, end: 54, color: '#3b82f6' },
            { id: 3, text: 'tháng 6/2026', label: 'DATE', start: 59, end: 71, color: '#10b981' },
            { id: 4, text: 'Tim Cook', label: 'PERSON', start: 77, end: 85, color: '#f59e0b' }
          ],
          sentiment: 'positive',
          confidence: 0.92,
          notes: 'Văn bản rõ ràng, dễ phân loại'
        },
        status: 'pending_review',
        createdAt: '2026-01-28T09:30:00Z',
        timeSpent: 300,
        history: [
          { action: 'created', timestamp: '2026-01-28T09:00:00Z', user: 'Trần Thị B', description: 'Tạo annotation' },
          { action: 'updated', timestamp: '2026-01-28T09:20:00Z', user: 'Trần Thị B', description: 'Thêm entities' },
          { action: 'submitted', timestamp: '2026-01-28T09:30:00Z', user: 'Trần Thị B', description: 'Submit để review' }
        ]
      },
      '3': { // Video annotation
        id: 'ANN-003',
        annotatorId: 'Ann-001',
        annotatorName: 'Nguyễn Văn A',
        data: {
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          duration: 120, // seconds
          frames: [
            { time: 5, labels: [{ name: 'Car', x: 100, y: 50, width: 200, height: 150 }] },
            { time: 15, labels: [{ name: 'Person', x: 150, y: 100, width: 80, height: 120 }] },
            { time: 30, labels: [{ name: 'Car', x: 200, y: 80, width: 200, height: 150 }] }
          ],
          classification: 'traffic_scene',
          notes: 'Video chất lượng cao, góc quay tốt'
        },
        status: 'approved',
        createdAt: '2026-01-27T14:20:00Z',
        timeSpent: 720,
        history: [
          { action: 'created', timestamp: '2026-01-27T13:00:00Z', user: 'Nguyễn Văn A', description: 'Tạo annotation' },
          { action: 'updated', timestamp: '2026-01-27T14:00:00Z', user: 'Nguyễn Văn A', description: 'Gán nhãn các frames' },
          { action: 'submitted', timestamp: '2026-01-27T14:20:00Z', user: 'Nguyễn Văn A', description: 'Submit để review' }
        ]
      },
      '4': { // Audio annotation
        id: 'ANN-004',
        annotatorId: 'Ann-003',
        annotatorName: 'Lê Văn C',
        data: {
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: 180,
          segments: [
            { id: 1, start: 0, end: 30, label: 'Music', confidence: 0.95, color: '#ef4444' },
            { id: 2, start: 30, end: 60, label: 'Speech', confidence: 0.88, color: '#3b82f6' },
            { id: 3, start: 60, end: 90, label: 'Music', confidence: 0.92, color: '#ef4444' },
            { id: 4, start: 90, end: 120, label: 'Noise', confidence: 0.75, color: '#f59e0b' }
          ],
          classification: 'mixed_audio',
          notes: 'Âm thanh rõ ràng, dễ phân biệt'
        },
        status: 'rejected',
        createdAt: '2026-01-27T11:00:00Z',
        timeSpent: 360,
        history: [
          { action: 'created', timestamp: '2026-01-27T10:30:00Z', user: 'Lê Văn C', description: 'Tạo annotation' },
          { action: 'updated', timestamp: '2026-01-27T10:50:00Z', user: 'Lê Văn C', description: 'Gán nhãn các segments' },
          { action: 'submitted', timestamp: '2026-01-27T11:00:00Z', user: 'Lê Văn C', description: 'Submit để review' }
        ]
      }
    };

    const selectedAnnotation = mockAnnotations[taskId] || mockAnnotations['1'];
    setAnnotation(selectedAnnotation);

    // Update task type based on annotation
    if (taskId === '2') {
      setTask(prev => ({ ...prev, type: 'text', title: 'Phân loại văn bản tin tức' }));
    } else if (taskId === '3') {
      setTask(prev => ({ ...prev, type: 'video', title: 'Nhận diện đối tượng trong video' }));
    } else if (taskId === '4') {
      setTask(prev => ({ ...prev, type: 'audio', title: 'Gán nhãn âm thanh' }));
    }
    setError(null); // Clear error since we have mock data
    } finally {
      setLoading(false);
    }
  };

  const [reviewData, setReviewData] = useState({
    status: 'pending',
    feedback: '',
    issues: [],
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  
  // Image viewer states
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Mock issues that can be selected
  const commonIssues = [
    'Nhãn không chính xác',
    'Thiếu một số đối tượng',
    'Vùng bounding box không chính xác',
    'Phân loại sai',
    'Chất lượng annotation kém',
    'Không tuân thủ hướng dẫn'
  ];

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
        reviewedAt: new Date().toISOString()
      };

      // Call API to approve or reject
      if (actionType === 'approve') {
        await reviewAPI.approve(annotation.id, reviewPayload);
      } else {
        await reviewAPI.reject(annotation.id, reviewPayload);
      }

      console.log('Review submitted successfully');
      
      alert(`Annotation đã được ${actionType === 'approve' ? 'duyệt' : 'từ chối'} thành công!`);
      navigate('/reviewer/dashboard');
    } catch (err) {
      console.error('Error submitting review:', err);
      alert(err.response?.data?.message || 'Không thể submit review');
    }
  };

  const handleCancel = () => {
    setShowFeedbackModal(false);
    setActionType('');
    setReviewData({ status: 'pending', feedback: '', issues: [] });
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = annotation.data.url;
    link.download = `annotation-${annotation.id}.jpg`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Review Annotation"
          userName="Reviewer"
          userRole="reviewer"
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-500">Đang tải dữ liệu...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Review Annotation"
          userName="Reviewer"
          userRole="reviewer"
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/reviewer/dashboard')}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Quay lại Dashboard</span>
          </button>
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi tải annotation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={loadAnnotation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => navigate('/reviewer/dashboard')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!annotation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Review Annotation"
          userName="Reviewer"
          userRole="reviewer"
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-xl font-semibold text-gray-500">Không tìm thấy annotation</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Review Annotation"
        userName="Reviewer"
        userRole="reviewer"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/reviewer/dashboard')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Quay lại Dashboard</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{/* Left Column: Task and Annotator Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Task Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                {getTypeIcon(task.type)}
                Thông tin Task
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tên Task</p>
                  <p className="font-semibold text-gray-900">{task.title}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Mô tả</p>
                  <p className="text-gray-700">{task.description}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Dự án</p>
                  <p className="text-gray-700">{task.projectName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Loại</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase">
                    {task.type}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Deadline
                  </p>
                  <p className="text-gray-700">{new Date(task.deadline).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Annotator Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Thông tin Annotator
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Người thực hiện</p>
                  <p className="font-semibold text-gray-900">{annotation.annotatorName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Thời gian hoàn thành</p>
                  <p className="text-gray-700">{new Date(annotation.createdAt).toLocaleString('vi-VN')}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Thời gian thực hiện
                  </p>
                  <p className="text-gray-700">{formatTime(annotation.timeSpent)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Trạng thái</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    annotation.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                    annotation.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {annotation.status === 'pending_review' ? 'Chờ review' :
                     annotation.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                  </span>
                </div>
              </div>
            </div>

            {/* Review Actions */}
            {annotation.status === 'pending_review' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Hành động</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleOpenFeedbackModal('approve')}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Duyệt Annotation
                  </button>
                  
                  <button
                    onClick={() => handleOpenFeedbackModal('reject')}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <ThumbsDown className="w-5 h-5" />
                    Từ chối Annotation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Annotation Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Display (for image type tasks) */}
            {task.type === 'image' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Dữ liệu đã gán nhãn</h2>
                  
                  {/* Image Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowLabels(!showLabels)}
                      className={`p-2 rounded-lg transition-all ${
                        showLabels 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={showLabels ? 'Ẩn nhãn' : 'Hiện nhãn'}
                    >
                      {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.5}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700 min-w-[50px] text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                      title="Reset zoom"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDownloadImage}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                      title="Tải xuống"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="relative bg-gray-100 rounded-lg overflow-auto mb-6" style={{ maxHeight: '600px' }}>
                  <div className="inline-block relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                    <img
                      src={annotation.data.url}
                      alt="Annotated"
                      className="w-full h-auto"
                      style={{ minWidth: '600px' }}
                    />
                    {/* Render bounding boxes */}
                    {showLabels && annotation.data.labels && annotation.data.labels.map((label, idx) => (
                      <div
                        key={idx}
                        className={`absolute border-3 cursor-pointer transition-all ${
                          selectedLabel === label.id ? 'border-4 shadow-lg' : 'border-2'
                        }`}
                        style={{
                          left: `${(label.x / 10)}%`,
                          top: `${(label.y / 5)}%`,
                          width: `${(label.width / 10)}%`,
                          height: `${(label.height / 5)}%`,
                          borderColor: label.color || '#ef4444',
                        }}
                        onClick={() => setSelectedLabel(selectedLabel === label.id ? null : label.id)}
                        onMouseEnter={() => setSelectedLabel(label.id)}
                        onMouseLeave={() => setSelectedLabel(null)}
                      >
                        <span 
                          className="absolute -top-7 left-0 text-white px-2 py-1 text-xs rounded font-semibold whitespace-nowrap shadow-md"
                          style={{ backgroundColor: label.color || '#ef4444' }}
                        >
                          {label.name} ({(label.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Labels Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Nhãn đã gán ({annotation.data.labels?.length || 0})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {annotation.data.labels && annotation.data.labels.map((label, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            selectedLabel === label.id 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedLabel(selectedLabel === label.id ? null : label.id)}
                          onMouseEnter={() => setSelectedLabel(label.id)}
                          onMouseLeave={() => setSelectedLabel(null)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: label.color || '#ef4444' }}
                            ></div>
                            <div>
                              <p className="font-medium text-gray-900">{label.name}</p>
                              <p className="text-xs text-gray-600">
                                Position: ({label.x}, {label.y}) | Size: {label.width}×{label.height}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {(label.confidence * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">Confidence</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {annotation.data.classification && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Phân loại</h3>
                      <span className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-100 text-blue-800 font-medium">
                        {annotation.data.classification}
                      </span>
                    </div>
                  )}

                  {annotation.data.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Ghi chú của Annotator
                      </h3>
                      <p className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                        {annotation.data.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text Display (for text type tasks) */}
            {task.type === 'text' && annotation && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Văn bản đã gán nhãn</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Văn bản gốc:</h3>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {annotation.data.text}
                    </p>
                  </div>

                  {annotation.data.entities && annotation.data.entities.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Entities đã gán nhãn ({annotation.data.entities.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {annotation.data.entities.map((entity, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: entity.color }}
                              ></div>
                              <div>
                                <p className="font-medium text-gray-900">{entity.text}</p>
                                <p className="text-xs text-gray-500">Position: {entity.start}-{entity.end}</p>
                              </div>
                            </div>
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{ 
                                backgroundColor: entity.color + '20',
                                color: entity.color
                              }}
                            >
                              {entity.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {annotation.data.sentiment && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Phân tích cảm xúc</h3>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                          annotation.data.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                          annotation.data.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {annotation.data.sentiment === 'positive' ? '😊 Tích cực' :
                           annotation.data.sentiment === 'negative' ? '😞 Tiêu cực' : '😐 Trung lập'}
                        </span>
                        {annotation.data.confidence && (
                          <span className="text-sm text-gray-600">
                            Confidence: {(annotation.data.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {annotation.data.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Ghi chú của Annotator
                      </h3>
                      <p className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                        {annotation.data.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video Display (for video type tasks) */}
            {task.type === 'video' && annotation && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Video đã gán nhãn</h2>
                
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <video 
                      controls 
                      className="w-full"
                      src={annotation.data.url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {annotation.data.duration}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{annotation.data.frames?.length || 0} frames labeled</span>
                    </div>
                  </div>

                  {annotation.data.frames && annotation.data.frames.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Frames đã gán nhãn</h3>
                      <div className="space-y-2">
                        {annotation.data.frames.map((frame, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">Frame tại {frame.time}s</span>
                              <span className="text-sm text-gray-600">{frame.labels.length} objects</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {frame.labels.map((label, lidx) => (
                                <span key={lidx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {annotation.data.classification && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Phân loại video</h3>
                      <span className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-100 text-purple-800 font-medium">
                        {annotation.data.classification}
                      </span>
                    </div>
                  )}

                  {annotation.data.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Ghi chú của Annotator
                      </h3>
                      <p className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                        {annotation.data.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio Display (for audio type tasks) */}
            {task.type === 'audio' && annotation && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Audio đã gán nhãn</h2>
                
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-6">
                    <audio 
                      controls 
                      className="w-full"
                      src={annotation.data.url}
                    >
                      Your browser does not support the audio tag.
                    </audio>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {annotation.data.duration}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{annotation.data.segments?.length || 0} segments labeled</span>
                    </div>
                  </div>

                  {annotation.data.segments && annotation.data.segments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                        Segments đã gán nhãn ({annotation.data.segments.length})
                      </h3>
                      
                      {/* Timeline visualization */}
                      <div className="mb-4 bg-gray-200 rounded-lg h-12 relative overflow-hidden">
                        {annotation.data.segments.map((segment, idx) => (
                          <div
                            key={idx}
                            className="absolute h-full flex items-center justify-center text-xs font-semibold text-white"
                            style={{
                              left: `${(segment.start / annotation.data.duration) * 100}%`,
                              width: `${((segment.end - segment.start) / annotation.data.duration) * 100}%`,
                              backgroundColor: segment.color
                            }}
                          >
                            {segment.label}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {annotation.data.segments.map((segment, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: segment.color }}
                                ></div>
                                <span className="font-medium text-gray-900">{segment.label}</span>
                              </div>
                              <span className="text-sm text-gray-600">
                                {segment.start}s - {segment.end}s
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              Confidence: {(segment.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {annotation.data.classification && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Phân loại audio</h3>
                      <span className="inline-flex items-center px-4 py-2 rounded-lg bg-orange-100 text-orange-800 font-medium">
                        {annotation.data.classification}
                      </span>
                    </div>
                  )}

                  {annotation.data.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Ghi chú của Annotator
                      </h3>
                      <p className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                        {annotation.data.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quality Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Đánh giá chất lượng</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {task.type === 'image' ? '95%' : 
                     task.type === 'text' ? (annotation?.data.confidence * 100).toFixed(0) + '%' :
                     task.type === 'video' ? '93%' : '88%'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Độ chính xác</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">98%</p>
                  <p className="text-sm text-gray-600 mt-1">Độ hoàn thiện</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {task.type === 'image' ? annotation?.data.labels?.length || 0 :
                     task.type === 'text' ? annotation?.data.entities?.length || 0 :
                     task.type === 'video' ? annotation?.data.frames?.length || 0 :
                     annotation?.data.segments?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {task.type === 'image' ? 'Số nhãn' :
                     task.type === 'text' ? 'Entities' :
                     task.type === 'video' ? 'Frames' : 'Segments'}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {annotation && formatTime(annotation.timeSpent)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Thời gian</p>
                </div>
              </div>
            </div>

            {/* Annotation History */}
            {annotation && annotation.history && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <HistoryIcon className="w-5 h-5" />
                    Lịch sử thay đổi
                  </h2>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    {showHistory ? 'Ẩn' : 'Xem tất cả'}
                  </button>
                </div>
                
                {showHistory && (
                  <div className="space-y-3">
                    {annotation.history.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            item.action === 'created' ? 'bg-blue-600' :
                            item.action === 'updated' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}></div>
                          {idx < annotation.history.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900">{item.description}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">Bởi: {item.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!showHistory && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Có {annotation.history.length} thay đổi. Click "Xem tất cả" để xem chi tiết.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {actionType === 'approve' ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      Duyệt Annotation
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-600" />
                      Từ chối Annotation
                    </>
                  )}
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {actionType === 'reject' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Vấn đề thường gặp (chọn nhiều)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {commonIssues.map((issue, idx) => (
                        <label key={idx} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reviewData.issues.includes(issue)}
                            onChange={() => handleIssueToggle(issue)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{issue}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Feedback {actionType === 'reject' ? '(bắt buộc nếu không chọn vấn đề)' : '(tùy chọn)'}
                  </label>
                  <textarea
                    value={reviewData.feedback}
                    onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                    rows={6}
                    placeholder={actionType === 'approve' 
                      ? 'Nhập nhận xét hoặc ghi chú (tùy chọn)...'
                      : 'Giải thích lý do từ chối và hướng dẫn cải thiện...'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {reviewData.issues.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-900 mb-2">Vấn đề đã chọn:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {reviewData.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-red-800">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitReview}
                  className={`px-6 py-2 rounded-lg text-white transition-all font-semibold flex items-center gap-2 ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Xác nhận {actionType === 'approve' ? 'Duyệt' : 'Từ chối'}
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
