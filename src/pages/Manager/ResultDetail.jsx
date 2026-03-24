import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  useParams,
  useNavigate
} from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Tag,
  Download,
  Filter,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Maximize2
} from "lucide-react";
import api, { taskAPI, annotationAPI } from "../../config/api";
import {
  resolveApiData,
  getAssignedTasksByUserMap
} from "../../utils/annotatorTaskHelpers";

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveImageUrl(item) {
  if (!item) return '';
  const nested = item?.datasetItem || item?.DatasetItem || item?.item;
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

  // Case 1: item is already an array of bboxes
  if (Array.isArray(item)) {
    return normalize(item);
  }

  // Case 2: item is an object containing a list
  const rawList =
    item.annotations || item.Annotations ||
    item.bboxes || item.boundingBoxes ||
    item.labels || item.payload?.bboxes || item.payload?.annotations || [];

  if (Array.isArray(rawList)) {
    return normalize(rawList);
  }

  // Case 3: item itself is a single bbox
  if (item.x !== undefined || item.left !== undefined || item.bbox) {
    return normalize([item]);
  }

  return [];

  function normalize(list) {
    if (!Array.isArray(list)) return [];
    return list.map((a, idx) => {
      const findProp = (obj, keys) => {
        if (!obj) return null;
        for (const k of keys) {
          if (obj[k] !== undefined) return obj[k];
          // Try case insensitive match in current object
          const lowerK = k.toLowerCase();
          const match = Object.keys(obj).find(ok => ok.toLowerCase() === lowerK);
          if (match !== undefined) return obj[match];
        }
        return null;
      };

      // Recursive deep search helper for specific fields
      const deepFind = (obj, field) => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj[field] !== undefined) return obj[field];
        // Check case-insensitive
        const match = Object.keys(obj).find(k => k.toLowerCase() === field.toLowerCase());
        if (match) return obj[match];

        for (const key in obj) {
          const res = deepFind(obj[key], field);
          if (res !== null) return res;
        }
        return null;
      };

      // ── Label Search ────────────────────────────────────────────────────────
      let label = 'Object';
      const labelCandidates = ['label', 'category', 'categoryName', 'labelName', 'name', 'category_name', 'className', 'category_id', 'value', 'tag'];
      let rawLabel = findProp(a, labelCandidates);

      // If found an object, try to get its name
      if (rawLabel && typeof rawLabel === 'object') {
        rawLabel = rawLabel.name || rawLabel.label || rawLabel.id || rawLabel.value || 'Object';
      }

      if (rawLabel) {
        label = String(rawLabel);
      } else {
        // Search deeper if not found at top level
        const deepLabel = deepFind(a, 'label') || deepFind(a, 'category') || deepFind(a, 'name');
        if (deepLabel) label = String(deepLabel);
      }

      // ── Coordinate Search ───────────────────────────────────────────────────
      const rawX = findProp(a, ['x', 'left', 'x1', 'x_center', 'centerX', 'point_x']);
      const rawY = findProp(a, ['y', 'top', 'y1', 'y_center', 'centerY', 'point_y']);
      const rawW = findProp(a, ['width', 'w', 'boxWidth', 'rectWidth', 'span_x']);
      const rawH = findProp(a, ['height', 'h', 'boxHeight', 'rectHeight', 'span_y']);

      let x = parseFloat(rawX ?? (a.payload?.x || a.data?.x || (Array.isArray(a.bbox) ? a.bbox[0] : 0)));
      let y = parseFloat(rawY ?? (a.payload?.y || a.data?.y || (Array.isArray(a.bbox) ? a.bbox[1] : 0)));
      let width = parseFloat(rawW ?? (a.payload?.width || a.data?.width || (Array.isArray(a.bbox) ? a.bbox[2] : 0)));
      let height = parseFloat(rawH ?? (a.payload?.height || a.data?.height || (Array.isArray(a.bbox) ? a.bbox[3] : 0)));

      // If coordinates missing, try deep search
      if (!x && !y && !width) {
        x = parseFloat(deepFind(a, 'x') || 0);
        y = parseFloat(deepFind(a, 'y') || 0);
        width = parseFloat(deepFind(a, 'width') || deepFind(a, 'w') || 0);
        height = parseFloat(deepFind(a, 'height') || deepFind(a, 'h') || 0);
      }

      // If width/height missing but x2/y2 exist
      if ((width <= 0 || height <= 0)) {
        const x2 = findProp(a, ['x2', 'right', 'x_max']);
        const y2 = findProp(a, ['y2', 'bottom', 'y_max']);
        if (x2 !== null && y2 !== null) {
          width = Math.abs(parseFloat(x2) - x);
          height = Math.abs(parseFloat(y2) - y);
        }
      }

      // Absolute fallback
      if (width <= 0) width = 80;
      if (height <= 80) height = 80;

      const color = a.color || getLabelColor(label, idx);
      return {
        label: label.toUpperCase(),
        x: Number(x) || 0,
        y: Number(y) || 0,
        width: Number(width),
        height: Number(height),
        color
      };
    }).filter(a => a.width > 2 && a.height > 2);
  }
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
    if (!annotations || annotations.length === 0) return;
    const scaleX = dispW / natW;
    const scaleY = dispH / natH;
    annotations.forEach((ann) => {
      // ── Smart Coordinate Scaling ───────────────────────────────────────────
      // Detect if coordinates are normalized (0..1) or absolute pixels
      // Threshold: if any value > 1.5, we assume pixels.
      const isNormalized =
        Math.abs(ann.x) <= 1.5 &&
        Math.abs(ann.y) <= 1.5 &&
        Math.abs(ann.width) <= 1.5 &&
        Math.abs(ann.height) <= 1.5 &&
        (ann.width > 0 || ann.height > 0);

      const x = isNormalized ? ann.x * dispW : ann.x * scaleX;
      const y = isNormalized ? ann.y * dispH : ann.y * scaleY;
      const w = isNormalized ? ann.width * dispW : ann.width * scaleX;
      const h = isNormalized ? ann.height * dispH : ann.height * scaleY;

      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = ann.color + '22';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = ann.color;
      ctx.font = 'bold 10px Inter, sans-serif';
      const labelText = String(ann.label).toUpperCase();
      ctx.fillText(labelText, x, y > 15 ? y - 5 : y + 15);
    });
  }, [annotations, imgRef, imgNaturalSize]);
  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

