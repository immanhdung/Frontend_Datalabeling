import {
  ArrowLeft,
  Download,
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
import api, { labelAPI, taskAPI } from "../../config/api";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const toObject = (value) => {
  if (!value) return null;
  if (value?.data && typeof value.data === "object" && !Array.isArray(value.data)) {
    return value.data;
  }
  return typeof value === "object" && !Array.isArray(value) ? value : null;
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
    return { id: `label-local-${index}-${name}`, name };
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

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labelSets, setLabelSets] = useState([]);

  const [categories, setCategories] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("annotator");
  const [memberPage, setMemberPage] = useState(1);
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState("");
  const [assigningTask, setAssigningTask] = useState(false);

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

  const allLabels = useMemo(() => normalizeLabelNames(project, labelSets), [project, labelSets]);

  const selectedCategoryName = useMemo(() => {
    const cid = String(project?.categoryId || project?.category?.id || "");
    const matched = categories.find((item) => String(item?.id || item?.categoryId || "") === cid);
    return matched?.name || project?.category?.name || "N/A";
  }, [project, categories]);

  const linkedDatasets = useMemo(() => {
    const targetIds = new Set(editForm.datasetIds.map((item) => String(item)));
    return datasets.filter((dataset, index) => {
      const dsId = String(dataset?.id ?? dataset?.datasetId ?? `ds-${index}`);
      return targetIds.has(dsId);
    });
  }, [datasets, editForm.datasetIds]);

  const annotatorMembers = useMemo(
    () =>
      projectMembers.filter((member) => {
        const role = String(member?.roleName || member?.role?.name || member?.role || "").toLowerCase();
        return role === "annotator";
      }),
    [projectMembers]
  );

  const getEntityId = (entity) =>
    String(
      entity?.userId ?? entity?.id ?? entity?.memberId ??
      entity?.user?.id ?? entity?.user?._id ?? entity?.user?.userId ?? entity?._id ?? ""
    );

  const getEntityDisplayName = (entity, fallbackPrefix = "User") =>
    entity?.displayName || entity?.name || entity?.username || entity?.email || fallbackPrefix;

  const getEntityRole = (entity) =>
    String(entity?.roleName || entity?.role?.name || entity?.role || "").toLowerCase();

  const projectMemberIdSet = useMemo(() => {
    const ids = projectMembers.map((member) => getEntityId(member)).filter(Boolean).map((item) => String(item));
    return new Set(ids);
  }, [projectMembers]);

  const availableUsersToAdd = useMemo(
    () => allUsers.filter((user) => !projectMemberIdSet.has(getEntityId(user))),
    [allUsers, projectMemberIdSet]
  );

  const filteredUsersToAdd = useMemo(() => {
    const keyword = String(memberSearch || "").trim().toLowerCase();
    return availableUsersToAdd.filter((user) => {
      const role = getEntityRole(user);
      const displayName = String(getEntityDisplayName(user, "User")).toLowerCase();
      const email = String(user?.email || "").toLowerCase();
      const username = String(user?.username || "").toLowerCase();
      const matchRole = role === memberRoleFilter;
      const matchKeyword = !keyword || displayName.includes(keyword) || email.includes(keyword) || username.includes(keyword);
      return matchRole && matchKeyword;
    });
  }, [availableUsersToAdd, memberRoleFilter, memberSearch]);

  const USERS_PER_PAGE = 10;
  const totalMemberPages = Math.max(1, Math.ceil(filteredUsersToAdd.length / USERS_PER_PAGE));
  const currentMemberPage = Math.min(Math.max(memberPage, 1), totalMemberPages);
  const paginatedUsersToAdd = useMemo(() => {
    const start = (currentMemberPage - 1) * USERS_PER_PAGE;
    return filteredUsersToAdd.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsersToAdd, currentMemberPage]);

  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Chỉ gọi các endpoint thực sự tồn tại
      const [projectRes, categoriesRes, datasetsRes, projectDatasetsRes, tasksRes, projectLabelsRes, usersRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get("/categories").catch(() => ({ data: [] })),
        api.get("/datasets").catch(() => ({ data: [] })),
        api.get(`/datasets?ProjectId=${id}`).catch(() => ({ data: [] })),
        api.get("/tasks").catch(() => ({ data: [] })),
        api.get(`/labels?ProjectId=${id}`).catch(() => ({ data: [] })),
        api.get("/users").catch(() => ({ data: [] })),
      ]);

      const fetchedProject =
        toObject(projectRes?.data) ||
        toObject(projectRes?.data?.project) ||
        projectRes?.data;

      // Lấy members từ project detail (nếu có) hoặc từ allUsers filter
      // ❌ Bỏ /projects/{id}/members vì 400
      // ❌ Bỏ /projects/{id}/label-sets vì 404
      let fetchedMembers = [];
      const membersFromProject = toArray(fetchedProject?.members);
      if (membersFromProject.length > 0) {
        fetchedMembers = membersFromProject;
      }

      // Labels từ project detail
      const fetchedLabelSets = toArray(fetchedProject?.labelSets || fetchedProject?.label_sets);
      const projectLabels = toArray(projectLabelsRes?.data);
      if (projectLabels.length > 0) {
        fetchedProject.labels = projectLabels;
      }

      const allTasks = toArray(tasksRes?.data);
      const fetchedTasks = allTasks.filter(
        (task) => String(task?.projectId || task?.project?.id || "") === String(id)
      );

      setProject(fetchedProject);
      setLabelSets(fetchedLabelSets);
      setCategories(toArray(categoriesRes?.data));

      // Merge all datasets + project datasets
      const allDatasets = toArray(datasetsRes?.data);
      const projectDatasets = toArray(projectDatasetsRes?.data);
      const datasetMap = new Map();
      [...allDatasets, ...projectDatasets].forEach((dataset, idx) => {
        const dsId = String(dataset?.id ?? dataset?.datasetId ?? `dataset-${idx}`);
        datasetMap.set(dsId, dataset);
      });
      setDatasets(Array.from(datasetMap.values()));
      setProjectMembers(fetchedMembers);
      setProjectTasks(fetchedTasks);
      setAllUsers(toArray(usersRes?.data));

      const initialLabels = normalizeLabelNames(fetchedProject, fetchedLabelSets);
      const initialDatasetIds = Array.from(
        new Set([
          ...normalizeDatasetIds(fetchedProject),
          ...toArray(projectDatasetsRes?.data)
            .map((dataset) => dataset?.id ?? dataset?.datasetId)
            .filter(Boolean)
            .map((datasetId) => String(datasetId)),
        ])
      );

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

      const fetchedAnnotators = fetchedMembers.filter((member) => {
        const role = String(member?.roleName || member?.role?.name || member?.role || "").toLowerCase();
        return role === "annotator";
      });

      setSelectedTaskId((prev) => {
        const validTaskIds = fetchedTasks.map((task) => String(task?.id || task?.taskId || "")).filter(Boolean);
        if (prev && validTaskIds.includes(String(prev))) return prev;
        return String(fetchedTasks[0]?.id || fetchedTasks[0]?.taskId || "");
      });

      setSelectedAssigneeId((prev) => {
        const validAssigneeIds = fetchedAnnotators.map((member) => getEntityId(member)).filter(Boolean);
        if (prev && validAssigneeIds.includes(String(prev))) return prev;
        return getEntityId(fetchedAnnotators[0]);
      });

    } catch (err) {
      console.error("fetchProjectDetail error:", err);
      setError("Không thể tải thông tin chi tiết dự án. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMemberFromProject = async (member) => {
    const memberId = getEntityId(member);
    if (!memberId) { alert("Không tìm thấy member ID để xóa"); return; }
    const memberName = getEntityDisplayName(member, "Member");
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${memberName} khỏi dự án?`)) return;
    try {
      setRemovingMemberId(memberId);
      await api.delete(`/projects/${id}/members/${memberId}`);
      alert("Đã xóa thành viên khỏi dự án");
      await fetchProjectDetail();
    } catch (err) {
      alert(err?.response?.data?.message || "Xóa thành viên thất bại");
    } finally {
      setRemovingMemberId("");
    }
  };

  const handleAssignTask = async () => {
    const taskId = String(selectedTaskId || "");
    const assigneeId = String(selectedAssigneeId || "");
    if (!taskId || !assigneeId) { alert("Vui lòng chọn task và annotator"); return; }
    try {
      setAssigningTask(true);
      await taskAPI.assign(taskId, assigneeId, id);
      alert("Giao việc thành công");
      await fetchProjectDetail();
    } catch (err) {
      alert(err?.response?.data?.message || "Giao việc thất bại");
    } finally {
      setAssigningTask(false);
    }
  };

  const handleAddMemberToProject = async (targetMemberId) => {
    const memberId = String(targetMemberId || "");
    if (!memberId) { alert("Vui lòng chọn user để thêm vào dự án"); return; }
    if (projectMemberIdSet.has(memberId)) { alert("User này đã thuộc dự án"); return; }
    try {
      setAddingMember(true);
      await api.post(`/projects/${id}/members/${memberId}`, null, { validateStatus: () => true });
      alert("Thêm thành viên vào dự án thành công");
      await fetchProjectDetail();
    } catch (err) {
      alert(err?.response?.data?.message || "Thêm thành viên thất bại");
    } finally {
      setAddingMember(false);
    }
  };

  useEffect(() => { if (id) fetchProjectDetail(); }, [id]);
  useEffect(() => { setMemberPage(1); }, [memberSearch, memberRoleFilter]);
  useEffect(() => { if (memberPage > totalMemberPages) setMemberPage(totalMemberPages); }, [memberPage, totalMemberPages]);
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
        if (currentCategoryId !== selectedCategoryId) return category;
        const normalizedLabels = toArray(category?.labels).map((item, index) => normalizeLabelItem(item, index)).filter(Boolean);
        const nextLabels = updater(normalizedLabels);
        return { ...category, labels: nextLabels, labelsCount: nextLabels.length };
      })
    );
  };

  const startEditCategoryLabel = (label) => {
    setEditingCategoryLabelId(String(label.id));
    setEditingCategoryLabelName(String(label.name || ""));
  };
  const cancelEditCategoryLabel = () => { setEditingCategoryLabelId(""); setEditingCategoryLabelName(""); };

  const handleAddCategoryLabel = async () => {
    const categoryId = String(editForm.categoryId || "");
    const nextName = customLabelInput.trim();
    if (!categoryId || !nextName) { alert("Vui lòng chọn category và nhập tên nhãn"); return; }
    const duplicate = categoryLabelItems.some((item) => String(item.name).trim().toLowerCase() === nextName.toLowerCase());
    if (duplicate) { alert("Nhãn đã tồn tại trong category"); return; }
    setLabelActionTargetId("new");
    try {
      await labelAPI.create(categoryId, { name: nextName });
      patchSelectedCategoryLabels((prev) => [...prev, { id: `label-${Date.now()}`, name: nextName }]);
      setEditForm((prev) => ({ ...prev, labels: prev.labels.includes(nextName) ? prev.labels : [...prev.labels, nextName] }));
      setCustomLabelInput("");
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Thêm nhãn thất bại");
    } finally {
      setLabelActionTargetId("");
    }
  };

  const handleSaveCategoryLabel = async (label) => {
    const categoryId = String(editForm.categoryId || "");
    const nextName = editingCategoryLabelName.trim();
    if (!categoryId || !nextName) { alert("Tên nhãn không hợp lệ"); return; }
    const currentName = String(label.name || "").trim();
    if (currentName.toLowerCase() === nextName.toLowerCase()) { cancelEditCategoryLabel(); return; }
    const duplicate = categoryLabelItems.some(
      (item) => String(item.id) !== String(label.id) && String(item.name).trim().toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) { alert("Tên nhãn đã tồn tại trong category"); return; }
    setLabelActionTargetId(String(label.id));
    try {
      await labelAPI.update(categoryId, label.id, { name: nextName });
      patchSelectedCategoryLabels((prev) => prev.map((item) => String(item.id) === String(label.id) ? { ...item, name: nextName } : item));
      setEditForm((prev) => ({ ...prev, labels: prev.labels.map((item) => String(item).trim().toLowerCase() === currentName.toLowerCase() ? nextName : item) }));
      cancelEditCategoryLabel();
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Cập nhật nhãn thất bại");
    } finally {
      setLabelActionTargetId("");
    }
  };

  const handleDeleteCategoryLabel = async (label) => {
    const categoryId = String(editForm.categoryId || "");
    if (!categoryId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhãn "${label.name}"?`)) return;
    setLabelActionTargetId(String(label.id));
    try {
      await labelAPI.remove(categoryId, label.id, label.name);
      patchSelectedCategoryLabels((prev) => prev.filter((item) => String(item.id) !== String(label.id)));
      setEditForm((prev) => ({ ...prev, labels: prev.labels.filter((item) => String(item).trim().toLowerCase() !== String(label.name).trim().toLowerCase()) }));
      if (String(editingCategoryLabelId) === String(label.id)) cancelEditCategoryLabel();
    } catch (error) {
      alert(error?.response?.data?.message || error?.response?.data?.title || "Xóa nhãn thất bại");
    } finally {
      setLabelActionTargetId("");
    }
  };

  const toggleLabel = (name) => {
    const normalized = String(name || "").trim();
    if (!normalized) return;
    setEditForm((prev) => ({
      ...prev,
      labels: prev.labels.includes(normalized) ? prev.labels.filter((item) => item !== normalized) : [...prev.labels, normalized],
    }));
  };

  const toggleDataset = (datasetId) => {
    const idString = String(datasetId);
    setEditForm((prev) => ({
      ...prev,
      datasetIds: prev.datasetIds.includes(idString) ? prev.datasetIds.filter((item) => item !== idString) : [...prev.datasetIds, idString],
    }));
  };

  const saveProject = async () => {
    try {
      setSaving(true);
      await api.put(`/projects/${id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        isActive: String(editForm.status || "").toLowerCase() !== "inactive",
        guideline: editForm.guideline,
        categoryId: editForm.categoryId || null,
        status: editForm.status,
        type: editForm.type,
        deadline: editForm.deadline || null,
        labels: editForm.labels,
        labelNames: editForm.labels,
      });
      if (editForm.datasetIds.length > 0) {
        await Promise.allSettled(
          editForm.datasetIds.map((datasetId) => api.post(`/datasets/add/${id}`, { datasetId }, { validateStatus: () => true }))
        );
      }
      alert("Cập nhật dự án thành công");
      setIsEditMode(false);
      await fetchProjectDetail();
    } catch (err) {
      alert(err.response?.data?.message || "Cập nhật dự án thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Đang tải thông tin dự án...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-800 font-bold text-lg">{error || "Không tìm thấy dự án"}</p>
        <button onClick={() => navigate("/manager/projects")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Quay lại danh sách
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
            <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{project.status || "Đang hoạt động"}</span>
          </div>
          <p className="text-gray-500 mt-1">{project.description || "Chưa có mô tả cho dự án này."}</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Xuất dữ liệu
          </button>
          <button onClick={() => setIsEditMode((prev) => !prev)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black">
            {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {isEditMode ? "Đóng chỉnh sửa" : "Chỉnh sửa"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Category", value: selectedCategoryName },
          { label: "Datasets", value: linkedDatasets.length },
          { label: "Members", value: projectMembers.length },
          { label: "Tasks", value: projectTasks.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {isEditMode && (
        <div className="bg-white rounded-xl p-5 shadow space-y-5 border border-indigo-100">
          <h3 className="font-semibold text-indigo-700">Chỉnh sửa chi tiết dự án</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên dự án</label>
              <input className="w-full border rounded px-3 py-2" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại</label>
              <input className="w-full border rounded px-3 py-2" value={editForm.type} onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trạng thái</label>
              <input className="w-full border rounded px-3 py-2" value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={editForm.deadline} onChange={(e) => setEditForm((prev) => ({ ...prev, deadline: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hướng dẫn</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={editForm.guideline} onChange={(e) => setEditForm((prev) => ({ ...prev, guideline: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className="w-full border rounded px-3 py-2" value={editForm.categoryId} onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
              <option value="">-- Chọn category --</option>
              {categories.map((category, idx) => {
                const catId = category?.id ?? category?.categoryId ?? `cat-${idx}`;
                return <option key={catId} value={String(catId)}>{category?.name || `Category ${idx + 1}`}</option>;
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
                          <input value={editingCategoryLabelName} onChange={(e) => setEditingCategoryLabelName(e.target.value)} className="w-28 border rounded px-2 py-0.5 text-xs text-slate-700" disabled={isBusy} />
                          <button type="button" onClick={() => handleSaveCategoryLabel(label)} disabled={isBusy || !editingCategoryLabelName.trim()} className="p-1 rounded hover:bg-black/10 disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={cancelEditCategoryLabel} disabled={isBusy} className="p-1 rounded hover:bg-black/10 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => toggleLabel(label.name)} className="px-1">{label.name}</button>
                          <button type="button" onClick={() => startEditCategoryLabel(label)} disabled={isBusy} className="p-1 rounded hover:bg-black/10 disabled:opacity-50"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteCategoryLabel(label)} disabled={isBusy} className="p-1 rounded hover:bg-black/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input value={customLabelInput} onChange={(e) => setCustomLabelInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Thêm nhãn tùy chỉnh..." />
              <button type="button" onClick={handleAddCategoryLabel} disabled={labelActionTargetId === "new" || !customLabelInput.trim() || !editForm.categoryId} className="px-3 py-2 bg-gray-900 text-white rounded disabled:opacity-50">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editForm.labels.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm">
                  {name}
                  <button type="button" onClick={() => toggleLabel(name)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Datasets (chỉ hiện dataset thuộc dự án này)</p>
            {linkedDatasets.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                Dự án chưa có dataset nào. Vào trang Datasets → gán dataset vào dự án này trước.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {linkedDatasets.map((dataset, idx) => {
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
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={saveProject} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow lg:col-span-2">
          <h3 className="font-semibold mb-2">Hướng dẫn gán nhãn</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{project.guideline || "Dự án này chưa có hướng dẫn chi tiết."}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow">
          <h3 className="font-semibold mb-3">Nhãn ({allLabels.length})</h3>
          <div className="flex gap-2 flex-wrap">
            {allLabels.length > 0
              ? allLabels.map((label) => <span key={label} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700">{label}</span>)
              : <p className="text-sm text-gray-400">Chưa có nhãn</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow border border-blue-100 space-y-4">
        <h3 className="font-semibold text-blue-700">Giao việc trong dự án</h3>
        {projectTasks.length === 0 ? (
          <p className="text-sm text-gray-500">Dự án này chưa có task để giao.</p>
        ) : annotatorMembers.length === 0 ? (
          <p className="text-sm text-gray-500">Dự án chưa có annotator member.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Task</label>
              <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="">-- Chọn task --</option>
                {projectTasks.map((task, idx) => {
                  const taskId = String(task?.id || task?.taskId || `task-${idx}`);
                  return <option key={taskId} value={taskId}>{task?.name || task?.title || `Task ${idx + 1}`}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Annotator</label>
              <select value={selectedAssigneeId} onChange={(e) => setSelectedAssigneeId(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="">-- Chọn annotator --</option>
                {annotatorMembers.map((member, idx) => {
                  const memberId = getEntityId(member);
                  return <option key={memberId || `member-${idx}`} value={memberId}>{getEntityDisplayName(member, `Annotator ${idx + 1}`)}</option>;
                })}
              </select>
            </div>
            <div>
              <button type="button" onClick={handleAssignTask} disabled={assigningTask || !selectedTaskId || !selectedAssigneeId} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {assigningTask ? "Đang giao..." : "Giao task"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow border border-emerald-100 space-y-4">
        <h3 className="font-semibold text-emerald-700">Thêm thành viên vào dự án</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Tìm theo tên, username, email..." className="md:col-span-2 border rounded px-3 py-2" />
          <select value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)} className="border rounded px-3 py-2">
            <option value="annotator">Annotator</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </div>

        {filteredUsersToAdd.length === 0 ? (
          <p className="text-sm text-gray-500">
            {availableUsersToAdd.length === 0 ? "Tất cả users hiện đã thuộc dự án này." : "Không có user phù hợp với bộ lọc hiện tại."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Username</th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsersToAdd.map((user, idx) => {
                    const userId = getEntityId(user);
                    const role = getEntityRole(user);
                    return (
                      <tr key={userId || `user-${idx}`} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3 text-sm text-gray-700">{user?.username || "---"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{getEntityDisplayName(user, `User ${idx + 1}`)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{role || "---"}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => handleAddMemberToProject(userId)} disabled={addingMember || !userId} className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 text-sm">
                            {addingMember ? "Đang thêm..." : "Thêm"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Trang {currentMemberPage}/{totalMemberPages} - {filteredUsersToAdd.length} user</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setMemberPage((prev) => (prev <= 1 ? totalMemberPages : prev - 1))} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Trước</button>
                <button type="button" onClick={() => setMemberPage((prev) => (prev >= totalMemberPages ? 1 : prev + 1))} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Sau</button>
              </div>
            </div>
          </div>
        )}

        {projectMembers.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Thành viên hiện tại ({projectMembers.length})</p>
            <div className="flex flex-wrap gap-2">
              {projectMembers.map((member, idx) => {
                const role = getEntityRole(member);
                const memberId = getEntityId(member);
                const busy = removingMemberId === memberId;
                return (
                  <div key={`${memberId}-${idx}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    {getEntityDisplayName(member, `Member ${idx + 1}`)}
                    {role ? <span className="text-gray-500">({role})</span> : null}
                    <button type="button" onClick={() => handleRemoveMemberFromProject(member)} disabled={busy} className="ml-1 text-red-600 hover:text-red-700 disabled:opacity-50">
                      {busy ? "..." : "xóa"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
