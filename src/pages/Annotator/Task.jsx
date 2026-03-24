import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { taskAPI, annotationAPI, trySequential } from '../../config/api';
import {
  normalizeTask,
  resolveApiData,
  getCurrentUserId,
  getCurrentUserIdentifiers,
  getLocalAssignedTasksForUser,
  getAssignedTasksByUserMap,
  upsertLocalAssignedTask,
  processTaskConsensus,
  getSubmissionCount,
} from '../../utils/annotatorTaskHelpers';
import {
  ArrowLeft, ArrowRight, Save, Send, Trash2, Tag, AlertCircle,
  Check, X, ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut,
  CheckCircle2, SkipForward, List, Loader2, Users,
} from 'lucide-react';

// ── Colors ──────────────────────────────────────────────────
const PREDEFINED_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#0ea5e9', '#22c55e',
];

const _labelColorRegistry = {};
function getLabelColor(label, index = 0) {
  if (!label) return PREDEFINED_COLORS[index % PREDEFINED_COLORS.length];
  if (_labelColorRegistry[label]) return _labelColorRegistry[label];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) & 0xffff;
  _labelColorRegistry[label] = PREDEFINED_COLORS[hash % PREDEFINED_COLORS.length];
  return _labelColorRegistry[label];
}

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

async function fetchProjectLabels(projectId) {
  const parse = (data) => {
    const raw = Array.isArray(data) ? data : (data?.items || data?.data || data?.labels || []);
    return raw.map((l) => typeof l === 'string' ? l : (l?.name || l?.Name || l?.labelName || '')).filter(Boolean);
  };
  try {
    const res = await api.get(`/projects/${projectId}/labels`);
    const labels = parse(res?.data);
    if (labels.length > 0) return labels;
  } catch (e) {
    console.warn('[Labels] failed:', e?.message);
  }
  return [];
}

