import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewAPI } from '../../config/api';
import Header from '../../components/common/Header';
import { processTaskConsensus } from '../../utils/annotatorTaskHelpers';
import {
    ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Check, X,
    FileText, Image as ImageIcon, Calendar, CheckCircle2,
    AlertCircle, Tag, Eye,
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

/**
 * Extracts bounding box annotations from an item regardless of nesting.
 * Returns array of { label, x, y, width, height, color }
 */
function extractAnnotations(item) {
    if (!item) return [];

    // Prioritize direct annotations from specific annotators if available
    const rawList =
        item.annotations ||
        item.Annotations ||
        item.payload?.bboxes ||
        item.payload?.boundingBoxes ||
        item.bboxes ||
        item.boundingBoxes ||
        item.labels ||
        [];

    if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map((a, idx) => {
            const label = a.label || a.labelName || a.name || a.category || 'Object';
            // Support both flat and nested bbox formats
            // Use Pixel coordinates ideally
            const x = a.x ?? a.left ?? (Array.isArray(a.bbox) ? a.bbox[0] : undefined) ?? 0;
            const y = a.y ?? a.top ?? (Array.isArray(a.bbox) ? a.bbox[1] : undefined) ?? 0;
            const width = a.width ?? a.w ?? (Array.isArray(a.bbox) ? a.bbox[2] : undefined) ?? 0;
            const height = a.height ?? a.h ?? (Array.isArray(a.bbox) ? a.bbox[3] : undefined) ?? 0;
            const color = a.color || getLabelColor(label, idx);
            return { label, x, y, width, height, color };
        }).filter(a => a.width > 0 && a.height > 0);
    }
    
    // Fallback for single classification-type task (though this component is mostly for bboxes)
    if (item.classification || item.label) {
       return [{
           label: item.classification || item.label,
           x: 0, y: 0, width: 0, height: 0, color: getLabelColor(item.classification || item.label, 0)
       }];
    }

    return [];
}

