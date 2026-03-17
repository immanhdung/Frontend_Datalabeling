export const toArrayData = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};


export const normalizeProjectStatus = (status) => String(status || "").trim().toLowerCase();

export const isActiveProject = (project) => {
  const status = normalizeProjectStatus(project?.status);
  return status === "active" || status === "in_progress" || status === "ongoing" || status === "đang hoạt động";
};

export const isCompletedProject = (project) => {
  const status = normalizeProjectStatus(project?.status);
  return status === "completed" || status === "done" || status === "finished" || status === "hoàn thành";
};

export const getProjectStatusMeta = (project) => {
  if (isCompletedProject(project)) {
    return { statusType: "completed", label: "Hoàn thành" };
  }
  if (isActiveProject(project)) {
    return { statusType: "active", label: "Đang hoạt động" };
  }
  return { statusType: "pending", label: "Chờ xử lý" };
};

export const getProjectItemCount = (project) => {
  return Number(
    project?.imagesCount ??
      project?.itemsCount ??
      project?.totalItems ??
      project?.itemCount ??
      project?.imageCount ??
      project?.items?.length ??
      0
  ) || 0;
};

export const getProjectTypeLabel = (project) => {
  const raw = String(project?.type || project?.projectType || project?.taskType || "").trim();
  if (!raw) return "N/A";
  return raw;
};

export const getProjectUpdatedAt = (project) =>
  project?.updatedAt || project?.updated_at || project?.modifiedAt || project?.createdAt || project?.created_at || null;

export const formatRelativeDateVi = (dateValue) => {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Vừa xong";
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
};

export const sortProjectsByNewest = (projects) =>
  [...projects].sort((a, b) => {
    const aTime = new Date(getProjectUpdatedAt(a) || 0).getTime();
    const bTime = new Date(getProjectUpdatedAt(b) || 0).getTime();
    return bTime - aTime;
  });
