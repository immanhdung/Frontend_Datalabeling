import { useEffect, useMemo, useState } from "react";
import api, { categoryAPI, labelAPI } from "../../config/api";
import { Plus, Folder, ChevronRight, Tag, X, Layers3, Pencil, Trash2, Check } from "lucide-react";

const readArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const requestSequential = async (requestFactories) => {
  let lastError;
  for (const requestFactory of requestFactories) {
    try {
      return await requestFactory();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const normalizeLabels = (category) => {
  const directLabels = asArray(category?.labels);
  const tagLabels = asArray(category?.tags);
  const labelSetLabels = asArray(category?.labelSet?.labels);
  const lowerLabelSetLabels = asArray(category?.labelset?.labels);
  const groupedLabelSetLabels = asArray(category?.labelSets).flatMap((set) =>
    asArray(set?.labels)
  );

  const labelCandidates = [
    ...directLabels,
    ...tagLabels,
    ...labelSetLabels,
    ...lowerLabelSetLabels,
    ...groupedLabelSetLabels,
  ];

  const normalized = labelCandidates
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `label-${index}-${item}`,
          name: item,
        };
      }

      const name = item?.name ?? item?.labelName ?? item?.title ?? item?.tagName;
      if (!name) return null;

      return {
        id: item?.id ?? item?.labelId ?? item?.labelID ?? `label-${index}-${name}`,
        name,
      };
    })
    .filter(Boolean);

  const byName = new Map();
  normalized.forEach((label) => {
    const key = String(label.name).trim().toLowerCase();
    if (!key) return;
    byName.set(key, label);
  });

  return Array.from(byName.values());
};