// ── Components ────────────────────────────────────────────────────────────────
function GalleryItem({ item, onSelect }) {
  const imgRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  return (
    <div
      className="group bg-white rounded-3xl border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 flex flex-col"
    >
      {/* Container with fixed aspect ratio, using object-contain to show full image like Reviewer view */}
      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden flex items-center justify-center p-1">
        <div className="relative max-w-full max-h-full">
          <img
            ref={imgRef}
            src={resolveImageUrl(item)}
            className="max-w-full max-h-full object-contain block group-hover:scale-105 transition-transform duration-700"
            alt="result"
            onLoad={(e) => {
              setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
            }}
            onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=No+Preview'; }}
          />
          {/* ✅ Precision BBox Overlay (Same as Reviewer view) */}
          <BBoxCanvas
            annotations={item.bboxes}
            imgRef={imgRef}
            imgNaturalSize={imgNaturalSize}
          />
        </div>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onSelect(item)}
            className="p-3 bg-white text-slate-900 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-black text-slate-600 shadow-sm uppercase">#{item.id?.slice(-4)}</div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{item.taskTitle}</div>
        <div className="flex flex-wrap gap-1 mb-4">
          {item.allLabels.length > 0 ? (
            item.allLabels.slice(0, 3).map((l, lid) => (
              <span key={lid} className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-indigo-100">{l}</span>
            ))
          ) : (
            <span className="text-[10px] font-bold text-slate-300 italic">No labels</span>
          )}
          {item.allLabels.length > 3 && <span className="text-[10px] font-bold text-slate-400">+{item.allLabels.length - 3}</span>}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Verified
          </div>
          <div className="text-[10px] text-slate-300 font-medium">By {item.annotations[0]?.assignedBy || 'Consensus'}</div>
        </div>
      </div>
    </div>
  );
}

