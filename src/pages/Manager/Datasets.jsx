import { useEffect, useMemo, useState, useRef } from "react";
import {
    Plus,
    Search,
    MoreVertical,
    FolderPlus,
    FileArchive,
    Image as ImageIcon,
    X,
    Check,
    Trash2,
    Link2,
    Upload,
    AlertCircle,
    Loader2,
    Eye,
    Calendar,
    Database,
    Pencil
} from "lucide-react";
import api from "../../config/api";
import Pagination from "../../components/common/Pagination";

const toArray = (value) => {
    if (Array.isArray(value)) return value;
    const root = value?.data ?? value?.items ?? value?.results ?? value;
    if (Array.isArray(root)) return root;
    if (Array.isArray(root?.items)) return root.items;
    return [];
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"];
const MIME_EXTENSION_MAP = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/gif": "gif",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
};


const formatBytes = (bytes) => {
    const numeric = Number(bytes || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return "N/A";
    const units = ["B", "KB", "MB", "GB"];
    let value = numeric;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const parseItemMetadata = (item) => {
    const metadata = item?.metadata ?? item?.meta ?? item?.info;
    if (!metadata) return null;

    if (typeof metadata === "string") {
        try {
            return JSON.parse(metadata);
        } catch {
            return null;
        }
    }

    if (typeof metadata === "object") {
        return metadata;
    }

    return null;
};

const getItemName = (item, fallbackIndex) => {
    if (typeof item === "string" || typeof item === "number") {
        const raw = String(item).trim();
        return raw || `item-${fallbackIndex + 1}`;
    }

    const name = item?.name || item?.fileName || item?.filename || item?.originalName || item?.path;
    if (name) return String(name);

    const url = item?.url || item?.thumbnailUrl || item?.fileUrl || item?.storageUri || item?.uri;
    if (url && typeof url === "string") {
        const parts = url.split("/");
        const finalPart = parts[parts.length - 1];
        if (finalPart) return decodeURIComponent(finalPart);
    }

    return `item-${fallbackIndex + 1}`;
};

const getItemSizeBytes = (item) => {
    if (typeof item === "string" || typeof item === "number") {
        return 0;
    }

    const parsedMeta = parseItemMetadata(item);
    const raw =
        item?.size ??
        item?.fileSize ??
        item?.length ??
        item?.contentLength ??
        item?.bytes ??
        item?.fileBytes ??
        parsedMeta?.size ??
        parsedMeta?.fileSize ??
        parsedMeta?.bytes;
    const numeric = Number(raw || 0);
    return Number.isFinite(numeric) ? numeric : 0;
};

const getItemExtension = (item, fallbackIndex) => {
    const name = getItemName(item, fallbackIndex);
    const chunks = String(name).split(".");
    if (chunks.length <= 1) {
        const fromMime = getExtensionFromMimeType(item?.mediaType ?? item?.mimeType ?? item?.contentType);
        return fromMime !== "unknown" ? fromMime : "unknown";
    }
    return chunks[chunks.length - 1].toLowerCase();
};

const isImageItem = (item, fallbackIndex) => {
    if (typeof item === "object" && item !== null) {
        const mimeType = String(item?.mimeType ?? item?.contentType ?? item?.type ?? "").toLowerCase();
        if (mimeType.startsWith("image/")) {
            return true;
        }
    }

    const ext = getItemExtension(item, fallbackIndex);
    return IMAGE_EXTENSIONS.includes(ext);
};

const getItemDimensions = (item) => {
    if (typeof item === "string" || typeof item === "number") {
        return null;
    }

    const parsedMeta = parseItemMetadata(item);
    const width = Number(item?.width ?? item?.imageWidth ?? item?.meta?.width ?? parsedMeta?.width ?? 0);
    const height = Number(item?.height ?? item?.imageHeight ?? item?.meta?.height ?? parsedMeta?.height ?? 0);
    if (width > 0 && height > 0) {
        return { width, height };
    }
    return null;
};

const resolvePreviewUrl = (item) => {
    if (typeof item === "string" || typeof item === "number") {
        return "";
    }

    const candidate =
        item?.thumbnailUrl ||
        item?.thumbnailURL ||
        item?.previewUrl ||
        item?.previewURL ||
        item?.imageUrl ||
        item?.imageURL ||
        item?.fileUrl ||
        item?.fileURL ||
        item?.storageUri ||
        item?.uri ||
        item?.url ||
        item?.path ||
        item?.filePath;

    if (!candidate || typeof candidate !== "string") return "";

    if (/^(https?:|data:|blob:)/i.test(candidate)) return candidate;

    const configuredBase = import.meta.env.VITE_API_BASE_URL || "";
    const normalizedBase = configuredBase.replace(/\/$/, "");
    const absoluteApiBase = normalizedBase.startsWith("http")
        ? normalizedBase
        : `${window.location.origin}${normalizedBase}`;
    const staticBase = absoluteApiBase.replace(/\/api$/i, "");

    if (candidate.startsWith("/")) {
        return `${staticBase}${candidate}`;
    }

    return `${staticBase}/${candidate}`;
};

const getQualityInfo = (item, fallbackIndex) => {
    if (!isImageItem(item, fallbackIndex)) {
        return { status: "na", text: "N/A" };
    }

    const sizeBytes = getItemSizeBytes(item);
    const dims = getItemDimensions(item);

    const lowBySize = sizeBytes > 0 && sizeBytes < 80 * 1024;
    const lowByDimension = dims ? dims.width < 640 || dims.height < 480 : false;

    if (lowBySize || lowByDimension) {
        return { status: "low", text: "Chất lượng thấp" };
    }

    if (dims || sizeBytes > 0) {
        return { status: "ok", text: "Tốt" };
    }

    return { status: "unknown", text: "Chưa đủ dữ liệu" };
};

const getItemId = (item, fallbackIndex) => {
    if (typeof item === "string" || typeof item === "number") {
        const primitiveId = String(item).trim();
        return primitiveId || `local-${fallbackIndex}`;
    }

    const id = item?.id ?? item?.itemId ?? item?.datasetItemId ?? item?.datasetItemID;
    if (id !== undefined && id !== null && String(id).trim() !== "") {
        return String(id);
    }
    return `local-${fallbackIndex}`;
};

const normalizeDatasetItem = (item, index, datasetId = null) => {
    if (typeof item === "string" || typeof item === "number") {
        return { id: String(item), itemId: String(item), __datasetId: datasetId };
    }

    if (!item || typeof item !== "object") {
        return { id: `local-${index}`, __datasetId: datasetId };
    }

    const normalizedId =
        item?.id ??
        item?.itemId ??
        item?.datasetItemId ??
        item?.datasetItemID ??
        item?.dataset_item_id;
    if (normalizedId !== undefined && normalizedId !== null && String(normalizedId).trim() !== "") {
        return {
            ...item,
            id: String(normalizedId),
            itemId: String(normalizedId),
            storageUri: item?.storageUri ?? item?.storageURL ?? item?.uri ?? item?.url ?? null,
            __datasetId: datasetId ?? item?.datasetId ?? item?.datasetID ?? item?.dataset_id ?? null,
        };
    }

    return {
        ...item,
        id: `local-${index}`,
        storageUri: item?.storageUri ?? item?.storageURL ?? item?.uri ?? item?.url ?? null,
        __datasetId: datasetId ?? item?.datasetId ?? item?.datasetID ?? item?.dataset_id ?? null,
    };
};

const extractDatasetItems = (raw) => {
    if (Array.isArray(raw)) {
        return raw;
    }

    if (raw && typeof raw === "object") {
        const candidates = [
            raw.items,
            raw.itemIds,
            raw.datasetItemIds,
            raw.ids,
            raw.data,
            raw.data?.items,
            raw.data?.itemIds,
            raw.data?.datasetItemIds,
        ];

        const firstArray = candidates.find((candidate) => Array.isArray(candidate));
        if (firstArray) {
            return firstArray;
        }
    }

    return [];
};

const normalizeDatasetItems = (raw, datasetId = null) =>
    extractDatasetItems(raw).map((item, index) => normalizeDatasetItem(item, index, datasetId));

const getExtensionFromMimeType = (mimeType) => {
    const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
    return MIME_EXTENSION_MAP[normalized] || "unknown";
};

const parseFilenameFromContentDisposition = (contentDisposition) => {
    const value = String(contentDisposition || "");
    if (!value) return "";

    const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1].replace(/"/g, "")).trim();
        } catch {
            return utf8Match[1].trim();
        }
    }

    const plainMatch = value.match(/filename="?([^";]+)"?/i);
    return plainMatch?.[1]?.trim() || "";
};