const normalizeCategory = (category, index) => {
  const id =
    category?.categoryId ??
    category?.categoryID ??
    category?.CategoryId ??
    category?.id ??
    `category-${index}`;
  const labels = normalizeLabels(category);

  return {
    ...category,
    id,
    categoryId: id,
    name: category?.name ?? `Category ${index + 1}`,
    description: category?.description ?? "",
    labels,
    labelsCount: labels.length,
  };
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [labelName, setLabelName] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState("");
  const [editingLabelName, setEditingLabelName] = useState("");
  const [processingLabelId, setProcessingLabelId] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeLabelFilter, setActiveLabelFilter] = useState("");

  const [categoryProjects, setCategoryProjects] = useState([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId]
  );

  const syncCategoriesState = (nextCategories, preferredId) => {
    setCategories(nextCategories);

    if (nextCategories.length === 0) {
      setSelectedCategoryId("");
      return;
    }

    const targetId =
      preferredId && nextCategories.some((item) => String(item.id) === String(preferredId))
        ? preferredId
        : nextCategories[0].id;

    setSelectedCategoryId(String(targetId));
  };

  const fetchCategories = async (preferredId) => {
    try {
      setLoading(true);
      const response = await categoryAPI.getAll();

      const nextCategories = readArray(response?.data).map(normalizeCategory);
      if (nextCategories.length > 0) {
        syncCategoriesState(nextCategories, preferredId || selectedCategoryId);
      } else {
        syncCategoriesState([], "");
      }
    } catch (error) {
      alert("Không tải được danh sách category");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryProjects = async (categoryId) => {
    if (!categoryId) {
      setCategoryProjects([]);
      return;
    }

    try {
      setFetchingProjects(true);
      const response = await requestSequential([
        () => api.get("/projects"),
        () => api.get("/Projects"),
        () => api.get("/projects/mine"),
      ]);
      const allProjects = readArray(response?.data);

      const filtered = allProjects.filter((project) => {
        const pid = String(categoryId);
        return (
          String(project?.categoryId ?? "") === pid ||
          String(project?.category?.id ?? "") === pid ||
          String(project?.category?.categoryId ?? "") === pid
        );
      });

      setCategoryProjects(filtered);
    } catch (error) {
      setCategoryProjects([]);
    } finally {
      setFetchingProjects(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    fetchCategoryProjects(selectedCategoryId);
  }, [selectedCategoryId]);

  const applyLabelToState = (categoryId, nextLabelName) => {
    const normalizedName = String(nextLabelName || "").trim();
    if (!normalizedName) return;

    const nextCategories = categories.map((category) => {
      if (String(category.id) !== String(categoryId)) {
        return category;
      }

      const exists = category.labels.some(
        (label) => String(label.name).toLowerCase() === normalizedName.toLowerCase()
      );

      if (exists) {
        return category;
      }

      const nextLabels = [
        ...category.labels,
        {
          id: `label-${Date.now()}`,
          name: normalizedName,
        },
      ];

      return {
        ...category,
        labels: nextLabels,
        labelsCount: nextLabels.length,
      };
    });

    syncCategoriesState(nextCategories, categoryId);
  };

  const updateLabelInState = (categoryId, labelId, nextLabelName) => {
    const normalizedName = String(nextLabelName || "").trim();
    if (!normalizedName) return;

    const nextCategories = categories.map((category) => {
      if (String(category.id) !== String(categoryId)) {
        return category;
      }

      const duplicate = category.labels.some(
        (label) =>
          String(label.id) !== String(labelId) &&
          String(label.name).trim().toLowerCase() === normalizedName.toLowerCase()
      );

      if (duplicate) {
        return category;
      }

      const nextLabels = category.labels.map((label) => {
        if (String(label.id) !== String(labelId)) return label;
        return {
          ...label,
          name: normalizedName,
        };
      });

      return {
        ...category,
        labels: nextLabels,
        labelsCount: nextLabels.length,
      };
    });

    syncCategoriesState(nextCategories, categoryId);
  };

  const removeLabelFromState = (categoryId, labelId, labelNameToRemove) => {
    const nextCategories = categories.map((category) => {
      if (String(category.id) !== String(categoryId)) {
        return category;
      }

      const nextLabels = category.labels.filter((label) => {
        if (String(label.id) === String(labelId)) return false;
        return String(label.name).trim().toLowerCase() !== String(labelNameToRemove).trim().toLowerCase();
      });

      return {
        ...category,
        labels: nextLabels,
        labelsCount: nextLabels.length,
      };
    });

    if (String(activeLabelFilter).toLowerCase() === String(labelNameToRemove).trim().toLowerCase()) {
      setActiveLabelFilter("");
    }

    syncCategoriesState(nextCategories, categoryId);
  };

  const handleCreateCategory = async () => {
    const name = newName.trim();
    if (!name) {
      alert("Vui lòng nhập tên category");
      return;
    }

    const payload = {
      name,
      description: newDesc.trim(),
    };

    try {
      await categoryAPI.create(payload);

      setShowModal(false);
      setNewName("");
      setNewDesc("");
      await fetchCategories();
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Tạo category thất bại");
    }
  };

  const handleAddLabel = async () => {
    const nextLabelName = labelName.trim();
    if (!selectedCategory || !nextLabelName) {
      alert("Vui lòng chọn category và nhập tên nhãn");
      return;
    }

    const exists = selectedCategory.labels.some(
      (label) => String(label.name).toLowerCase() === nextLabelName.toLowerCase()
    );

    if (exists) {
      alert("Nhãn này đã tồn tại trong category");
      return;
    }

    setAddingLabel(true);
    try {
      await labelAPI.create(selectedCategory.id, { name: nextLabelName });

      applyLabelToState(selectedCategory.id, nextLabelName);
      setLabelName("");
      await fetchCategories(selectedCategory.id);
      alert("Thêm nhãn thành công");
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Thêm nhãn thất bại");
    } finally {
      setAddingLabel(false);
    }
  };

  const handleStartEditLabel = (label) => {
    setEditingLabelId(String(label.id));
    setEditingLabelName(String(label.name || ""));
  };

  const handleCancelEditLabel = () => {
    setEditingLabelId("");
    setEditingLabelName("");
  };

  const handleSaveLabel = async (label) => {
    const nextName = editingLabelName.trim();
    if (!selectedCategory || !nextName) {
      alert("Vui lòng nhập tên nhãn hợp lệ");
      return;
    }

    const sameName = String(label.name).trim().toLowerCase() === nextName.toLowerCase();
    if (sameName) {
      handleCancelEditLabel();
      return;
    }

    const duplicate = selectedCategory.labels.some(
      (item) =>
        String(item.id) !== String(label.id) &&
        String(item.name).trim().toLowerCase() === nextName.toLowerCase()
    );

    if (duplicate) {
      alert("Tên nhãn đã tồn tại trong category");
      return;
    }

    setProcessingLabelId(String(label.id));
    try {
      await labelAPI.update(selectedCategory.id, label.id, { name: nextName });

      updateLabelInState(selectedCategory.id, label.id, nextName);
      handleCancelEditLabel();
      await fetchCategories(selectedCategory.id);
      alert("Cập nhật nhãn thành công");
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Cập nhật nhãn thất bại");
    } finally {
      setProcessingLabelId("");
    }
  };

  const handleDeleteLabel = async (label) => {
    if (!selectedCategory) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhãn \"${label.name}\"?`)) {
      return;
    }

    setProcessingLabelId(String(label.id));
    try {
      await labelAPI.remove(selectedCategory.id, label.id, label.name);

      removeLabelFromState(selectedCategory.id, label.id, label.name);
      if (String(editingLabelId) === String(label.id)) {
        handleCancelEditLabel();
      }
      await fetchCategories(selectedCategory.id);
      alert("Xóa nhãn thành công");
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Xóa nhãn thất bại");
    } finally {
      setProcessingLabelId("");
    }
  };

  const filteredCategories = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return categories;

    return categories.filter((category) => {
      const byName = String(category.name).toLowerCase().includes(keyword);
      const byDesc = String(category.description).toLowerCase().includes(keyword);
      const byLabel = category.labels.some((label) => String(label.name).toLowerCase().includes(keyword));
      return byName || byDesc || byLabel;
    });
  }, [categories, searchKeyword]);

  const filteredProjects = useMemo(() => {
    if (!activeLabelFilter) return categoryProjects;

    return categoryProjects.filter((project) => {
      const projectLabels = [
        ...(Array.isArray(project?.labels) ? project.labels : []),
        ...(Array.isArray(project?.labelNames) ? project.labelNames : []),
      ]
        .map((item) => (typeof item === "string" ? item : item?.name))
        .filter(Boolean)
        .map((item) => String(item).toLowerCase());

      return projectLabels.includes(activeLabelFilter.toLowerCase());
    });
  }, [categoryProjects, activeLabelFilter]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Category và Labels</h1>
          <p className="text-gray-500">Mỗi category có danh sách nhãn riêng, có thể thêm nhãn trực tiếp.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm Category
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Folder className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg">Category List</h2>
          </div>

          <input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="Tìm theo category hoặc label..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
          />

          {loading ? (
            <p className="text-gray-500">Đang tải...</p>
          ) : filteredCategories.length === 0 ? (
            <p className="text-gray-500">Không có category phù hợp</p>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {filteredCategories.map((category) => {
                const isActive = String(selectedCategoryId) === String(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategoryId(String(category.id));
                      setActiveLabelFilter("");
                    }}
                    className={`w-full text-left p-4 border rounded-lg transition-all ${
                      isActive ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{category.name}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {category.description || "Chưa có mô tả"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                        {category.labelsCount} labels
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-span-8 bg-white rounded-xl shadow-sm overflow-hidden">
          {!selectedCategory ? (
            <div className="h-full min-h-[540px] flex flex-col items-center justify-center text-gray-500 p-12">
              <Layers3 className="w-14 h-14 text-gray-300 mb-3" />
              <p className="font-medium">Chọn category để quản lý nhãn</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCategory.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedCategory.description || "Chưa có mô tả"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {selectedCategory.labels.length} labels
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {filteredProjects.length} projects
                  </span>
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-gray-50/60 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Quản lý labels trong category
                </h3>

                <div className="flex gap-3">
                  <input
                    value={labelName}
                    onChange={(event) => setLabelName(event.target.value)}
                    placeholder="Nhập tên nhãn mới..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleAddLabel}
                    disabled={addingLabel || !labelName.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingLabel ? "Đang thêm..." : "Thêm nhãn"}
                  </button>
                </div>

                {selectedCategory.labels.length === 0 ? (
                  <div className="border border-dashed rounded-lg px-4 py-4 text-sm text-gray-500">
                    Category này chưa có label. Hãy thêm nhãn để phân loại dữ liệu.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveLabelFilter("")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        activeLabelFilter === ""
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Tất cả
                    </button>
                    {selectedCategory.labels.map((label) => {
                      const isEditing = String(editingLabelId) === String(label.id);
                      const isProcessing = String(processingLabelId) === String(label.id);

                      return (
                        <div
                          key={label.id}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                            activeLabelFilter === label.name
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-indigo-700 border-indigo-200"
                          }`}
                        >
                          {isEditing ? (
                            <>
                              <input
                                value={editingLabelName}
                                onChange={(event) => setEditingLabelName(event.target.value)}
                                className="w-28 border border-indigo-200 rounded px-2 py-0.5 text-xs text-slate-700"
                                placeholder="Tên nhãn"
                                disabled={isProcessing}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveLabel(label)}
                                disabled={isProcessing || !editingLabelName.trim()}
                                className="p-1 rounded hover:bg-white/20 disabled:opacity-50"
                                title="Luu"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditLabel}
                                disabled={isProcessing}
                                className="p-1 rounded hover:bg-white/20 disabled:opacity-50"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveLabelFilter(label.name)}
                                className="px-1 text-xs font-semibold"
                                title="Lọc theo nhãn"
                              >
                                #{label.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditLabel(label)}
                                disabled={isProcessing}
                                className="p-1 rounded hover:bg-white/20 disabled:opacity-50"
                                title="Sửa nhãn"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLabel(label)}
                                disabled={isProcessing}
                                className="p-1 rounded hover:bg-white/20 disabled:opacity-50"
                                title="Xóa nhãn"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Dự án trong category</h3>

                {fetchingProjects ? (
                  <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="h-36 border-2 border-dashed rounded-xl flex items-center justify-center text-sm text-gray-400">
                    Không có dự án nào phù hợp với label đang chọn
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id || project.projectId}
                        className="p-4 border border-gray-100 rounded-xl bg-gray-50/30"
                      >
                        <h4 className="font-bold text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {project.description || "Chưa có mô tả"}
                        </p>
                        <div className="mt-3 text-xs text-gray-500">Trang thai: {project.status || "N/A"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 w-[460px] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Thêm Category moi</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tên category *</label>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3"
                  placeholder="Ví dụ: Giao thông, Động vật..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mo ta</label>
                <textarea
                  value={newDesc}
                  onChange={(event) => setNewDesc(event.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 min-h-[100px]"
                  placeholder="Mô tả ngắn gọn về category này..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-6 py-2.5 font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                disabled={!newName.trim()}
              >
                Tạo Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




