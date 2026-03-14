import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  FolderOpen,
  Tag,
  Database,
  Plus,
  X,
} from "lucide-react";

const FIXED_TEMPLATE_ID = "e841b523-8215-4952-b3dc-8c9bc60f8a7d";

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

const extractProjectIdFromResponse = (responseData) => {
  const candidates = [
    responseData?.id,
    responseData?.projectId,
    responseData?.data?.id,
    responseData?.data?.projectId,
    responseData?.item?.id,
    responseData?.item?.projectId,
  ];

  const found = candidates.find((item) => item !== undefined && item !== null && String(item).trim() !== "");
  return found ? String(found) : "";
};

const getApiErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.title ||
  error?.response?.data?.error ||
  error?.message ||
  "Tạo dự án thất bại";

const normalizeCategoryLabels = (category) => {
  const candidates = [
    ...(Array.isArray(category?.labels) ? category.labels : []),
    ...(Array.isArray(category?.labelSets) ? category.labelSets.flatMap((set) => set?.labels || []) : []),
  ];

  const byName = new Map();
  candidates.forEach((item, idx) => {
    const name = typeof item === "string" ? item : item?.name ?? item?.labelName;
    if (!name) return;
    const key = String(name).trim().toLowerCase();
    if (!key) return;
    byName.set(key, { id: item?.id ?? `label-${idx}-${key}`, name: String(name).trim() });
  });

  return Array.from(byName.values());
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [guidelines, setGuidelines] = useState("");

  const [categories, setCategories] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);

  const [categoryLabels, setCategoryLabels] = useState([]);
  const [selectedLabelNames, setSelectedLabelNames] = useState([]);
  const [customLabelInput, setCustomLabelInput] = useState("");

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id || c.categoryId) === String(selectedCategoryId)),
    [categories, selectedCategoryId]
  );

  const allSelectedLabels = useMemo(() => {
    const byName = new Map();
    selectedLabelNames.forEach((name) => {
      const normalized = String(name).trim();
      if (!normalized) return;
      byName.set(normalized.toLowerCase(), normalized);
    });
    return Array.from(byName.values());
  }, [selectedLabelNames]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await requestSequential([
          () => api.get("/categories"),
          () => api.get("/Categories"),
        ]);

        const normalized = toArray(response?.data).map((category, idx) => ({
          ...category,
          id: category?.id ?? category?.categoryId ?? `category-${idx}`,
          categoryId: category?.categoryId ?? category?.id ?? `category-${idx}`,
        }));

        if (normalized.length > 0) {
          setCategories(normalized);
          return;
        }
        setCategories([]);
      } catch {
        setError("Không tải được danh sách category");
      } finally {
        setLoadingCategories(false);
      }
    };

    const fetchDatasets = async () => {
      try {
        setLoadingDatasets(true);
        const response = await requestSequential([
          () => api.get("/datasets"),

        ]);
        setDatasets(toArray(response?.data));
      } catch {
        setDatasets([]);
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchCategories();
    fetchDatasets();
  }, []);

  useEffect(() => {
    const loadCategoryLabels = async () => {
      if (!selectedCategoryId) {
        setCategoryLabels([]);
        setSelectedLabelNames([]);
        return;
      }

      try {
        setLoadingLabels(true);

        const localCategory = categories.find(
          (c) => String(c.id || c.categoryId) === String(selectedCategoryId)
        );
        const fromCategoryPayload = normalizeCategoryLabels(localCategory);

        let fromApi = [];
        try {
          const labelsRes = await requestSequential([
            () => api.get(`/labels?CategoryId=${selectedCategoryId}`),
            () => api.get(`/categories/${selectedCategoryId}/labels`),
            () => api.get(`/Categories/${selectedCategoryId}/labels`),
            () => api.get(`/labelsets/${selectedCategoryId}/labels`),
          ]);
          fromApi = toArray(labelsRes?.data).map((item, idx) => ({
            id: item?.id ?? `api-label-${idx}`,
            name: item?.name ?? item?.labelName,
          })).filter((item) => item.name);
        } catch {
          fromApi = [];
        }

        const byName = new Map();
        [...fromCategoryPayload, ...fromApi].forEach((label) => {
          const key = String(label.name).trim().toLowerCase();
          if (!key) return;
          byName.set(key, { ...label, name: String(label.name).trim() });
        });

        setCategoryLabels(Array.from(byName.values()));
        setSelectedLabelNames([]);
      } finally {
        setLoadingLabels(false);
      }
    };

    loadCategoryLabels();
  }, [selectedCategoryId, categories]);

  const toggleLabel = (labelName) => {
    const normalized = String(labelName).trim();
    if (!normalized) return;
    setSelectedLabelNames((prev) =>
      prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized]
    );
  };

  const handleAddCustomLabel = () => {
    const normalized = customLabelInput.trim();
    if (!normalized) return;

    const exists = allSelectedLabels.some(
      (item) => item.toLowerCase() === normalized.toLowerCase()
    );

    if (!exists) {
      setSelectedLabelNames((prev) => [...prev, normalized]);
    }

    setCustomLabelInput("");
  };

  const toggleDataset = (datasetId) => {
    const id = String(datasetId);
    setSelectedDatasetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) {
      return projectName.trim() && projectDescription.trim();
    }
    if (step === 2) {
      return selectedCategoryId !== "";
    }
    return true;
  };

  const attachDatasets = async (projectId) => {
    const datasetIds = selectedDatasetIds.map((item) => String(item));
    if (datasetIds.length === 0) return { attachedCount: 0, failedCount: 0 };

    const results = await Promise.allSettled(
      datasetIds.map((datasetId) =>
        requestSequential([
          () => api.post(`/datasets/add/${projectId}`, { datasetId }),

          () => api.post(`/datasets/${datasetId}/attach/${projectId}`, {}),

        ])
      )
    );

    const attachedCount = results.filter((item) => item.status === "fulfilled").length;
    const failedCount = results.length - attachedCount;
    return { attachedCount, failedCount };
  };

  const handleSubmit = async () => {
    if (!selectedCategoryId) {
      setError("Vui lòng chọn category");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const normalizedCategoryId = String(selectedCategoryId);
      const normalizedGuideline = guidelines.trim();

      const payload = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        categoryId: normalizedCategoryId,
        guideline: normalizedGuideline,
        templateId: FIXED_TEMPLATE_ID,
      };

      const payloadPascalCase = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        categoryId: normalizedCategoryId,
        guideline: normalizedGuideline,
        TemplateId: FIXED_TEMPLATE_ID,
      };

      const createRes = await requestSequential([
        () => api.post("/projects", payload),
        () => api.post("/Projects", payload),
        () => api.post("/projects", payloadPascalCase),
        () => api.post("/Projects", payloadPascalCase),
      ]);

      let projectId = extractProjectIdFromResponse(createRes?.data);

      if (!projectId) {
        const refreshProjects = await requestSequential([
          () => api.get(`/projects?Name=${encodeURIComponent(projectName.trim())}`),
          () => api.get("/Projects"),
          () => api.get("/projects"),
        ]);

        const projectList = toArray(refreshProjects?.data);
        const latestMatch = projectList
          .filter((item) => String(item?.name || "").trim() === projectName.trim())
          .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];

        projectId = latestMatch?.id || latestMatch?.projectId;
      }

      if (!projectId) {
        throw new Error("Tạo dự án xong nhưng không lấy được projectId");
      }

      const attachResult = await attachDatasets(projectId);

      if (attachResult.failedCount > 0) {
        alert(`Tạo dự án thành công. Đã gán ${attachResult.attachedCount}/${selectedDatasetIds.length} dataset.`);
      } else {
        alert("Tạo dự án thành công!");
      }

      navigate("/manager/projects");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Thong tin", icon: FileText },
    { number: 2, title: "Category + Labels", icon: FolderOpen },
    { number: 3, title: "Datasets", icon: Database },
    { number: 4, title: "Xác nhận", icon: Check },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button className="p-2 rounded hover:bg-gray-100" onClick={() => navigate("/manager/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Tạo dự án mới</h1>
          <p className="text-gray-500">Chọn category, labels và datasets cho dự án</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded border">{error}</div>}

      <div className="flex items-center justify-between">
        {steps.map((s, index) => (
          <div key={s.number} className="flex items-center">
            <div className={`flex items-center gap-2 ${step >= s.number ? "text-indigo-600" : "text-gray-400"}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${step > s.number
                    ? "bg-indigo-600 text-white"
                    : step === s.number
                      ? "border-2 border-indigo-600"
                      : "bg-gray-200"
                  }`}
              >
                {step > s.number ? <Check /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className="hidden sm:block text-sm font-medium">{s.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-10 sm:w-20 h-0.5 mx-2 ${step > s.number ? "bg-indigo-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Thông tin dự án</h2>

            <div>
              <label className="block text-sm font-medium">Tên dự án *</label>
              <input className="w-full border rounded px-3 py-2" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium">Mo ta *</label>
              <textarea className="w-full border rounded px-3 py-2" rows={3} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium">Huong dan</label>
              <textarea className="w-full border rounded px-3 py-2" rows={4} value={guidelines} onChange={(e) => setGuidelines(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Category va Labels</h2>

            {loadingCategories ? (
              <p>Đang tải category...</p>
            ) : (
              <select className="w-full border rounded px-3 py-2" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">-- Chọn category --</option>
                {categories.map((category, index) => {
                  const catId = category.categoryId || category.id || `cat-${index}`;
                  return (
                    <option key={catId} value={String(catId)}>
                      {category.name}
                    </option>
                  );
                })}
              </select>
            )}

            {selectedCategory && (
              <div className="border rounded p-4 bg-gray-50 space-y-3">
                <p className="font-semibold">{selectedCategory.name}</p>
                <p className="text-sm text-gray-500">{selectedCategory.description || "Chưa có mô tả"}</p>

                <div>
                  <p className="text-sm font-semibold mb-2">Nhãn có sẵn trong category</p>
                  {loadingLabels ? (
                    <p className="text-sm text-gray-400">Đang tải labels...</p>
                  ) : categoryLabels.length === 0 ? (
                    <p className="text-sm text-gray-400">Category này chưa có label định nghĩa trước</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categoryLabels.map((label) => {
                        const selected = allSelectedLabels.some((item) => item.toLowerCase() === label.name.toLowerCase());
                        return (
                          <button
                            key={label.id}
                            onClick={() => toggleLabel(label.name)}
                            type="button"
                            className={`px-3 py-1 rounded-full text-sm border ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"
                              }`}
                          >
                            {label.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <p className="text-sm font-semibold mb-2">Them label custom</p>
                  <div className="flex gap-2">
                    <input
                      value={customLabelInput}
                      onChange={(e) => setCustomLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomLabel();
                        }
                      }}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="Nhap label ban muon them..."
                    />
                    <button type="button" onClick={handleAddCustomLabel} className="px-3 py-2 bg-gray-900 text-white rounded">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Labels đã chọn ({allSelectedLabels.length})</p>
                  {allSelectedLabels.length === 0 ? (
                    <p className="text-sm text-gray-400">Chưa chọn label nào</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allSelectedLabels.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm">
                          <Tag className="w-3 h-3" />
                          {name}
                          <button type="button" onClick={() => toggleLabel(name)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Gan datasets (1 hoac nhieu)</h2>
            {loadingDatasets ? (
              <p>Đang tải datasets...</p>
            ) : datasets.length === 0 ? (
              <p className="text-sm text-gray-400">Không có dataset nào</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {datasets.map((dataset, index) => {
                  const dsId = String(dataset.id || dataset.datasetId || `ds-${index}`);
                  const checked = selectedDatasetIds.includes(dsId);
                  return (
                    <label key={dsId} className={`p-3 rounded-lg border cursor-pointer ${checked ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleDataset(dsId)} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{dataset.name || `Dataset ${index + 1}`}</p>
                          <p className="text-xs text-gray-500">{dataset.itemsCount || dataset.totalItems || 0} files</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Xác nhận</h2>
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
              <p><b>Ten:</b> {projectName}</p>
              <p><b>Category:</b> {selectedCategory?.name || "--"}</p>
              <p><b>Mo ta:</b> {projectDescription}</p>
              <p><b>Labels:</b> {allSelectedLabels.length > 0 ? allSelectedLabels.join(", ") : "Không có"}</p>
              <p><b>Datasets đã chọn:</b> {selectedDatasetIds.length}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button className="border px-4 py-2 rounded" onClick={() => setStep(step - 1)} disabled={step === 1}>
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Quay lại
        </button>

        {step < 4 ? (
          <button className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Tiep theo
            <ArrowRight className="inline w-4 h-4 ml-1" />
          </button>
        ) : (
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleSubmit} disabled={submitting}>
            <Check className="inline w-4 h-4 mr-1" />
            {submitting ? "Đang tạo..." : "Tạo dự án"}
          </button>
        )}
      </div>
    </div>
  );
}