const readImageDimensionsFromBlob = (blob) =>
    new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
            URL.revokeObjectURL(objectUrl);
        };

        image.onerror = () => {
            resolve(null);
            URL.revokeObjectURL(objectUrl);
        };

        image.src = objectUrl;
    });

const getQualityFromMetrics = ({ isImage, sizeBytes, dimensions }) => {
    if (!isImage) {
        return { status: "na", text: "N/A" };
    }

    const lowBySize = sizeBytes > 0 && sizeBytes < 80 * 1024;
    const lowByDimension = dimensions ? dimensions.width < 640 || dimensions.height < 480 : false;

    if (lowBySize || lowByDimension) {
        return { status: "low", text: "Chất lượng thấp" };
    }

    if (sizeBytes > 0 || dimensions) {
        return { status: "ok", text: "Tốt" };
    }

    return { status: "unknown", text: "Chưa đủ dữ liệu" };
};

const getInsightScore = (insight) => {
    if (!insight) return 0;
    let score = 0;
    if (insight.extension && insight.extension !== "unknown") score += 1;
    if (Number(insight.sizeBytes || 0) > 0) score += 1;
    if (insight.dimensions?.width > 0 && insight.dimensions?.height > 0) score += 2;
    if (insight.isImage) score += 1;
    return score;
};

