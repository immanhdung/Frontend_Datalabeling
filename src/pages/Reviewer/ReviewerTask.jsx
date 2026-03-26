import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import {
    ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, X,
    CheckCircle2, AlertCircle,
} from 'lucide-react';

// ── API ───────────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveImageUrl(item) {
    if (!item) return '';
    const nested = item?.datasetItem || item?.DatasetItem || item?.taskItem?.datasetItem;
    if (nested) { const u = resolveImageUrl(nested); if (u) return u; }
    const candidate =
        item?.storageUri || item?.StorageUri ||
        item?.thumbnailUrl || item?.previewUrl ||
        item?.imageUrl || item?.ImageUrl ||
        item?.url || item?.Url ||
        item?.path || item?.Path ||
        item?.filePath || item?.mediaUrl || '';
    if (!candidate) {
        if (item?.data && typeof item.data === 'object') return resolveImageUrl(item.data);
        return '';
    }
    if (/^(https?:|data:|blob:)/i.test(candidate)) return candidate;
    const base = API_BASE.replace(/\/api$/i, '');
    return candidate.startsWith('/') ? `${base}${candidate}` : `${base}/${candidate}`;
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];
const _colorReg = {};
function getLabelColor(label, idx = 0) {
    if (!label) return COLORS[idx % COLORS.length];
    if (_colorReg[label]) return _colorReg[label];
    let h = 0;
    for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) & 0xffff;
    _colorReg[label] = COLORS[h % COLORS.length];
    return _colorReg[label];
}

function extractAnnotations(item) {
    if (!item) return [];
    const rawList =
        item.annotations ||
        item.Annotations ||
        item.payload?.bboxes ||
        item.payload?.boundingBoxes ||
        item.bboxes ||
        item.boundingBoxes ||
        item.labels ||
        [];
    if (!Array.isArray(rawList)) return [];
    return rawList.map((a, idx) => {
        const label = a.label || a.labelName || a.name || a.category || 'Object';
        const x = a.x ?? a.left ?? (Array.isArray(a.bbox) ? a.bbox[0] : undefined) ?? 0;
        const y = a.y ?? a.top ?? (Array.isArray(a.bbox) ? a.bbox[1] : undefined) ?? 0;
        const width = a.width ?? a.w ?? (Array.isArray(a.bbox) ? a.bbox[2] : undefined) ?? 0;
        const height = a.height ?? a.h ?? (Array.isArray(a.bbox) ? a.bbox[3] : undefined) ?? 0;
        const color = a.color || getLabelColor(label, idx);
        return { label, x, y, width, height, color };
    }).filter(a => a.width > 0 && a.height > 0);
}

// ── BBox Canvas ───────────────────────────────────────────────────────────────
function BBoxCanvas({ annotations, imgRef, imgNaturalSize }) {
    const canvasRef = useRef(null);
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;
        const dispW = img.clientWidth;
        const dispH = img.clientHeight;
        const natW = img.naturalWidth || imgNaturalSize.w || 1;
        const natH = img.naturalHeight || imgNaturalSize.h || 1;
        canvas.width = dispW;
        canvas.height = dispH;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, dispW, dispH);
        if (!annotations?.length) return;
        const scaleX = dispW / natW;
        const scaleY = dispH / natH;
        annotations.forEach(ann => {
            const x = ann.x * scaleX, y = ann.y * scaleY;
            const w = ann.width * scaleX, h = ann.height * scaleY;
            ctx.fillStyle = ann.color + '28';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            if (ann.label) {
                ctx.font = 'bold 12px system-ui, sans-serif';
                const tw = ctx.measureText(ann.label).width;
                const bw = tw + 10, bh = 20, bx = x;
                const by = y > bh + 2 ? y - bh - 2 : y + 2;
                ctx.fillStyle = ann.color;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 3);
                else ctx.rect(bx, by, bw, bh);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText(ann.label, bx + 5, by + 14);
            }
        });
    }, [annotations, imgNaturalSize, imgRef]);
    useEffect(() => { draw(); }, [draw]);
    useEffect(() => {
        window.addEventListener('resize', draw);
        return () => window.removeEventListener('resize', draw);
    }, [draw]);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />;
}

