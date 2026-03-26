import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewAPI, annotationAPI } from '../../config/api';
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

// ── Main Component ─────────────────────────────────────────────────────────────
const ReviewerTask = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [task, setTask] = useState({ id: taskId, title: 'Loading...', projectName: 'Processing...' });
    const [items, setItems] = useState([]);
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

            // 1. Gather all unique submissions for this task
            const submissionsMap = new Map();

            // From API
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

            // From Local storage
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
            const expanded = [];

            for (let i = 0; i < rawItemCount; i++) {
                const versions = submissions.map((s, sIdx) => {
                    const it = (s.items || [])[i];
                    if (!it) return null;
                    return {
                        ...it,
                        annotatorName: s.annotatorName || `Annotator ${sIdx + 1}`,
                        annotatorId: s.userId || s.annotatorId || sIdx
                    };
                }).filter(v => v !== null);

                // 1. Label-based fingerprint (Primary)
                const labelFingers = versions.map(v =>
                    extractAnnotations(v).map(a => a.label).sort().join('|') || 'empty'
                );

                // 2. Fuzzy Box-based fingerprint (Secondary) - 20px tolerance
                const fuzzyFingers = versions.map(v => {
                    const anns = extractAnnotations(v);
                    return anns.map(a => {
                        const rx = Math.round(a.x / 20) * 20;
                        const ry = Math.round(a.y / 20) * 20;
                        return `${a.label}_${rx}_${ry}`;
                    }).sort().join('|') || 'empty';
                });

                const distinctLabels = [...new Set(labelFingers)];
                const distinctFuzzy = [...new Set(fuzzyFingers)];

                // Real conflict logic: multiple labels or significantly different boxes
                const isConflict = versions.length > 1 && (distinctLabels.length > 1 || distinctFuzzy.length > 1);

                if (!isConflict && versions.length > 0) {
                    expanded.push({ ...versions[0], isConflict: false, itemIndex: i, consensusCount: versions.length });
                } else {
                    versions.forEach(v => {
                        expanded.push({ ...v, isConflict: true, itemIndex: i });
                    });
                }
            }

            setItems(expanded);
            const taskMeta = submissions[0];
            setTask({
                id: taskId,
                title: taskMeta.title || taskMeta.name || `Task #${String(taskId).slice(0, 8)}`,
                projectName: taskMeta.projectName || 'Dự án',
                totalItems: rawItemCount
            });
        } catch (err) {
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

    const handleApproveItem = () => {
        setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'approved' }));
        if (selectedItemIndex < items.length - 1) setSelectedItemIndex(prev => prev + 1);
    };

    const handleRejectItem = () => {
        setItemStatuses(prev => ({ ...prev, [selectedItemIndex]: 'rejected' }));
        if (selectedItemIndex < items.length - 1) setSelectedItemIndex(prev => prev + 1);
    };

    const handleSubmitReview = async () => {
        try {
            const payload = {
                feedback: reviewData.feedback,
                issues: reviewData.issues,
                action: actionType,
                reviewedAt: new Date().toISOString()
            };

            // Discard rejected
            const rejectedItems = items.filter((_, idx) => itemStatuses[idx] === 'rejected');
            for (const it of rejectedItems) {
                const id = it.id || it.annotationId;
                if (id) await annotationAPI.remove(id).catch(e => console.warn('Discard failed', id));
            }

            if (actionType === 'approve') await reviewAPI.approve(taskId, payload);
            else await reviewAPI.reject(taskId, payload);

            alert(`Duyệt thành công! Đã loại bỏ ${rejectedItems.length} phiên bản lỗi.`);
            navigate('/reviewer/dashboard');
        } catch (err) {
            alert('Lỗi khi gửi kết quả review');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-slate-300">Loading...</div>;
    if (error) return <div className="h-screen flex items-center justify-center font-black uppercase text-rose-500 p-10">{error}</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <Header title="Review Annotation" userName="Reviewer" userRole="reviewer" />
            <main className="flex-1 p-8 max-w-screen-2xl mx-auto w-full grid grid-cols-12 gap-8">
                {/* Left: Info */}
                <div className="col-span-2 space-y-6">
                    <button onClick={() => navigate('/reviewer/dashboard')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-all">
                        <ArrowLeft className="w-3 h-3" /> Dashboard
                    </button>
                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Project</p>
                        <p className="text-sm font-black text-slate-800 mb-4">{task.projectName}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Task</p>
                        <p className="text-xs font-bold text-slate-600 truncate">{task.title}</p>
                    </div>
                </div>

                {/* Center: Viewer */}
                <div className="col-span-8 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[700px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Review Canvas</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Item #{currentItem.itemIndex + 1} / {task.totalItems}
                                    {currentItem.isConflict && <span className="text-rose-500 ml-2">[{currentItem.annotatorName}]</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-3 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"><ZoomOut className="w-4 h-4" /></button>
                                <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-3 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"><ZoomIn className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-900 rounded-[2rem] overflow-hidden relative shadow-inner">
                            <div className="absolute inset-0 overflow-auto flex items-center justify-center p-10">
                                <div className="relative inline-block transition-transform duration-200" style={{ transform: `scale(${zoom})` }}>
                                    <img ref={imgRef} src={imageUrl} alt="img" className="max-w-none shadow-2xl rounded-lg" onLoad={e => setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })} />
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
                                        <button onClick={handleApproveItem} className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg shadow-emerald-200 transition-all flex items-center gap-3"><Check className="w-5 h-5" /> Chấp nhận</button>
                                        <button onClick={handleRejectItem} className="px-10 py-5 bg-white border-2 border-slate-100 hover:border-rose-500 hover:text-rose-600 rounded-[1.5rem] font-black uppercase text-[10px] transition-all flex items-center gap-3"><X className="w-5 h-5" /> Loại bỏ</button>
                                    </>
                                )}
                            </div>
                            {allDecided && (
                                <button onClick={() => { setActionType(Object.values(itemStatuses).includes('rejected') ? 'reject' : 'approve'); setShowFeedbackModal(true); }} className="px-10 py-5 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-2xl transition-all flex items-center gap-3">
                                    Hoàn tất <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: List */}
                <div className="col-span-2 space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Danh sách ảnh</h3>
                    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-3 custom-scrollbar">
                        {items.map((it, idx) => {
                            const st = itemStatuses[idx];
                            const bboxCount = extractAnnotations(it).length;
                            return (
                                <button key={idx} onClick={() => setSelectedItemIndex(idx)} className={`w-full group relative rounded-[2rem] overflow-hidden border-4 transition-all duration-300 ${selectedItemIndex === idx ? 'border-blue-500 shadow-2xl scale-[1.02]' : st === 'approved' ? 'border-emerald-400 opacity-80' : st === 'rejected' ? 'border-rose-400 opacity-80' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                    <img src={resolveImageUrl(it)} alt="t" className="w-full h-36 object-cover bg-slate-100" />
                                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg">#{it.itemIndex + 1}</div>

                                    {/* CONFLICT BADGE */}
                                    {it.isConflict && (
                                        <div className="absolute top-3 right-3 bg-rose-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-xl border border-rose-400">
                                            CONFLICT
                                        </div>
                                    )}

                                    {/* ANNOTATOR NAME */}
                                    {it.isConflict && (
                                        <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-white text-[7px] font-black px-2.5 py-1.5 rounded-xl max-w-[90px] truncate shadow-lg">
                                            {it.annotatorName}
                                        </div>
                                    )}

                                    {bboxCount > 0 && !it.isConflict && (
                                        <div className="absolute bottom-3 left-3 bg-indigo-600 text-white text-[7px] font-black px-2.5 py-1 rounded-full shadow-lg">
                                            {bboxCount} BBOX
                                        </div>
                                    )}

                                    {st === 'approved' && <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[2px]"><Check className="w-10 h-10 text-emerald-500 drop-shadow-lg" /></div>}
                                    {st === 'rejected' && <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center backdrop-blur-[2px]"><X className="w-10 h-10 text-rose-500 drop-shadow-lg" /></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>

            {showFeedbackModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 text-center border border-slate-100">
                        <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-100">
                            <ArrowRight className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-4">Gửi kết quả Review</h2>
                        <p className="text-slate-500 mb-10 font-bold uppercase text-[9px] tracking-widest leading-relaxed">Dữ liệu sẽ được cập nhật vào hệ thống. Các phiên bản bị từ chối sẽ bị loại bỏ vĩnh viễn.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-[1.5rem] font-black uppercase text-[10px] transition-all">Quay lại</button>
                            <button onClick={handleSubmitReview} className="flex-[2] py-5 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl shadow-blue-200 font-black uppercase text-[10px] hover:bg-blue-700 transition-all">Xác nhận gửi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewerTask;