export default function Datasets() {
    const [datasets, setDatasets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [uploadingDetailItems, setUploadingDetailItems] = useState(false);
    const [deletingItemIds, setDeletingItemIds] = useState([]);
    const [securePreviewUrls, setSecurePreviewUrls] = useState({});
    const [itemInsights, setItemInsights] = useState({});
    const [previewImage, setPreviewImage] = useState(null);
    const secureBlobUrlsRef = useRef([]);

    // New Dataset State
    const [newDataset, setNewDataset] = useState({
        name: "",
        zipFile: null,
        images: []
    });
    const [uploadType, setUploadType] = useState("images"); // "images" or "zip"
    const fileInputRef = useRef(null);

    // Edit State
    const [editName, setEditName] = useState("");
    const [editUploadType, setEditUploadType] = useState("images");
    const [editImages, setEditImages] = useState([]);
    const [editZipFile, setEditZipFile] = useState(null);
    const editFileInputRef = useRef(null);

    const [openMenuId, setOpenMenuId] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Detail modal pagination state
    const [detailCurrentPage, setDetailCurrentPage] = useState(1);
    const [detailPageSize, setDetailPageSize] = useState(10);

    const getDatasetId = (dataset) => dataset?.id ?? dataset?.datasetId ?? null;

    const patchDatasetCount = (datasetId, itemCount) => {
        setDatasets((prev) =>
            prev.map((dataset) => {
                const currentId = getDatasetId(dataset);
                if (String(currentId || "") !== String(datasetId || "")) {
                    return dataset;
                }

                return {
                    ...dataset,
                    itemsCount: itemCount,
                    imagesCount: itemCount,
                    totalItems: itemCount,
                    itemCount,
                    imageCount: itemCount,
                };
            })
        );
    };

    const createImagePreviews = useMemo(
        () => newDataset.images.map((file) => ({
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
        })),
        [newDataset.images]
    );

    const editImagePreviews = useMemo(
        () => editImages.map((file) => ({
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
        })),
        [editImages]
    );

    useEffect(() => {
        return () => {
            createImagePreviews.forEach((item) => URL.revokeObjectURL(item.url));
        };
    }, [createImagePreviews]);

    useEffect(() => {
        return () => {
            editImagePreviews.forEach((item) => URL.revokeObjectURL(item.url));
        };
    }, [editImagePreviews]);

    useEffect(() => {
        return () => {
            secureBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            secureBlobUrlsRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!showDetailModal || detailItems.length === 0) {
            setSecurePreviewUrls({});
            setItemInsights({});
            return;
        }

        let disposed = false;
        const freshBlobUrls = [];

        const loadSecurePreviews = async () => {
            const nextPreviewUrls = {};
            const nextItemInsights = {};

            await Promise.all(
                detailItems.map(async (item, idx) => {
                    const itemId = getItemId(item, idx);
                    const fallbackName = getItemName(item, idx);
                    const fallbackExt = getItemExtension(item, idx);
                    const fallbackSizeBytes = getItemSizeBytes(item);
                    const fallbackDimensions = getItemDimensions(item);
                    const fallbackIsImage = isImageItem(item, idx);

                    if (!itemId || itemId.startsWith("local-")) {
                        const directUrl = resolvePreviewUrl(item);
                        const fallbackQuality = getQualityFromMetrics({
                            isImage: fallbackIsImage,
                            sizeBytes: fallbackSizeBytes,
                            dimensions: fallbackDimensions,
                        });

                        nextItemInsights[itemId] = {
                            fileName: fallbackName,
                            extension: fallbackExt,
                            sizeBytes: fallbackSizeBytes,
                            dimensions: fallbackDimensions,
                            qualityStatus: fallbackQuality.status,
                            qualityText: fallbackQuality.text,
                            isImage: fallbackIsImage,
                        };

                        if (directUrl && fallbackIsImage) {
                            nextPreviewUrls[itemId] = directUrl;
                        }
                        return;
                    }

                    try {
                        const datasetId = item?.__datasetId ?? selectedDataset?.id ?? selectedDataset?.datasetId ?? null;

                        const response = await api.get(`/datasets/items/${itemId}`, { responseType: "blob" });
                        const mimeType = String(response?.data?.type || "").toLowerCase();

                        // Fallback: some backends may return item metadata JSON instead of binary file.
                        if (mimeType.includes("application/json")) {
                            const text = await response.data.text();
                            const parsed = JSON.parse(text || "{}");
                            const source = parsed?.data ?? parsed?.item ?? parsed;
                            const normalizedSource = normalizeDatasetItem(source, idx, datasetId);
                            const jsonName = getItemName(normalizedSource, idx);
                            const jsonExt = getItemExtension(normalizedSource, idx);
                            const jsonSizeBytes = getItemSizeBytes(normalizedSource) || fallbackSizeBytes;
                            const jsonDimensions = getItemDimensions(normalizedSource) || fallbackDimensions;
                            const jsonIsImage = isImageItem(normalizedSource, idx) || fallbackIsImage;
                            const jsonQuality = getQualityFromMetrics({
                                isImage: jsonIsImage,
                                sizeBytes: jsonSizeBytes,
                                dimensions: jsonDimensions,
                            });

                            nextItemInsights[itemId] = {
                                fileName: jsonName || fallbackName,
                                extension: jsonExt !== "unknown" ? jsonExt : fallbackExt,
                                sizeBytes: jsonSizeBytes,
                                dimensions: jsonDimensions,
                                qualityStatus: jsonQuality.status,
                                qualityText: jsonQuality.text,
                                isImage: jsonIsImage,
                            };

                            const directUrl = resolvePreviewUrl(normalizedSource);
                            if (directUrl && jsonIsImage) {
                                nextPreviewUrls[itemId] = directUrl;
                            }
                            return;
                        }

                        const extensionFromMime = getExtensionFromMimeType(mimeType);
                        const isImageByMime = mimeType.startsWith("image/");
                        const isImage = isImageByMime || fallbackIsImage || IMAGE_EXTENSIONS.includes(extensionFromMime);
                        const blobSizeBytes = Number(response?.data?.size || 0);
                        const responseHeaders = response?.headers || {};
                        const contentDisposition =
                            responseHeaders["content-disposition"] || responseHeaders["Content-Disposition"];
                        const serverFileName = parseFilenameFromContentDisposition(contentDisposition);
                        const dimensions = isImage ? await readImageDimensionsFromBlob(response.data) : fallbackDimensions;
                        const quality = getQualityFromMetrics({
                            isImage,
                            sizeBytes: blobSizeBytes || fallbackSizeBytes,
                            dimensions,
                        });

                        nextItemInsights[itemId] = {
                            fileName: serverFileName || fallbackName,
                            extension: extensionFromMime !== "unknown" ? extensionFromMime : fallbackExt,
                            sizeBytes: blobSizeBytes || fallbackSizeBytes,
                            dimensions,
                            qualityStatus: quality.status,
                            qualityText: quality.text,
                            isImage,
                        };

                        // Some APIs return item metadata without filename/extension, so detect image from blob MIME.
                        if (isImage) {
                            const blobUrl = URL.createObjectURL(response.data);
                            freshBlobUrls.push(blobUrl);
                            nextPreviewUrls[itemId] = blobUrl;
                        }
                    } catch {
                        const directUrl = resolvePreviewUrl(item);
                        const fallbackQuality = getQualityFromMetrics({
                            isImage: fallbackIsImage,
                            sizeBytes: fallbackSizeBytes,
                            dimensions: fallbackDimensions,
                        });

                        nextItemInsights[itemId] = {
                            fileName: fallbackName,
                            extension: fallbackExt,
                            sizeBytes: fallbackSizeBytes,
                            dimensions: fallbackDimensions,
                            qualityStatus: fallbackQuality.status,
                            qualityText: fallbackQuality.text,
                            isImage: fallbackIsImage,
                        };

                        if (directUrl && fallbackIsImage) {
                            nextPreviewUrls[itemId] = directUrl;
                        }
                    }
                })
            );

            if (disposed) {
                freshBlobUrls.forEach((url) => URL.revokeObjectURL(url));
                return;
            }

            setSecurePreviewUrls(nextPreviewUrls);
            setItemInsights((prev) => {
                const merged = { ...prev };
                Object.entries(nextItemInsights).forEach(([itemId, nextInsight]) => {
                    const current = merged[itemId];
                    merged[itemId] = getInsightScore(nextInsight) >= getInsightScore(current)
                        ? nextInsight
                        : current;
                });
                return merged;
            });
            secureBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            secureBlobUrlsRef.current = freshBlobUrls;
        };

        loadSecurePreviews();

        return () => {
            disposed = true;
        };
    }, [detailItems, showDetailModal, selectedDataset]);

    const getPreviewSrc = (item, idx) => {
        const itemId = getItemId(item, idx);
        return securePreviewUrls[itemId] || resolvePreviewUrl(item);
    };

    const openImagePreview = (src, name) => {
        if (!src) return;
        setPreviewImage({ src, name: name || "Dataset image" });
    };

    // ================= FETCH DATA =================
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const { getAssignedTasksByUserMap } = await import("../../utils/annotatorTaskHelpers");

            let apiDatasets = [];
            let apiProjects = [];

            try {
                const datasetRes = await api.get("/datasets", { params: { PageSize: 1000, pageSize: 1000, page: 1 } });
                apiDatasets = toArray(datasetRes.data);
            } catch (err) {
                console.warn("API Datasets failed, falling back to local history", err);
            }

            try {
                const projRes = await api.get("/projects", { params: { PageSize: 1000, pageSize: 1000 } });
                apiProjects = toArray(projRes.data);
            } catch {
                apiProjects = [];
            }

            const localTasksMap = getAssignedTasksByUserMap();
            const allLocalTasks = Object.values(localTasksMap).flat();
            
            const localDatasets = [];
            const seenDids = new Set(apiDatasets.map(d => String(d.id || d.datasetId)));
            
            allLocalTasks.forEach(t => {
                const did = String(t.datasetId || t.dataset?.id || "");
                if (did && !seenDids.has(did)) {
                    localDatasets.push({
                        id: did,
                        datasetId: did,
                        name: t.datasetName || t.dataset?.name || `Dataset #${did.slice(0, 5)}`,
                        imagesCount: t.totalItems || t.items?.length || 0,
                        createdAt: t.createdAt
                    });
                    seenDids.add(did);
                }
            });

            const merged = [...apiDatasets, ...localDatasets];
            setDatasets(merged);
            setProjects(apiProjects);

            const countResults = await Promise.allSettled(
                merged.map(async (dataset) => {
                    const datasetId = getDatasetId(dataset);
                    if (!datasetId) return { datasetId: null, itemCount: 0 };
                    
                    try {
                      const itemsRes = await api.get(`/datasets/${datasetId}/items`, { params: { PageSize: 1 } });
                      return {
                          datasetId,
                          itemCount: itemsRes?.data?.totalCount || normalizeDatasetItems(itemsRes?.data).length || dataset.imagesCount || 0,
                      };
                    } catch {
                      return { datasetId, itemCount: dataset.imagesCount || 0 };
                    }
                })
            );

            const countMap = new Map();
            countResults.forEach((result) => {
                if (result.status !== "fulfilled") return;
                const datasetId = result.value?.datasetId;
                if (!datasetId) return;
                countMap.set(String(datasetId), Number(result.value?.itemCount || 0));
            });

            if (countMap.size > 0) {
                setDatasets((prev) =>
                    prev.map((dataset) => {
                        const datasetId = getDatasetId(dataset);
                        if (!datasetId) return dataset;
                        const itemCount = countMap.get(String(datasetId));
                        if (itemCount === undefined) return dataset;

                        return {
                            ...dataset,
                            itemsCount: itemCount,
                            imagesCount: itemCount,
                            totalItems: itemCount,
                            itemCount,
                            imageCount: itemCount,
                        };
                    })
                );
            }
        } catch (err) {
            console.error(err);
            setError("Không tải được dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    // ================= ACTIONS =================
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (uploadType === "zip") {
            setNewDataset(prev => ({ ...prev, zipFile: files[0] }));
        } else {
            setNewDataset(prev => ({ ...prev, images: [...prev.images, ...files] }));
        }

        if (e.target) {
            e.target.value = "";
        }
    };

    const resetAddForm = () => {
        setNewDataset({ name: "", zipFile: null, images: [] });
        setUploadType("images");
    };

    const buildInsightFromFile = async (file) => {
        const fileName = String(file?.name || "");
        const extension = fileName.includes(".")
            ? fileName.split(".").pop().toLowerCase()
            : getExtensionFromMimeType(file?.type || "");
        const isImage = String(file?.type || "").toLowerCase().startsWith("image/") || IMAGE_EXTENSIONS.includes(extension);
        const dimensions = isImage ? await readImageDimensionsFromBlob(file) : null;
        const sizeBytes = Number(file?.size || 0);
        const quality = getQualityFromMetrics({
            isImage,
            sizeBytes,
            dimensions,
        });

        return {
            fileName: fileName || "uploaded-file",
            extension: extension || "unknown",
            sizeBytes,
            dimensions,
            qualityStatus: quality.status,
            qualityText: quality.text,
            isImage,
        };
    };

    const handleCreateDataset = async () => {
        if (!newDataset.name.trim()) {
            alert("Vui lòng nhập tên Dataset");
            return;
        }

        if (uploadType === "zip" && !newDataset.zipFile) {
            alert("Vui lòng chọn file ZIP");
            return;
        }

        if (uploadType === "images" && newDataset.images.length === 0) {
            alert("Vui lòng chọn ít nhất một ảnh");
            return;
        }

        try {
            setLoading(true);
            const uploadedInsights = {};

            // 1. Create Dataset
            const createRes = await api.post("/datasets", { name: newDataset.name });
            const datasetId = createRes.data?.id || createRes.data?.datasetId;
            if (!datasetId) throw new Error("Không tạo được dataset");

            // 2. Upload Content
            if (uploadType === "zip") {
                const formData = new FormData();
                formData.append("File", newDataset.zipFile);
                formData.append("Name", newDataset.zipFile.name);
                await api.post(`/datasets/${datasetId}/items`, formData);
            } else {
                for (const file of newDataset.images) {
                    const formData = new FormData();
                    formData.append("File", file);
                    formData.append("Name", file.name);
                    const uploadRes = await api.post(`/datasets/${datasetId}/items`, formData);
                    const uploadedItemId =
                        uploadRes?.data?.id ??
                        uploadRes?.data?.itemId ??
                        uploadRes?.data?.datasetItemId ??
                        uploadRes?.data?.data?.id ??
                        uploadRes?.data?.data?.itemId ??
                        null;
                    if (uploadedItemId) {
                        uploadedInsights[String(uploadedItemId)] = await buildInsightFromFile(file);
                    }
                }
            }

            if (Object.keys(uploadedInsights).length > 0) {
                setItemInsights((prev) => ({ ...prev, ...uploadedInsights }));
            }

            alert("Tạo dataset thành công!");
            setShowAddModal(false);
            resetAddForm();
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Thêm dataset thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEditDataset = async () => {
        if (!editName.trim()) return;
        try {
            setLoading(true);
            const id = selectedDataset.id || selectedDataset.datasetId;
            await api.put(`/datasets/${id}`, { name: editName });
            alert("Cập nhật thành công!");
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Cập nhật thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDataset = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa dataset này? Dữ liệu bên trong sẽ bị mất.")) return;

        try {
            setLoading(true);
            // Standarizing to uppercase for this resource
            await api.delete(`/datasets/${id}`);
            setDatasets(prev => prev.filter(d => (d.id || d.datasetId) !== id));
            alert("Đã xóa dataset thành công!");
        } catch (err) {
            console.error("Delete error details:", err.response || err);
            const errorMsg = err.response?.data?.message || err.message;
            if (err.response?.status === 500) {
                alert("Lỗi Server (500): Không thể xóa dataset này. Có thể dataset đang được sử dụng trong một dự án hoặc gặp lỗi ràng buộc dữ liệu phía backend.");
            } else {
                alert("Xóa thất bại: " + errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAssignToProject = async (projectId) => {
        try {
            setLoading(true);
            const dsId = selectedDataset.id || selectedDataset.datasetId;

            // Thử attach trực tiếp
            const attachRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(dsId) }, {
                validateStatus: () => true,
            });

            if (attachRes.status === 200 || attachRes.status === 201 || attachRes.status === 204) {
                alert("Gán vào project thành công!");
                setShowAssignModal(false);
                fetchData();
                return;
            }

            const attachMsg = String(attachRes.data?.message || '');

            if (!attachMsg.toLowerCase().includes('already')) {
                alert("Gán thất bại: " + (attachMsg || 'Lỗi không xác định'));
                return;
            }

            // Dataset đang thuộc project khác → brute-force remove rồi add lại
            let removed = false;
            try {
                const projRes = await api.get('/projects', { validateStatus: () => true });
                const allProjects = projRes.data?.items || projRes.data?.data || projRes.data || [];
                for (const proj of Array.isArray(allProjects) ? allProjects : []) {
                    const pid = proj.projectId || proj.id;
                    if (!pid || String(pid) === String(projectId)) continue;
                    const removeRes = await api.post(`/datasets/remove/${pid}`, { datasetId: String(dsId) }, {
                        validateStatus: () => true,
                    });
                    if (removeRes.status === 200 || removeRes.status === 201 || removeRes.status === 204) {
                        removed = true;
                        break;
                    }
                }
            } catch (e) {
                console.warn('Error during remove:', e?.message);
            }

            if (removed) {
                await new Promise(r => setTimeout(r, 500));
                const retryRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(dsId) }, {
                    validateStatus: () => true,
                });
                if (retryRes.status === 200 || retryRes.status === 201 || retryRes.status === 204) {
                    alert("Gán vào project thành công!");
                    setShowAssignModal(false);
                    fetchData();
                    return;
                }
            }

            // Dataset bị orphan - hỏi user có muốn xóa và tạo lại không
            const confirmed = window.confirm(
                `Dataset "${selectedDataset?.name}" đang bị lỗi trạng thái trong hệ thống (không thể gán vào project nào).\n\n` +
                `Bấm OK để XÓA dataset này và tạo lại dataset mới cùng tên (các file ảnh sẽ bị mất, cần upload lại).\n\n` +
                `Bấm Hủy để bỏ qua.`
            );

            if (!confirmed) return;

            // Xóa dataset cũ
            const deleteRes = await api.delete(`/datasets/${dsId}`, { validateStatus: () => true });
            if (deleteRes.status !== 200 && deleteRes.status !== 204) {
                alert("Không thể xóa dataset: " + (deleteRes.data?.message || 'Lỗi không xác định'));
                return;
            }

            // Tạo dataset mới cùng tên
            const createRes = await api.post('/datasets', { name: selectedDataset?.name || 'Dataset mới' });
            const newDsId = createRes.data?.id || createRes.data?.datasetId || createRes.data?.data?.id;
            if (!newDsId) {
                alert("Tạo dataset mới thất bại.");
                return;
            }

            // Gán dataset mới vào project
            const assignNewRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(newDsId) }, {
                validateStatus: () => true,
            });

            if (assignNewRes.status === 200 || assignNewRes.status === 201 || assignNewRes.status === 204) {
                alert(`Đã tạo lại dataset "${selectedDataset?.name}" và gán vào project thành công!\n\nVui lòng upload lại ảnh vào dataset mới.`);
                setShowAssignModal(false);
                fetchData();
            } else {
                alert("Tạo lại dataset thành công nhưng gán vào project thất bại. Vui lòng gán thủ công.");
                setShowAssignModal(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchDatasetDetail = async (datasetId) => {
        const [infoRes, itemsRes] = await Promise.all([
            api.get(`/datasets/${datasetId}`),
            api.get(`/datasets/${datasetId}/items`),
        ]);

        return {
            dataset: infoRes?.data,
            items: normalizeDatasetItems(itemsRes?.data, datasetId),
        };
    };

    const handleViewDetail = async (ds) => {
        const id = ds.id || ds.datasetId;
        setShowDetailModal(true);
        setLoadingDetail(true);

        try {
            const detail = await fetchDatasetDetail(id);
            setSelectedDataset(detail.dataset);
            setDetailItems(detail.items);
            setDetailCurrentPage(1);
            patchDatasetCount(id, detail.items.length);
        } catch (err) {
            console.error("Fetch dataset details error:", err);
            setSelectedDataset(ds); // Fallback to list info
            setDetailItems([]);
        } finally {
            setLoadingDetail(false);
        }
    };

    const openEditDatasetModal = async (ds) => {
        const id = ds.id || ds.datasetId;
        setSelectedDataset(ds);
        setEditName(ds.name || "");
        setEditUploadType("images");
        setEditImages([]);
        setEditZipFile(null);
        setShowEditModal(true);

        try {
            setLoadingDetail(true);
            const detail = await fetchDatasetDetail(id);
            setSelectedDataset(detail.dataset);
            setDetailItems(detail.items);
            setDetailCurrentPage(1);
            patchDatasetCount(id, detail.items.length);
        } catch (err) {
            console.error("Fetch dataset details for edit error:", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleEditFilesChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (editUploadType === "zip") {
            setEditZipFile(files[0] || null);
            if (e.target) e.target.value = "";
            return;
        }
        setEditImages((prev) => [...prev, ...files]);
        if (e.target) e.target.value = "";
    };

    const uploadFilesToDataset = async () => {
        const dsId = selectedDataset?.id || selectedDataset?.datasetId;
        if (!dsId) return;

        if (editUploadType === "zip" && !editZipFile) {
            alert("Vui lòng chọn file ZIP");
            return;
        }

        if (editUploadType === "images" && editImages.length === 0) {
            alert("Vui lòng chọn ít nhất một ảnh");
            return;
        }

        const files = editUploadType === "zip" ? [editZipFile] : editImages;

        try {
            setUploadingDetailItems(true);
            const uploadedInsights = {};
            for (const file of files) {
                const formData = new FormData();
                formData.append("File", file);
                formData.append("Name", file.name);
                const uploadRes = await api.post(`/datasets/${dsId}/items`, formData);

                const uploadedItemId =
                    uploadRes?.data?.id ??
                    uploadRes?.data?.itemId ??
                    uploadRes?.data?.datasetItemId ??
                    uploadRes?.data?.data?.id ??
                    uploadRes?.data?.data?.itemId ??
                    null;

                if (uploadedItemId && editUploadType === "images") {
                    uploadedInsights[String(uploadedItemId)] = await buildInsightFromFile(file);
                }
            }

            if (Object.keys(uploadedInsights).length > 0) {
                setItemInsights((prev) => ({ ...prev, ...uploadedInsights }));
            }

            const detail = await fetchDatasetDetail(dsId);
            setSelectedDataset(detail.dataset);
            setDetailItems(detail.items);
            patchDatasetCount(dsId, detail.items.length);
            setEditImages([]);
            setEditZipFile(null);
            fetchData();
            alert("Đã cập nhật dữ liệu dataset");
        } catch (err) {
            alert("Thêm file thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setUploadingDetailItems(false);
        }
    };

    const handleDeleteDatasetItem = async (item) => {
        const dsId = selectedDataset?.id || selectedDataset?.datasetId;
        const itemId = item?.id || item?.itemId || item?.datasetItemId;
        if (!dsId || !itemId) {
            alert("Không xác định được file cần xóa");
            return;
        }

        if (!window.confirm("Bạn có chắc chắn muốn xóa file này?")) return;

        try {
            setDeletingItemIds((prev) => [...prev, String(itemId)]);
            await api.delete(`/datasets/${dsId}/items/${itemId}`);

            setDetailItems((prev) => prev.filter((it) => String(it?.id || it?.itemId || it?.datasetItemId) !== String(itemId)));
            patchDatasetCount(dsId, Math.max(detailItems.length - 1, 0));
            setItemInsights((prev) => {
                const next = { ...prev };
                delete next[String(itemId)];
                return next;
            });
            setSecurePreviewUrls((prev) => {
                const next = { ...prev };
                delete next[String(itemId)];
                return next;
            });
            fetchData();
        } catch (err) {
            alert("Xóa file thất bại: " + (err.response?.data?.message || err.message));
        } finally {
            setDeletingItemIds((prev) => prev.filter((id) => id !== String(itemId)));
        }
    };

    // ================= RENDER =================
    const filteredDatasets = datasets.filter(d =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDetailFiles = detailItems.length;
    const totalDetailSize = detailItems.reduce((sum, item, index) => {
        const itemId = getItemId(item, index);
        const insight = itemInsights[itemId];
        return sum + Number(insight?.sizeBytes ?? getItemSizeBytes(item) ?? 0);
    }, 0);
    const lowQualityCount = detailItems.reduce((sum, item, index) => {
        const itemId = getItemId(item, index);
        const insight = itemInsights[itemId];
        const quality = insight
            ? { status: insight.qualityStatus, text: insight.qualityText }
            : getQualityInfo(item, index);
        return quality.status === "low" ? sum + 1 : sum;
    }, 0);

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Thư viện Dataset</h1>
                    <p className="text-gray-500 mt-1">Quản lý và tổ chức các nguồn dữ liệu của bạn</p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 font-bold"
                >
                    <Plus className="w-5 h-5" />
                    Tạo Dataset mới
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Tìm kiếm dataset theo tên..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to page 1 on search
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm"
                />
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Dataset Grid */}
            {loading && datasets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
                </div>
            ) : filteredDatasets.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                    <FolderPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-400">Không tìm thấy dataset nào</h3>
                    <p className="text-gray-500 mt-1">Hãy thử tìm kiếm từ khóa khác hoặc tạo dataset mới</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDatasets
                            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                            .map((ds) => {
                                const id = ds.id || ds.datasetId;
                                return (
                                    <div
                                        key={id}
                                        className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="relative transition-all">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === id ? null : id);
                                                    }}
                                                    className="p-2 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5 text-gray-500 hover:text-indigo-600" />
                                                </button>

                                                {openMenuId === id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDetail(ds);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Xem chi tiết
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditDatasetModal(ds);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            Chỉnh sửa dataset
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDataset(ds);
                                                                setShowAssignModal(true);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <Link2 className="w-4 h-4" />
                                                            Gán vào project
                                                        </button>

                                                        <div className="h-px bg-gray-100 my-1" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteDataset(id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Xóa Dataset
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-5 group-hover:bg-indigo-600 transition-colors duration-300">
                                            <FolderPlus className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{ds.name}</h3>
                                        <div className="mt-4 flex items-center gap-4 text-sm font-medium text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <ImageIcon className="w-4 h-4" />
                                                {ds.imagesCount || ds.itemsCount || ds.totalItems || ds.itemCount || ds.imageCount || ds.items?.length || 0} files
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Database className="w-4 h-4" />
                                                {formatBytes(ds.totalSize || ds.totalBytes || ds.size || ds.datasetSize)}
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-400 mt-4 italic">
                                            Ngày tạo: {ds.createdAt ? new Date(ds.createdAt).toLocaleDateString() : "N/A"}
                                        </p>
                                    </div>
                                );
                            })}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredDatasets.length / pageSize)}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={setPageSize}
                        pageSizeOptions={[5, 10, 20, 50]}
                        totalItems={filteredDatasets.length}
                    />
                </div>
            )}

            {/* CREATE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Tạo Dataset mới</h2>
                                <p className="text-sm text-gray-500 mt-1">Chuẩn bị dữ liệu cho quy trình gán nhãn của bạn</p>
                            </div>
                            <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-200">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto">
                            {/* Dataset Name */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-700 ml-1">Tên Dataset *</label>
                                <input
                                    type="text"
                                    value={newDataset.name}
                                    onChange={(e) => setNewDataset(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ví dụ: Training_Cars_2024"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all text-lg font-bold placeholder:font-normal"
                                />
                            </div>

                            {/* Upload Section */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 ml-1">Nguồn dữ liệu *</label>
                                <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl w-fit">
                                    <button
                                        onClick={() => setUploadType("images")}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadType === "images" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        Hình ảnh
                                    </button>
                                    <button
                                        onClick={() => setUploadType("zip")}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadType === "zip" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        <FileArchive className="w-4 h-4" />
                                        Tệp ZIP
                                    </button>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-[28px] p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                >
                                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-700">Kéo thả hoặc click để tải lên</p>
                                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-black">
                                            {uploadType === "images" ? "Chấp nhận: .jpg, .png, .jpeg" : "Chấp nhận: .zip (Tối đa 500MB)"}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        multiple={uploadType === "images"}
                                        accept={uploadType === "images" ? "image/*" : ".zip"}
                                        className="hidden"
                                    />
                                </div>

                                {uploadType === "images" && newDataset.images.length > 0 && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                                                {newDataset.images.length} tệp đã chọn
                                            </span>
                                            <button onClick={() => setNewDataset(p => ({ ...p, images: [] }))} className="text-xs font-bold text-red-500 hover:underline">Xóa tất cả</button>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {createImagePreviews.map((item, index) => (
                                                <div key={`${item.name}-${index}`} className="relative border rounded-xl overflow-hidden bg-white">
                                                    <img src={item.url} alt={item.name} className="w-full h-24 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewDataset((prev) => ({
                                                            ...prev,
                                                            images: prev.images.filter((_, i) => i !== index),
                                                        }))}
                                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                                                        title="Bỏ ảnh này"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <div className="px-2 py-1 text-[10px] text-gray-600 truncate">
                                                        {item.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {uploadType === "zip" && newDataset.zipFile && (
                                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in bounce-in duration-300">
                                        <FileArchive className="w-6 h-6 text-indigo-600" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-indigo-900 truncate">{newDataset.zipFile.name}</p>
                                            <p className="text-[10px] text-indigo-400 uppercase font-black">{(newDataset.zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button onClick={() => setNewDataset(p => ({ ...p, zipFile: null }))} className="p-1.5 hover:bg-indigo-200 text-indigo-600 rounded-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600">
                                Nhãn được quản lý ở trang Category. Dataset chỉ quản lý tệp và archive.
                            </div>
                        </div>

                        <div className="p-8 border-t bg-gray-50/50 flex justify-end gap-4">
                            <button
                                onClick={() => { setShowAddModal(false); resetAddForm(); }}
                                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleCreateDataset}
                                disabled={loading || !newDataset.name}
                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2 transition-all"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? "Đang xử lý..." : "Khởi tạo Dataset"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa Dataset</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-700 ml-1">Đổi tên Dataset</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all text-lg font-bold"
                                    />
                                    <button onClick={handleEditDataset} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">Lưu tên</button>
                                </div>
                            </div>

                            <div className="space-y-4 border rounded-2xl p-4 bg-gray-50/40">
                                <p className="text-sm font-bold text-gray-700">Thêm dữ liệu (Ảnh hoặc ZIP)</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditUploadType("images")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${editUploadType === "images" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                                    >
                                        Ảnh
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditUploadType("zip")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${editUploadType === "zip" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                                    >
                                        ZIP
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => editFileInputRef.current?.click()} className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm font-semibold">Chọn file</button>
                                    <button type="button" onClick={uploadFilesToDataset} disabled={uploadingDetailItems} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                                        {uploadingDetailItems ? "Đang upload..." : "Upload vào dataset"}
                                    </button>
                                </div>
                                <input
                                    ref={editFileInputRef}
                                    type="file"
                                    className="hidden"
                                    multiple={editUploadType === "images"}
                                    accept={editUploadType === "images" ? "image/*" : ".zip"}
                                    onChange={handleEditFilesChange}
                                />

                                {editUploadType === "images" && editImages.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500">Đã chọn {editImages.length} ảnh để thêm</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {editImagePreviews.map((item, index) => (
                                                <div key={`${item.name}-${index}`} className="relative border rounded-xl overflow-hidden bg-white">
                                                    <img src={item.url} alt={item.name} className="w-full h-20 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== index))}
                                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                                                        title="Bỏ ảnh này"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {editUploadType === "zip" && editZipFile && (
                                    <p className="text-xs text-gray-500">Đã chọn ZIP: {editZipFile.name}</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-bold text-gray-700">Danh sách file hiện có</p>
                                {loadingDetail ? (
                                    <div className="py-8 text-center text-sm text-gray-500">Đang tải file...</div>
                                ) : detailItems.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-500 border rounded-xl">Dataset chưa có file</div>
                                ) : (
                                    <div className="max-h-[260px] overflow-y-auto border rounded-xl divide-y">
                                        {detailItems.map((item, idx) => {
                                            const itemId = String(item?.id || item?.itemId || item?.datasetItemId || idx);
                                            const insight = itemInsights[itemId];
                                            const fileName = insight?.fileName || getItemName(item, idx);
                                            const previewUrl = getPreviewSrc(item, idx);
                                            const sizeBytes = insight?.sizeBytes ?? getItemSizeBytes(item);
                                            const deleting = deletingItemIds.includes(itemId);
                                            const canRenderAsImage = Boolean(previewUrl) && (Boolean(securePreviewUrls[itemId]) || insight?.isImage || isImageItem(item, idx));

                                            return (
                                                <div key={itemId} className="flex items-center justify-between gap-3 px-3 py-2">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        {canRenderAsImage ? (
                                                            <img src={previewUrl} alt={fileName} className="w-12 h-12 rounded object-cover border" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                                                                <FileArchive className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{fileName}</p>
                                                            <p className="text-xs text-gray-500">{formatBytes(sizeBytes)}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeleteDatasetItem(item)} disabled={deleting} className="p-2 rounded hover:bg-red-50 text-red-600 disabled:opacity-50" title="Xóa file">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500">Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Gán vào Project</h2>
                                <p className="text-sm text-gray-500 mt-1">Dataset: <span className="font-bold text-indigo-600">{selectedDataset?.name}</span></p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-white rounded-full">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-3">
                            <p className="text-sm font-bold text-gray-700 px-2">Chọn dự án đích:</p>
                            {projects.length === 0 ? (
                                <div className="p-10 text-center font-medium text-gray-400">Không tìm thấy dự án nào</div>
                            ) : projects.map(p => (
                                <button
                                    key={p.id || p.projectId}
                                    onClick={() => handleAssignToProject(p.id || p.projectId)}
                                    className="w-full flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <FolderPlus className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{p.name}</p>
                                            <p className="text-xs text-gray-400 uppercase font-black">{p.type || "N/A"}</p>
                                        </div>
                                    </div>
                                    <Check className="w-5 h-5 text-transparent group-hover:text-indigo-600 transition-all translate-x-4 group-hover:translate-x-0" />
                                </button>
                            ))}
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 text-center">
                            <button onClick={() => setShowAssignModal(false)} className="text-sm font-bold text-gray-500 hover:text-gray-700">Hủy bỏ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* DETAIL MODAL */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-indigo-50/30">
                            <div className="flex gap-4">
                                <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100">
                                    <Database className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 leading-tight">{selectedDataset?.name}</h2>
                                    <div className="flex flex-wrap items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            {selectedDataset?.createdAt ? new Date(selectedDataset.createdAt).toLocaleDateString() : "N/A"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100">
                                            <ImageIcon className="w-4 h-4" />
                                            {totalDetailFiles} items
                                        </div>
                                        <div className="text-xs font-black uppercase text-gray-400 tracking-widest">
                                            ID: {selectedDataset?.id || selectedDataset?.datasetId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setPreviewImage(null);
                                }}
                                className="p-2 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-200"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                    <p className="text-xs font-black uppercase text-indigo-400">Tổng file</p>
                                    <p className="text-2xl font-black text-indigo-700 mt-1">{totalDetailFiles}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                    <p className="text-xs font-black uppercase text-blue-400">Tổng dung lượng</p>
                                    <p className="text-2xl font-black text-blue-700 mt-1">{formatBytes(totalDetailSize)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                    <p className="text-xs font-black uppercase text-amber-400">File chất lượng thấp</p>
                                    <p className="text-2xl font-black text-amber-700 mt-1">{lowQualityCount}</p>
                                </div>
                            </section>

                            {/* Content Preview Section */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Danh sách file trong dataset
                                    </h3>
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase">
                                        Archive và image đều hỗ trợ
                                    </span>
                                </div>

                                {loadingDetail ? (
                                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                                        <p className="text-sm font-bold text-gray-400">Đang tải danh sách file...</p>
                                    </div>
                                ) : detailItems.length > 0 ? (
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                            <div className="col-span-5">File</div>
                                            <div className="col-span-2">Loại</div>
                                            <div className="col-span-2">Dung lượng</div>
                                            <div className="col-span-2">Kích thước</div>
                                            <div className="col-span-1">Chất lượng</div>
                                        </div>

                                        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                                            {detailItems
                                                .slice((detailCurrentPage - 1) * detailPageSize, detailCurrentPage * detailPageSize)
                                                .map((item, pageIdx) => {
                                                    const idx = (detailCurrentPage - 1) * detailPageSize + pageIdx;
                                                    const itemId = getItemId(item, idx);
                                                    const insight = itemInsights[itemId];
                                                    const fileName = insight?.fileName || getItemName(item, idx);
                                                    const ext = insight?.extension || getItemExtension(item, idx);
                                                    const sizeBytes = insight?.sizeBytes ?? getItemSizeBytes(item);
                                                    const dims = insight?.dimensions ?? getItemDimensions(item);
                                                    const quality = insight
                                                        ? { status: insight.qualityStatus, text: insight.qualityText }
                                                        : getQualityInfo(item, idx);
                                                    const previewUrl = getPreviewSrc(item, idx);
                                                    const canRenderAsImage = Boolean(previewUrl) && (Boolean(securePreviewUrls[itemId]) || insight?.isImage || isImageItem(item, idx));

                                                    return (
                                                        <div key={`${fileName}-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center">
                                                            <div className="col-span-5 flex items-center gap-4 min-w-0">
                                                                {canRenderAsImage ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openImagePreview(previewUrl, fileName)}
                                                                        className="rounded-lg overflow-hidden border border-indigo-100 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                                        title="Xem ảnh lớn"
                                                                    >
                                                                        <img
                                                                            src={previewUrl}
                                                                            alt={fileName}
                                                                            className="w-14 h-14 rounded-lg object-cover"
                                                                        />
                                                                    </button>
                                                                ) : (
                                                                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                                        <FileArchive className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                                <span className="truncate font-medium text-gray-800">{fileName}</span>
                                                            </div>

                                                            <div className="col-span-2 text-gray-600 uppercase">{ext}</div>
                                                            <div className="col-span-2 text-gray-600">{formatBytes(sizeBytes)}</div>
                                                            <div className="col-span-2 text-gray-600">{dims ? `${dims.width}x${dims.height}` : "N/A"}</div>
                                                            <div className="col-span-1">
                                                                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${quality.status === "low"
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : quality.status === "ok"
                                                                        ? "bg-emerald-100 text-emerald-700"
                                                                        : "bg-gray-100 text-gray-600"
                                                                    }`}>
                                                                    {quality.text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <FolderPlus className="w-12 h-12 text-gray-300 mb-2" />
                                        <p className="text-sm font-bold text-gray-400 font-sans">Không tìm thấy file nào trong dataset.</p>
                                    </div>
                                )}

                                {detailItems.length > detailPageSize && (
                                    <Pagination
                                        currentPage={detailCurrentPage}
                                        totalPages={Math.ceil(detailItems.length / detailPageSize)}
                                        onPageChange={setDetailCurrentPage}
                                        pageSize={detailPageSize}
                                        onPageSizeChange={setDetailPageSize}
                                        pageSizeOptions={[10, 20, 50, 100]}
                                        totalItems={detailItems.length}
                                    />
                                )}
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t bg-gray-50/50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setPreviewImage(null);
                                }}
                                className="px-10 py-4 bg-gray-900 text-white rounded-[20px] text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-200"
                            >
                                Đóng chi tiết
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewImage && (
                <div
                    className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-w-5xl w-full"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-12 right-0 text-white/90 hover:text-white p-2"
                        >
                            <X className="w-7 h-7" />
                        </button>
                        <img
                            src={previewImage.src}
                            alt={previewImage.name}
                            className="max-h-[85vh] w-full object-contain rounded-2xl bg-slate-900"
                        />
                        <p className="mt-3 text-center text-sm font-semibold text-white/90 truncate">{previewImage.name}</p>
                    </div>
                </div>
            )}
        </div>
    );
}







