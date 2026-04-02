import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { categoryAPI, labelAPI } from "../../config/api";
import {
  Plus,
  Folder,
  ChevronRight,
  Tag,
  X,
  Layers3,
  Pencil,
  Trash2,
  Check,
  Search,
  Clock,
  Database,
  LayoutGrid
} from "lucide-react";



const readArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
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

const getCategoryIdValue = (category) =>
  category?.categoryId ??
  category?.categoryID ??
  category?.CategoryId ??
  category?.id ??
  null;

const normalizeCategory = (category, index, labelsByCategory = {}) => {
  const id = getCategoryIdValue(category) ?? `category-${index}`;
  const externalLabels = asArray(labelsByCategory[String(id)]);
  const mergedCategory = {
    ...category,
    labels: [...asArray(category?.labels), ...externalLabels],
  };
  const labels = normalizeLabels(mergedCategory);

  return {
    ...category,
    id,
    categoryId: id,
    name: category?.name ?? `Category ${index + 1}`,
    description: category?.description ?? "",
    labels,
    labelsCount: labels.length ||
      category?.labelsCount ||
      category?.labelCount ||
      category?.tagsCount ||
      category?.labels?.length ||
      0,
  };
};

// --- Component ---

export default function Categories() {
  const navigate = useNavigate();
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

  // Premium Vibrant Themes
  const themes = [
    { base: 'blue', grad: 'from-blue-600 to-indigo-700', text: 'text-blue-600', bg: 'bg-blue-50', soft: 'bg-blue-50/50', border: 'border-blue-100' },
    { base: 'emerald', grad: 'from-emerald-500 to-teal-700', text: 'text-emerald-600', bg: 'bg-emerald-50', soft: 'bg-emerald-50/50', border: 'border-emerald-100' },
    { base: 'amber', grad: 'from-amber-400 to-orange-600', text: 'text-amber-600', bg: 'bg-amber-50', soft: 'bg-amber-50/50', border: 'border-amber-100' },
    { base: 'rose', grad: 'from-rose-500 to-pink-700', text: 'text-rose-600', bg: 'bg-rose-50', soft: 'bg-rose-50/50', border: 'border-rose-100' },
    { base: 'purple', grad: 'from-purple-500 to-violet-700', text: 'text-purple-600', bg: 'bg-purple-50', soft: 'bg-purple-50/50', border: 'border-purple-100' }
  ];

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
      const rawCategories = readArray(response?.data);
      if (rawCategories.length === 0) {
        syncCategoriesState([], "");
        setLoading(false);
        return;
      }

      const categoriesWithLabels = rawCategories.map((cat, index) => {
        return normalizeCategory(cat, index);
      });

      syncCategoriesState(categoriesWithLabels, preferredId || selectedCategoryId);
    } catch {
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
      const response = await api.get("/projects");
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
    } catch {
      setCategoryProjects([]);
    } finally {
      setFetchingProjects(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Background sync for all category label counts (quietly)
  useEffect(() => {
    if (loading || categories.length === 0) return;

    const syncAllCounts = async () => {
      for (const cat of categories) {
        // If already has labels, skip (unless they are 0 and we want to double check)
        if (cat.labelsCount > 0) continue;

        try {
          const res = await api.get(`/categories/${cat.id}/labels`);
          const fetchedLabels = asArray(res?.data);
          if (fetchedLabels.length > 0) {
            setCategories(prev => prev.map(item => {
              if (String(item.id) === String(cat.id)) {
                const normalized = normalizeLabels({ ...item, labels: fetchedLabels });
                return { ...item, labels: normalized, labelsCount: normalized.length };
              }
              return item;
            }));
          }
        } catch (e) {
          // Ignore failures silently in background sync
        }
        // Small delay between calls to be nice to the server
        await new Promise(r => setTimeout(r, 200));
      }
    };

    syncAllCounts();
  }, [loading]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    fetchCategoryProjects(selectedCategoryId);

    const refreshLabels = async () => {
      try {
        const res = await api.get(`/categories/${selectedCategoryId}/labels`);
        const fetchedLabels = asArray(res?.data);
        setCategories(prev => prev.map(cat => {
          if (String(cat.id) === String(selectedCategoryId)) {
            const merged = { ...cat, labels: fetchedLabels };
            const normalized = normalizeLabels(merged);
            return { ...cat, labels: normalized, labelsCount: normalized.length };
          }
          return cat;
        }));
      } catch (err) {
        console.error("Refresh labels failed", err);
      }
    };
    refreshLabels();
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
  const handleDeleteCategory = async (e, categoryId, categoryName) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${categoryName}"?`)) return;
    try {
      // Optimistic update: remove from local state first
      const nextCategories = categories.filter(c => String(c.id) !== String(categoryId));
      syncCategoriesState(nextCategories, "");

      await categoryAPI.remove(categoryId);
      await fetchCategories();
      alert("Xóa danh mục thành công!");
    } catch (error) {
      console.error("Delete category error:", error);
      alert(error?.response?.data?.message || "Xóa danh mục thất bại");
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
    if (!selectedCategory || !nextName) {
      alert("Vui lòng nhập tên nhãn hợp lệ");
      return;
    }

    const nextName = editingLabelName.trim();
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

    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhãn "${label.name}"?`)) {
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
    <div className="p-10 space-y-10 bg-[#fcfdfe] min-h-screen font-sans">
      {/* Header section with high-end typography */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">

          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Category & Label Management</h1>

        </div>

        <button
          onClick={() => setShowModal(true)}
          className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 hover:-translate-y-1 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Tạo Category
        </button>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Left Side: Category List with glassmorphism approach */}
        <div className="col-span-4 space-y-6">
          <div className="bg-white rounded-[40px] p-8 shadow-premium border border-slate-50 overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Folder className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="font-display font-black text-xl text-slate-900">Danh Mục</h2>
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm danh mục hoặc nhãn..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
              />
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải dữ liệu...</p>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Không tìm thấy kết quả</p>
                </div>
              ) : (
                filteredCategories.map((c, idx) => {
                  const theme = themes[idx % themes.length];
                  const isActive = String(selectedCategoryId) === String(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCategoryId(String(c.id)); setActiveLabelFilter(""); }}
                      className={`w-full text-left p-6 rounded-[32px] transition-all duration-300 border-2 flex items-center justify-between group cursor-pointer ${isActive ? `${theme.bg} ${theme.border} scale-[1.02] shadow-lg` : "border-transparent bg-white hover:bg-slate-50"
                        }`}
                    >
                      <div className="space-y-1.5 flex-1 pr-4">
                        <p className={`font-black text-lg ${isActive ? theme.text : "text-slate-900"}`}>{c.name}</p>

                        <div className={`w-8 h-1 rounded-full mt-3 ${isActive ? `bg-gradient-to-r ${theme.grad}` : "bg-slate-100"}`} />
                      </div>
                      <div className="flex flex-col items-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? `bg-gradient-to-br ${theme.grad} text-white shadow-md` : "bg-slate-50 text-slate-300 group-hover:bg-white"}`}>
                          <h4 className="font-black text-sm">{c.labelsCount}</h4>
                        </div>
                        <button
                          onClick={(e) => handleDeleteCategory(e, c.id, c.name)}
                          className={`p-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors ${isActive ? "text-slate-400 opacity-60" : "text-slate-300"}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Category Detail Workspace */}
        <div className="col-span-8 bg-white rounded-[48px] shadow-premium border border-slate-50 min-h-[700px] flex flex-col overflow-hidden relative">
          {!selectedCategory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-6">
              <div className="w-32 h-32 rounded-[48px] bg-slate-50 flex items-center justify-center text-slate-100">
                <Layers3 className="w-20 h-20" />
              </div>
              <p className="font-black uppercase tracking-[0.2em] text-sm">Chọn mục để quản lý nhãn và dự án</p>
            </div>
          ) : (
            <div className="p-12 space-y-12 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Detail Header */}
              <div className="flex justify-between items-start gap-10 border-b border-slate-50 pb-12">
                <div className="space-y-3">
                  <h2 className="text-4xl font-display font-black text-slate-900 tracking-tight">{selectedCategory.name}</h2>

                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 px-6 py-4 rounded-3xl border border-indigo-100/50">
                    <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Tổng nhãn</span>
                    <span className="text-3xl font-black text-indigo-600 leading-none">{selectedCategory.labels.length}</span>
                  </div>
                  <div className="bg-emerald-50 px-6 py-4 rounded-3xl text-right border border-emerald-100/50">
                    <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Dự án</span>
                    <span className="text-3xl font-black text-emerald-600 leading-none">{categoryProjects.length}</span>
                  </div>
                </div>
              </div>

              {/* Labels Management Area */}
              <div className="space-y-8 bg-slate-50/50 p-10 rounded-[40px] border border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 flex items-center gap-3 uppercase tracking-widest text-sm text-indigo-600/80">
                    <Tag className="w-5 h-5" />
                    Quản lý nhãn
                  </h3>
                </div>

                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      value={labelName}
                      onChange={(e) => setLabelName(e.target.value)}
                      placeholder="Nhập tên nhãn mới muốn thêm..."
                      className="w-full bg-white border border-slate-200 rounded-[24px] pl-14 pr-6 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700 shadow-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddLabel}
                    disabled={addingLabel || !labelName.trim()}
                    className="px-10 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-100 disabled:opacity-30 transition-all flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4" />
                    {addingLabel ? "Adding..." : "Thêm nhãn"}
                  </button>
                </div>

                {/* Dynamic Label Tags with Theme context */}
                <div className="flex flex-wrap gap-3">

                  {selectedCategory.labels.map((l, lIdx) => {
                    const isEditing = String(editingLabelId) === String(l.id);
                    const theme = themes[lIdx % themes.length];
                    const isProcessing = String(processingLabelId) === String(l.id);
                    const isFiltered = activeLabelFilter === l.name;

                    return (
                      <div
                        key={l.id}
                        className={`group inline-flex items-center gap-3 rounded-2xl border-2 px-7 py-3 transition-all duration-300 ${isFiltered ? `bg-gradient-to-r ${theme.grad} text-white shadow-xl ${theme.border}` : `bg-white border-slate-50 ${theme.text} hover:scale-105 hover:border-slate-200`
                          }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <input
                              value={editingLabelName}
                              onChange={(e) => setEditingLabelName(e.target.value)}
                              className="w-32 bg-transparent focus:outline-none text-xs font-black border-b-2 border-current px-1"
                              autoFocus
                              disabled={isProcessing}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel(l)}
                            />
                            {isProcessing ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleSaveLabel(l)} disabled={!editingLabelName.trim()} className="hover:scale-125 transition-transform"><Check className="w-4 h-4" /></button>
                                <button onClick={handleCancelEditLabel} className="hover:scale-125 transition-transform"><X className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setActiveLabelFilter(isFiltered ? "" : l.name)} className="text-sm font-black uppercase tracking-wider">
                              #{l.name}
                            </button>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all pl-1 border-l border-current/20">
                              <Pencil onClick={() => handleStartEditLabel(l)} className="w-3.5 h-3.5 cursor-pointer hover:rotate-12 transition-transform" />

                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Associated Projects View */}
              <div className="space-y-8 flex-1 flex flex-col">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] px-2 flex items-center gap-3 text-emerald-600/70">
                  <Database className="w-5 h-5" />
                  Dự án
                </h3>

                {fetchingProjects ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/20 rounded-[40px] border-2 border-dashed border-slate-100">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Searching database...</p>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-24 bg-slate-50/20 rounded-[40px] border-2 border-dashed border-slate-100 group">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Database className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Không có dự án nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-8 pb-10">
                    {filteredProjects.map((p) => (
                      <button
                        key={p.id || p.projectId}
                        onClick={() => {
                          const pid = p.id || p.projectId;
                          if (pid) navigate(`/manager/projects/${pid}`);
                        }}
                        className="group p-8 border border-slate-100 rounded-[40px] bg-white hover:shadow-2xl hover:-translate-y-2 transition-all text-left relative overflow-hidden"
                      >
                        <div className="relative z-10 space-y-5">
                          <div className="flex items-center justify-between gap-4">
                            <h4 className="font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-1">{p.name}</h4>
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed h-10">
                            {p.description || "Dự án thu thập và gán nhãn dữ liệu chất lượng cao cho học máy."}
                          </p>
                          <div className="flex items-center justify-between pt-5 border-t border-slate-100/50">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{p.status || "In Progress"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Clock className="w-4 h-4" />
                              <span className="text-[10px] font-bold">Latest data</span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50/50 rounded-full group-hover:scale-150 transition-transform duration-700 ease-out" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal - Redesigned for Premium Look */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-300 p-6">
          <div className="bg-white rounded-[48px] p-12 w-full max-w-[600px] shadow-2xl relative overflow-hidden scale-in-center border border-white/20">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600" />

            <div className="flex justify-between items-center mb-12">
              <div className="space-y-1">
                <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Tạo category mới</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-all hover:rotate-90 text-slate-400 hover:text-slate-900"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-3 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Tên danh mục *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-[28px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-lg transition-all"
                  placeholder="Ví dụ: Giao thông đường bộ, Y khoa..."
                  autoFocus
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Mô tả
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-[28px] px-8 py-5 min-h-[140px] focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all resize-none"
                  placeholder="Mô tả mục đích sử dụng của danh mục này..."
                />
              </div>

              <div className="flex gap-5 mt-12">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-5 font-black text-[11px] uppercase tracking-widest border-2 border-slate-100 text-slate-400 rounded-[28px] hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newName.trim()}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
