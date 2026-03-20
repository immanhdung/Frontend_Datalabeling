import React, { useState, useEffect, useRef, useCallback } from 'react'; // Force reload at 20:30
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { taskAPI, annotationAPI, projectAPI } from '../../config/api';
import {
  normalizeTask,
  resolveApiData,
  getCurrentUserId,
  getLocalAssignedTasksForUser,
  upsertLocalAssignedTask,
} from '../../utils/annotatorTaskHelpers';
import {
  ArrowLeft, ArrowRight, Save, Send, Trash2, Tag, AlertCircle,
  Check, X, ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut,
  CheckCircle2, SkipForward, List, Loader2,
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

// ── Image URL ────────────────────────────────────────────────
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

// ── Fetch labels của project ────────────────────────────────
// Endpoint: GET /api/projects/{id}/labels
async function fetchProjectLabels(projectId) {
  const parse = (data) => {
    const raw = Array.isArray(data) ? data : (data?.items || data?.data || data?.labels || []);
    return raw.map((l) => typeof l === 'string' ? l : (l?.name || l?.Name || l?.labelName || '')).filter(Boolean);
  };

  try {
    const res = await api.get(`/projects/${projectId}/labels`);
    const labels = parse(res?.data);
    if (labels.length > 0) { console.log('[Labels] /projects/{id}/labels OK:', labels); return labels; }
    console.warn('[Labels] /projects/{id}/labels trả về rỗng');
  } catch (e) {
    console.warn('[Labels] /projects/{id}/labels failed:', e?.response?.status, e?.message);
  }

  return [];
}

// ── Main Component ───────────────────────────────────────────
export default function AnnotatorTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [itemStates, setItemStates] = useState({});

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

  const currentItem = items[currentIndex] || null;
  const currentItemId = currentItem?.taskItemId || currentItem?.id || `item-${currentIndex}`;
  const currentState = itemStates[currentItemId] || { annotations: [], status: 'pending', skipReason: '' };
  const annotations = currentState.annotations;
  const totalItems = items.length;
  const processedCount = Object.values(itemStates).filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const allProcessed = totalItems > 0 && processedCount >= totalItems;
  const progressPercent = totalItems > 0 ? Math.round((processedCount / totalItems) * 100) : 0;

  useEffect(() => { loadTask(); }, [taskId]); // eslint-disable-line

  async function loadTask() {
    setLoading(true);
    setError(null);
    try {
      const passedTask = location.state?.task;

      // 1. Task
      let taskData = null;
      const isMockTask = String(taskId).startsWith('MOCK-TASK') || String(taskId).startsWith('OFFLINE');

      try {
        if (!isMockTask) {
          const res = await taskAPI.getById(taskId);
          const raw = resolveApiData(res);
          taskData = normalizeTask(Array.isArray(raw) ? raw[0] : raw);
        }
      } catch (e) {
        console.warn('[Task] getById failed, checking local fallback:', e?.message);
      }

      if (!taskData || isMockTask) {
        // Fallback: Tìm trong local storage của người dùng hiện tại
        const userId = getCurrentUserId();
        const localTasks = getLocalAssignedTasksForUser(userId);
        const match = localTasks.find(t => String(t.id) === String(taskId));
        if (match) {
          taskData = normalizeTask(match);
          console.log('[Task] Loaded from local storage fallback');
        }
      }

      if (!taskData) { setError('Không tìm thấy nhiệm vụ.'); return; }

      // 2. Items
      let taskItems = [];
      try {
        if (!isMockTask) {
          const itemsRes = await taskAPI.getItems(taskId);
          taskItems = Array.isArray(resolveApiData(itemsRes)) ? resolveApiData(itemsRes) : [];
        }
      } catch (e) {
        console.warn('[Task] getItems failed:', e?.message);
      }

      if (taskItems.length === 0 && taskData.items) {
        taskItems = taskData.items;
      }

      // If still no items, we might need to fetch samples from the dataset if it's a mock task
      if (taskItems.length === 0 && taskData.datasetId) {
        try {
          const dsItemsRes = await api.get(`/datasets/${taskData.datasetId}/items`).catch(() => api.get(`/Datasets/${taskData.datasetId}`));
          taskItems = resolveApiData(dsItemsRes);
        } catch (e) {
          console.warn('[Task] Fallback fetch dataset items failed');
        }
      }

      // Normalize nested structure
      taskItems = taskItems.map((item) =>
        item?.taskItemId && item?.datasetItem
          ? { ...item.datasetItem, taskItemId: item.taskItemId, id: item.taskItemId, _raw: item }
          : item
      );

      // 3. Labels từ project
      // projectId có thể lấy từ taskData hoặc từ items (nếu getById fail)
      const projectId = taskData.projectId
        || taskItems[0]?._raw?.projectId
        || taskItems[0]?.projectId;

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
      setItems(taskItems);

      const firstUnprocessed = taskItems.findIndex((it) => {
        const st = String(it?.status || '').toLowerCase();
        return st !== 'completed' && st !== 'done' && st !== 'skipped';
      });
      setCurrentIndex(firstUnprocessed >= 0 ? firstUnprocessed : 0);

      // 4. Load existing annotations
      const initialStates = {};
      for (const item of taskItems) {
        const itemId = item?.taskItemId || item?.id || item?.itemId;
        const itemStatus = String(item?.status || '').toLowerCase();
        initialStates[itemId] = {
          annotations: [],
          status: itemStatus === 'completed' || itemStatus === 'done' ? 'done' : itemStatus === 'skipped' ? 'skipped' : 'pending',
          skipReason: '',
        };
        // Try to load any existing annotations for this item (don't strictly wait for status === 'done')
        if (itemId) {
          try {
            const annRes = await annotationAPI.getByItem(itemId);
            const data = resolveApiData(annRes);
            const anns = Array.isArray(data) ? data : [];

            if (anns.length > 0) {
              const latestAnn = anns[anns.length - 1];
              const bboxes = latestAnn?.payload?.bboxes || [];

              // Store the ID of the annotation object for future PUT updates
              initialStates[itemId].annotationId = latestAnn.id;

              initialStates[itemId].annotations = bboxes.map((b, idx) => ({
                id: b.id || `ann-${idx}`,
                label: b.label,
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                color: getLabelColor(b.label, idx),
              }));

              // If we found server annotations, ensure status is 'done'
              initialStates[itemId].status = 'done';
            }
          } catch (e) {
            console.warn(`[Task] Failed to fetch annotations for item ${itemId}:`, e?.message);
          }
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

  // ── Canvas ───────────────────────────────────────────────────
  function getCanvasCoords(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  }

  function handleCanvasMouseDown(e) {
    if (!selectedLabel) { alert('Vui lòng chọn nhãn trước khi vẽ bounding box!'); return; }
    setIsDrawing(true); setStartPoint(getCanvasCoords(e)); setPreviewBox(null);
  }

  function handleCanvasMouseMove(e) {
    if (!isDrawing || !startPoint) return;
    const pt = getCanvasCoords(e);
    setPreviewBox({ x: Math.min(startPoint.x, pt.x), y: Math.min(startPoint.y, pt.y), width: Math.abs(pt.x - startPoint.x), height: Math.abs(pt.y - startPoint.y) });
  }

  function handleCanvasMouseUp(e) {
    if (!isDrawing || !startPoint) return;
    const pt = getCanvasCoords(e);
    const box = { x: Math.min(startPoint.x, pt.x), y: Math.min(startPoint.y, pt.y), width: Math.abs(pt.x - startPoint.x), height: Math.abs(pt.y - startPoint.y) };
    setIsDrawing(false); setStartPoint(null); setPreviewBox(null);
    if (box.width > 8 && box.height > 8) {
      updateItemState(currentItemId, {
        annotations: [...annotations, { id: `ann-${Date.now()}`, label: selectedLabel, color: getLabelColor(selectedLabel, labels.indexOf(selectedLabel)), ...box }],
        status: 'pending',
      });
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
    if (previewBox && selectedLabel) {
      const color = getLabelColor(selectedLabel, labels.indexOf(selectedLabel));
      ctx.fillStyle = color + '22'; ctx.fillRect(previewBox.x, previewBox.y, previewBox.width, previewBox.height);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
      ctx.strokeRect(previewBox.x, previewBox.y, previewBox.width, previewBox.height); ctx.setLineDash([]);
    }
  }, [annotations, previewBox, selectedLabel, labels, currentIndex]);

  // ── Actions ──────────────────────────────────────────────────
  async function saveCurrentItem() {
    if (!currentItem) return;
    if (annotations.length === 0) { alert('Vui lòng gán ít nhất một nhãn hoặc chọn Skip.'); return false; }
    setSaving(true);
    try {
      const bboxes = annotations.map((a) => ({
        label: a.label,
        x: Math.round(a.x),
        y: Math.round(a.y),
        width: Math.round(a.width),
        height: Math.round(a.height)
      }));

      const existingAnnId = itemStates[currentItemId]?.annotationId;

      if (existingAnnId) {
        // Cập nhật gán nhãn đã tồn tại (PUT)
        await annotationAPI.update(existingAnnId, {
          payload: { bboxes }
        });
      } else {
        // Tạo gán nhãn mới (POST)
        await annotationAPI.submit([{
          taskItemId: currentItemId,
          payload: { bboxes }
        }]);
      }

      updateItemState(currentItemId, { status: 'done' });

      // 5. Update local task items and progress for dashboard/details
      const nextProcessedCount = Object.values({
        ...itemStates,
        [currentItemId]: { ...(itemStates[currentItemId] || {}), status: 'done' }
      }).filter((s) => s.status === 'done' || s.status === 'skipped').length;

      const newProgress = Math.round((nextProcessedCount / totalItems) * 100);

      // Update items array in local task
      const updatedItems = items.map(it => {
        const id = it?.taskItemId || it?.id;
        if (id === currentItemId) return { ...it, status: 'done' };
        return it;
      });

      upsertLocalAssignedTask({
        ...task,
        progress: newProgress,
        items: updatedItems,
        totalItems: items.length
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

      // Update local task progress for dashboard/details
      const nextProcessedCount = Object.values({
        ...itemStates,
        [currentItemId]: { ...(itemStates[currentItemId] || {}), status: 'skipped' }
      }).filter((s) => s.status === 'done' || s.status === 'skipped').length;

      const newProgress = Math.round((nextProcessedCount / totalItems) * 100);

      // Update items array in local task
      const updatedItems = items.map(it => {
        const id = it?.taskItemId || it?.id;
        if (id === currentItemId) return { ...it, status: 'skipped' };
        return it;
      });

      upsertLocalAssignedTask({
        ...task,
        progress: newProgress,
        items: updatedItems,
        totalItems: items.length
      }, getCurrentUserId());

      setShowSkipModal(false); setSkipReason('');
      if (currentIndex < totalItems - 1) setCurrentIndex((i) => i + 1);
    } catch (err) { alert('Skip thất bại: ' + (err?.response?.data?.message || err?.message)); }
    finally { setSaving(false); }
  }

  async function handleSubmit() {
    if (!allProcessed) {
      const cnt = items.filter((item, idx) => { const id = item?.taskItemId || item?.id || `item-${idx}`; const st = itemStates[id]?.status; return st !== 'done' && st !== 'skipped'; }).length;
      const first = items.findIndex((item, idx) => { const id = item?.taskItemId || item?.id || `item-${idx}`; return itemStates[id]?.status !== 'done' && itemStates[id]?.status !== 'skipped'; });
      alert(`Còn ${cnt} ảnh chưa xử lý. Hoàn thành hoặc skip tất cả trước khi nộp!`);
      if (first >= 0) setCurrentIndex(first);
      setShowSubmitConfirm(false); return;
    }
    setSubmitting(true);
    try {
      try { await taskAPI.submit(taskId); } catch (e) { console.warn('[Task] submit not available:', e?.message); }
      alert('Nộp dự án thành công! Đang chuyển hướng...');
      navigate('/annotator/tasks');
    } catch (err) { alert('Nộp thất bại: ' + (err?.response?.data?.message || err?.message)); }
    finally { setSubmitting(false); setShowSubmitConfirm(false); }
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" /><p className="text-gray-600 font-medium">Đang tải nhiệm vụ...</p></div>
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
            <button onClick={() => navigate('/annotator/tasks')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"><ArrowLeft className="w-5 h-5" /></button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">{task.projectName || 'Dự án'}</h1>
              <p className="text-xs text-gray-500 truncate">{task.title && !task.title.startsWith('Task #') ? task.title : `Nhiệm vụ #${task.id?.slice(0, 8)}`} · {task.datasetName}</p>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center gap-1 min-w-[200px]">
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} /></div>
            <span className="text-xs text-gray-500 font-medium">{processedCount}/{totalItems} ảnh · {progressPercent}%</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={saveCurrentItem} disabled={saving || annotations.length === 0 || currentState.status === 'done'} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 text-sm font-semibold transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
            </button>
            <button onClick={() => setShowSkipModal(true)} disabled={saving || currentState.status === 'done' || currentState.status === 'skipped'} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 disabled:opacity-40 text-sm font-semibold transition-all">
              <SkipForward className="w-4 h-4" /> Skip
            </button>
            <button
              onClick={() => { if (!canSubmit) { alert(`Còn ${totalItems - processedCount} ảnh chưa xử lý!`); return; } setShowSubmitConfirm(true); }}
              disabled={submitting}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${canSubmit ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Nộp dự án {!canSubmit && <span className="ml-1 text-xs">({totalItems - processedCount} còn lại)</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full">

        {/* Left: Image list */}
        <div className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-100"><p className="text-xs font-black uppercase text-gray-400 tracking-wider">Danh sách ảnh ({totalItems})</p></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {items.map((item, idx) => {
              const id = item?.taskItemId || item?.id || `item-${idx}`;
              const state = itemStates[id] || {};
              const url = resolveImageUrl(item);
              const isActive = idx === currentIndex;
              return (
                <button key={id} onClick={() => setCurrentIndex(idx)}
                  className={`w-full rounded-xl border-2 overflow-hidden transition-all relative ${isActive ? 'border-indigo-500 shadow-md' : state.status === 'done' ? 'border-emerald-300 opacity-80' : state.status === 'skipped' ? 'border-amber-300 opacity-70' : 'border-transparent hover:border-slate-300'}`}
                >
                  {url ? <img src={url} alt={`item-${idx}`} className="w-full h-24 object-cover bg-gray-100" onError={(e) => { e.target.style.display = 'none'; }} />
                    : <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-400"><Tag className="w-8 h-8" /></div>}
                  <div className="absolute top-1 right-1">
                    {state.status === 'done' && <span className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center"><Check className="w-3 h-3" /></span>}
                    {state.status === 'skipped' && <span className="bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center"><SkipForward className="w-3 h-3" /></span>}
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
                <img ref={imgRef} src={imageUrl} alt="annotation" className="max-w-none select-none" style={{ display: 'block', maxHeight: '70vh' }}
                  onLoad={(e) => { const img = e.target; setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight }); }} draggable={false} />
                <canvas ref={canvasRef}
                  width={imgRef.current?.naturalWidth || imgNaturalSize.w} height={imgRef.current?.naturalHeight || imgNaturalSize.h}
                  className="absolute inset-0 cursor-crosshair" style={{ width: imgRef.current?.width || '100%', height: imgRef.current?.height || '100%' }}
                  onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp}
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
              <div className="w-32 bg-gray-700 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progressPercent}%` }} /></div>
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
              <Tag className="w-4 h-4" /> Chọn nhãn
            </h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {labels.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <Tag className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">Không có nhãn trong dự án</p>
                </div>
              ) : labels.map((label, idx) => {
                const color = getLabelColor(label, idx);
                const isSelected = selectedLabel === label;
                return (
                  <button key={label} onClick={() => setSelectedLabel(isSelected ? '' : label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-semibold text-sm transition-all ${isSelected ? 'text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                    style={isSelected ? { backgroundColor: color } : {}}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {label}
                    {isSelected && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
            {!selectedLabel && labels.length > 0 && <p className="text-xs text-amber-600 mt-2 font-medium">↑ Chọn nhãn, rồi kéo trên ảnh để vẽ</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider flex items-center gap-2"><List className="w-4 h-4" /> Bounding boxes ({annotations.length})</h3>
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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ann.color }} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{ann.label}</p>
                        <p className="text-[10px] text-gray-400">{Math.round(ann.width)}×{Math.round(ann.height)}</p>
                      </div>
                    </div>
                    {currentState.status !== 'done' && (
                      <button onClick={() => updateItemState(currentItemId, { annotations: annotations.filter((a) => a.id !== ann.id) })} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
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
              <button onClick={saveCurrentItem} disabled={saving || annotations.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-40 hover:bg-indigo-700 transition-all">
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
            <p className="text-sm text-gray-600 mb-4">Vui lòng nhập lý do bỏ qua (ví dụ: ảnh mờ, không có đối tượng cần gán nhãn...)</p>
            <textarea value={skipReason} onChange={(e) => setSkipReason(e.target.value)} placeholder="Nhập lý do tại đây..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:border-indigo-400 outline-none resize-none h-28 text-sm" autoFocus />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowSkipModal(false); setSkipReason(''); }} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={confirmSkip} disabled={saving || !skipReason.trim()} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50">
                {saving ? 'Đang xử lý...' : 'Xác nhận Skip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nộp dự án?</h3>
            <p className="text-gray-600 mb-2">Bạn đã xử lý <strong>{processedCount}/{totalItems}</strong> ảnh.</p>
            <p className="text-sm text-gray-500 mb-6">Sau khi nộp, dự án sẽ được chuyển đến <strong>Reviewer</strong> để kiểm duyệt.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Hủy</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Nộp ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