export default function ManagerResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [itemsWithLabels, setItemsWithLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLabel, setFilterLabel] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ Refs and state for BBox Canvas (Modal view)
  const imgRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  const fetchData = async () => {
    // ... no changes to fetchData
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch project meta
      const projRes = await api.get(`/projects/${id}`);
      const projData = resolveApiData(projRes);
      setProject(projData);

      // 2. Fetch all tasks for this project
      const tasksRes = await api.get("/tasks").catch(() => ({ data: [] }));
      const apiTasks = resolveApiData(tasksRes) || [];
      const localMap = getAssignedTasksByUserMap();
      const allLocalTasks = Object.values(localMap).flat();

      const combinedTasks = [...apiTasks, ...allLocalTasks];

      // Filter for project tasks with normalized project ID
      const projectTasksFiltered = combinedTasks.filter(t => {
        const pid = String(t.projectId || t.project?.id || t.project_id || '');
        return pid === String(id) && !!pid;
      });

      // Deduplicate tasks by ID
      const uniqueTasks = [];
      const seenIds = new Set();
      projectTasksFiltered.forEach(t => {
        const tid = String(t.id || t.taskId || '');
        if (tid && !seenIds.has(tid)) {
          uniqueTasks.push(t);
          seenIds.add(tid);
        }
      });

      setTasks(uniqueTasks);

      // 3. Aggregate all items and their labels
      const aggregated = [];
      // allLocalTasks and localMap are already defined in step 2 above.

      for (const task of uniqueTasks) {
        const taskId = String(task.id || task.taskId);
        if (!taskId) continue;

        try {
          // Check for local task fallback first (it usually has the most recent status)
          const localTask = allLocalTasks.find(t => String(t.id || t.taskId) === taskId);

          const [itemsRes, annRes] = await Promise.all([
            taskAPI.getItems(taskId).catch(() => ({ data: [] })),
            annotationAPI.getByTask(taskId).catch(() => ({ data: [] }))
          ]);

          const apiItems = resolveApiData(itemsRes) || [];
          const taskAnns = resolveApiData(annRes) || [];

          // Merge Local + API Items
          const taskItems = localTask?.items || apiItems;

          taskItems.forEach(item => {
            const itemId = String(item.id || item.itemId || item.taskItemId || '');

            // Aggregate ALL relevant annotations for this item (to show multiple labels)
            let sourceAnns = [];

            // Check local first (often contains the full set from the latest work)
            if (item.annotations && item.annotations.length > 0) {
              // If it's already an array of bboxes, wrap it in a session or pass directly
              sourceAnns = item.annotations;
            } else {
              // Fallback to API annotations
              const itemAnns = taskAnns.filter(a =>
                String(a.itemId || a.item_id || a.taskItemId || '') === itemId
              );
              // Pick winners if any, otherwise all
              const winners = itemAnns.filter(a => a.isConsensusWinner || a.isWinner || a.status === 'approved');
              sourceAnns = winners.length > 0 ? winners : itemAnns;
            }

            // Extract labels from ALL source annotations
            const labelSet = new Set();
            const rawBBoxes = [];

            // handle both single and multiple sources
            const listToProcess = Array.isArray(sourceAnns) ? sourceAnns : [sourceAnns];
            listToProcess.forEach(sa => {
              const bboxes = extractAnnotations(sa);
              bboxes.forEach(b => {
                rawBBoxes.push(b);
                labelSet.add(b.label);
              });

              // Also check for classification on the session itself
              const cls = sa.classification || sa.label || sa.category;
              if (cls && typeof cls === 'string') labelSet.add(cls.toUpperCase());
            });

            // Status check
            const isRejected = (item.status || '').toLowerCase() === 'rejected';
            if (isRejected) return;

            aggregated.push({
              ...item,
              taskTitle: task.title || task.name,
              taskId: taskId,
              annotations: listToProcess,
              allLabels: Array.from(labelSet),
              bboxes: rawBBoxes,
              classification: listToProcess[0]?.classification || ''
            });
          });
        } catch (err) {
          console.warn(`Failed to process task ${taskId}:`, err);
        }
      }
      setItemsWithLabels(aggregated);
    } catch (err) {
      console.error("Fetch result detail error:", err);
      setError("Không thể tải chi tiết kết quả.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const allAvailableLabels = useMemo(() => {
    const labels = new Set();
    itemsWithLabels.forEach(it => {
      it.allLabels.forEach(l => labels.add(l));
      if (it.classification) labels.add(it.classification);
    });
    return Array.from(labels);
  }, [itemsWithLabels]);

  const filteredItems = useMemo(() => {
    return itemsWithLabels.filter(it => {
      const matchSearch = !searchTerm || it.taskTitle?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLabel = filterLabel === 'all' || it.allLabels.includes(filterLabel) || it.classification === filterLabel;
      return matchSearch && matchLabel;
    });
  }, [itemsWithLabels, searchTerm, filterLabel]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang nạp dữ liệu hoàn thiện...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Có lỗi xảy ra</h2>
        <p className="text-slate-500 mb-8">{error || "Không tìm thấy thông tin dự án."}</p>
        <button onClick={() => navigate('/manager/results')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black">QUAY LẠI DANH SÁCH</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-8 py-4 shadow-sm">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/manager/results')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-emerald-200">FINALIZED</span>
              </div>
              <p className="text-xs text-slate-400 font-bold">{tasks.length} Nhiệm vụ • {itemsWithLabels.length} Hình ảnh đạt chuẩn</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-screen-2xl mx-auto w-full flex overflow-hidden">
        {/* Left Filters */}
        <aside className="w-80 bg-white border-r border-slate-200 p-8 hidden lg:flex flex-col gap-8 overflow-y-auto">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tìm kiếm</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tên nhiệm vụ..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bộ lọc nhãn</p>
              <span className="text-[10px] font-bold text-indigo-500">{allAvailableLabels.length} nhãn</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setFilterLabel('all')}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all ${filterLabel === 'all' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>TẤT CẢ</span>
                <span className="opacity-40">{itemsWithLabels.length}</span>
              </button>
              {allAvailableLabels.map(label => (
                <button
                  key={label}
                  onClick={() => setFilterLabel(label)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all ${filterLabel === label ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="uppercase">{label}</span>
                  <span className="opacity-40">{itemsWithLabels.filter(it => it.allLabels.includes(label) || it.classification === label).length}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Gallery */}
        <main className="flex-1 p-8 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Không có kết quả phù hợp bộ lọc</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item, idx) => (
                <GalleryItem
                  key={`${item.id}-${idx}`}
                  item={item}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Item Details Overlay (Modal) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-8 lg:p-12 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-8 right-8 p-4 text-white/60 hover:text-white transition-all scale-150"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="w-full h-full max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Left: Main Image Visualization */}
            <div className="flex-1 bg-black/40 rounded-[3rem] border border-white/5 relative overflow-hidden flex items-center justify-center">
              <div className="relative inline-block max-w-full max-h-[80vh]">
                <img
                  ref={imgRef}
                  src={resolveImageUrl(selectedItem)}
                  className="max-w-full max-h-full object-contain block rounded-2xl"
                  alt="preview"
                  onLoad={(e) => {
                    setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                  }}
                />
                {/* ✅ Professional BBox Canvas (Pixel-accurate scaling) */}
                <BBoxCanvas
                  annotations={selectedItem.bboxes}
                  imgRef={imgRef}
                  imgNaturalSize={imgNaturalSize}
                />
              </div>
            </div>

            {/* Right: Technical Metadata */}
            <div className="w-full lg:w-96 flex flex-col gap-6 lg:justify-center">
              <div className="space-y-2 text-center lg:text-left">
                <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">Phân tích chi tiết</p>
                <h2 className="text-2xl lg:text-2xl font-black text-white leading-tight">Giao diện kết quả</h2>
                <p className="text-white/40 font-medium">{selectedItem.taskTitle}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <p className="text-[12px] font-black text-white/30 uppercase tracking-widest mb-4">Dữ liệu Bounding Boxes</p>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {(selectedItem.bboxes || []).map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-white/80 uppercase">{b.label}</span>
                        <span className="text-[10px] text-white/30 font-mono">[{Math.round(b.width)}x{Math.round(b.height)}]</span>
                      </div>
                    ))}
                    {(selectedItem.bboxes || []).length === 0 && (
                      <p className="text-xs text-white/20 italic text-center py-4">Không có dữ liệu bounding box.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className, ...props }) {
  return (
    <svg {...props} className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  )
}
