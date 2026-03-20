import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewAPI, taskAPI, consensusAPI, annotationAPI } from '../../config/api';
import Header from '../../components/common/Header';
import {
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Volume2,
  Video,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
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
  , List
} from 'lucide-react';

const resolveApiData = (response) => {
  const root = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.data)) return root.data;
  return [];
};

const resolveSingleApiEntity = (response) => {
  const root = response?.data?.data ?? response?.data ?? null;
  if (Array.isArray(root)) return root[0] || null;
  if (Array.isArray(root?.items)) return root.items[0] || null;
  if (Array.isArray(root?.results)) return root.results[0] || null;
  if (Array.isArray(root?.data)) return root.data[0] || null;
  return root;
};

const findMediaUrlInObject = (value, depth = 0) => {
  if (depth > 4 || value == null) return '';

  if (typeof value === 'string') {
    const v = value.trim();
    if (!v) return '';
    if (
      /^https?:\/\//i.test(v) ||
      v.startsWith('/') ||
      /\.(jpg|jpeg|png|webp|bmp|gif|tif|tiff)$/i.test(v)
    ) {
      return v;
    }
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findMediaUrlInObject(item, depth + 1);
      if (url) return url;
    }
    return '';
  }

  if (typeof value === 'object') {
    const priorityKeys = [
      'url',
      'imageUrl',
      'storageUri',
      'itemUrl',
      'mediaUrl',
      'mediaUri',
      'fileUrl',
      'filePath',
      'src',
      'path',
    ];

    for (const key of priorityKeys) {
      if (key in value) {
        const url = findMediaUrlInObject(value[key], depth + 1);
        if (url) return url;
      }
    }

    for (const nestedValue of Object.values(value)) {
      const url = findMediaUrlInObject(nestedValue, depth + 1);
      if (url) return url;
    }
  }

  return '';
};

const toReviewImage = (item, idx) => {
  const payload = item?.payload || item?.data || {};
  const labels = Array.isArray(item?.labels)
    ? item.labels
    : Array.isArray(payload?.labels)
      ? payload.labels
      : [];

  const directUrl =
    item?.url ||
    item?.imageUrl ||
    item?.storageUri ||
    item?.itemUrl ||
    item?.mediaUri ||
    item?.mediaPath ||
    item?.fileUrl ||
    item?.filePath ||
    item?.mediaUrl ||
    payload?.url ||
    payload?.imageUrl ||
    payload?.storageUri ||
    payload?.itemUrl ||
    payload?.mediaUri ||
    payload?.mediaPath ||
    payload?.fileUrl ||
    payload?.filePath ||
    payload?.src ||
    '';

  const url = directUrl || findMediaUrlInObject(item) || findMediaUrlInObject(payload);

  if (!url) return null;

  return {
    id: item?.id || item?.taskItemId || `item-${idx}`,
    name: item?.name || item?.title || `Ảnh ${idx + 1}`,
    url,
    labels,
    consensusId: item?.consensusId || item?.consensus?.id || item?.id || item?.taskItemId,
    taskItemId: item?.taskItemId || item?.id,
  };
};

const toSafeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toBoundingBoxPercent = (label, imageSize) => {
  const x = toSafeNumber(label?.x ?? label?.left);
  const y = toSafeNumber(label?.y ?? label?.top);
  const width = toSafeNumber(label?.width ?? label?.w);
  const height = toSafeNumber(label?.height ?? label?.h);

  if (width <= 0 || height <= 0) return null;

  const maxAbs = Math.max(Math.abs(x), Math.abs(y), Math.abs(width), Math.abs(height));

  // 0..1 normalized ratios
  if (maxAbs <= 1) {
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${width * 100}%`,
      height: `${height * 100}%`,
    };
  }

  // Already percentages
  if (maxAbs <= 100) {
    return {
      left: `${x}%`,
      top: `${y}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  }

  // Legacy normalized scales observed in existing reviewer payloads
  if (x <= 1000 && width <= 1000 && y <= 500 && height <= 500) {
    return {
      left: `${x / 10}%`,
      top: `${y / 5}%`,
      width: `${width / 10}%`,
      height: `${height / 5}%`,
    };
  }

  // Pixel coordinates relative to image natural size
  if (imageSize?.width > 0 && imageSize?.height > 0) {
    return {
      left: `${(x / imageSize.width) * 100}%`,
      top: `${(y / imageSize.height) * 100}%`,
      width: `${(width / imageSize.width) * 100}%`,
      height: `${(height / imageSize.height) * 100}%`,
    };
  }

  return {
    left: `${x / 10}%`,
    top: `${y / 10}%`,
    width: `${width / 10}%`,
    height: `${height / 10}%`,
  };
};

const enrichItemsWithAnnotations = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const enriched = await Promise.all(
    items.map(async (item) => {
      const quickUrl = toReviewImage(item, 0)?.url;
      if (quickUrl) return item;

      const itemId = item?.taskItemId || item?.itemId || item?.id;
      if (!itemId) return item;

      try {
        const response = await annotationAPI.getByItem(itemId);
        const annotation = resolveSingleApiEntity(response);
        const payload = annotation?.payload || annotation?.data || {};
        const labels = Array.isArray(payload?.labels)
          ? payload.labels
          : Array.isArray(annotation?.labels)
            ? annotation.labels
            : item?.labels;

        const url =
          payload?.url ||
          payload?.imageUrl ||
          payload?.storageUri ||
          payload?.itemUrl ||
          payload?.mediaUrl ||
          payload?.src ||
          findMediaUrlInObject(payload) ||
          '';

        if (!url) return item;

        return {
          ...item,
          payload: typeof payload === 'object' && payload !== null ? payload : item?.payload,
          labels,
          url,
          imageUrl: item?.imageUrl || url,
        };
      } catch {
        return item;
      }
    })
  );

  return enriched;
};

const enrichItemsWithConsensus = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const uniqueTaskItemIds = [...new Set(
    items
      .map((item) => item?.taskItemId || item?.id)
      .filter(Boolean)
      .map((id) => String(id))
  )];

  const consensusMap = new Map();

  await Promise.all(
    uniqueTaskItemIds.map(async (taskItemId) => {
      try {
        const response = await consensusAPI.getByTaskItemId(taskItemId);
        const consensus = resolveSingleApiEntity(response);
        if (consensus) {
          consensusMap.set(String(taskItemId), consensus);
        }
      } catch {
        // Ignore per-item consensus errors and keep original item data.
      }
    })
  );

  return items.map((item) => {
    const taskItemId = String(item?.taskItemId || item?.id || '');
    const consensus = consensusMap.get(taskItemId);
    if (!consensus) return item;

    return {
      ...item,
      consensusId: consensus?.id || consensus?.consensusId || item?.consensusId,
      payload:
        (consensus?.payload && typeof consensus.payload === 'object')
          ? consensus.payload
          : item?.payload,
      labels:
        Array.isArray(consensus?.payload?.labels)
          ? consensus.payload.labels
          : item?.labels,
    };
  });
};

const ReviewerTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const STORAGE_KEY = `reviewer_decisions_${taskId}`;
  const [imageDecisions, setImageDecisions] = useState(() => {
    try {
      const saved = localStorage.getItem(`reviewer_decisions_${taskId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
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

  // Persist decisions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imageDecisions));
    } catch {
      // ignore quota errors
    }
  }, [imageDecisions, STORAGE_KEY]);

  // Load annotation from API
  useEffect(() => {
    loadAnnotation();
  }, [taskId]);

  const loadAnnotation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prefer GET /api/tasks/{taskId}/items
      try {
        const itemsResponse = await taskAPI.getItems(taskId);
        const rawItems = resolveApiData(itemsResponse);
        const consensusItems = await enrichItemsWithConsensus(rawItems);
        let images = consensusItems.map(toReviewImage).filter(Boolean);

        if (images.length === 0 && rawItems.length > 0) {
          const itemsWithAnnotations = await enrichItemsWithAnnotations(consensusItems);
          images = itemsWithAnnotations.map(toReviewImage).filter(Boolean);
          if (images.length > 0) {
            for (let i = 0; i < itemsWithAnnotations.length; i += 1) {
              consensusItems[i] = itemsWithAnnotations[i];
            }
          }
        }

        if (Array.isArray(rawItems)) {
          const first = consensusItems[0] || rawItems[0] || {};
          const mediaType = String(first?.mediaType || first?.type || first?.MediaType || 'image').toLowerCase();
          const normalized = {
            id: first?.id || first?.taskItemId || taskId,
            taskId,
            taskItemId: first?.taskItemId || first?.id || taskId,
            annotatorName: first?.annotatorName || first?.assignedToName || first?.assignedTo || 'N/A',
            createdAt: first?.createdAt || first?.CreatedAt || new Date().toISOString(),
            status: 'pending_review',
            data: {
              images,
              url: images[0]?.url || '',
              labels: images[0]?.labels || [],
              ...((first?.payload && typeof first.payload === 'object') ? first.payload : {}),
            },
            task: {
              id: taskId,
              title: first?.taskTitle || first?.title || first?.taskName || `Task #${String(taskId).slice(0, 8)}`,
              description: first?.description || '',
              type: mediaType,
              status: first?.status || 'in_progress',
              projectId: first?.projectId || first?.ProjectId || null,
              projectName: first?.projectName || first?.ProjectName || 'Dự án',
              createdAt: first?.createdAt || first?.CreatedAt || new Date().toISOString(),
              deadline: first?.dueDate || first?.deadline || first?.DueDate || null,
            },
          };

          setAnnotation(normalized);
          setTask(normalized.task);
          setCurrentImageIndex(0);
          // Restore persisted decisions from localStorage; only fallback to {} if none saved.
          setImageDecisions(() => {
            try {
              const saved = localStorage.getItem(STORAGE_KEY);
              return saved ? JSON.parse(saved) : {};
            } catch {
              return {};
            }
          });
          setShowRejectReason(false);
          setRejectReason('');

          if (rawItems.length > 0 && images.length === 0) {
            setError('Task đã tải được item nhưng chưa có URL media hợp lệ để hiển thị.');
          }
          return;
        }
      } catch (itemsErr) {
        console.warn('GET /tasks/{taskId}/items failed:', itemsErr);
      }

      setError('Không thể tải task items từ API /tasks/{taskId}/items.');
      setAnnotation(null);
    } catch (err) {
      console.error('Error loading annotation from API:', err);
      setError(err.response?.data?.message || 'Không thể tải annotation review');
      setAnnotation(null);
    } finally {
      setLoading(false);
    }
  };

  // Image viewer states
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [activeImageNaturalSize, setActiveImageNaturalSize] = useState({ width: 0, height: 0 });
  const [showHistory, setShowHistory] = useState(false);
  // ...

  // Keep hook order stable across loading/error branches.
  useEffect(() => {
    setSelectedLabel(null);
    setActiveImageNaturalSize({ width: 0, height: 0 });
  }, [currentImageIndex, annotation?.id]);

  // ...

  const handleSubmitReview = async (decision, options = {}) => {
    try {
      const { confirm = true, feedback = '', redirect = true, extraPayload = {} } = options;
      const isApprove = decision === 'approve';

      if (confirm) {
        const confirmed = window.confirm(
          isApprove
            ? 'Bạn có chắc muốn duyệt annotation này?'
            : 'Bạn có chắc muốn từ chối annotation này?'
        );

        if (!confirmed) {
          return;
        }
      }

      const reviewPayload = {
        feedback,
        issues: [],
        reviewedAt: new Date().toISOString(),
        ...extraPayload,
      };

      // Call API to approve or reject
      if (isApprove) {
        await reviewAPI.approve(annotation.id, reviewPayload);
      } else {
        await reviewAPI.reject(annotation.id, reviewPayload);
      }

      console.log('Review submitted successfully');

      alert(`Annotation đã được ${isApprove ? 'duyệt' : 'từ chối'} thành công!`);
      if (redirect) {
        navigate('/reviewer/review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      alert(err.response?.data?.message || 'Không thể submit review');
    }
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

  const getReviewImages = (ann) => {
    const imageList = ann?.data?.images;
    if (Array.isArray(imageList) && imageList.length > 0) {
      return imageList
        .map((img, idx) => {
          const url = img?.url || img?.imageUrl || img?.storageUri || img?.src || '';
          if (!url) return null;
          return {
            id: img?.id || `img-${idx}`,
            name: img?.name || `Ảnh ${idx + 1}`,
            url,
            labels: Array.isArray(img?.labels) ? img.labels : (ann?.data?.labels || []),
            consensusId: img?.consensusId || img?.consensus?.id || null,
            taskItemId: img?.taskItemId || img?.itemId || img?.id || null,
          };
        })
        .filter(Boolean);
    }

    if (ann?.data?.url) {
      return [
        {
          id: ann.id || 'img-0',
          name: 'Ảnh 1',
          url: ann.data.url,
          labels: Array.isArray(ann?.data?.labels) ? ann.data.labels : [],
          consensusId: ann?.consensusId || ann?.consensus?.id || null,
          taskItemId: ann?.taskItemId || ann?.itemId || ann?.id || null,
        },
      ];
    }

    return [];
  };

  const reviewImages = getReviewImages(annotation);
  const safeImageIndex = Math.min(currentImageIndex, Math.max(reviewImages.length - 1, 0));
  const activeImage = reviewImages[safeImageIndex] || null;
  const activeLabels = Array.isArray(activeImage?.labels) ? activeImage.labels : [];
  const activeBboxMetrics = activeLabels.map((label, idx) => ({
    key: label?.id || `bbox-${idx}`,
    name: label?.name || `Label ${idx + 1}`,
    x: Math.max(0, Math.round(toSafeNumber(label?.x ?? label?.left))),
    y: Math.max(0, Math.round(toSafeNumber(label?.y ?? label?.top))),
    width: Math.max(0, Math.round(toSafeNumber(label?.width ?? label?.w))),
    height: Math.max(0, Math.round(toSafeNumber(label?.height ?? label?.h))),
    confidence: label?.confidence,
    color: label?.color || '#22c55e',
  }));
  // ...
  const currentDecision = activeImage ? imageDecisions[activeImage.id] : null;
  const currentImageApproved = currentDecision?.decision === 'approved';
  const currentImageRejected = currentDecision?.decision === 'rejected';
  const reviewedCount = reviewImages.filter((img) => Boolean(imageDecisions[img.id])).length;
  const approvedCount = reviewImages.filter((img) => imageDecisions[img.id]?.decision === 'approved').length;
  const rejectedCount = reviewImages.filter((img) => imageDecisions[img.id]?.decision === 'rejected').length;
  const allImagesReviewed = reviewImages.length > 0 && reviewImages.every((img) => Boolean(imageDecisions[img.id]));


  const handleApproveImage = () => {
    const canReview = annotation?.status === 'pending_review';
    if (!canReview || !activeImage) return;

    setImageDecisions((prev) => ({
      ...prev,
      [activeImage.id]: { decision: 'approved', reason: '' },
    }));
    setShowRejectReason(false);
    setRejectReason('');

    if (safeImageIndex < reviewImages.length - 1) {
      setCurrentImageIndex((prev) => Math.min(prev + 1, reviewImages.length - 1));
    }
  };

  const handleCompleteApprove = async () => {
    if (!allImagesReviewed) {
      alert('Bạn cần kiểm duyệt tất cả ảnh trước khi Complete.');
      return;
    }

    // Submit all decisions via POST /api/reviews (one call per image).
    try {
      for (const img of reviewImages) {
        const decision = imageDecisions[img.id];
        if (!decision) continue;
        await reviewAPI.submit({
          taskItemId: img.taskItemId || img.id,
          consensusId: img.consensusId || null,
          result: decision.decision === 'rejected' ? 'Rejected' : 'Approved',
          feedback: decision.reason || '',
        });
      }
      localStorage.removeItem(STORAGE_KEY);
      alert(`Hoàn tất kiểm duyệt! Approve: ${approvedCount} | Reject: ${rejectedCount}`);
      navigate('/reviewer/review/inbox');
    } catch (err) {
      alert('Lỗi khi submit: ' + (err?.response?.data?.message || err?.message));
    }
  };

  const handleConfirmReject = () => {
    if (!activeImage) return;
    const reason = rejectReason.trim();
    if (!reason) {
      alert('Vui lòng nhập lý do reject.');
      return;
    }

    setImageDecisions((prev) => ({
      ...prev,
      [activeImage.id]: { decision: 'rejected', reason },
    }));
    setShowRejectReason(false);
    setRejectReason('');

    if (safeImageIndex < reviewImages.length - 1) {
      setCurrentImageIndex((prev) => Math.min(prev + 1, reviewImages.length - 1));
    }
  };

  if (task.type === 'image' && activeImage) {
    const canReview = annotation.status === 'pending_review';

    return (
      <div className="min-h-screen bg-[#F1F3F8]">
        <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reviewer/review/inbox')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="font-bold text-gray-900">Task #{task.id || annotation.taskId || annotation.id}</p>
              <p className="text-sm text-gray-500">Dự án - {task.projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canReview ? (
              <>
                <button
                  onClick={handleCompleteApprove}
                  disabled={!allImagesReviewed}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold disabled:opacity-50"
                >
                  Complete
                </button>
              </>
            ) : (
              <div className="text-sm text-gray-500 font-medium">Reviewer Workspace</div>
            )}
          </div>
        </div>

        <div className="h-[calc(100vh-74px)] grid grid-cols-12 gap-0">
          <aside className="col-span-2 bg-white border-r overflow-y-auto">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-bold text-gray-700">DANH SÁCH ẢNH ({reviewImages.length})</p>
            </div>
            <div className="p-3 space-y-3">
              {reviewImages.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-full rounded-xl overflow-hidden border-2 transition-all ${
                    idx === safeImageIndex ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <img src={img.url} alt={img.name} className="w-full h-24 object-cover" />
                  <div className="text-xs px-2 py-1 bg-gray-50 text-gray-700 font-semibold text-left">
                    {img.name}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="col-span-8 bg-[#07152e] flex flex-col">
            <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between text-white/90">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentImageIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={safeImageIndex === 0}
                  className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-sm">{safeImageIndex + 1} / {reviewImages.length}</span>
                <button
                  onClick={() => setCurrentImageIndex((prev) => Math.min(prev + 1, reviewImages.length - 1))}
                  disabled={safeImageIndex >= reviewImages.length - 1}
                  className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleZoomOut} className="p-1 rounded hover:bg-white/10">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomIn} className="p-1 rounded hover:bg-white/10">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleResetZoom} className="p-1 rounded hover:bg-white/10">
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
              <div
                className="relative mx-auto w-fit"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                onClick={() => {
                  if (activeBboxMetrics.length === 0) setSelectedLabel('no-bbox');
                }}
              >
                <img
                  src={activeImage.url}
                  alt={activeImage.name}
                  className="max-w-[860px] rounded shadow-2xl"
                  onLoad={(e) => {
                    const target = e.currentTarget;
                    setActiveImageNaturalSize({ width: target.naturalWidth || 0, height: target.naturalHeight || 0 });
                  }}
                />
                {/* Show badge if no bbox and user clicked image */}
                {selectedLabel === 'no-bbox' && activeBboxMetrics.length === 0 && (
                  <span
                    className="absolute top-2 left-2 z-40 px-2 py-1 text-xs rounded bg-black/80 text-white font-semibold shadow"
                    style={{ borderRadius: 6, fontSize: '12px', letterSpacing: 0.2 }}
                  >
                    Chưa có bounding box
                  </span>
                )}
                <div className="absolute top-3 right-3 z-30 bg-black/75 text-white rounded-lg px-3 py-2 text-xs leading-5 shadow-lg backdrop-blur-sm">
                  <p className="font-semibold">Labels: {activeBboxMetrics.length}</p>
                  {activeBboxMetrics.slice(0, 6).map((bbox, index) => (
                    <p key={`${bbox.key}-debug`} className="whitespace-nowrap">
                      {index + 1}. {bbox.name} ({bbox.x}, {bbox.y}) {bbox.width}x{bbox.height}
                    </p>
                  ))}
                  {activeBboxMetrics.length > 6 && (
                    <p className="text-white/80">... +{activeBboxMetrics.length - 6} bbox khác</p>
                  )}
                </div>
                {showLabels && activeBboxMetrics.map((bbox) => {
                  const key = bbox.key;
                  const box = toBoundingBoxPercent(bbox, activeImageNaturalSize);
                  const x = bbox.x;
                  const y = bbox.y;
                  const width = bbox.width;
                  const height = bbox.height;
                  if (!box) return null;

                  const isActive = selectedLabel === key;
                  return (
                    <div
                      key={key}
                      className={`absolute border-2 cursor-pointer transition-all ${isActive ? 'border-yellow-400 ring-2 ring-yellow-300 shadow-lg z-30' : ''}`}
                      style={{
                        ...box,
                        borderColor: isActive ? '#facc15' : bbox.color,
                        backgroundColor: `${bbox.color}33`,
                        zIndex: isActive ? 30 : 10,
                      }}
                      onMouseEnter={() => setSelectedLabel(key)}
                      onMouseLeave={() => setSelectedLabel(null)}
                      onClick={() => setSelectedLabel(key)}
                    >
                      <span
                        className="absolute top-0 left-0 z-40 px-1.5 py-0.5 text-[11px] leading-tight rounded-br font-semibold whitespace-nowrap shadow pointer-events-none"
                        style={{ backgroundColor: bbox.color, color: '#fff', fontWeight: 600, fontSize: '11px', borderTopLeftRadius: 4, borderBottomRightRadius: 4, letterSpacing: 0.2 }}
                      >
                        {bbox.name}
                      </span>
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-0 z-40 px-1 py-0.5 text-[10px] rounded-tr bg-black/70 text-white font-semibold shadow pointer-events-none"
                          style={{ borderTopRightRadius: 4 }}
                        >
                          x:{x} y:{y} w:{width} h:{height}
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* Reset badge if user clicks on a bbox */}
                {selectedLabel === 'no-bbox' && activeBboxMetrics.length > 0 && setSelectedLabel(null)}
                {/* No preview box in reviewer */}
              </div>
            </div>
          </section>

          <aside className="col-span-2 bg-white border-l flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-800">Review Action</h3>
              <p className="text-xs text-gray-500 mt-1">Thay cho chọn nhãn, reviewer chỉ duyệt hoặc từ chối.</p>
            </div>

            <div className="p-4 space-y-3 border-b">
              <div className="text-xs text-gray-500">
                Đã kiểm duyệt: {reviewedCount}/{reviewImages.length} ảnh
              </div>
              <div className="text-xs text-gray-500">
                Approve: {approvedCount} | Reject: {rejectedCount}
              </div>
              {/* No label select or drag-to-draw in reviewer */}
              <button
                onClick={handleApproveImage}
                disabled={!canReview || currentImageApproved}
                className="w-full py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {currentImageApproved ? 'Đã approve' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectReason((prev) => !prev)}
                disabled={!canReview}
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {currentImageRejected ? 'Reject lại' : 'Reject'}
              </button>
              {canReview && showRejectReason && (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do reject..."
                    className="w-full min-h-[88px] px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <button
                    onClick={handleConfirmReject}
                    className="w-full py-2 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800"
                  >
                    Xác nhận Reject
                  </button>
                </div>
              )}
              {!canReview && (
                <p className="text-xs text-gray-500 text-center">Annotation này đã được xử lý</p>
              )}
            </div>

            <div className="p-4 border-b">
              <div className="text-xs text-gray-500">Annotator</div>
              <div className="font-semibold text-gray-900">{annotation.annotatorName}</div>
              <div className="text-xs text-gray-500 mt-3">Trạng thái</div>
              <div className="font-semibold text-gray-900">
                {annotation.status === 'pending_review' ? 'Chờ review' : annotation.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider flex items-center gap-2">
                  <List className="w-4 h-4" /> Bounding boxes ({activeBboxMetrics.length})
                </h3>
              </div>

              {activeBboxMetrics.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Chưa có bounding box</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBboxMetrics.map((bbox, idx) => {
                    const key = bbox.key;
                    const isSelected = selectedLabel === key;

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                        onMouseEnter={() => setSelectedLabel(key)}
                        onMouseLeave={() => setSelectedLabel(null)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: bbox.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{bbox.name}</p>
                            <p className="text-[10px] text-gray-400">
                              ({bbox.x}, {bbox.y}) | {bbox.width}x{bbox.height}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {bbox.confidence ? `${(bbox.confidence * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
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
                    onClick={() => handleSubmitReview('approve')}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Duyệt Annotation
                  </button>

                  <button
                    onClick={() => handleSubmitReview('reject')}
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
                                Vị trí: ({label.x}, {label.y}) | Kích thước: {label.width}x{label.height}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {(label.confidence * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">Độ tin cậy</p>
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
                        Thực thể đã gán nhãn ({annotation.data.entities.length})
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
                                <p className="text-xs text-gray-500">Vị trí: {entity.start}-{entity.end}</p>
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
                          {annotation.data.sentiment === 'positive' ? 'Tích cực' :
                          annotation.data.sentiment === 'negative' ? 'Tiêu cực' : 'Trung lập'}
                        </span>
                        {annotation.data.confidence && (
                          <span className="text-sm text-gray-600">
                            Độ tin cậy: {(annotation.data.confidence * 100).toFixed(1)}%
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
                      <span>Thời lượng: {annotation.data.duration}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{annotation.data.frames?.length || 0} khung hình đã gán nhãn</span>
                    </div>
                  </div>

                  {annotation.data.frames && annotation.data.frames.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Khung hình đã gán nhãn</h3>
                      <div className="space-y-2">
                        {annotation.data.frames.map((frame, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">Mốc thời gian {frame.time}s</span>
                              <span className="text-sm text-gray-600">{frame.labels.length} đối tượng</span>
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
                      <span>Thời lượng: {annotation.data.duration}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>{annotation.data.segments?.length || 0} đoạn đã gán nhãn</span>
                    </div>
                  </div>

                  {annotation.data.segments && annotation.data.segments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                        Đoạn đã gán nhãn ({annotation.data.segments.length})
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
                              Độ tin cậy: {(segment.confidence * 100).toFixed(1)}%
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
                    task.type === 'text' ? 'Thực thể' :
                     task.type === 'video' ? 'Khung hình' : 'Đoạn'}
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

      </main>
    </div>
  );
};

export default ReviewerTask;