// ── Canvas Component ───────────────────────────────────────────────────────────
function BBoxCanvas({ annotations, imgRef, imgNaturalSize }) {
    const canvasRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        // Size canvas to match the DISPLAYED image (not natural size)
        const dispW = img.clientWidth;
        const dispH = img.clientHeight;
        const natW = img.naturalWidth || imgNaturalSize.w || 1;
        const natH = img.naturalHeight || imgNaturalSize.h || 1;

        canvas.width = dispW;
        canvas.height = dispH;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, dispW, dispH);

        if (!annotations || annotations.length === 0) return;

        // Scale factor: pixel coords stored at natural size → displayed size
        const scaleX = dispW / natW;
        const scaleY = dispH / natH;

        annotations.forEach((ann) => {
            const x = ann.x * scaleX;
            const y = ann.y * scaleY;
            const w = ann.width * scaleX;
            const h = ann.height * scaleY;
            const color = ann.color;

            // Fill
            ctx.fillStyle = color + '28';
            ctx.fillRect(x, y, w, h);

            // Border
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            // Corner accents
            const cs = 7;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, cs, 2.5); ctx.fillRect(x, y, 2.5, cs);
            ctx.fillRect(x + w - cs, y, cs, 2.5); ctx.fillRect(x + w - 2.5, y, 2.5, cs);
            ctx.fillRect(x, y + h - 2.5, cs, 2.5); ctx.fillRect(x, y + h - cs, 2.5, cs);
            ctx.fillRect(x + w - cs, y + h - 2.5, cs, 2.5); ctx.fillRect(x + w - 2.5, y + h - cs, 2.5, cs);

            // Label badge
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
    }, [annotations, imgNaturalSize]);

    // Redraw whenever annotations or image size changes
    useEffect(() => { draw(); }, [draw]);

    // Also redraw on window resize
    useEffect(() => {
        window.addEventListener('resize', draw);
        return () => window.removeEventListener('resize', draw);
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
        />
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const ReviewerTask = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [task, setTask] = useState({ id: taskId, title: 'Loading...', projectName: 'Processing...' });
    const [annotations, setAnnotations] = useState([]);   // array of annotator submissions
    const [items, setItems] = useState([]);               // flat item list to display
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
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

            let allFoundAnns = [];
            let taskMeta = null;

            // 1. Try API
            try {
                const response = await reviewAPI.getAnnotationForReview(taskId);
                const data = response.data.data || response.data;
                allFoundAnns = Array.isArray(data) ? data : (data.annotations || [data]);
                if (data.task) taskMeta = data.task;
            } catch (err) {
                console.warn('[ReviewerTask] API failed, using localStorage');
            }

            // 2. Discover from localStorage
            try {
                const rawMap = localStorage.getItem('assignedTasksByUser');
                if (rawMap) {
                    const map = JSON.parse(rawMap);
                    const rawSubmissions = [];

                    Object.entries(map).forEach(([uid, userTasks]) => {
                        if (!Array.isArray(userTasks)) return;
                        const mt = userTasks.find(t => String(t.id) === String(taskId));
                        if (mt && ['completed', 'pending_review', 'done', 'submitted'].includes(mt.status)) {
                            rawSubmissions.push({ uid, task: mt });
                        }
                    });

                    // Re-trigger consensus if needed
                    const totalExpected = rawSubmissions[0]?.task?.totalAnnotators || 3;
                    if (rawSubmissions.length >= totalExpected && !rawSubmissions.some(s => s.task.isConsensusWinner)) {
                        processTaskConsensus(taskId);
                        const updatedMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
                        rawSubmissions.forEach(rs => {
                            const uTasks = updatedMap[rs.uid] || [];
                            const updated = uTasks.find(it => String(it.id) === String(taskId));
                            if (updated) rs.task = updated;
                        });
                    }

                    // Prefer consensus winner
                    let targetSubmissions = rawSubmissions;
                    const winner = rawSubmissions.find(s => s.task.isConsensusWinner);
                    if (winner) targetSubmissions = [winner];

                    let collectedItems = [];
                    const discoveredAnns = [];

                    targetSubmissions.forEach(({ uid, task: matchedTask }) => {
                        if (Array.isArray(matchedTask.items)) {
                            collectedItems = matchedTask.items;
                        }
                        discoveredAnns.push({
                            id: `ANN-${uid}-${taskId}`,
                            annotatorName: `Annotator ${uid.slice(0, 4)}`,
                            isConsensusWinner: matchedTask.isConsensusWinner,
                            rawItems: matchedTask.items || [],
                            status: 'pending_review',
                            createdAt: matchedTask.updatedAt || new Date().toISOString(),
                        });
                        if (!taskMeta) taskMeta = matchedTask;
                    });

                    setItems(collectedItems);

                    discoveredAnns.forEach(da => {
                        if (!allFoundAnns.some(aa => String(aa.id) === String(da.id))) {
                            allFoundAnns.push(da);
                        }
                    });
                }
            } catch (e) { console.error('Local discovery error', e); }

            if (allFoundAnns.length === 0) {
                setError('Không tìm thấy dữ liệu gán nhãn nào cho nhiệm vụ này.');
                return;
            }

            setAnnotations(allFoundAnns);
            if (taskMeta) {
                setTask({
                    id: taskMeta.id,
                    title: taskMeta.title || taskMeta.name || `Nhiệm vụ #${String(taskId).slice(0, 8)}`,
                    type: taskMeta.type || 'image',
                    status: 'pending_review',
                    projectName: taskMeta.projectName || 'Dự án Hệ thống',
                    deadline: taskMeta.dueDate || taskMeta.deadline,
                });
            }
        } catch (err) {
            setError(err.message || 'Không thể tải dữ liệu review');
        } finally {
            setLoading(false);
        }
    };

    // ── Derived data for current item ─────────────────────────────────────────
    const currentItem = items[selectedItemIndex] || {};
    const imageUrl = resolveImageUrl(currentItem);

    // ✅ KEY FIX: extract annotations from the current item directly
    const currentAnnotations = extractAnnotations(
        // Also check rawItems from the first annotator submission (fallback)
        currentItem.annotations?.length > 0
            ? currentItem
            : (annotations[0]?.rawItems?.[selectedItemIndex] || currentItem)
    );

    const consensus = (() => {
        const annCount = task.annotatorCount || 3;
        if (annotations.length === 1) {
            const it = annotations[0].rawItems?.[selectedItemIndex] || {};
            const val = it.classification || currentAnnotations[0]?.label || 'Unlabeled';
            return { type: 'majority', label: val, count: annCount };
        }
        const it = annotations[0]?.rawItems?.[selectedItemIndex] || {};
        const val = it.classification || currentAnnotations[0]?.label || 'Unlabeled';
        return { type: 'majority', label: val, count: annCount };
    })();

    const currentItemStatus = itemStatuses[selectedItemIndex];
    const allDecided = items.length > 0 && Object.keys(itemStatuses).length >= items.length;

    const handleApproveItem = () => {
        setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'approved' }));
        if (selectedItemIndex < items.length - 1) setSelectedItemIndex(i => i + 1);
    };

    const handleRejectItem = () => {
        setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'rejected' }));
        setActionType('reject');
        setShowFeedbackModal(true);
    };

    const handleOpenFeedbackModal = (type) => {
        setActionType(type);
        setShowFeedbackModal(true);
    };

    const handleIssueToggle = (issue) => {
        setReviewData(prev => ({
            ...prev,
            issues: prev.issues.includes(issue)
                ? prev.issues.filter(i => i !== issue)
                : [...prev.issues, issue],
        }));
    };

    const handleSubmitReview = async () => {
        try {
            if (actionType === 'reject' && !reviewData.feedback.trim() && reviewData.issues.length === 0) {
                alert('Vui lòng cung cấp feedback hoặc chọn vấn đề trước khi từ chối');
                return;
            }

            const payload = {
                feedback: reviewData.feedback,
                issues: reviewData.issues,
                reviewedAt: new Date().toISOString(),
                action: actionType,
            };

            try {
                if (actionType === 'approve') await reviewAPI.approve(taskId, payload);
                else if (actionType === 'reject') await reviewAPI.reject(taskId, payload);
            } catch (e) { /* offline ok */ }

            // Sync to localStorage
            try {
                const rawMap = localStorage.getItem('assignedTasksByUser');
                if (rawMap) {
                    const map = JSON.parse(rawMap);
                    const newStatus = actionType === 'approve' ? 'approved' : 'rejected';
                    Object.keys(map).forEach(uid => {
                        if (Array.isArray(map[uid])) {
                            map[uid] = map[uid].map(t =>
                                String(t.id) === String(taskId)
                                    ? { ...t, status: newStatus, feedback: reviewData.feedback || undefined }
                                    : t
                            );
                        }
                    });
                    localStorage.setItem('assignedTasksByUser', JSON.stringify(map));
                }
            } catch (e) { /* ignore */ }

            const msg = actionType === 'approve' ? 'Đã duyệt thành công!' : 'Đã từ chối và gửi feedback!';
            alert(msg);
            navigate('/reviewer/dashboard');
        } catch (err) {
            alert(err.response?.data?.message || 'Không thể thực hiện yêu cầu');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu review...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-red-100 max-w-lg text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Lỗi tải dữ liệu</h2>
                <p className="text-gray-600 mb-8 font-medium">{error}</p>
                <button onClick={() => navigate('/reviewer/dashboard')} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all uppercase tracking-widest text-sm shadow-lg shadow-blue-100">
                    Quay lại Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header title="Review Annotation" userName="Reviewer" userRole="reviewer" />

            <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate('/reviewer/dashboard')}
                    className="mb-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-black uppercase text-xs tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại Dashboard
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ── Left Sidebar ─────────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Task Info */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">THÔNG TIN</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Dự án</p>
                                    <p className="text-xs font-bold text-slate-700 uppercase">{task.projectName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tiêu đề</p>
                                    <p className="text-xs font-bold text-slate-700">{task.title}</p>
                                </div>
                                {task.deadline && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hạn chót</p>
                                        <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-orange-400" />
                                            {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Consensus */}
                        <div className="bg-slate-900 rounded-2xl p-5 text-white">
                            <p className="text-[8px] font-black uppercase text-slate-500 mb-3 tracking-widest">Trạng thái đồng thuận</p>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-black text-[10px] uppercase">ĐỒNG THUẬN ({consensus.count}/{task.annotatorCount || 3})</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-2">Đang xem nhóm</p>
                                <p className="text-xs font-black text-blue-400 font-mono tracking-tighter truncate">
                                    {annotations[0]?.annotatorName || 'Annotator'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Center: Image Viewer ──────────────────────────────── */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">XEM CHI TIẾT BẢN GÁN NHÃN</h2>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        ẢNH {selectedItemIndex + 1} / {items.length} • ANNOTATOR
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl">
                                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600">
                                        <ZoomOut className="w-4 h-4" />
                                    </button>
                                    <span className="text-[10px] font-black w-10 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600">
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* ✅ Image + Canvas overlay */}
                            <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden relative min-h-[450px]">
                                {imageUrl ? (
                                    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                                        <div
                                            className="relative inline-block"
                                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                        >
                                            <img
                                                ref={imgRef}
                                                src={imageUrl}
                                                alt="annotation"
                                                className="max-w-none select-none block shadow-2xl rounded-sm"
                                                style={{ maxHeight: '600px' }}
                                                onLoad={e => {
                                                    setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                                                }}
                                                draggable={false}
                                            />
                                            {/* ✅ Canvas overlay for bounding boxes */}
                                            <BBoxCanvas
                                                annotations={currentAnnotations}
                                                imgRef={imgRef}
                                                imgNaturalSize={imgNaturalSize}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                                        Không có nội dung hiển thị
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {currentItemStatus === 'approved' ? (
                                        <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black shadow-sm">
                                            <CheckCircle2 className="w-5 h-5" /> ĐÃ DUYỆT ẢNH NÀY
                                        </div>
                                    ) : currentItemStatus === 'rejected' ? (
                                        <div className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black shadow-sm">
                                            <AlertCircle className="w-5 h-5" /> ĐÃ TỪ CHỐI ẢNH NÀY
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleApproveItem}
                                                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                                            >
                                                <Check className="w-5 h-5" /> DUYỆT ẢNH NÀY
                                            </button>
                                            <button
                                                onClick={handleRejectItem}
                                                className="px-8 py-3.5 bg-white border-2 border-slate-200 hover:border-rose-500 hover:text-rose-600 rounded-2xl font-black transition-all flex items-center gap-2"
                                            >
                                                <X className="w-5 h-5" /> TỪ CHỐI ẢNH NÀY
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {allDecided && (
                                    <button
                                        onClick={() => handleOpenFeedbackModal(
                                            Object.values(itemStatuses).includes('rejected') ? 'reject' : 'approve'
                                        )}
                                        className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black shadow-2xl transition-all flex items-center gap-3 active:scale-95"
                                    >
                                        GỬI KẾT QUẢ KIỂM DUYỆT <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* ✅ Annotation list below image */}
                            <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Bounding Boxes ({currentAnnotations.length})
                                        </p>
                                    </div>
                                    <p className="text-[10px] font-black text-blue-500 uppercase">
                                        {currentAnnotations.length} đối tượng
                                    </p>
                                </div>

                                {currentAnnotations.length === 0 ? (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Tag className="w-4 h-4 opacity-40" />
                                        <p className="text-xs font-medium">Ảnh này chưa có nhãn nào được gán</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {currentAnnotations.map((ann, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm"
                                                style={{ backgroundColor: ann.color }}
                                            >
                                                <span>{ann.label}</span>
                                                <span className="opacity-70 text-[10px]">
                                                    {Math.round(ann.width)}×{Math.round(ann.height)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Right Sidebar: Image List ─────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">DANH SÁCH ẢNH</h3>
                            </div>

                            <div className="space-y-3 overflow-y-auto max-h-[700px] pr-1">
                                {items.map((item, idx) => {
                                    const annCount = extractAnnotations(
                                        annotations[0]?.rawItems?.[idx] || item
                                    ).length;
                                    const status = itemStatuses[idx];
                                    const rawItem = annotations[0]?.rawItems?.[idx] || item;
                                    const consensusCount = rawItem.consensusCount;
                                    const totalAnnotators = rawItem.totalAnnotators || task.annotatorCount || 3;
                                    
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedItemIndex(idx)}
                                            className={`w-full relative group transition-all rounded-xl overflow-hidden border-2 ${selectedItemIndex === idx
                                                ? 'border-blue-500 shadow-lg'
                                                : status === 'approved'
                                                    ? 'border-emerald-400'
                                                    : status === 'rejected'
                                                        ? 'border-rose-400'
                                                        : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                        >
                                            <img
                                                src={resolveImageUrl(item)}
                                                alt={`Item ${idx}`}
                                                className="w-full h-24 object-cover bg-slate-100"
                                                onError={e => { e.target.style.display = 'none'; }}
                                            />
                                            <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                                                #{idx + 1}
                                            </div>
                                            {/* Bbox count badge */}
                                            {annCount > 0 && (
                                                <div className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                                    {annCount} bbox
                                                </div>
                                            )}
                                            {/* Agreement Badge */}
                                            {consensusCount !== undefined && (
                                                <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black border ${
                                                    consensusCount === totalAnnotators 
                                                        ? 'bg-emerald-500 text-white border-emerald-400' 
                                                        : consensusCount >= 2 
                                                            ? 'bg-amber-400 text-white border-amber-300' 
                                                            : 'bg-rose-500 text-white border-rose-400'
                                                }`}>
                                                    {consensusCount}/{totalAnnotators}
                                                </div>
                                            )}
                                            {/* Status badge */}
                                            {status === 'approved' && (
                                                <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}
                                            {status === 'rejected' && (
                                                <div className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                                                    <X className="w-3 h-3" />
                                                </div>
                                            )}
                                            {selectedItemIndex === idx && !status && (
                                                <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden">
                        <div className="p-8 border-b border-slate-100">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                                {actionType === 'approve' ? 'XÁC NHẬN DUYỆT' : 'TỪ CHỐI BẢN GÁN NHÃN'}
                            </h3>
                        </div>

                        <div className="p-8 space-y-6">
                            {actionType === 'reject' && (
                                <div className="grid grid-cols-1 gap-2">
                                    {['Nhãn không chính xác', 'Vùng bao sai lệch', 'Phân loại lỗi', 'Thiếu chi tiết'].map(issue => (
                                        <label key={issue} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white hover:border-blue-400 transition-all group">
                                            <input
                                                type="checkbox"
                                                checked={reviewData.issues.includes(issue)}
                                                onChange={() => handleIssueToggle(issue)}
                                                className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-0"
                                            />
                                            <span className="font-black uppercase text-xs text-slate-500 group-hover:text-blue-600">{issue}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            <textarea
                                value={reviewData.feedback}
                                onChange={e => setReviewData({ ...reviewData, feedback: e.target.value })}
                                placeholder="Nhập ý kiến đóng góp hoặc lý do..."
                                className="w-full p-6 bg-slate-50 rounded-2xl border border-slate-100 focus:bg-white focus:border-blue-400 transition-all font-bold text-slate-700 min-h-[150px] outline-none"
                            />
                        </div>

                        <div className="p-8 bg-slate-50 flex gap-4">
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmitReview}
                                className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl transition-all ${actionType === 'approve' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'
                                    }`}
                            >
                                Xác nhận hành động
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewerTask;
