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
  ChevronDown,
  Folder,
  Database,
  Tag,
  Users,
  LayoutGrid,
  FolderOpen
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api, { labelAPI, taskAPI, exportAPI } from "../../config/api";

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
  const fromProject = toArray(project?.labels || project?.labelNames || project?.labelList || project?.ProjectLabels)
    .map((item) => (typeof item === "string" ? item : item?.name ?? item?.labelName ?? item?.title))
    .filter(Boolean);
  const fromLabelSets = labelSets.flatMap((set) =>
    toArray(set?.labels).map((item) => item?.name ?? item?.labelName ?? item?.title)
  ).filter(Boolean);
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

  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportForm, setExportForm] = useState({
    format: "json",
    trainSplitRatio: 0.8,
    randomSeed: 0
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [guidelineId, setGuidelineId] = useState(null);
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
      const [projectRes, categoriesRes, datasetsRes, projectDatasetsRes, tasksRes, projectLabelsRes, usersRes, guidelineRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get("/categories").catch(() => ({ data: [] })),
        api.get("/datasets").catch(() => ({ data: [] })),
        api.get(`/projects/${id}/datasets`).catch(() => ({ data: [] })),
        api.get("/tasks").catch(() => ({ data: [] })),
        api.get(`/projects/${id}/labels`).catch(() => api.get(`/labels?ProjectId=${id}`)).catch(() => ({ data: [] })),
        api.get("/users").catch(() => ({ data: [] })),
        api.get(`/projects/${id}/guideline`).catch(() => ({ data: null })),
      ]);

      const fetchedProject =
        toObject(projectRes?.data) ||
        toObject(projectRes?.data?.project) ||
        projectRes?.data;

      const guidelineRaw = guidelineRes?.data?.data || guidelineRes?.data;
      let guidelineContent = "";
      let foundId = null;

      if (typeof guidelineRaw === 'string') {
        guidelineContent = guidelineRaw;
      } else if (guidelineRaw && typeof guidelineRaw === 'object') {
        guidelineContent = guidelineRaw.content || guidelineRaw.guideline || guidelineRaw.text || "";
        foundId = guidelineRaw.id || guidelineRaw.guidelineId;
      }

      setGuidelineId(foundId);

      if (guidelineContent) {
        fetchedProject.guideline = guidelineContent;
      } else {

        fetchedProject.guideline = fetchedProject.guideline || "";
      }


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

  const handleExportData = async () => {
    try {
      setExporting(true);
      // Construct filename
      const timestamp = new Date().getTime();
      const filename = `Project_${id}_Export_${exportForm.format}_${timestamp}.${exportForm.format === 'json' ? 'json' : 'zip'}`;

      const payload = {
        format: exportForm.format,
        trainSplitRatio: exportForm.format === 'yolo' ? exportForm.trainSplitRatio : 0.8,
        randomSeed: exportForm.format === 'yolo' ? exportForm.randomSeed : 0
      };

      const res = await api.post(`/exports/${id}`, payload, { responseType: 'blob' });

      // Create a blob from the response data. 
      // If it's already a blob, we use it directly. If it's an object (fallback), we stringify it.
      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);

      setShowExportModal(false);
      alert("Xuất dữ liệu thành công!");
    } catch (err) {
      console.error("Export failed:", err);
      // Try to read the error from the blob if possible
      if (err.response?.data instanceof Blob) {
        const errorText = await err.response.data.text();
        try {
          const errorJson = JSON.parse(errorText);
          alert("Có lỗi xảy ra khi xuất dữ liệu: " + (errorJson.message || errorJson.title || "Lỗi server"));
        } catch (e) {
          alert("Có lỗi xảy ra khi xuất dữ liệu: " + errorText);
        }
      } else {
        alert("Có lỗi xảy ra khi xuất dữ liệu: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = async () => {
    setShowExportModal(true);
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
      const updatePayload = {
        description: editForm.description.trim(),
        isActive: String(editForm.status || "").toLowerCase() !== "inactive",
      };

      // Only include name if it actually changed
      if (editForm.name.trim() !== project.name) {
        updatePayload.name = editForm.name.trim();
      }

      await api.put(`/projects/${id}`, updatePayload);

      try {
        if (guidelineId) {
          await api.put(`/guidelines/${guidelineId}`, {
            content: editForm.guideline || ""
          });
        } else {

          await api.post("/guidelines", {
            projectId: id,
            content: editForm.guideline || ""
          });
          setTimeout(fetchProjectDetail, 1000);
        }
      } catch (e) {
        console.warn("Could not update/create guideline via /guidelines.");
      }

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

  const statusTheme = useMemo(() => {
    const s = String(project?.status || "").toLowerCase();
    if (s.includes("active") || s.includes("hoạt động")) return { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500", label: "Đang hoạt động" };
    if (s.includes("complete") || s.includes("hoàn thành")) return { bg: "bg-indigo-500/10", text: "text-indigo-500", dot: "bg-indigo-500", label: "Hoàn thành" };
    return { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500", label: s || "Chờ xử lý" };
  }, [project?.status]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-600/20 rounded-full animate-ping absolute" />
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Loading...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-rose-50 rounded-[40px] flex items-center justify-center text-rose-500 shadow-xl shadow-rose-100">
          <AlertCircle className="w-12 h-12" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Truy cập bị từ chối</h2>
          <p className="text-slate-400 font-medium max-w-sm">{error || "Dự án không tồn tại hoặc đã bị gỡ bỏ khỏi HUB."}</p>
        </div>
        <button
          onClick={() => navigate("/manager/projects")}
          className="px-10 py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] hover:bg-black hover:-translate-y-1 transition-all shadow-xl"
        >
          Trở lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 space-y-10 bg-[#fcfdfe] min-h-screen font-sans max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-12 h-12 rounded-[20px] bg-white shadow-premium border border-slate-50 flex items-center justify-center hover:bg-slate-50 hover:scale-105 transition-all text-slate-400 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`px-4 py-1.5 rounded-full ${statusTheme.bg} ${statusTheme.text} flex items-center gap-2 border border-current/10 shadow-sm shadow-current/10`}>
              <div className={`w-2 h-2 rounded-full ${statusTheme.dot} animate-pulse`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{statusTheme.label}</span>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-display font-black text-slate-900 tracking-tight leading-tight">{project.name}</h1>
            <p className="text-slate-400 font-medium max-w-2xl text-lg leading-relaxed">{project.description || "Đang truy cập ngữ cảnh thông tin dự án..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            disabled={exporting}
            onClick={() => setShowExportModal(true)}
            className="group flex items-center gap-3 px-8 py-4 bg-white border border-slate-100 text-slate-900 rounded-[28px] font-black uppercase tracking-widest text-[11px] hover:shadow-2xl hover:-translate-y-1 transition-all shadow-premium"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Download className="w-4 h-4 text-indigo-600 group-hover:rotate-12 transition-transform" />}
            {exporting ? "Đang xử lý..." : "Xuất dữ liệu"}
          </button>
          <button
            onClick={() => setIsEditMode((prev) => !prev)}
            className={`group flex items-center gap-3 px-8 py-4 rounded-[28px] font-black uppercase tracking-widest text-[11px] hover:shadow-2xl hover:-translate-y-1 transition-all shadow-xl ${isEditMode ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-rose-100' : 'bg-slate-900 text-white shadow-slate-200'}`}
          >
            {isEditMode ? <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> : <Pencil className="w-4 h-4 group-hover:-rotate-12 transition-transform" />}
            {isEditMode ? "Hủy chỉnh sửa" : "Chỉnh sửa"}
          </button>
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: "Category", value: selectedCategoryName, icon: <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Folder className="w-5 h-5" /></div> },
          { label: "Datasets", value: linkedDatasets.length, icon: <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Database className="w-5 h-5" /></div> },
          { label: "Nhãn", value: allLabels.length, icon: <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Tag className="w-5 h-5" /></div> },
          { label: "Thành viên", value: projectMembers.length, icon: <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Users className="w-5 h-5" /></div> },
          { label: "Công việc đã giao", value: projectTasks.length, icon: <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><LayoutGrid className="w-5 h-5" /></div> },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-premium flex flex-col justify-between group hover:scale-105 transition-all duration-500 cursor-default">
            <div className="flex justify-between items-start">
              {item.icon}
              <div className="w-2 h-2 rounded-full bg-slate-100 group-hover:bg-indigo-400 transition-colors" />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-2xl font-display font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {isEditMode && (
        <div className="bg-white rounded-[48px] p-10 md:p-12 shadow-premium border border-indigo-50/50 space-y-12 animate-in slide-in-from-top-10 duration-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 blur-3xl -z-10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-center gap-6 border-b border-slate-50 pb-8">
            <div className="w-16 h-16 rounded-[24px] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Save className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-3xl font-display font-black text-slate-900 tracking-tight">Cấu hình dự án</h3>
              <p className="text-slate-400 font-medium">Cập nhật các tham số chính và phân loại cho dự án này.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tên dự án</label>
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-[28px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-slate-700"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên dự án..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Loại công việc</label>
                  <input
                    className="w-full bg-slate-50 border border-slate-100 rounded-[28px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-slate-700"
                    value={editForm.type}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Trạng thái</label>
                  <input
                    className="w-full bg-slate-50 border border-slate-100 rounded-[28px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-slate-700 uppercase"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Mô tả dự án</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-8 py-5 min-h-[160px] focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-slate-700 resize-none leading-relaxed"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Tóm tắt mục tiêu dự án..."
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Hướng dẫn thực hiện</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-8 py-5 min-h-[160px] focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-slate-700 resize-none leading-relaxed"
                  value={editForm.guideline}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, guideline: e.target.value }))}
                  placeholder="Cung cấp hướng dẫn chi tiết cho người dán nhãn..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Danh mục</label>
                <div className="relative group">
                  <select
                    className="w-full bg-slate-50 border border-slate-100 rounded-[28px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-slate-700 appearance-none cursor-pointer"
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((category, idx) => {
                      const catId = category?.id ?? category?.categoryId ?? `cat-${idx}`;
                      return <option key={catId} value={String(catId)}>{category?.name || `Category ${idx + 1}`}</option>;
                    })}
                  </select>
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Taxonomy Section */}
          <div className="pt-12 border-t border-slate-50 space-y-10">
            <div className="flex items-center gap-3">
              <Tag className="w-6 h-6 text-indigo-600" />
              <h4 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Định nghĩa nhãn</h4>
            </div>

            <div className="bg-slate-50/50 p-10 rounded-[40px] border border-slate-100 space-y-8">
              <div className="flex gap-4">
                <input
                  value={customLabelInput}
                  onChange={(e) => setCustomLabelInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-[24px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-700 shadow-sm"
                  placeholder="Thêm nhãn mới..."
                />
                <button
                  type="button"
                  onClick={handleAddCategoryLabel}
                  disabled={labelActionTargetId === "new" || !customLabelInput.trim() || !editForm.categoryId}
                  className="px-10 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] hover:shadow-xl disabled:opacity-30 transition-all"
                >
                  Thêm nhãn
                </button>
              </div>

              <div className="flex flex-wrap gap-4">
                {categoryLabelItems.map((label) => {
                  const checked = editForm.labels.includes(label.name);
                  const isEditing = String(editingCategoryLabelId) === String(label.id);
                  const isBusy = String(labelActionTargetId) === String(label.id);
                  return (
                    <div
                      key={label.id}
                      className={`group flex items-center transition-all duration-300 rounded-2xl border-2 px-6 py-3 ${checked ? "bg-indigo-600 border-indigo-600 text-white scale-105 shadow-lg shadow-indigo-100" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"}`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-3">
                          <input
                            value={editingCategoryLabelName}
                            onChange={(e) => setEditingCategoryLabelName(e.target.value)}
                            className="w-32 bg-transparent focus:outline-none text-xs font-black border-b-2 border-current px-1"
                            autoFocus
                            disabled={isBusy}
                          />
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleSaveCategoryLabel(label)} className="hover:scale-125 transition-transform"><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEditCategoryLabel} className="hover:scale-125 transition-transform"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <button onClick={() => toggleLabel(label.name)} className="text-xs font-black uppercase tracking-wider">#{label.name}</button>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all border-l border-current/20 pl-4">
                            <Pencil onClick={() => startEditCategoryLabel(label)} className="w-3.5 h-3.5 cursor-pointer hover:rotate-12 transition-transform" />
                            <Trash2 onClick={() => handleDeleteCategoryLabel(label)} className="w-3.5 h-3.5 cursor-pointer hover:scale-125 transition-transform" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-12 border-t border-slate-50">
            <button
              onClick={saveProject}
              disabled={saving}
              className="flex items-center gap-4 px-12 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs hover:shadow-2xl hover:shadow-indigo-200 hover:-translate-y-1 disabled:opacity-50 transition-all border-none"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Đang đồng bộ..." : "Áp dụng thay đổi"}
            </button>
          </div>
        </div>
      )}

      {/* Content Sections Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2 space-y-8">
          {/* Guidelines Card */}
          <div className="bg-white rounded-[48px] p-12 shadow-premium border border-slate-50 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -translate-x-12 translate-y-12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 flex items-center justify-center">
                <FolderOpen className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight">Hướng dẫn gán nhãn</h3>
            </div>
            <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 leading-relaxed text-slate-600 font-medium text-lg min-h-[300px] whitespace-pre-wrap">
              {project.guideline || "Chưa có nội dung hướng dẫn cho dự án này."}
            </div>
          </div>

        </div>

        {/* Labels Sidebar Card */}
        <div className="space-y-8">
          <div className="bg-white rounded-[48px] p-10 shadow-premium border border-slate-50 space-y-10 sticky top-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-amber-500 text-white shadow-xl shadow-amber-100 flex items-center justify-center">
                <Tag className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight">Danh sách nhãn</h3>
            </div>

            <div className="flex flex-wrap gap-3">
              {allLabels.length > 0 ? (
                allLabels.map((label, idx) => (
                  <span
                    key={idx}
                    className="px-6 py-3 rounded-2xl bg-slate-50 text-slate-900 font-black uppercase tracking-[0.15em] text-[10px] border border-slate-100 hover:scale-105 hover:bg-white hover:shadow-lg transition-all cursor-default"
                  >
                    #{label}
                  </span>
                ))
              ) : (
                <div className="w-full py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-50 rounded-[32px]">
                  Chưa có nhãn nào
                </div>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-xl p-12 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -translate-x-6 translate-y-6 blur-3xl opacity-50" />

            <div className="flex items-center justify-between border-b border-slate-50 pb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 flex items-center justify-center">
                  <Download className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight">Xuất dữ liệu</h3>
                  <p className="text-slate-400 font-medium">Cấu hình các tham số trích xuất dữ liệu.</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-12 h-12 rounded-[20px] bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-105"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Định dạng tập tin đầu ra</label>
                <div className="grid grid-cols-3 gap-4">
                  {['json', 'coco', 'yolo'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportForm(prev => ({ ...prev, format: fmt }))}
                      className={`py-5 rounded-[24px] border-2 font-black uppercase text-xs tracking-widest transition-all ${exportForm.format === fmt
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100 scale-[1.02]'
                        : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {exportForm.format === 'yolo' && (
                <div className="space-y-8 pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-6">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỷ lệ chia tập dữ liệu</label>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-4 py-1.5 rounded-full shadow-sm">
                        {Math.round(exportForm.trainSplitRatio * 100)}% Train / {Math.round((1 - exportForm.trainSplitRatio) * 100)}% Val
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={exportForm.trainSplitRatio}
                      onChange={(e) => setExportForm(prev => ({ ...prev, trainSplitRatio: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Mã ngẫu nhiên (Randomizer Seed)</label>
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      value={exportForm.randomSeed}
                      onChange={(e) => setExportForm(prev => ({ ...prev, randomSeed: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-700 transition-all"
                      placeholder="VD: 42"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest text-[11px] hover:shadow-2xl hover:shadow-indigo-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {exporting ? "Đang hoàn tất..." : "Bắt đầu xuất dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