// ── Right Bar Thumbnail ───────────────────────────────────────────────────────
function RightBarThumb({ item, idx, isSelected, status, onClick }) {
    const bboxCount = extractAnnotations(item).length;
    const isConflict = item.isConflict === true;
    return (
        <button
            onClick={onClick}
            className={`w-full relative rounded-[2rem] overflow-hidden border-4 transition-all duration-300 ${isSelected
                ? 'border-blue-500 shadow-2xl scale-[1.02]'
                : status === 'approved'
                    ? 'border-emerald-400 opacity-80'
                    : status === 'rejected'
                        ? 'border-rose-400 opacity-80'
                        : 'border-transparent opacity-60 hover:opacity-100'
                }`}
        >
            <img
                src={resolveImageUrl(item)}
                alt={`item-${idx}`}
                className="w-full h-36 object-cover bg-slate-100"
            />
            {/* Index */}
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg">
                #{item.itemIndex + 1}
            </div>
            {/* CONFLICT badge */}
            {isConflict && (
                <div className="absolute top-3 right-3 bg-rose-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-xl border border-rose-400">
                    CONFLICT
                </div>
            )}
            {/* Annotator name — conflict only */}
            {isConflict && item.annotatorName && (
                <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-white text-[7px] font-black px-2.5 py-1.5 rounded-xl max-w-[90px] truncate shadow-lg">
                    {item.annotatorName}
                </div>
            )}
            {/* Consensus badge */}
            {!isConflict && item.consensusCount > 1 && (
                <div className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full shadow-lg">
                    {item.consensusCount} đồng thuận
                </div>
            )}
            {/* BBox badge */}
            {bboxCount > 0 && !isConflict && (
                <div className="absolute bottom-3 left-3 bg-indigo-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full shadow-lg">
                    {bboxCount} BBOX
                </div>
            )}
            {status === 'approved' && (
                <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[2px]">
                    <Check className="w-10 h-10 text-emerald-500 drop-shadow-lg" />
                </div>
            )}
            {status === 'rejected' && (
                <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center backdrop-blur-[2px]">
                    <X className="w-10 h-10 text-rose-500 drop-shadow-lg" />
                </div>
            )}
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const ReviewerTask = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [task, setTask] = useState({ id: taskId, title: 'Loading...', projectName: '...' });
    const [items, setItems] = useState([]);
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const [itemStatuses, setItemStatuses] = useState({});
    const [zoom, setZoom] = useState(1);
    const [imgNaturalSize, setImgNaturalSize] = useState({ w: 800, h: 600 });
    const imgRef = useRef(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [actionType, setActionType] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => { loadData(); }, [taskId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // ── 1. Task info ──────────────────────────────────────────────────
            const taskRes = await apiFetch(`/api/tasks/${taskId}`).catch(() => null);
            if (taskRes) {
                const t = taskRes.data || taskRes;
                setTask(prev => ({
                    ...prev,
                    title: t.title || t.name || `Task #${String(taskId).slice(0, 8)}`,
                    projectName: t.projectName || t.project?.name || 'Dự án',
                    totalItems: t.totalItems || t.itemCount || 0,
                }));
            }

            // ── 2. Task items list (for ordered itemIds + image URLs) ─────────
            // GET /api/tasks/{taskId}/items
            const itemsRes = await apiFetch(`/api/tasks/${taskId}/items`).catch(() => null);
            const taskItemsArr = Array.isArray(itemsRes?.data)
                ? itemsRes.data
                : Array.isArray(itemsRes?.items)
                    ? itemsRes.items
                    : Array.isArray(itemsRes)
                        ? itemsRes
                        : [];

            if (taskItemsArr.length === 0) {
                setError('Task này không có item nào.');
                return;
            }

            // ── 3. For each task item: try consensus first, fallback to conflicted ──
            const rightBarEntries = [];

            await Promise.all(
                taskItemsArr.map(async (taskItem, i) => {
                    const itemId = taskItem.id || taskItem.taskItemId || taskItem.itemId;

                    // 3a. Try GET /api/consensuses/task-items/{taskItemId}
                    const consensusRes = await apiFetch(`/api/consensuses/task-items/${itemId}`)
                        .catch(() => null);

                    const consensus = consensusRes?.data || consensusRes;

                    // If a consensus exists and is valid (not conflicted), show 1 entry
                    if (
                        consensus &&
                        !consensus.isConflict &&
                        consensus.status !== 'Conflicted' &&
                        consensus.status !== 'conflicted'
                    ) {
                        rightBarEntries.push({
                            // image URL: prefer taskItem, then consensus
                            ...taskItem,
                            ...consensus,
                            isConflict: false,
                            itemIndex: i,
                            taskItemId: String(itemId),
                            consensusCount: consensus.annotatorCount || consensus.agreementCount || 1,
                            totalAnnotators: consensus.totalAnnotators || undefined,
                            annotatorName: undefined, // hide for non-conflict
                        });
                        return;
                    }

                    // 3b. Conflicted → GET /api/tasks/items/{itemId}/annotations?Status=Conflicted
                    const conflictRes = await apiFetch(
                        `/api/tasks/items/${itemId}/annotations?Status=Conflicted`
                    ).catch(() => null);

                    const conflictAnns = Array.isArray(conflictRes?.data)
                        ? conflictRes.data
                        : Array.isArray(conflictRes)
                            ? conflictRes
                            : [];

                    if (conflictAnns.length > 0) {
                        // One entry per conflicting annotator
                        conflictAnns.forEach(ann => {
                            rightBarEntries.push({
                                ...taskItem,   // base image URL from taskItem
                                ...ann,        // annotation data (may also contain image URL)
                                isConflict: true,
                                itemIndex: i,
                                taskItemId: String(itemId),
                                annotationId: ann.id || ann.annotationId,
                                annotatorName:
                                    ann.annotatorName ||
                                    ann.userName ||
                                    ann.userEmail ||
                                    `Annotator ${ann.userId || '?'}`,
                                annotatorId: ann.userId || ann.annotatorId,
                            });
                        });
                        return;
                    }

                    // 3c. Fallback: no consensus, no conflicted annotations yet
                    //     (e.g. only 1 annotator submitted so far) — show as pending
                    rightBarEntries.push({
                        ...taskItem,
                        isConflict: false,
                        itemIndex: i,
                        taskItemId: String(itemId),
                        consensusCount: 1,
                        annotatorName: undefined,
                    });
                })
            );

            // Sort by itemIndex to preserve original order (Promise.all may resolve out of order)
            rightBarEntries.sort((a, b) => a.itemIndex - b.itemIndex);

            if (rightBarEntries.length === 0) {
                setError('Không có dữ liệu annotation nào cho task này.');
                return;
            }

            setItems(rightBarEntries);
            setTask(prev => ({
                ...prev,
                totalItems: prev.totalItems || taskItemsArr.length,
            }));

        } catch (err) {
            console.error(err);
            setError(err.message || 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const currentItem = items[selectedItemIndex] || {};
    const imageUrl = resolveImageUrl(currentItem);
    const currentAnnotations = extractAnnotations(currentItem);
    const currentItemStatus = itemStatuses[selectedItemIndex];
    const allDecided = items.length > 0 && Object.keys(itemStatuses).length >= items.length;
    const conflictCount = items.filter(it => it.isConflict === true).length;
    const nonConflictCount = items.filter(it => it.isConflict === false).length;

    const handleApproveItem = () => {
        setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'approved' }));
        if (selectedItemIndex < items.length - 1) setSelectedItemIndex(p => p + 1);
    };

    const handleRejectItem = () => {
        setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'rejected' }));
        if (selectedItemIndex < items.length - 1) setSelectedItemIndex(p => p + 1);
    };

    const handleSubmitReview = async () => {
        try {
            const approvedItems = items
                .filter((_, idx) => itemStatuses[idx] === 'approved')
                .map(it => ({ taskItemId: it.taskItemId, annotationId: it.annotationId, annotatorId: it.annotatorId }));
            const rejectedItems = items
                .filter((_, idx) => itemStatuses[idx] === 'rejected')
                .map(it => ({ taskItemId: it.taskItemId, annotationId: it.annotationId, annotatorId: it.annotatorId }));

            // POST /api/reviews
            await apiFetch('/api/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: Number(taskId) || taskId,
                    action: actionType,
                    feedback,
                    approvedItems,
                    rejectedItems,
                    reviewedAt: new Date().toISOString(),
                }),
            });

            alert(`Hoàn tất! Duyệt ${approvedItems.length} ảnh, loại bỏ ${rejectedItems.length} phiên bản.`);
            navigate('/reviewer/dashboard');
        } catch (err) {
            alert('Lỗi khi gửi kết quả review: ' + err.message);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-black uppercase text-sm tracking-widest">Đang tải...</p>
        </div>
    );

    if (error) return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 p-10 text-center">
            <AlertCircle className="w-16 h-16 text-rose-500" />
            <p className="font-black uppercase text-rose-500">{error}</p>
            <button onClick={() => navigate('/reviewer/dashboard')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black">
                Quay lại
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <Header title="Review Annotation" userName="Reviewer" userRole="reviewer" />

            <main className="flex-1 p-8 max-w-screen-2xl mx-auto w-full grid grid-cols-12 gap-8">

                {/* ── Left info ── */}
                <div className="col-span-2 space-y-6">
                    <button onClick={() => navigate('/reviewer/dashboard')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-all">
                        <ArrowLeft className="w-3 h-3" /> Dashboard
                    </button>

                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Project</p>
                            <p className="text-sm font-black text-slate-800">{task.projectName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Task</p>
                            <p className="text-xs font-bold text-slate-600 truncate">{task.title}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500">Tổng ảnh</span>
                                <span className="font-black text-slate-800">{task.totalItems}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-emerald-600">Đồng thuận</span>
                                <span className="font-black text-emerald-700">{nonConflictCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-rose-600">Conflict</span>
                                <span className="font-black text-rose-700">{conflictCount} entries</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Chú thích</p>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-600">1 ảnh = đồng thuận</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-600">CONFLICT: nhiều phiên bản</span>
                        </div>
                    </div>

                    {currentItem.isConflict === true && (
                        <div className="p-4 bg-rose-600 rounded-2xl text-white">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4" />
                                <p className="text-[10px] font-black uppercase">Conflict</p>
                            </div>
                            <p className="text-[9px] font-bold opacity-80 uppercase tracking-tighter">
                                Phiên bản của {currentItem.annotatorName}. Hãy chấp nhận hoặc loại bỏ.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Center canvas ── */}
                <div className="col-span-8 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[700px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Review Canvas</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Ảnh #{(currentItem.itemIndex ?? 0) + 1} / {task.totalItems}
                                    {currentItem.isConflict === true && (
                                        <span className="text-rose-500 ml-2 bg-rose-50 px-2 py-0.5 rounded-full">
                                            [{currentItem.annotatorName}] — CONFLICT
                                        </span>
                                    )}
                                    {currentItem.isConflict === false && currentItem.consensusCount > 1 && (
                                        <span className="text-emerald-600 ml-2 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {currentItem.consensusCount} annotators đồng thuận ✓
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-3 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm">
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-3 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm">
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-900 rounded-[2rem] overflow-hidden relative shadow-inner">
                            <div className="absolute inset-0 overflow-auto flex items-center justify-center p-10">
                                <div className="relative inline-block transition-transform duration-200" style={{ transform: `scale(${zoom})` }}>
                                    <img
                                        ref={imgRef}
                                        src={imageUrl}
                                        alt="img"
                                        className="max-w-none shadow-2xl rounded-lg"
                                        onLoad={e => setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                                    />
                                    <BBoxCanvas annotations={currentAnnotations} imgRef={imgRef} imgNaturalSize={imgNaturalSize} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <div className="flex gap-4">
                                {currentItemStatus === 'approved' ? (
                                    <div className="px-10 py-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-3 border border-emerald-100">
                                        <CheckCircle2 className="w-5 h-5" /> Approved
                                    </div>
                                ) : currentItemStatus === 'rejected' ? (
                                    <div className="px-10 py-4 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-3 border border-rose-100">
                                        <X className="w-5 h-5" /> Discarded
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={handleApproveItem} className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg shadow-emerald-200 transition-all flex items-center gap-3">
                                            <Check className="w-5 h-5" /> Chấp nhận
                                        </button>
                                        <button onClick={handleRejectItem} className="px-10 py-5 bg-white border-2 border-slate-100 hover:border-rose-500 hover:text-rose-600 rounded-[1.5rem] font-black uppercase text-[10px] transition-all flex items-center gap-3">
                                            <X className="w-5 h-5" /> Loại bỏ
                                        </button>
                                    </>
                                )}
                            </div>
                            {allDecided && (
                                <button
                                    onClick={() => {
                                        setActionType(Object.values(itemStatuses).includes('rejected') ? 'reject' : 'approve');
                                        setShowFeedbackModal(true);
                                    }}
                                    className="px-10 py-5 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-2xl transition-all flex items-center gap-3"
                                >
                                    Hoàn tất <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right image list ── */}
                <div className="col-span-2 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Danh sách ảnh</h3>
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest px-1">
                            Conflict → hiện tất cả annotator
                        </p>
                    </div>
                    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-3 custom-scrollbar">
                        {items.map((item, idx) => (
                            <RightBarThumb
                                key={`${item.taskItemId}-${item.annotatorId || idx}`}
                                item={item}
                                idx={idx}
                                isSelected={selectedItemIndex === idx}
                                status={itemStatuses[idx]}
                                onClick={() => setSelectedItemIndex(idx)}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* ── Feedback modal ── */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 border border-slate-100">
                        <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-100">
                            <ArrowRight className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2 text-center">Gửi kết quả Review</h2>
                        <p className="text-slate-400 mb-6 font-bold uppercase text-[9px] tracking-widest text-center">
                            Duyệt {Object.values(itemStatuses).filter(s => s === 'approved').length} ảnh •
                            Loại bỏ {Object.values(itemStatuses).filter(s => s === 'rejected').length} phiên bản
                        </p>
                        <textarea
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Ghi chú / nhận xét (tuỳ chọn)..."
                            className="w-full border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 resize-none mb-6 focus:outline-none focus:border-blue-300"
                            rows={3}
                        />
                        <div className="flex gap-4">
                            <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-[1.5rem] font-black uppercase text-[10px] transition-all">
                                Quay lại
                            </button>
                            <button onClick={handleSubmitReview} className="flex-[2] py-5 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl shadow-blue-200 font-black uppercase text-[10px] hover:bg-blue-700 transition-all">
                                Xác nhận gửi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewerTask;
