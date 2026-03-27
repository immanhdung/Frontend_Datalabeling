import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, {
    taskAPI,
    consensusAPI,
    annotationAPI,
    reviewAPI
} from '../../config/api';
import Header from '../../components/common/Header';
import {
    ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, X,
    CheckCircle2, AlertCircle,
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

    if (Array.isArray(rawList)) {
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
    return [];
}

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
        if (!annotations) return;
        const scaleX = dispW / natW;
        const scaleY = dispH / natH;
        annotations.forEach((ann) => {
            const x = ann.x * scaleX;
            const y = ann.y * scaleY;
            const w = ann.width * scaleX;
            const h = ann.height * scaleY;
            const color = ann.color;
            ctx.fillStyle = color + '28';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            if (ann.label) {
                ctx.font = 'bold 12px system-ui, sans-serif';
                const tw = ctx.measureText(ann.label).width;
                const bw = tw + 10;
                const bh = 20;
                const bx = x;
                const by = y > bh + 2 ? y - bh - 2 : y + 2;
                ctx.fillStyle = color;
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

function RightBarThumb({ item, idx, isSelected, status, onClick }) {
    const bboxCount = extractAnnotations(item).length;
    return (
        <button
            onClick={onClick}
            className={`w-full group relative rounded-[2rem] overflow-hidden border-4 transition-all duration-300 ${isSelected
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

            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg">
                #{item.itemIndex + 1}
            </div>

            {item.isConflict && (
                <div className="absolute top-3 right-3 bg-rose-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-xl border border-rose-400">
                    CONFLICT
                </div>
            )}

            {item.isConflict && item.annotatorName && (
                <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-white text-[7px] font-black px-2.5 py-1.5 rounded-xl max-w-[90px] truncate shadow-lg">
                    {item.annotatorName}
                </div>
            )}

            {!item.isConflict && item.versions?.length > 1 && (
                <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full shadow-lg border border-emerald-400">
                    ĐỒNG THUẬN ({item.versions.length})
                </div>
            )}

            {!item.isConflict && item.consensusCount > 1 && (
                <div className="absolute bottom-3 left-3 bg-emerald-500/80 backdrop-blur-md text-white text-[7px] font-black px-2 py-1 rounded-full shadow-lg">
                    {item.consensusCount} đồng thuận
                </div>
            )}

            {bboxCount > 0 && !item.isConflict && (
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

const ReviewerTask = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [task, setTask] = useState({ id: taskId, title: 'Loading...', projectName: 'Processing...' });
    const [items, setItems] = useState([]);

    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState(null);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [itemStatuses, setItemStatuses] = useState({});

    const [zoom, setZoom] = useState(1);
    const [imgNaturalSize, setImgNaturalSize] = useState({ w: 800, h: 600 });
    const imgRef = useRef(null);

    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [actionType, setActionType] = useState('');
    const [reviewData, setReviewData] = useState({ feedback: '', issues: [] });

    useEffect(() => { loadAnnotation(); }, [taskId]);

    const loadAnnotation = async () => {
        try {
            setLoading(true);
            setError(null);

            const submissionsMap = new Map();

            try {
                const res = await reviewAPI.getAnnotationForReview(taskId);
                const data = res.data.data || res.data;
                const apiSubs = Array.isArray(data) ? data : (data.submissions || [data]);
                apiSubs.forEach((s, idx) => {
                    const sid = s.userId || s.annotatorId || `api-${idx}`;
                    submissionsMap.set(sid, s);
                });
                if (data.task) setTask(prev => ({ ...prev, ...data.task }));
            } catch (err) { console.warn('[ReviewerTask] API fetch failed'); }

            try {
                const rawMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
                Object.entries(rawMap).forEach(([uid, list]) => {
                    const mt = list.find(t => String(t.id) === String(taskId));
                    if (mt && ['completed', 'pending_review', 'submitted'].includes(mt.status)) {
                        if (!submissionsMap.has(uid) || (mt.items?.length || 0) >= (submissionsMap.get(uid).items?.length || 0)) {
                            submissionsMap.set(uid, mt);
                        }
                    }
                });
            } catch (e) { }

            const submissions = Array.from(submissionsMap.values());

            if (submissions.length === 0) {
                setError('Không tìm thấy dữ liệu gán nhãn nào.');
                return;
            }

            const rawItemCount = Math.max(...submissions.map(s => (s.items || []).length));
            const totalAnnotators = submissions.length;

            const rightBarEntries = [];

            for (let i = 0; i < rawItemCount; i++) {
                const versions = submissions.map((s, sIdx) => {
                    const it = (s.items || [])[i];
                    if (!it) return null;
                    return {
                        ...it,
                        annotatorName: s.annotatorName || `Annotator ${sIdx + 1}`,
                        annotatorId: s.userId || s.annotatorId || sIdx,
                        status: it.status || 'submitted'
                    };
                }).filter(Boolean);

                const labelFingers = versions.map(v =>
                    extractAnnotations(v).map(a => a.label).sort().join('|') || 'empty'
                );

                const labelFingersSet = new Set(labelFingers);
                const isConflict = versions.length > 1 && labelFingersSet.size > 1;

                if (!isConflict) {
                    rightBarEntries.push({
                        ...versions[0],
                        isConflict: false,
                        itemIndex: i,
                        consensusCount: versions.length,
                        totalAnnotators,
                        versions: versions
                    });
                } else {
                    rightBarEntries.push({
                        ...versions[0],
                        annotations: [],
                        isConflict: true,
                        itemIndex: i,
                        totalAnnotators,
                        versions: versions
                    });
                }
            }

            setItems(rightBarEntries);

            const taskMeta = submissions[0];
            setTask({
                id: taskId,
                title: taskMeta.title || taskMeta.name || `Task #${String(taskId).slice(0, 8)}`,
                projectName: taskMeta.projectName || 'Dự án',
                totalItems: rawItemCount,
                totalAnnotators,
            });
        } catch (err) {
            setError(err.message || 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const currentItem = items[selectedItemIndex] || {};
    const activeVersion = (currentItem.isConflict && selectedVersionIndex !== null)
        ? (currentItem.versions?.[selectedVersionIndex] || currentItem)
        : (currentItem.isConflict ? { ...currentItem, annotations: [] } : currentItem);

    const imageUrl = resolveImageUrl(activeVersion);
    const currentAnnotations = extractAnnotations(activeVersion);
    const currentItemStatus = itemStatuses[selectedItemIndex]?.status;

    const allDecided = items.length > 0 && items.every((_, idx) => !!itemStatuses[idx]?.status);

    const conflictCount = items.filter(it => it.isConflict).length;
    const nonConflictCount = items.filter(it => !it.isConflict).length;

    const handleApproveItem = () => {
        if (currentItem.isConflict && selectedVersionIndex === null) {
            setIsConflictModalOpen(true);
            return;
        }
        setItemStatuses(prev => ({
            ...prev,
            [selectedItemIndex]: { status: 'approved', versionIndex: selectedVersionIndex ?? 0 }
        }));
        if (selectedItemIndex < items.length - 1) {
            setSelectedItemIndex(prev => prev + 1);
            setSelectedVersionIndex(null);
        }
    };

    const handleRejectItem = () => {
        setItemStatuses(prev => ({
            ...prev,
            [selectedItemIndex]: { status: 'rejected', versionIndex: selectedVersionIndex ?? 0 }
        }));
        if (selectedItemIndex < items.length - 1) {
            setSelectedItemIndex(prev => prev + 1);
            setSelectedVersionIndex(null);
        }
    };

    const handleSubmitReview = async () => {
        try {
            setLoading(true);

            const approvedItems = items.map((it, idx) => {
                const decision = itemStatuses[idx];
                if (decision?.status !== 'approved') return null;
                const vIdx = decision.versionIndex ?? 0;
                const version = it.isConflict ? (it.versions?.[vIdx] || it) : it;
                return {
                    taskItemId: version.taskItemId || version.id,
                    annotationId: version.annotationId || version.id,
                    annotatorId: version.userId || version.annotatorId
                };
            }).filter(Boolean);

            const rejectedItems = items.map((it, idx) => {
                const decision = itemStatuses[idx];
                if (decision?.status !== 'rejected') return null;
                const vIdx = decision.versionIndex ?? 0;
                const version = it.isConflict ? (it.versions?.[vIdx] || it) : it;
                return {
                    taskItemId: version.taskItemId || version.id,
                    annotationId: version.annotationId || version.id,
                    annotatorId: version.userId || version.annotatorId
                };
            }).filter(Boolean);

            const reviewPayload = {
                taskId: Number(taskId) || taskId,
                status: 'Completed',
                feedback: reviewData.feedback || 'Review submitted by reviewer',
                approvedItems,
                rejectedItems,
                reviewedAt: new Date().toISOString()
            };
            console.log('[Reviewer] Submitting review to POST /reviews...');
            await api.post('/reviews', reviewPayload);

            const approvedCount = approvedItems.length;
            const rejectedCount = rejectedItems.length;
            alert(`Gửi kết quả Review thành công!\n- Đã phê duyệt: ${approvedCount} ảnh.\n- Đã loại bỏ: ${rejectedCount} phiên bản.`);
            navigate('/reviewer/dashboard');
        } catch (err) {
            console.error('[Reviewer] Submission Error:', err);
            const status = err?.response?.status;
            const msg = err?.response?.data?.message || err?.message || 'Lỗi không xác định';
            alert(`Lỗi khi gửi kết quả review (${status || 'unknown'}): ${msg}`);
        } finally {
            setLoading(false);
        }
    };

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

                <div className="col-span-2 space-y-6">
                    <button
                        onClick={() => navigate('/reviewer/dashboard')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-all"
                    >
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
                                <span className="font-bold text-slate-500">Tổng ảnh (gốc)</span>
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
                            <span className="text-[10px] font-bold text-slate-600">1 ảnh = 1 annotator (đồng thuận)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-600">CONFLICT: hiện tất cả annotator</span>
                        </div>
                    </div>

                    {currentItem.isConflict && (
                        <div className="p-4 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-200">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-4 h-4" />
                                <p className="text-[10px] font-black uppercase">Conflict Detect</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[9px] font-bold opacity-90 uppercase leading-tight mb-3">
                                    Ảnh có nhiều kết quả khác nhau. Hãy chọn phiên bản đúng bên dưới:
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {currentItem.versions?.map((v, vIdx) => (
                                        <button
                                            key={vIdx}
                                            onClick={() => setSelectedVersionIndex(vIdx)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${selectedVersionIndex === vIdx
                                                ? 'bg-white text-rose-600 border-white shadow-md'
                                                : 'bg-rose-500/30 text-rose-100 border-rose-400/30 hover:bg-rose-500/50'
                                                }`}
                                        >
                                            <p className="text-[10px] font-black uppercase">{v.annotatorName}</p>
                                            <p className="text-[8px] font-bold opacity-70 italic">{extractAnnotations(v).length} BBox</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/*Center*/}
                <div className="col-span-8 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[700px] flex flex-col">

                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Review Canvas</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Ảnh #{currentItem.itemIndex + 1} / {task.totalItems}
                                    {currentItem.isConflict && (
                                        <span className="text-rose-500 ml-2 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 animate-pulse">
                                            CONFLICT — Phiên bản: {activeVersion.annotatorName}
                                        </span>
                                    )}
                                    {!currentItem.isConflict && currentItem.consensusCount > 1 && (
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
                                        <button
                                            onClick={handleApproveItem}
                                            className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg shadow-emerald-200 transition-all flex items-center gap-3"
                                        >
                                            <Check className="w-5 h-5" /> Chấp nhận
                                        </button>
                                        <button
                                            onClick={handleRejectItem}
                                            className="px-10 py-5 bg-white border-2 border-slate-100 hover:border-rose-500 hover:text-rose-600 rounded-[1.5rem] font-black uppercase text-[10px] transition-all flex items-center gap-3"
                                        >
                                            <X className="w-5 h-5" /> Loại bỏ
                                        </button>
                                    </>
                                )}
                            </div>

                            {allDecided && (
                                <button
                                    onClick={() => {
                                        const hasRejected = Object.values(itemStatuses).some(s => s.status === 'rejected');
                                        setActionType(hasRejected ? 'reject' : 'approve');
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

                {/* ── Right: Image list ── */}
                <div className="col-span-2 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                            Danh sách ảnh
                        </h3>
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest px-1">
                            Conflict → hiện tất cả annotator
                        </p>
                    </div>

                    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-3 custom-scrollbar">
                        {items.map((item, idx) => (
                            <RightBarThumb
                                key={item.itemIndex}
                                item={item}
                                idx={idx}
                                isSelected={selectedItemIndex === idx}
                                status={itemStatuses[idx]?.status}
                                onClick={() => {
                                    setSelectedItemIndex(idx);
                                    setSelectedVersionIndex(null);
                                    if (item.isConflict) setIsConflictModalOpen(true);
                                }}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* ── Conflict Resolution Modal ── */}
            {isConflictModalOpen && currentItem.isConflict && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full p-12 border border-slate-100 flex gap-8">
                        <div className="flex-1 bg-slate-50 rounded-3xl overflow-hidden relative border border-slate-100 min-h-[400px]">
                            <img src={imageUrl} alt="conflict-preview" className="w-full h-full object-contain" />
                            <BBoxCanvas annotations={currentAnnotations} imgRef={imgRef} imgNaturalSize={imgNaturalSize} />
                        </div>

                        <div className="w-80 flex flex-col">
                            <h2 className="text-2xl font-black text-rose-600 uppercase tracking-tighter mb-2">Resolve Conflict</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ảnh #{currentItem.itemIndex + 1}</p>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                                {currentItem.versions?.map((v, vIdx) => (
                                    <button
                                        key={vIdx}
                                        onClick={() => setSelectedVersionIndex(vIdx)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${selectedVersionIndex === vIdx
                                            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100'
                                            : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-black uppercase ${selectedVersionIndex === vIdx ? 'text-white' : 'text-slate-800'}`}>
                                                {v.annotatorName}
                                            </span>
                                            <CheckCircle2 className={`w-4 h-4 ${selectedVersionIndex === vIdx ? 'text-white' : 'text-slate-200'}`} />
                                        </div>
                                        <div className={`text-[8px] font-bold uppercase tracking-widest ${selectedVersionIndex === vIdx ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {extractAnnotations(v).length} BBoxes • ID: {String(v.annotatorId).slice(0, 8)}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 space-y-3">
                                <button
                                    onClick={() => {
                                        if (selectedVersionIndex !== null) setIsConflictModalOpen(false);
                                        else alert('Vui lòng chọn một phiên bản!');
                                    }}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-2xl"
                                >
                                    Confirm Choice
                                </button>
                                <button
                                    onClick={() => {
                                        setIsConflictModalOpen(false);
                                        setSelectedVersionIndex(null);
                                    }}
                                    className="w-full py-4 text-slate-400 font-black uppercase text-[10px]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Feedback Modal ── */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 text-center border border-slate-100">
                        <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-100">
                            <ArrowRight className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Gửi kết quả Review</h2>
                        <p className="text-slate-400 mb-6 font-bold uppercase text-[9px] tracking-widest leading-relaxed">
                            Duyệt {Object.values(itemStatuses).filter(s => s.status === 'approved').length} ảnh •
                            Loại bỏ {Object.values(itemStatuses).filter(s => s.status === 'rejected').length} phiên bản
                        </p>
                        <textarea
                            value={reviewData.feedback}
                            onChange={e => setReviewData(prev => ({ ...prev, feedback: e.target.value }))}
                            placeholder="Ghi chú / nhận xét (tuỳ chọn)..."
                            className="w-full border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 resize-none mb-8 focus:outline-none focus:border-blue-300"
                            rows={3}
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="flex-1 py-5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-[1.5rem] font-black uppercase text-[10px] transition-all"
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleSubmitReview}
                                className="flex-[2] py-5 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl shadow-blue-200 font-black uppercase text-[10px] hover:bg-blue-700 transition-all"
                            >
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