// ── Submission Result Modal ───────────────────────────────────
function SubmissionResultModal({ result, onClose, onRework, totalAnnotators = 3 }) {
  const { hasConflict, conflictCount, totalItems, nonConflictCount } = result;

  if (!hasConflict) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">Nộp thành công!</h2>
          <p className="text-slate-500 mb-2">
            Tất cả <strong>{totalItems}</strong> ảnh đã đạt đồng thuận.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Kết quả đã được chuyển đến <strong className="text-indigo-600">Reviewer</strong> để kiểm duyệt.
          </p>
          <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-2xl mb-8 text-left">
            <Users className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-700 font-medium">
              {totalAnnotators} annotator đã đồng thuận. Reviewer sẽ kiểm tra kết quả và phê duyệt cuối.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Về danh sách nhiệm vụ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">Có ảnh bị Conflict!</h2>
        <p className="text-slate-500 mb-6">
          <strong className="text-amber-600">{conflictCount}</strong> / {totalItems} ảnh bị conflict
          ({totalAnnotators} annotator gán nhãn khác nhau).
        </p>

        <div className="space-y-3 mb-8">
          {nonConflictCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl text-left">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                <strong>{nonConflictCount}</strong> ảnh đã đồng thuận → đã gửi cho Reviewer duyệt.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl text-left">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 font-medium">
              <strong>{conflictCount}</strong> ảnh cần gán nhãn lại ({totalAnnotators} annotator không đồng ý).
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
          >
            Về danh sách
          </button>
          <button
            onClick={onRework}
            className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all text-sm shadow-lg shadow-amber-100"
          >
            Làm lại ảnh conflict
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Waiting for other annotators modal ───────────────────────
function WaitingModal({ submittedCount, onClose, totalAnnotators = 3 }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">Đã nộp thành công!</h2>
        <p className="text-slate-500 mb-4">
          Bạn là annotator thứ <strong className="text-blue-600">{submittedCount}</strong>/{totalAnnotators} nộp bài.
        </p>
        <div className="flex justify-center flex-wrap gap-2 mb-6">
          {Array.from({ length: totalAnnotators }, (_, i) => i + 1).map(n => (
            <div
              key={n}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm border-2 ${n <= submittedCount
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 text-slate-300 border-slate-200'
                }`}
            >
              {n <= submittedCount ? <Check className="w-5 h-5" /> : n}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-400 mb-8">
          Đang chờ <strong>{totalAnnotators - submittedCount}</strong> annotator còn lại nộp bài để tính đồng thuận.
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          Về danh sách nhiệm vụ
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function AnnotatorTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isRework = !!location.state?.isRework;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);
  const [items, setItems] = useState([]);
  const [fullItems, setFullItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [itemStates, setItemStates] = useState({});

  // Post-submit result
  const [submitResult, setSubmitResult] = useState(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [showWaiting, setShowWaiting] = useState(false);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [previewBox, setPreviewBox] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 800, h: 600 });
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [pendingBox, setPendingBox] = useState(null);

  const currentItem = items[currentIndex] || null;
  const currentItemId = currentItem?.taskItemId || currentItem?.id || `item-${currentIndex}`;
  const currentState = itemStates[currentItemId] || { annotations: [], status: 'pending', skipReason: '' };
  const annotations = currentState.annotations;
  const totalItems = items.length;
  const processedCount = Object.values(itemStates).filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const allProcessed = totalItems > 0 && processedCount >= totalItems;
  const progressPercent = totalItems > 0 ? Math.round((processedCount / totalItems) * 100) : 0;

  useEffect(() => { loadTask(); }, [taskId]);

  async function loadTask() {
    setLoading(true);
    setError(null);
    try {
      const passedTask = location.state?.task;
      let taskData = null;
      const isMockTask = String(taskId).startsWith('MOCK-TASK') || String(taskId).startsWith('OFFLINE');

      try {
        if (!isMockTask) {
          const res = await taskAPI.getById(taskId);
          const raw = resolveApiData(res);
          taskData = normalizeTask(Array.isArray(raw) ? raw[0] : raw);
        }
      } catch (e) {
        console.warn('[Task] getById failed:', e?.message);
      }

      const userId = getCurrentUserId();
      const localTasks = getLocalAssignedTasksForUser(userId);
      const localMatch = localTasks.find(t => String(t.id) === String(taskId));
      if (localMatch) {
        taskData = { ...taskData, ...localMatch, items: localMatch.items || taskData?.items || [] };
      }

      if (!taskData) { setError('Không tìm thấy nhiệm vụ.'); return; }

      let taskItems = [];
      try {
        if (!isMockTask) {
          const itemsRes = await taskAPI.getItems(taskId);
          taskItems = Array.isArray(resolveApiData(itemsRes)) ? resolveApiData(itemsRes) : [];
        }
      } catch (e) {
        console.warn('[Task] getItems failed:', e?.message);
      }

      if (isRework && taskData.items) {
        taskItems = taskData.items;
      } else if (taskItems.length === 0 && taskData.items) {
        taskItems = taskData.items;
      }

      if (taskItems.length === 0 && taskData.datasetId) {
        try {
          const dsItemsRes = await api.get(`/datasets/${taskData.datasetId}/items`)
            .catch(() => api.get(`/Datasets/${taskData.datasetId}`));
          taskItems = resolveApiData(dsItemsRes);
        } catch (e) {
          console.warn('[Task] Fallback dataset items failed');
        }
      }

      taskItems = taskItems.map((item, idx) => {
        const iid = String(item?.taskItemId || item?.id || item?.itemId || '');
        const localMeta = (taskData.items || []).find(it => String(it.taskItemId || it.id || '') === iid) || {};
        const baseItem = item?.taskItemId && item?.datasetItem
          ? {
            ...item.datasetItem,
            ...localMeta,
            taskItemId: item.taskItemId,
            id: item.taskItemId,
            isConflict: !!(item.isConflict || localMeta.isConflict),
            _raw: item
          }
          : { ...item, ...localMeta, isConflict: !!(item.isConflict || localMeta.isConflict) };
        return baseItem;
      });

      const projectId = taskData.projectId || taskItems[0]?._raw?.projectId || taskItems[0]?.projectId;
      if (projectId) {
        const projectLabels = await fetchProjectLabels(projectId);
        if (projectLabels.length > 0) {
          projectLabels.forEach((l, i) => {
            if (!_labelColorRegistry[l]) _labelColorRegistry[l] = PREDEFINED_COLORS[i % PREDEFINED_COLORS.length];
          });
          setLabels(projectLabels);
          setSelectedLabel('');
        }
      }

      setTask(taskData);
      setFullItems(taskItems);

      if (isRework) {
        const localTasksRaw = getAssignedTasksByUserMap();
        const submissions = [];
        Object.entries(localTasksRaw || {}).forEach(([uid, tks]) => {
          const match = (tks || []).find(it => String(it.id || it._id || '') === String(taskId));
          if (match && (match.status === 'completed' || match.status === 'done' || match.status === 'rejected')) {
            submissions.push(match);
          }
        });

        if (submissions.length > 0) {
          taskItems = taskItems.map((item, i) => {
            const fpList = submissions.map(s => {
              const it = s.items?.[i] || {};
              return it.classification || (it.annotations?.[0]?.label) || 'unknown';
            });
            const counts = {};
            fpList.forEach(l => counts[l] = (counts[l] || 0) + 1);
            const majority = Object.entries(counts).find(([_, count]) => count >= 2);
            return { ...item, isConflict: item.isConflict || !majority };
          });
        }

        const isReviewRework = taskItems.some(it => {
          const s = String(it.status || '').toLowerCase();
          return s === 'rejected' || s === 'completed' || s === 'approved';
        });

        const conflictedCount = taskItems.filter(it => it.isConflict).length;
        if (conflictedCount === 0 && !isReviewRework) {
          taskItems = taskItems.map(it => ({ ...it, isConflict: true }));
        }
      }

      setItems(taskItems);

      // Deep Sync: Fetch all task annotations at once to link IDs correctly
      let allTaskAnns = [];
      try {
        const resAnns = await annotationAPI.getByTask(taskId);
        const rawAnns = resolveApiData(resAnns);
        if (Array.isArray(rawAnns)) {
          allTaskAnns = rawAnns;
        } else if (rawAnns && typeof rawAnns === 'object') {
          const values = Object.values(rawAnns);
          if (values.some(v => Array.isArray(v))) {
            allTaskAnns = values.flat().filter(v => v && typeof v === 'object');
          } else {
            allTaskAnns = values;
          }
        }
      } catch (e) { console.warn('[Task] Pre-fetch anns failed'); }

      if (taskData.dueDate && new Date(taskData.dueDate) < new Date()) {
        setIsExpired(true);
      }

      const firstUnprocessed = taskItems.findIndex((it) => {
        const st = String(it?.status || '').toLowerCase();
        return st !== 'completed' && st !== 'done' && st !== 'skipped';
      });
      setCurrentIndex(firstUnprocessed >= 0 ? firstUnprocessed : 0);

      const myUserIds = getCurrentUserIdentifiers();
      const initialStates = {};

      for (const item of taskItems) {
        const itemId = String(item?.taskItemId || item?.id || item?.itemId || '');
        const itemStatus = String(item?.status || '').toLowerCase();
        const isConflictItem = item.isConflict && isRework;
        const datasetItemId = String(item?.datasetItemId || item?.dataset_item_id || item?.datasetItem?.id || '');

        const matchedAnn = allTaskAnns.find(a => {
          // 1. User Filter (Crucial for consensus tasks)
          const aUserId = String(a.userId || a.annotatorId || a.annotator_id || a.ParticipantId || '');
          if (aUserId && !myUserIds.includes(aUserId)) return false;

          // 2. Item Match
          if (String(a.taskItemId || a.task_item_id || a.TaskItemId || a.itemId || a.item_id || '').toLowerCase() === itemId.toLowerCase()) return true;
          if (String(a.datasetItemId || a.dataset_item_id || a._datasetItemId || '').toLowerCase() === datasetItemId.toLowerCase()) return true;
          
          return Object.keys(a).some(k => {
            const val = String(a[k] || '').toLowerCase();
            return val === itemId.toLowerCase() || val === datasetItemId.toLowerCase();
          });
        });

        let embeddedAnnId = null;
        const rawAnns = item.annotations || item.Annotations || item.boundingBoxes || item.labels || [];
        if (Array.isArray(rawAnns) && rawAnns.length > 0) {
          embeddedAnnId = rawAnns[0].id || rawAnns[0]._id || rawAnns[0].AnnotationId || rawAnns[0].annotationId;
        }

        const isDone = itemStatus === 'completed' || itemStatus === 'done' || itemStatus === 'approved';
        const isRejected = itemStatus === 'rejected';

        // ─── FIX CHÍNH ────────────────────────────────────────────────────────────
        // Với item bị REJECTED: backend giữ annotation cũ (không xóa khi reject).
        // Phải GIỮ annotationId để saveCurrentItem() gọi PUT thay vì POST.
        // Nếu reset về null → POST → 400 "Already exists".
        //
        // Với conflict rework (isConflictItem): reset null vì đây là item mới hoàn toàn
        // chưa có annotation trên server (conflict items chưa được submit).
        // ─────────────────────────────────────────────────────────────────────────
        initialStates[itemId] = {
          annotations: [],
          annotationId: isConflictItem
            ? null
            : (matchedAnn?.id || matchedAnn?._id || matchedAnn?.AnnotationId || matchedAnn?.annotationId || item.annotationId || embeddedAnnId || null),
          status: isConflictItem
            ? 'pending'
            : isDone
              ? 'done'
              : (itemStatus === 'skipped')
                ? 'skipped'
                : isRejected
                  ? 'rejected'
                  : 'pending',
          skipReason: '',
        };

        // Load existing labels nếu có (chỉ khi không bị rejected và không phải conflict rework)
        // Với rejected: reset annotations rỗng để annotator vẽ lại từ đầu,
        // nhưng annotationId vẫn GIỮ ở trên để dùng PUT khi save
        if (matchedAnn && !isRejected && !isConflictItem) {
          const bboxes = matchedAnn.payload?.bboxes || matchedAnn.payload?.boundingBoxes || [];
          initialStates[itemId].annotations = bboxes.map((b, idx) => ({
            id: b.id || `ann-${idx}`,
            label: b.label, x: b.x, y: b.y, width: b.width, height: b.height,
            color: getLabelColor(b.label, idx),
          }));

          if (isDone) {
            initialStates[itemId].status = 'done';
          }
        }

        // Conflict rework: reset annotations
        if (isConflictItem) {
          initialStates[itemId].annotations = [];
          initialStates[itemId].annotationId = null;
        }
      }
      setItemStates(initialStates);
    } catch (err) {
      console.error('[Task] loadTask error:', err);
      setError('Không thể tải nhiệm vụ: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  }

  const updateItemState = useCallback((itemId, patch) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { annotations: [], status: 'pending', skipReason: '' }), ...patch },
    }));
  }, []);

  // ── Canvas ──────────────────────────────────────────────────
  function getCanvasCoords(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleCanvasMouseDown(e) {
    if (isExpired) return;
    setIsDrawing(true); setStartPoint(getCanvasCoords(e)); setPreviewBox(null);
  }

  function handleCanvasMouseMove(e) {
    if (!isDrawing || !startPoint) return;
    const pt = getCanvasCoords(e);
    setPreviewBox({
      x: Math.min(startPoint.x, pt.x), y: Math.min(startPoint.y, pt.y),
      width: Math.abs(pt.x - startPoint.x), height: Math.abs(pt.y - startPoint.y)
    });
  }

  function handleCanvasMouseUp(e) {
    if (!isDrawing || !startPoint) return;
    const pt = getCanvasCoords(e);
    const box = {
      x: Math.min(startPoint.x, pt.x), y: Math.min(startPoint.y, pt.y),
      width: Math.abs(pt.x - startPoint.x), height: Math.abs(pt.y - startPoint.y)
    };
    setIsDrawing(false); setStartPoint(null); setPreviewBox(null);
    if (box.width > 8 && box.height > 8) {
      setPendingBox(box);
      setSelectedLabel('');
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    annotations.forEach((ann) => {
      const color = ann.color || '#ef4444';
      ctx.fillStyle = color + '33'; ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      ctx.font = 'bold 12px Inter, sans-serif';
      const bw = ctx.measureText(ann.label).width + 10, bh = 18;
      const bx = ann.x, by = ann.y > bh ? ann.y - bh : ann.y + ann.height;
      ctx.fillStyle = color; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#fff'; ctx.fillText(ann.label, bx + 5, by + 13);
    });
    if (previewBox) {
      ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
      ctx.strokeRect(previewBox.x, previewBox.y, previewBox.width, previewBox.height);
      ctx.setLineDash([]);
    }
    if (pendingBox) {
      ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3;
      ctx.strokeRect(pendingBox.x, pendingBox.y, pendingBox.width, pendingBox.height);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
      ctx.fillRect(pendingBox.x, pendingBox.y, pendingBox.width, pendingBox.height);
    }
  }, [annotations, previewBox, pendingBox, selectedLabel, labels, currentIndex]);

  // ── Actions ─────────────────────────────────────────────────
  async function saveCurrentItem() {
    if (!currentItem) return;
    if (annotations.length === 0) { alert('Vui lòng gán ít nhất một nhãn hoặc chọn Skip.'); return false; }
    setSaving(true);
    try {
      const bboxes = annotations.map((a) => ({
        label: a.label, x: Math.round(a.x), y: Math.round(a.y),
        width: Math.round(a.width), height: Math.round(a.height)
      }));

      let existingAnnId = itemStates[currentItemId]?.annotationId;

      // Với item rejected: annotationId đã được GIỮ từ loadTask()
      // nên existingAnnId sẽ có giá trị → đi thẳng vào nhánh PUT bên dưới.
      // Chỉ cần verify annotation vẫn tồn tại trên server phòng trường hợp backend xóa khi reject.
      const itemStatus = String(currentItem?.status || currentState?.status || '').toLowerCase();
      const isRejectedItem = itemStatus === 'rejected';

      if (isRejectedItem && existingAnnId) {
        try {
          await annotationAPI.getById(existingAnnId);
          // GET thành công → annotation vẫn còn → dùng PUT
          console.log('[SaveItem] Rejected item: annotation exists on server, will PUT update.');
        } catch (e) {
          // Backend đã xóa annotation khi reject → reset null để POST mới
          console.warn('[SaveItem] Rejected annotation no longer exists on server, will POST new.');
          existingAnnId = null;
          updateItemState(currentItemId, { annotationId: null });
        }
      }

      try {
        const nextStatus = 'done';
        updateItemState(currentItemId, { status: nextStatus, annotations });

        const nextProcessedItems = items.map(it => {
          const id = it?.taskItemId || it?.id;
          if (id === currentItemId) return { ...it, status: nextStatus };
          return it;
        });

        const nextProcessedCount = nextProcessedItems.filter((it) =>
          ['done', 'completed', 'skipped', 'approved'].includes(String(it.status || '').toLowerCase())
        ).length;

        const newProgress = Math.round((nextProcessedCount / totalItems) * 100);

        upsertLocalAssignedTask({
          ...task, progress: newProgress, items: nextProcessedItems, totalItems: items.length
        }, getCurrentUserId());

        // Navigation (Chỉ chuyển index nếu không phải là người dùng cố tình ở lại để edit)
        if (currentIndex < totalItems - 1) {
          setCurrentIndex(currentIndex + 1);
        }

        // ─── ĐỒNG BỘ SERVER (Background/Retry) ───────────────────────────────
        if (existingAnnId) {
          try {
            // ─── TẬP HỢP CÁC PHƯƠNG ÁN UPDATE (SERIAL) ───────────────────────────
            await trySequential([
              // 1. PUT chuẩn
              () => annotationAPI.update(existingAnnId, { payload: { bboxes } }),
              
              // 2. PUT phẳng (không bọc trong payload)
              () => annotationAPI.update(existingAnnId, { bboxes }),
              
              // 3. PUT với flag bypass
              () => annotationAPI.update(existingAnnId, { payload: { bboxes }, status: "Conflicted", isConflict: true }),
              
              // 4. POST submit định dạng Top-level TaskId (Object)
              () => api.post("/annotations/submit", { taskId, taskItemId: currentItemId, payload: { bboxes }, id: existingAnnId }),
              
              // 5. POST submit định dạng Top-level TaskId (Array wrapper)
              () => api.post("/annotations/submit", { taskId, annotations: [{ taskItemId: currentItemId, payload: { bboxes }, id: existingAnnId }] }),

              // 6. PATCH
              () => annotationAPI.patch(existingAnnId, { payload: { bboxes } }),
            ]);
            
            console.log('[SaveItem] Update successful');
          } catch (updateErr) {
            console.warn('[SaveItem] Sequential updates failed. Trying reset...');
            try { await annotationAPI.remove(existingAnnId); } catch (e) { }
            
            await trySequential([
              () => annotationAPI.submit([{ taskItemId: currentItemId, payload: { bboxes } }]),
              () => api.post("/annotations/submit", { taskId, taskItemId: currentItemId, payload: { bboxes } }),
            ]);
            console.log('[SaveItem] Reset & POST successful');
          }
        } else {
          // Chưa có annotation → POST tạo mới
          try {
            const res = await annotationAPI.submit([{ taskItemId: currentItemId, payload: { bboxes } }]);
            const resData = resolveApiData(res);
            const firstRes = Array.isArray(resData) ? resData[0] : (resData?.id || resData?._id ? resData : null);
            if (firstRes?.id || firstRes?._id || firstRes?.annotationId) {
              existingAnnId = firstRes.id || firstRes._id || firstRes.annotationId;
              console.log('[SaveItem] POST created annotation:', existingAnnId);
              updateItemState(currentItemId, { annotationId: existingAnnId });
            }
          } catch (err) {
            // Healing: nếu vẫn bị 400/409 "Already Exists" dù đã cố gắng giữ annotationId,
            // tức là có annotation trên server mà ta không biết ID → tìm và PUT
            const isAlreadyExists =
              err.response?.status === 400 ||
              err.response?.status === 409 ||
              String(err.response?.data?.message || '').toLowerCase().includes('already exists');

            if (isAlreadyExists) {
              console.warn('[Healing] POST failed with "Already Exists". Searching for existing annotation ID...');
              const myUserIds = getCurrentUserIdentifiers();
              const datasetItemId = currentItem?.datasetItem?.id || currentItem?.datasetItemId || currentItem?.dataset_item_id || currentItem?.dataset_item?.id;
              const taskIdFromTask = task?.id || taskId;

              let anns = [];

              // 1. getByItem với currentItemId và datasetItemId
              const idsToTry = [currentItemId, datasetItemId].filter(Boolean);
              for (const idToTry of idsToTry) {
                try {
                  const findRes = await annotationAPI.getByItem(idToTry);
                  const findData = resolveApiData(findRes);
                  if (Array.isArray(findData)) anns = [...anns, ...findData];
                  else if (findData?.id || findData?._id) anns.push(findData);
                } catch (e) { }
              }

              // 2. getByTask để tìm trong toàn bộ task
              try {
                const taskAnnsRes = await annotationAPI.getByTask(taskIdFromTask);
                const taskAnnsData = resolveApiData(taskAnnsRes);
                const annList = Array.isArray(taskAnnsData)
                  ? taskAnnsData
                  : (taskAnnsData && typeof taskAnnsData === 'object' ? Object.values(taskAnnsData) : []);
                if (Array.isArray(annList)) {
                  anns = [...anns, ...annList.flat()];
                }
              } catch (e2) { }

              // Log data for diagnostic
              console.log('[Healing] Candidiate annotations found:', anns.length);
              if (anns.length > 0) console.log('[Healing] Sample candidate:', anns[0]);
              console.log('[Healing] Target ItemId:', currentItemId, 'Target DatasetItemId:', datasetItemId);
              console.log('[Healing] My User Identifiers:', myUserIds);

              // Deduplicate
              const uniqueAnns = anns.filter((v, i, a) =>
                v && (v.id || v._id || v.annotationId || v.AnnotationId) &&
                a.findIndex(t => (t.id || t._id || t.annotationId || t.AnnotationId) === (v.id || v._id || v.annotationId || v.AnnotationId)) === i
              );

              // Match theo userId + itemId (Sử dụng include để check nhiều định danh)
              let existing = uniqueAnns.find(a => {
                const aUserId = String(a.userId || a.annotatorId || a.annotator_id || a.ParticipantId || a.UserId || '');
                const matchesUser = myUserIds.includes(aUserId);
                
                const aItemId = String(a.taskItemId || a.taskItem || a.task_item_id || a.itemId || a.item_id || a.ItemId || a.Item_Id || '').toLowerCase();
                const aDatasetId = String(a.datasetItemId || a.datasetItem || a.dataset_item_id || a._datasetItemId || '').toLowerCase();
                
                const matchesItem = (aItemId === String(currentItemId).toLowerCase() || aDatasetId === String(datasetItemId).toLowerCase());
                
                return matchesUser && matchesItem;
              });

              if (!existing) {
                // Fallback 1: Match by itemId only
                existing = uniqueAnns.find(a => {
                  const aItemId = String(a.taskItemId || a.taskItem || a.task_item_id || a.itemId || a.item_id || a.ItemId || a.Item_Id || '').toLowerCase();
                  const aDatasetId = String(a.datasetItemId || a.datasetItem || a.dataset_item_id || a._datasetItemId || '').toLowerCase();
                  return aItemId === String(currentItemId).toLowerCase() || aDatasetId === String(datasetItemId).toLowerCase();
                });
              }

              if (!existing) {
                // Fallback 2: Any annotation for this user in this task
                existing = uniqueAnns.find(a => 
                  myUserIds.includes(String(a.userId || a.annotatorId || a.annotator_id || a.ParticipantId || a.UserId || ''))
                );
              }

              if (existing?.id || existing?._id || existing?.annotationId || existing?.AnnotationId) {
                existingAnnId = existing.id || existing._id || existing.annotationId || existing.AnnotationId;
                console.log('[Healing] Found existing ID:', existingAnnId, '→ will attempt update');
                // Lưu lại để lần sau không cần healing nữa
                updateItemState(currentItemId, { annotationId: existingAnnId });
                
                try {
                  await trySequential([
                    () => annotationAPI.update(existingAnnId, { payload: { bboxes } }),
                    () => api.post("/annotations/submit", { taskId, annotations: [{ taskItemId: currentItemId, payload: { bboxes }, id: existingAnnId }] }),
                    () => annotationAPI.patch(existingAnnId, { payload: { bboxes } }),
                  ]);
                  console.log('[Healing] Sequential update success');
                } catch (updateErr) {
                  console.warn('[Healing] All updates failed, trying reset...');
                  try { await annotationAPI.remove(existingAnnId); } catch (e) { }
                  await annotationAPI.submit([{ taskItemId: currentItemId, payload: { bboxes } }]);
                  console.log('[Healing] Reset & POST success');
                }
              } else {
                console.error('[Healing] Could not resolve existing annotation ID.');
                throw err;
              }
            } else {
              throw err;
            }
          }
        }
      } catch (err) {
        console.error('[SaveItem] Server sync failed:', err);
        // Nếu là Rework, chúng ta chỉ log lỗi và cho phép tiếp tục vì local state đã OK
        if (isRework) {
          console.warn('[SaveItem] Rework mode: proceeding with local save.');
          return true;
        }

        const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        alert('Lưu thất bại: ' + serverMsg);
        return false;
      }

      setSaving(false);
      return true;


      const newProgress = Math.round((nextProcessedCount / totalItems) * 100);
      const updatedItems = items.map(it => {
        const id = it?.taskItemId || it?.id;
        if (id === currentItemId) return { ...it, status: 'done' };
        return it;
      });

      upsertLocalAssignedTask({
        ...task, progress: newProgress, items: updatedItems, totalItems: items.length
      }, getCurrentUserId());

      return true;
    } catch (err) {
      alert('Lưu thất bại: ' + (err?.response?.data?.message || err?.message));
      return false;
    } finally { setSaving(false); }
  }

  async function goNext() {
    if (!currentItem) return;
    if (currentState.status !== 'done' && currentState.status !== 'skipped' && annotations.length > 0) {
      const ok = await saveCurrentItem(); if (!ok) return;
    }
    if (currentIndex < totalItems - 1) setCurrentIndex((i) => i + 1);
    else alert('Đây là ảnh cuối cùng. Nhấn "Nộp dự án" để hoàn tất.');
  }

  async function confirmSkip() {
    if (!skipReason.trim()) { alert('Vui lòng nhập lý do bỏ qua!'); return; }
    setSaving(true);
    try {
      await annotationAPI.skip({ taskItemId: currentItemId, note: skipReason });
      updateItemState(currentItemId, { status: 'skipped', skipReason, annotations: [] });

      const nextProcessedCount = Object.values({
        ...itemStates,
        [currentItemId]: { ...(itemStates[currentItemId] || {}), status: 'skipped' }
      }).filter((s) => s.status === 'done' || s.status === 'skipped').length;

      const newProgress = Math.round((nextProcessedCount / totalItems) * 100);
      const updatedItems = items.map(it => {
        const id = it?.taskItemId || it?.id;
        if (id === currentItemId) return { ...it, status: 'skipped' };
        return it;
      });

      upsertLocalAssignedTask({
        ...task, progress: newProgress, items: updatedItems, totalItems: items.length
      }, getCurrentUserId());

      setShowSkipModal(false); setSkipReason('');
      if (currentIndex < totalItems - 1) setCurrentIndex((i) => i + 1);
    } catch (err) { alert('Skip thất bại: ' + (err?.response?.data?.message || err?.message)); }
    finally { setSaving(false); }
  }

  async function handleSubmit() {
    if (!allProcessed) {
      const cnt = items.filter((item, idx) => {
        const id = item?.taskItemId || item?.id || `item-${idx}`;
        const st = itemStates[id]?.status;
        return st !== 'done' && st !== 'skipped';
      }).length;
      const first = items.findIndex((item, idx) => {
        const id = item?.taskItemId || item?.id || `item-${idx}`;
        return itemStates[id]?.status !== 'done' && itemStates[id]?.status !== 'skipped';
      });
      alert(`Còn ${cnt} ảnh chưa xử lý. Hoàn thành hoặc skip tất cả trước khi nộp!`);
      if (first >= 0) setCurrentIndex(first);
      setShowSubmitConfirm(false);
      return;
    }

    setSubmitting(true);
    const currentUserId = getCurrentUserId();

    try {
      const updatedTask = {
        ...task,
        status: 'completed',
        progress: 100,
        updatedAt: new Date().toISOString(),
        items: fullItems.map(it => {
          const iid = it?.taskItemId || it?.id || it?.itemId;
          const istate = itemStates[iid];
          if (istate) {
            return {
              ...it,
              status: istate.status === 'skipped' ? 'skipped' : 'completed',
              annotations: istate.annotations || []
            };
          }
          return it;
        })
      };

      try {
        await taskAPI.submit(taskId, { items: updatedTask.items });
      } catch (e) {
        console.warn('[Task] submit API failed:', e?.message);
      }

      upsertLocalAssignedTask(updatedTask, currentUserId);

      const currentCount = getSubmissionCount(taskId);
      setSubmittedCount(currentCount);

      const consensusResult = processTaskConsensus(taskId);

      setShowSubmitConfirm(false);

      if (!consensusResult.ready) {
        setShowWaiting(true);
      } else {
        setSubmitResult(consensusResult);
      }
    } catch (err) {
      alert('Nộp thất bại: ' + (err?.response?.data?.message || err?.message));
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }

  function handleSubmitResultClose() {
    navigate('/annotator/tasks');
  }

  function handleRework() {
    setSubmitResult(null);
    navigate(`/annotator/tasks/${taskId}`, { state: { task, isRework: true } });
    window.location.reload();
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Đang tải nhiệm vụ...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={loadTask} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Thử lại</button>
          <button onClick={() => navigate('/annotator/tasks')} className="px-6 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700">Quay lại</button>
        </div>
      </div>
    </div>
  );

  if (!task) return null;

  const imageUrl = currentItem ? resolveImageUrl(currentItem) : '';
  const canSubmit = allProcessed;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/annotator/tasks')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">{task.projectName || 'Dự án'}</h1>
              <p className="text-xs text-gray-500 truncate">
                {task.title && !task.title.startsWith('Task #') ? task.title : `Nhiệm vụ #${task.id?.slice(0, 8)}`} · {task.datasetName}
                {isRework && <span className="ml-2 text-amber-600 font-bold">• Đang làm lại ảnh conflict</span>}
              </p>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-1 min-w-[200px]">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">{processedCount}/{totalItems} ảnh · {progressPercent}%</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isExpired && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-black uppercase tracking-tighter shadow-sm border border-red-200">
                <AlertCircle className="w-4 h-4" /> ĐÃ HẾT HẠN
              </div>
            )}
            <button
              onClick={saveCurrentItem}
              disabled={saving || annotations.length === 0 || currentState.status === 'done' || isExpired}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 text-sm font-semibold transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
            </button>
            <button
              onClick={() => setShowSkipModal(true)}
              disabled={saving || currentState.status === 'done' || currentState.status === 'skipped' || isExpired}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 disabled:opacity-40 text-sm font-semibold transition-all"
            >
              <SkipForward className="w-4 h-4" /> Skip
            </button>
            <button
              onClick={() => {
                if (!canSubmit) { alert(`Còn ${totalItems - processedCount} ảnh chưa xử lý!`); return; }
                setShowSubmitConfirm(true);
              }}
              disabled={submitting || isExpired}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${canSubmit && !isExpired
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Nộp dự án {!canSubmit && <span className="ml-1 text-xs">({totalItems - processedCount} còn lại)</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full">

        {/* Left: Image list */}
        <div className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Danh sách ảnh ({totalItems})</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {items.map((item, idx) => {
              const id = item?.taskItemId || item?.id || `item-${idx}`;
              const state = itemStates[id] || {};
              const url = resolveImageUrl(item);
              const isActive = idx === currentIndex;
              return (
                <button
                  key={id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full rounded-xl border-2 overflow-hidden transition-all relative ${isActive ? 'border-indigo-500 shadow-md' :
                    (state.status === 'done' || state.status === 'completed') ? 'border-emerald-300 opacity-80' :
                      state.status === 'skipped' ? 'border-amber-300 opacity-70' :
                        state.status === 'rejected' ? 'border-rose-400 bg-rose-50/50' :
                          'border-transparent hover:border-slate-300'
                    }`}
                >
                  {url
                    ? <img src={url} alt={`item-${idx}`} className="w-full h-24 object-cover bg-gray-100" onError={(e) => { e.target.style.display = 'none'; }} />
                    : <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-400"><Tag className="w-8 h-8" /></div>
                  }
                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                    {item.isConflict && isRework && (
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-bounce">
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
                    {(state.status === 'done' || state.status === 'completed') && <span className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md"><Check className="w-3 h-3" /></span>}
                    {state.status === 'skipped' && <span className="bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md"><SkipForward className="w-3 h-3" /></span>}
                    {state.status === 'rejected' && <span className="bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md"><X className="w-3 h-3" /></span>}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] font-bold px-1 py-0.5 text-center">{idx + 1}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg disabled:opacity-40 transition-all"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-white text-sm font-bold">{currentIndex + 1} / {totalItems}</span>
              <button onClick={goNext} disabled={currentIndex >= totalItems - 1} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg disabled:opacity-40 transition-all"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2">
              {currentState.status === 'done' && <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold">✓ Đã lưu</span>}
              {currentState.status === 'skipped' && <span className="bg-amber-600 text-white text-xs px-2 py-1 rounded-full font-bold">↷ Đã bỏ qua</span>}
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-gray-300 text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoom(1)} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all"><RotateCcw className="w-4 h-4" /></button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4">
            {imageUrl ? (
              <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="annotation"
                  className="max-w-none select-none"
                  style={{ display: 'block', maxHeight: '70vh' }}
                  onLoad={(e) => { const img = e.target; setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight }); }}
                  draggable={false}
                />
                <canvas
                  ref={canvasRef}
                  width={imgRef.current?.naturalWidth || imgNaturalSize.w}
                  height={imgRef.current?.naturalHeight || imgNaturalSize.h}
                  className="absolute inset-0 cursor-crosshair"
                  style={{ width: imgRef.current?.width || '100%', height: imgRef.current?.height || '100%' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => { setIsDrawing(false); setStartPoint(null); setPreviewBox(null); }}
                />
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <Tag className="w-16 h-16 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">Không có ảnh để hiển thị</p>
              </div>
            )}
          </div>

          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
            <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl disabled:opacity-40 hover:bg-gray-600 font-semibold text-sm">
              <ArrowLeft className="w-4 h-4" /> Ảnh trước
            </button>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">{processedCount}/{totalItems} đã xử lý</span>
              <div className="w-32 bg-gray-700 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <button onClick={goNext} disabled={currentIndex >= totalItems - 1} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-40 hover:bg-indigo-500 font-semibold text-sm">
              Ảnh tiếp <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Labels + Annotations */}
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> {pendingBox ? 'Gán nhãn cho vùng chọn' : 'Chọn nhãn'}
            </h3>

            {pendingBox ? (
              <div className="space-y-3">
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-indigo-50 border-2 border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl font-bold text-sm focus:border-indigo-500 outline-none pr-10"
                    value={selectedLabel}
                    onChange={(e) => {
                      const label = e.target.value;
                      if (!label) return;
                      updateItemState(currentItemId, {
                        annotations: [...annotations, {
                          id: `ann-${Date.now()}`,
                          label: label,
                          color: getLabelColor(label, labels.indexOf(label)),
                          ...pendingBox
                        }],
                        status: 'pending',
                      });
                      setPendingBox(null);
                      setSelectedLabel('');
                    }}
                  >
                    <option value="">-- Chọn nhãn --</option>
                    {labels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Tag className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <button
                  onClick={() => setPendingBox(null)}
                  className="w-full py-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                >
                  Hủy vùng chọn này
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {labels.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <Tag className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p className="text-xs">Không có nhãn trong dự án</p>
                  </div>
                ) : (
                  <p className="text-xs text-indigo-600 mb-2 font-bold animate-pulse">
                    ↑ Kéo chuột trên ảnh để khoanh vùng
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider flex items-center gap-2">
                <List className="w-4 h-4" /> Bounding boxes ({annotations.length})
              </h3>
              {annotations.length > 0 && currentState.status !== 'done' && (
                <button onClick={() => updateItemState(currentItemId, { annotations: [] })} className="text-xs text-red-500 hover:text-red-700 font-semibold">Xóa tất cả</button>
              )}
            </div>
            {annotations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Chưa có bounding box</p>
                <p className="text-xs mt-1">Chọn nhãn và kéo trên ảnh</p>
              </div>
            ) : (
              <div className="space-y-2">
                {annotations.map((ann) => (
                  <div key={ann.id} className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ann.color }} />
                      <div className="flex-1 min-w-0">
                        {currentState.status !== 'done' ? (
                          <select
                            className="w-full text-sm font-black text-slate-900 bg-white/50 border border-slate-200 rounded-lg px-2 py-0.5 outline-none cursor-pointer hover:border-indigo-300 transition-all appearance-none"
                            value={ann.label}
                            onChange={(e) => {
                              const newLabel = e.target.value;
                              const updatedAnns = annotations.map(a =>
                                a.id === ann.id ? {
                                  ...a,
                                  label: newLabel,
                                  color: getLabelColor(newLabel, labels.indexOf(newLabel))
                                } : a
                              );
                              updateItemState(currentItemId, { annotations: updatedAnns });
                            }}
                          >
                            {labels.map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-gray-900 truncate">{ann.label}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">{Math.round(ann.width)}×{Math.round(ann.height)} pixels</p>
                      </div>
                    </div>
                    {currentState.status !== 'done' && (
                      <button
                        onClick={() => updateItemState(currentItemId, { annotations: annotations.filter((a) => a.id !== ann.id) })}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {currentState.status === 'skipped' && currentState.skipReason && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-700 mb-1">Lý do bỏ qua:</p>
                <p className="text-xs text-amber-800 italic">"{currentState.skipReason}"</p>
              </div>
            )}
          </div>

          {currentState.status !== 'done' && currentState.status !== 'skipped' && (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={saveCurrentItem}
                disabled={saving || annotations.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-40 hover:bg-indigo-700 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu ảnh này
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-2">Hoặc bấm "Skip" nếu ảnh không phù hợp</p>
            </div>
          )}
        </div>
      </div>

      {/* Skip Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Bỏ qua ảnh này</h3>
              <button onClick={() => { setShowSkipModal(false); setSkipReason(''); }} className="p-1.5 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Vui lòng nhập lý do bỏ qua</p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Nhập lý do tại đây..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:border-indigo-400 outline-none resize-none h-28 text-sm"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowSkipModal(false); setSkipReason(''); }} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={confirmSkip} disabled={saving || !skipReason.trim()} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50">
                {saving ? 'Đang xử lý...' : 'Xác nhận Skip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirm Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nộp dự án?</h3>
            <p className="text-gray-600 mb-2">Bạn đã xử lý <strong>{processedCount}/{totalItems}</strong> ảnh.</p>
            <p className="text-sm text-gray-500 mb-6">
              Sau khi nộp, hệ thống sẽ tính toán đồng thuận với {task?.totalAnnotators ? task.totalAnnotators - 1 : 2} annotator còn lại.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Hủy</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Nộp ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for others modal */}
      {showWaiting && (
        <WaitingModal
          submittedCount={submittedCount}
          totalAnnotators={task?.totalAnnotators || 3}
          onClose={() => {
            setShowWaiting(false);
            navigate('/annotator/tasks');
          }}
        />
      )}

      {/* Submission result modal (after all submitted) */}
      {submitResult && (
        <SubmissionResultModal
          result={submitResult}
          totalAnnotators={task?.totalAnnotators || 3}
          onClose={handleSubmitResultClose}
          onRework={handleRework}
        />
      )}
    </div>
  );
}
