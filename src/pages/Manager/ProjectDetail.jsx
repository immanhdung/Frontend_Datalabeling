import {
  ArrowLeft,
  Download,
  Plus,
  Loader2,
  AlertCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../../config/api";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const requestSequential = async (factories) => {
  let lastError;
  for (const factory of factories) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const normalizeLabelNames = (project, labelSets) => {
  const fromProject = toArray(project?.labels).map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean);
  const fromLabelSets = labelSets.flatMap((set) => toArray(set?.labels).map((item) => item?.name)).filter(Boolean);
  return Array.from(new Set([...fromProject, ...fromLabelSets].map((item) => String(item).trim()).filter(Boolean)));
};

const normalizeDatasetIds = (project) => {
  const fromList = toArray(project?.datasets)
    .map((item) => item?.id ?? item?.datasetId)
    .filter(Boolean)
    .map((item) => String(item));

  const fromSingle = [project?.datasetId, project?.dataset?.id, project?.dataset?.datasetId]
    .filter(Boolean)
    .map((item) => String(item));

  return Array.from(new Set([...fromList, ...fromSingle]));
};

export default function ManagerProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labelSets, setLabelSets] = useState([]);

  const [categories, setCategories] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customLabelInput, setCustomLabelInput] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    guideline: "",
    categoryId: "",
    status: "",
    type: "",
    deadline: "",
    labels: [],
    datasetIds: [],
  });

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id || item.categoryId) === String(editForm.categoryId)),
    [categories, editForm.categoryId]
  );

  const categoryLabels = useMemo(() => {
    const candidates = [
      ...toArray(selectedCategory?.labels),
      ...toArray(selectedCategory?.labelSets).flatMap((set) => toArray(set?.labels)),
    ];

    const byName = new Map();
    candidates.forEach((item) => {
      const name = typeof item === "string" ? item : item?.name;
      if (!name) return;
      byName.set(String(name).trim().toLowerCase(), String(name).trim());
    });

    return Array.from(byName.values());
  }, [selectedCategory]);

  const allLabels = useMemo(() => normalizeLabelNames(project, labelSets), [project, labelSets]);

  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectRes, labelSetsRes, categoriesRes, datasetsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/label-sets`).catch(() => ({ data: [] })),
        requestSequential([
          () => api.get("/categories"),
          () => api.get("/Categories"),
        ]).catch(() => ({ data: [] })),
        requestSequential([
          () => api.get("/datasets"),
          () => api.get("/Datasets"),
        ]).catch(() => ({ data: [] })),
      ]);

      const fetchedProject = projectRes.data;
      const fetchedLabelSets = toArray(labelSetsRes?.data);

      setProject(fetchedProject);
      setLabelSets(fetchedLabelSets);
      setCategories(toArray(categoriesRes?.data));
      setDatasets(toArray(datasetsRes?.data));

      const initialLabels = normalizeLabelNames(fetchedProject, fetchedLabelSets);
      const initialDatasetIds = normalizeDatasetIds(fetchedProject);

      setEditForm({
        name: fetchedProject?.name || "",
        description: fetchedProject?.description || "",
        guideline: fetchedProject?.guideline || "",
        categoryId: String(fetchedProject?.categoryId || fetchedProject?.category?.id || ""),
        status: fetchedProject?.status || "",
        type: fetchedProject?.type || "",
        deadline: fetchedProject?.deadline ? String(fetchedProject.deadline).slice(0, 10) : "",
        labels: initialLabels,
        datasetIds: initialDatasetIds,
      });
    } catch (err) {
      setError("Khong the tai thong tin chi tiet du an. Vui long thu lai sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProjectDetail();
  }, [id]);

  const toggleLabel = (name) => {
    const normalized = String(name || "").trim();
    if (!normalized) return;

    setEditForm((prev) => ({
      ...prev,
      labels: prev.labels.includes(normalized)
        ? prev.labels.filter((item) => item !== normalized)
        : [...prev.labels, normalized],
    }));
  };

  const addCustomLabel = () => {
    const normalized = customLabelInput.trim();
    if (!normalized) return;

    const exists = editForm.labels.some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (!exists) {
      setEditForm((prev) => ({ ...prev, labels: [...prev.labels, normalized] }));
    }
    setCustomLabelInput("");
  };

  const toggleDataset = (datasetId) => {
    const idString = String(datasetId);
    setEditForm((prev) => ({
      ...prev,
      datasetIds: prev.datasetIds.includes(idString)
        ? prev.datasetIds.filter((item) => item !== idString)
        : [...prev.datasetIds, idString],
    }));
  };

  const saveProject = async () => {
    try {
      setSaving(true);

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        guideline: editForm.guideline,
        categoryId: editForm.categoryId || null,
        status: editForm.status,
        type: editForm.type,
        deadline: editForm.deadline || null,
        labels: editForm.labels,
        labelNames: editForm.labels,
      };

      await api.put(`/projects/${id}`, payload);

      if (editForm.datasetIds.length > 0) {
        await Promise.allSettled(
          editForm.datasetIds.map((datasetId) =>
            requestSequential([
              () => api.post(`/datasets/${datasetId}/attach/${id}`, {}),
              () => api.post(`/Datasets/${datasetId}/attach/${id}`, {}),
            ])
          )
        );
      }

      alert("Cap nhat du an thanh cong");
      setIsEditMode(false);
      await fetchProjectDetail();
    } catch (err) {
      alert(err.response?.data?.message || "Cap nhat du an that bai");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Dang tai thong tin du an...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-800 font-bold text-lg">{error || "Khong tim thay du an"}</p>
        <button onClick={() => navigate("/manager/projects")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Quay lai danh sach
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{project.status || "Dang hoat dong"}</span>
          </div>
          <p className="text-gray-500 mt-1">{project.description || "Chua co mo ta cho du an nay."}</p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Xuat du lieu
          </button>
          <button onClick={() => setIsEditMode((prev) => !prev)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black">
            {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {isEditMode ? "Dong sua" : "Chinh sua"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Giao viec
          </button>
        </div>
      </div>

      {isEditMode && (
        <div className="bg-white rounded-xl p-5 shadow space-y-5 border border-indigo-100">
          <h3 className="font-semibold text-indigo-700">Chinh sua project details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ten du an</label>
              <input className="w-full border rounded px-3 py-2" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loai</label>
              <input className="w-full border rounded px-3 py-2" value={editForm.type} onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trang thai</label>
              <input className="w-full border rounded px-3 py-2" value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={editForm.deadline} onChange={(e) => setEditForm((prev) => ({ ...prev, deadline: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mo ta</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Huong dan</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={editForm.guideline} onChange={(e) => setEditForm((prev) => ({ ...prev, guideline: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className="w-full border rounded px-3 py-2" value={editForm.categoryId} onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
              <option value="">-- Chon category --</option>
              {categories.map((category, idx) => {
                const catId = category?.id ?? category?.categoryId ?? `cat-${idx}`;
                return (
                  <option key={catId} value={String(catId)}>
                    {category?.name || `Category ${idx + 1}`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Labels</p>
            {categoryLabels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categoryLabels.map((name) => {
                  const checked = editForm.labels.includes(name);
                  return (
                    <button
                      type="button"
                      key={name}
                      onClick={() => toggleLabel(name)}
                      className={`px-3 py-1 rounded-full text-sm border ${checked ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-300"}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <input value={customLabelInput} onChange={(e) => setCustomLabelInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Them label custom..." />
              <button type="button" onClick={addCustomLabel} className="px-3 py-2 bg-gray-900 text-white rounded">Them</button>
            </div>

            <div className="flex flex-wrap gap-2">
              {editForm.labels.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm">
                  {name}
                  <button type="button" onClick={() => toggleLabel(name)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Datasets</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {datasets.map((dataset, idx) => {
                const dsId = String(dataset?.id ?? dataset?.datasetId ?? `ds-${idx}`);
                const checked = editForm.datasetIds.includes(dsId);
                return (
                  <label key={dsId} className={`p-2 rounded border flex items-center gap-2 cursor-pointer ${checked ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDataset(dsId)} />
                    <span className="text-sm">{dataset?.name || `Dataset ${idx + 1}`}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveProject} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Dang luu..." : "Luu thay doi"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow lg:col-span-2">
          <h3 className="font-semibold mb-2">Huong dan gan nhan</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{project.guideline || "Du an nay chua co huong dan chi tiet."}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow">
          <h3 className="font-semibold mb-3">Nhan ({allLabels.length})</h3>
          <div className="flex gap-2 flex-wrap">
            {allLabels.length > 0 ? (
              allLabels.map((label) => (
                <span key={label} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700">{label}</span>
              ))
            ) : (
              <p className="text-sm text-gray-400">Chua co nhan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
