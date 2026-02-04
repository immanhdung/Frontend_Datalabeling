import { ArrowLeft, Download, Plus } from "lucide-react";

export default function ManagerProjectDetail() {
    const project = {
        name: "Phân loại chó mèo",
        status: "Đang hoạt động",
        description: "Phân loại hình ảnh chó và mèo cho mô hình nhận dạng động vật",
        progress: 40,
        agreement: 63,
        type: "Phân loại theo lớp",
        category: "Animals",
        createdAt: "15/1/2024",
        deadline: "00:48:41 5/2/2026",
        labels: ["Chó", "Mèo"],
        annotators: [
            { name: "Trần Thị B", email: "annotator@labeling.com" },
        ],
        images: [
            { id: 1, url: "https://inkythuatso.com/uploads/thumbnails/800/2023/02/hinh-anh-cho-con-de-thuong-chay-tung-tang-1-24-11-43-28.jpg" },
            { id: 2, url: "https://cdn-media.sforum.vn/storage/app/media/wp-content/uploads/2024/05/anh-cho-thumbnail.jpg" },
            { id: 3, url: "https://i.pinimg.com/736x/72/c2/cb/72c2cb9433178f6deab0bc9ea5abfea9.jpg" },
            { id: 4, url: "https://cellphones.com.vn/sforum/wp-content/uploads/2024/02/avatar-anh-meo-cute-1.jpg" },
            { id: 5, url: "https://minhducpc.vn/uploads/images/qa/top-100-hinh-nen-meo-3d-danh-cho-may-tinh-sieu-de-thuong-h26.jpg" },
        ],
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 rounded-lg hover:bg-gray-100">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            {project.status}
                        </span>
                    </div>
                    <p className="text-gray-500 mt-1">{project.description}</p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Xuất dữ liệu
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus className="w-4 h-4" />
                        Giao việc
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5 shadow">
                    <h3 className="font-semibold mb-1">Tiến độ dự án</h3>
                    <p className="text-sm text-gray-500 mb-4">Tiến độ chung</p>

                    <div className="flex justify-between mb-1">
                        <span className="text-sm">Tổng</span>
                        <span className="font-semibold text-blue-600">{project.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600"
                            style={{ width: `${project.progress}%` }}
                        />
                    </div>

                    <div className="mt-4 text-sm">
                        <p className="font-medium mb-1">Tiến độ từng annotator:</p>
                        <div className="flex justify-between">
                            <span>Trần Thị B</span>
                            <span>40%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 w-[40%]" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow">
                    <h3 className="font-semibold mb-1">Chỉ số đồng thuận</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Mức độ đồng thuận giữa các annotator
                    </p>

                    <div className="flex justify-between mb-1">
                        <span className="text-sm">Đồng thuận chung</span>
                        <span className="font-semibold text-red-500">{project.agreement}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600"
                            style={{ width: `${project.agreement}%` }}
                        />
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                        <p> Đồng thuận cao (≥90%): 0 ảnh</p>
                        <p> Cần xem xét (70-89%): 0 ảnh</p>
                        <p> Bất đồng (&lt;70%): 5 ảnh</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow space-y-3">
                    <h3 className="font-semibold">Thông tin dự án</h3>
                    <InfoRow label="Loại dự án" value={project.type} />
                    <InfoRow label="Category" value={project.category} />
                    <InfoRow label="Ngày tạo" value={project.createdAt} />
                    <InfoRow label="Deadline" value={project.deadline} />
                </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow">
                <h3 className="font-semibold mb-1">Hình ảnh ({project.images.length})</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Click vào ảnh để xem chi tiết đồng thuận
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {project.images.map((img) => (
                        <div key={img.id} className="relative group">
                            <img
                                src={img.url}
                                alt=""
                                className="w-full h-32 object-cover rounded-lg"
                            />
                            <span className="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                                65%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5 shadow lg:col-span-2">
                    <h3 className="font-semibold mb-2">Hướng dẫn gán nhãn</h3>
                    <p className="text-sm text-gray-600">
                        Chọn nhãn "Chó" nếu trong ảnh có chó, chọn "Mèo" nếu có mèo. Nếu ảnh
                        không rõ ràng, hãy skip và ghi lý do.
                    </p>
                </div>
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-5 shadow">
                        <h3 className="font-semibold mb-3">Nhãn ({project.labels.length})</h3>
                        <div className="flex gap-2 flex-wrap">
                            {project.labels.map((label) => (
                                <span
                                    key={label}
                                    className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700"
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow">
                        <h3 className="font-semibold mb-3">Nhóm làm việc</h3>
                        {project.annotators.map((a, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
                                    {a.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium">{a.name}</p>
                                    <p className="text-sm text-gray-500">{a.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
