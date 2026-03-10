import {
  ArrowLeft,
  Download,
  Plus,
  Loader2,
  AlertCircle,
  Pencil,
  Save,
  X,
  Trash2,
  Check,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api, { labelAPI } from "../../config/api";

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

const normalizeLabelItem = (item, index) => {
  if (typeof item === "string") {
    const name = String(item).trim();
    if (!name) return null;
    return {
      id: `label-local-${index}-${name}`,
      name,
    };
  }

  const name = item?.name ?? item?.labelName ?? item?.title;
  if (!name) return null;

  return {
    id: item?.id ?? item?.labelId ?? `label-local-${index}-${name}`,
    name: String(name).trim(),
  };
};

export default function ManagerProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");
  const enableDevFallback = import.meta.env.VITE_ENABLE_DEV_FALLBACK === "true";
  const enableDevBypass = import.meta.env.VITE_BYPASS_LOGIN === "true";
  const isDevLocalToken = token === "dev-fallback-token" || token === "dev-bypass-token";
  const isDevLocalSession =
    import.meta.env.DEV &&
    (enableDevFallback || enableDevBypass) &&
    isDevLocalToken;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labelSets, setLabelSets] = useState([]);

  const [categories, setCategories] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customLabelInput, setCustomLabelInput] = useState("");
  const [editingCategoryLabelId, setEditingCategoryLabelId] = useState("");
  const [editingCategoryLabelName, setEditingCategoryLabelName] = useState("");
  const [labelActionTargetId, setLabelActionTargetId] = useState("");
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

  const categoryLabelItems = useMemo(() => {
    const candidates = [
      ...toArray(selectedCategory?.labels),
      ...toArray(selectedCategory?.labelSets).flatMap((set) => toArray(set?.labels)),
    ];

    const byName = new Map();
    candidates.forEach((item, index) => {
      const normalized = normalizeLabelItem(item, index);
      if (!normalized?.name) return;
      byName.set(String(normalized.name).trim().toLowerCase(), normalized);
    });

    return Array.from(byName.values());
  }, [selectedCategory]);

  const categoryLabels = useMemo(
    () => categoryLabelItems.map((item) => item.name),
    [categoryLabelItems]
  );

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

  useEffect(() => {
    setEditingCategoryLabelId("");
    setEditingCategoryLabelName("");
    setLabelActionTargetId("");
  }, [editForm.categoryId]);

  const patchSelectedCategoryLabels = (updater) => {
    const selectedCategoryId = String(editForm.categoryId || "");
    if (!selectedCategoryId) return;

    setCategories((prev) =>
      prev.map((category) => {
        const currentCategoryId = String(category?.id ?? category?.categoryId ?? "");
        if (currentCategoryId !== selectedCategoryId) {
          return category;
        }

        const normalizedLabels = toArray(category?.labels)
          .map((item, index) => normalizeLabelItem(item, index))
          .filter(Boolean);

        const nextLabels = updater(normalizedLabels);

        return {
          ...category,
          labels: nextLabels,
          labelsCount: nextLabels.length,
        };
      })
    );
  };

  const startEditCategoryLabel = (label) => {
    setEditingCategoryLabelId(String(label.id));
    setEditingCategoryLabelName(String(label.name || ""));
  };

  const cancelEditCategoryLabel = () => {
    setEditingCategoryLabelId("");
    setEditingCategoryLabelName("");
  };

  const handleAddCategoryLabel = async () => {
    const categoryId = String(editForm.categoryId || "");
    const nextName = customLabelInput.trim();

    if (!categoryId || !nextName) {
      alert("Vui long chon category va nhap ten nhan");
      return;
    }

    const duplicate = categoryLabelItems.some(
      (item) => String(item.name).trim().toLowerCase() === nextName.toLowerCase()
    );

    if (duplicate) {
      alert("Nhan da ton tai trong category");
      return;
    }

    setLabelActionTargetId("new");
    try {
      await labelAPI.create(categoryId, { name: nextName });
      patchSelectedCategoryLabels((prev) => [
        ...prev,
        { id: `label-${Date.now()}`, name: nextName },
      ]);
      setEditForm((prev) => ({
        ...prev,
        labels: prev.labels.includes(nextName) ? prev.labels : [...prev.labels, nextName],
      }));
      setCustomLabelInput("");
    } catch (error) {
      if (!isDevLocalSession) {
        alert(error?.response?.data?.message || error?.response?.data?.title || "Them nhan that bai");
        return;
      }

      patchSelectedCategoryLabels((prev) => [
        ...prev,
        { id: `label-${Date.now()}`, name: nextName },
      ]);
      setEditForm((prev) => ({
        ...prev,
        labels: prev.labels.includes(nextName) ? prev.labels : [...prev.labels, nextName],
      }));
      setCustomLabelInput("");
      alert("Backend loi, da cap nhat local o che do demo.");
    } finally {
      setLabelActionTargetId("");
    }
  };

  const handleSaveCategoryLabel = async (label) => {
    const categoryId = String(editForm.categoryId || "");
    const nextName = editingCategoryLabelName.trim();

    if (!categoryId || !nextName) {
      alert("Ten nhan khong hop le");
      return;
    }

    const currentName = String(label.name || "").trim();
    if (currentName.toLowerCase() === nextName.toLowerCase()) {
      cancelEditCategoryLabel();
      return;
    }

    const duplicate = categoryLabelItems.some(
      (item) =>
        String(item.id) !== String(label.id) &&
        String(item.name).trim().toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      alert("Ten nhan da ton tai trong category");
      return;
    }

    setLabelActionTargetId(String(label.id));
    try {
      await labelAPI.update(categoryId, label.id, { name: nextName });
      patchSelectedCategoryLabels((prev) =>
        prev.map((item) =>
          String(item.id) === String(label.id) ? { ...item, name: nextName } : item
        )
      );
      setEditForm((prev) => ({
        ...prev,
        labels: prev.labels.map((item) =>
          String(item).trim().toLowerCase() === currentName.toLowerCase() ? nextName : item
        ),
      }));
      cancelEditCategoryLabel();
    } catch (error) {
      if (!isDevLocalSession) {
        alert(error?.response?.data?.message || error?.response?.data?.title || "Cap nhat nhan that bai");
        return;
      }

      patchSelectedCategoryLabels((prev) =>
        prev.map((item) =>
          String(item.id) === String(label.id) ? { ...item, name: nextName } : item
        )
      );
      setEditForm((prev) => ({
        ...prev,
        labels: prev.labels.map((item) =>
          String(item).trim().toLowerCase() === currentName.toLowerCase() ? nextName : item
        ),
      }));
      cancelEditCategoryLabel();
      alert("Backend loi, da cap nhat local o che do demo.");
    } finally {
      setLabelActionTargetId("");
    }
  };

  const handleDeleteCategoryLabel = async (label) => {
    const categoryId = String(editForm.categoryId || "");
    if (!categoryId) return;

    if (!window.confirm(`Ban co chac chan muon xoa nhan \"${label.name}\"?`)) return;

    setLabelActionTargetId(String(label.id));
    try {
      await labelAPI.remove(categoryId, label.id, label.name);
      patchSelectedCategoryLabels((prev) =>
        prev.filter((item) => String(item.id) !== String(label.id))
      );
      setEditForm((prev) => ({
        ...prev,
        labels: prev.labels.filter(
          (item) => String(item).trim().toLowerCase() !== String(label.name).trim().toLowerCase()
        ),
      }));
      if (String(editingCategoryLabelId) === String(label.id)) {
        cancelEditCategoryLabel();
      }
    } catch (error) {
      if (!isDevLocalSession) {
        alert(error?.response?.data?.message || error?.response?.data?.title || "Xoa nhan that bai");
        return;
      }

      patchSelectedCategoryLabels((prev) =>
        prev.filter((item) => String(item.id) !== String(label.id))
      );
      setEditForm((prev) => ({
        ...prev,
        labels: prev.labels.filter(
          (item) => String(item).trim().toLowerCase() !== String(label.name).trim().toLowerCase()
        ),
      }));
      if (String(editingCategoryLabelId) === String(label.id)) {
        cancelEditCategoryLabel();
      }
      alert("Backend loi, da xoa local o che do demo.");
    } finally {
      setLabelActionTargetId("");
    }
  };

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
            {categoryLabelItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categoryLabelItems.map((label) => {
                  const checked = editForm.labels.includes(label.name);
                  const isEditing = String(editingCategoryLabelId) === String(label.id);
                  const isBusy = String(labelActionTargetId) === String(label.id);

                  return (
                    <div key={label.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border ${checked ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-300 text-slate-700"}`}>
                      {isEditing ? (
                        <>
                          <input
                            value={editingCategoryLabelName}
                            onChange={(e) => setEditingCategoryLabelName(e.target.value)}
                            className="w-28 border rounded px-2 py-0.5 text-xs text-slate-700"
                            disabled={isBusy}
                          />
                          <button type="button" onClick={() => handleSaveCategoryLabel(label)} disabled={isBusy || !editingCategoryLabelName.trim()} className="p-1 rounded hover:bg-black/10 disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={cancelEditCategoryLabel} disabled={isBusy} className="p-1 rounded hover:bg-black/10 disabled:opacity-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleLabel(label.name)}
                            className="px-1"
                          >
                            {label.name}
                          </button>
                          <button type="button" onClick={() => startEditCategoryLabel(label)} disabled={isBusy} className="p-1 rounded hover:bg-black/10 disabled:opacity-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteCategoryLabel(label)} disabled={isBusy} className="p-1 rounded hover:bg-black/10 disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <input value={customLabelInput} onChange={(e) => setCustomLabelInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Them label custom..." />
              <button
                type="button"
                onClick={handleAddCategoryLabel}
                disabled={labelActionTargetId === "new" || !customLabelInput.trim() || !editForm.categoryId}
                className="px-3 py-2 bg-gray-900 text-white rounded disabled:opacity-50"
              >
                Them
              </button>
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
