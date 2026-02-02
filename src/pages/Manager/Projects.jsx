import { Search, Plus, Filter, MoreHorizontal, Tag, Image, Users } from "lucide-react";

const projects = [
    {
        id: 1,
        title: "Phân loại chó mèo",
        description: "Phân loại hình ảnh chó và mèo cho mô hình nhận dạng động vật",
        status: "Đang hoạt động",
        statusColor: "bg-green-100 text-green-700",
        type: "Phân loại theo lớp",
        progress: 40,
        images: 5,
        labels: 2,
        tags: ["Chó", "Mèo"],
        date: "15/1/2024",
        members: 1,
    },
    {
        id: 2,
        title: "Nhận dạng phương tiện giao thông",
        description: "Đánh dấu và khoanh vùng các phương tiện giao thông trong ảnh",
        status: "Đang hoạt động",
        statusColor: "bg-green-100 text-green-700",
        type: "Đánh dấu vùng",
        progress: 50,
        images: 3,
        labels: 3,
        tags: ["Xe hơi", "Xe máy", "Người"],
        date: "10/1/2024",
        members: 2,
    },
    {
        id: 3,
        title: "Phân loại cảm xúc khuôn mặt",
        description: "Phân loại cảm xúc từ hình ảnh khuôn mặt",
        status: "Hoàn thành",
        statusColor: "bg-blue-100 text-blue-700",
        type: "Phân loại theo lớp",
        progress: 100,
        images: 0,
        labels: 3,
        tags: ["Vui vẻ", "Buồn", "Tức giận"],
        date: "5/1/2024",
        members: 0,
    },
    {
        id: 4,
        title: "Nhận dạng khối u",
        description: "Đánh dấu vị trí khối u trong ảnh X-ray",
        status: "Chờ xử lý",
        statusColor: "bg-gray-100 text-gray-700",
        type: "Đánh dấu vùng",
        progress: 0,
        images: 2,
        labels: 2,
        tags: ["Khối u", "Bình thường"],
        date: "8/1/2024",
        members: 1,
    },
];

export default function ManagerProjects() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý dự án</h1>
                    <p className="text-sm text-gray-500">Tạo và quản lý các dự án gán nhãn</p>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                    Tạo dự án mới
                </button>
            </div>
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm dự án..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    Lọc
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((p) => (
                    <div key={p.id} className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900">{p.title}</h3>
                                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${p.statusColor}`}>
                                    {p.status}
                                </span>
                            </div>
                            <button className="p-1 hover:bg-gray-100 rounded">
                                <MoreHorizontal className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">{p.description}</p>
                        <div className="flex items-center gap-2 text-sm text-indigo-600">
                            <Tag className="w-4 h-4" />
                            {p.type}
                        </div>
                        <div>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Tiến độ</span>
                                <span>{p.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600"
                                    style={{ width: `${p.progress}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                            <div className="flex items-center gap-1">
                                <Image className="w-4 h-4" />
                                {p.images} ảnh
                            </div>
                            <div className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                {p.labels} nhãn
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {p.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                            <span>{p.date}</span>
                            <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {p.members} người
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
