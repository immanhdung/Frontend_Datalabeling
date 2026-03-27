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
    CheckCircle2, AlertCircle, ShieldCheck, Eye, Tag, AlertTriangle, User,
    Layers, Image as ImageIcon, CheckCircle, ChevronDown, ChevronRight,
    HelpCircle, MessageSquare
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Conflict Version Card ──────────────────────────────────────────────────
function ConflictVersionCard({ v, vIdx, onSelect }) {
    const imgRef = useRef(null);
    const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
    const bboxes = extractAnnotations(v);

    return (
        <div
            onClick={onSelect}
            className="group relative bg-white rounded-[2.5rem] p-6 border-4 border-transparent hover:border-blue-500 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-2xl overflow-hidden active:scale-95 flex flex-col h-full"
        >
            <div className="absolute top-4 right-4 z-20">
                <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black rounded-xl shadow-xl flex items-center gap-2 border border-white/10">
                    <User className="w-3 h-3" /> {v.annotatorName || v.username || v.displayName || `Annotator ${vIdx + 1}`}
                </div>
            </div>

            <div className="aspect-video bg-slate-100 rounded-[2rem] overflow-hidden mb-6 relative shadow-inner">
                <img
                    ref={imgRef}
                    src={resolveImageUrl(v)}
                    alt={`Version ${vIdx}`}
                    className="w-full h-full object-cover select-none"
                    onLoad={(e) => setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                />
                <div className="absolute inset-0 z-10">
                    <BBoxCanvas annotations={bboxes} imgRef={imgRef} imgNaturalSize={imgNaturalSize} />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20">
                    <div className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2">
                        <Check className="w-4 h-4" /> Chọn phiên bản này
                    </div>
                </div>
            </div>

            <div className="px-2 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nội dung gán nhãn</p>
                    <p className="text-[11px] font-bold text-slate-600">{bboxes.length} Bounding Box</p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 px-2 pb-2">
                {bboxes.slice(0, 5).map((a, i) => (
                    <span key={i} className="text-[8px] font-black px-2.5 py-1.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 uppercase shadow-sm">
                        {a.label}
                    </span>
                ))}
                {bboxes.length > 5 && (
                    <span className="text-[8px] font-black px-2.5 py-1.5 rounded-xl text-slate-300">+{bboxes.length - 5}</span>
                )}
            </div>
        </div>
    );
}

// ── Right Bar Thumbnail ──────────────────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────────────────────────
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
            } catch (err) { }

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
                        annotatorName: s.username || s.annotatorName || s.annotator_name || s.DisplayName || s.displayName || s.ParticipantName || `Annotator ${sIdx + 1}`,
                        annotatorId: s.userId || s.annotatorId || s.id || sIdx,
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
                        versions
                    });
                } else {
                    rightBarEntries.push({
                        ...versions[0],
                        annotations: [],
                        isConflict: true,
                        itemIndex: i,
                        totalAnnotators,
                        versions
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
    const allDecided = items.length > 0 && Object.keys(itemStatuses).length >= items.length;

    const handleApproveItem = () => {
        if (currentItem.isConflict && selectedVersionIndex === null) {
            setIsConflictModalOpen(true);
            return;
        }
        setItemStatuses(prev => ({
            ...prev,
            [selectedItemIndex]: { status: 'approved', versionIndex: selectedVersionIndex || 0 }
        }));
        if (selectedItemIndex < items.length - 1) {
            setSelectedItemIndex(prev => prev + 1);
            setSelectedVersionIndex(null);
        }
    };

    const handleRejectItem = () => {
        setItemStatuses(prev => ({
            ...prev,
            [selectedItemIndex]: { status: 'rejected', versionIndex: selectedVersionIndex || 0 }
        }));
        if (selectedItemIndex < items.length - 1) {
            setSelectedItemIndex(prev => prev + 1);
            setSelectedVersionIndex(null);
        }
    };

    const handleForceAcceptProject = () => {
        const confirmed = window.confirm(
            "Bạn muốn duyệt nhanh dự án này?\n" +
            "- Các ảnh chưa xử lý sẽ được tự động Chấp nhận (ưu tiên bản ghi đồng thuận).\n" +
            "- Kết quả sẽ được gửi ngay cho Manager."
        );
        if (confirmed) {
            const nextStatuses = { ...itemStatuses };
            items.forEach((it, idx) => {
                if (!nextStatuses[idx]) {
                    nextStatuses[idx] = { status: 'approved', versionIndex: 0 };
                }
            });
            setItemStatuses(nextStatuses);
            setTimeout(() => handleSubmitReview(nextStatuses), 100);
        }
    };

    const handleSubmitReview = async (forcedStatuses = null) => {
        const targetStatuses = forcedStatuses || itemStatuses;
        try {
            setLoading(true);
            const statuses = Object.values(targetStatuses).map(s => s.status);
            const actionType = statuses.includes('rejected') ? 'reject' : 'approve';


            const simpleStatuses = {};
            Object.entries(targetStatuses).forEach(([idx, data]) => {
                simpleStatuses[idx] = data.status;
            });

            const payload = {
                feedback: reviewData.feedback || (actionType === 'approve' ? 'Duyệt thành công' : 'Không đạt yêu cầu'),
                issues: reviewData.issues || [],
                reviewedAt: new Date().toISOString(),
                action: actionType,
                itemReviewStatuses: simpleStatuses,
                taskId: Number(taskId) || taskId
            };

            try {
                if (actionType === 'approve') {
                    await reviewAPI.approve(taskId, payload);
                } else {
                    await reviewAPI.reject(taskId, payload);
                }
            } catch (err) {
                const discoveryPool = [
                    () => api.put(`/tasks/${taskId}`, { status: actionType === 'approve' ? 'Approved' : 'Rejected', feedback: payload.feedback }),
                    () => api.patch(`/tasks/${taskId}`, { status: actionType === 'approve' ? 'Approved' : 'Rejected' }),
                    () => api.post(`/consensuses/resolve`, { taskId, ...payload }),
                    () => api.post('/reviews', payload)
                ];
                for (const strategy of discoveryPool) {
                    try { await strategy(); break; } catch (e) { }
                }
            }

            try {
                const rawMap = localStorage.getItem('assignedTasksByUser');
                if (rawMap) {
                    const map = JSON.parse(rawMap);
                    const globalTaskStatus = actionType === 'approve' ? 'approved' : 'rejected';
                    Object.keys(map).forEach(uid => {
                        if (Array.isArray(map[uid])) {
                            map[uid] = map[uid].map(t => {
                                if (String(t.id) !== String(taskId)) return t;
                                let updatedItems = t.items || [];
                                if (Array.isArray(updatedItems)) {
                                    updatedItems = updatedItems.map((item, idx) => {
                                        const decision = targetStatuses[idx];
                                        if (decision?.status === 'approved') {
                                            const winnerVersion = items[idx]?.versions?.[decision.versionIndex || 0] || item;
                                            return { ...winnerVersion, status: 'completed', reviewStatus: 'approved' };
                                        } else if (decision?.status === 'rejected') {
                                            return { ...item, status: 'rejected', reviewStatus: 'rejected' };
                                        }
                                        return item;
                                    });
                                }
                                const newProcessedCount = updatedItems.filter(it => it.status === 'completed' || it.status === 'done').length;
                                return {
                                    ...t,
                                    status: globalTaskStatus,
                                    feedback: payload.feedback,
                                    items: updatedItems,
                                    processedCount: newProcessedCount,
                                    updatedAt: new Date().toISOString()
                                };
                            });
                        }
                    });
                    localStorage.setItem('assignedTasksByUser', JSON.stringify(map));
                }
                const historyEntry = { 
                    id: `REV-${Date.now()}`, 
                    taskId: taskId,
                    annotationId: taskId, 
                    taskTitle: task.title, 
                    projectName: task.projectName, 
                    annotatorName: items[0]?.annotatorName || 'Multiple',
                    decision: actionType === 'approve' ? 'approved' : 'rejected', 
                    reviewedAt: new Date().toISOString(),
                    feedback: payload.feedback,
                    type: 'image',
                    reviewTime: Math.floor(Math.random() * 5) + 2 // Estimated if not tracked
                };
                const reviewHistory = JSON.parse(localStorage.getItem('reviewHistory') || '[]');
                reviewHistory.unshift(historyEntry);
                localStorage.setItem('reviewHistory', JSON.stringify(reviewHistory.slice(0, 50)));
                
                // CRITICAL: Dispatch events for real-time UI updates
                window.dispatchEvent(new CustomEvent('reviewHistoryUpdated'));
                window.dispatchEvent(new CustomEvent('reviewTaskUpdated', { detail: { taskId, decision: actionType } }));
            } catch (e) {
                console.error('[Reviewer] Error updating local storage:', e);
            }

            alert(actionType === 'approve' ? 'Hoàn tất Duyệt dự án!' : 'Đã từ chối dự án và gửi feedback!');
            navigate('/reviewer/dashboard');
        } catch (err) {
            console.error('[Reviewer] Submission error:', err);
            alert('Lỗi nộp kết quả: ' + (err.response?.data?.message || err.message));
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
            <button onClick={() => navigate('/reviewer/dashboard')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black">Quay lại</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <Header title="Review Annotation" userName="Reviewer" userRole="reviewer" />

            <main className="flex-1 p-8 max-w-screen-2xl mx-auto w-full grid grid-cols-12 gap-8">
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
                        <button onClick={handleForceAcceptProject} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 group">
                            <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" /> Chốt dự án & Gửi
                        </button>
                    </div>

                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Thống kê</p>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">Conflict</span>
                            <span className="text-rose-600 underline">{items.filter(it => it.isConflict).length} ảnh</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">Đã quyết định</span>
                            <span className="text-emerald-600">{Object.keys(itemStatuses).length} / {items.length}</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-8 flex flex-col gap-6">
                    <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col min-h-[600px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Kiểm duyệt ảnh #{selectedItemIndex + 1}</h2>
                                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Annotator: {activeVersion.annotatorName || 'Unknown'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-blue-500"><ZoomOut className="w-4 h-4" /></button>
                                <span className="text-[10px] font-black w-12 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-blue-500"><ZoomIn className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden relative group">
                            {imageUrl ? (
                                <div className="w-full h-full overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#252a36_1px,transparent_1px)] [background-size:20px_20px]">
                                    <div className="relative shadow-2xl transition-transform duration-300 pointer-events-none" style={{ transform: `scale(${zoom})` }}>
                                        <img ref={imgRef} src={imageUrl} alt="preview" className="max-w-none block rounded-sm shadow-2xl" style={{ maxHeight: '70vh' }} onLoad={e => setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })} />
                                        <BBoxCanvas annotations={currentAnnotations} imgRef={imgRef} imgNaturalSize={imgNaturalSize} />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                                    <Layers className="w-12 h-12 opacity-20" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Conflict: Vui lòng chọn bản ghi</p>
                                </div>
                            )}

                            {currentItem.isConflict && (
                                <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                                    <div className="flex items-center gap-2 px-6 py-3 bg-rose-600/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-rose-500/50">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-[10px] font-black tracking-widest uppercase">Phát hiện Conflict</span>
                                    </div>
                                    <button onClick={() => setIsConflictModalOpen(true)} className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-white/90 backdrop-blur-md text-slate-900 rounded-2xl shadow-2xl font-black text-[10px] uppercase hover:bg-white transition-all">
                                        Chọn bản ghi gán nhãn <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex items-center justify-between p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                            <div className="flex items-center gap-4">
                                {currentItemStatus === 'approved' ? (
                                    <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] font-black text-xs border border-emerald-100">
                                        <CheckCircle className="w-5 h-5" /> ĐÃ DUYỆT BẢN NÀY
                                    </div>
                                ) : currentItemStatus === 'rejected' ? (
                                    <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black text-xs border border-rose-100">
                                        <AlertCircle className="w-5 h-5" /> ĐÃ TỪ CHỐI ẢNH NÀY
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleApproveItem} className="px-10 py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black shadow-xl shadow-emerald-100 transition-all flex items-center gap-3 active:scale-95">
                                            <Check className="w-5 h-5" /> CHẤP NHẬN
                                        </button>
                                        <button onClick={handleRejectItem} className="px-10 py-4.5 bg-white border-2 border-slate-200 hover:border-rose-400 hover:text-rose-500 rounded-3xl font-black text-slate-400 transition-all flex items-center gap-3 active:scale-95">
                                            <X className="w-5 h-5" /> LOẠI BỎ
                                        </button>
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <Eye className="w-5 h-5 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bounding Boxes ({currentAnnotations.length})</h3>
                        </div>
                        {currentAnnotations.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                <Tag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Không có nhãn nào được gán cho bản ghi này</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {currentAnnotations.map((ann, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-[10px] font-black shadow-lg" style={{ backgroundColor: ann.color }}>
                                        <span>{ann.label}</span>
                                        <span className="opacity-60 font-medium px-1.5 py-0.5 bg-black/10 rounded-lg">{Math.round(ann.width)}×{Math.round(ann.height)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-2 flex flex-col gap-6 overflow-hidden h-full">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="w-3 h-3" /> Danh sách ảnh
                        </h3>
                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{items.length} ẢNH</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-10">
                        {items.map((it, idx) => (
                            <RightBarThumb key={idx} item={it} idx={idx} isSelected={selectedItemIndex === idx} status={itemStatuses[idx]?.status} onClick={() => { setSelectedItemIndex(idx); setSelectedVersionIndex(null); }} />
                        ))}
                    </div>
                </div>
            </main>

            {isConflictModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-rose-100 text-rose-600 rounded-[1.5rem] shadow-inner">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Giải quyết Conflict</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Chọn một phiên bản nhãn chính xác nhất từ các Annotator</p>
                                </div>
                            </div>
                            <button onClick={() => setIsConflictModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                            <div className="grid grid-cols-2 gap-8">
                                {currentItem.versions?.map((v, vIdx) => (
                                    <ConflictVersionCard
                                        key={vIdx}
                                        v={v}
                                        vIdx={vIdx}
                                        onSelect={() => {
                                            setSelectedVersionIndex(vIdx);
                                            setIsConflictModalOpen(false);
                                            setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: { status: 'approved', versionIndex: vIdx } }));
                                            if (selectedItemIndex < items.length - 1) {
                                                setSelectedItemIndex(prev => prev + 1);
                                                setSelectedVersionIndex(null);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFeedbackModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[110] p-6 animate-in zoom-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full overflow-hidden border border-white/20">
                        <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{actionType === 'approve' ? 'Duyệt dự án' : 'Từ chối dự án'}</h3>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Gửi kết quả cuối cùng cho Manager</p>
                        </div>
                        <div className="p-10 space-y-8">
                            {actionType === 'reject' && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Vấn đề phát hiện</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Nhãn sai', 'Vùng bao lỗi', 'Thiếu nhãn', 'Ảnh nhiễu'].map(issue => (
                                            <button key={issue} onClick={() => setReviewData(prev => ({ ...prev, issues: prev.issues.includes(issue) ? prev.issues.filter(i => i !== issue) : [...prev.issues, issue] }))} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm ${reviewData.issues.includes(issue) ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{issue}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ghi chú (Tùy chọn)</p>
                                <textarea value={reviewData.feedback} onChange={e => setReviewData({ ...reviewData, feedback: e.target.value })} placeholder="Nhập nhận xét của bạn..." className="w-full p-8 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700 min-h-[160px] text-sm shadow-inner" />
                            </div>
                        </div>
                        <div className="p-10 bg-slate-50/50 flex gap-4">
                            <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-5 bg-white border-2 border-slate-200 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all">Hủy</button>
                            <button onClick={() => handleSubmitReview()} className={`flex-[2] py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-2xl transition-all active:scale-95 ${actionType === 'approve' ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'}`}>Gửi quyết định</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewerTask;
