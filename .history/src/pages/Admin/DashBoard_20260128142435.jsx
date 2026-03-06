export default function AdminDashboard() {
  const stats = [
    { label: "Tổng người dùng", value: 6, color: "bg-indigo-100 text-indigo-600" },
    { label: "Tổng dự án", value: 4, color: "bg-sky-100 text-sky-600" },
    { label: "Dự án hoàn thành", value: 1, color: "bg-green-100 text-green-600" },
    { label: "Tỷ lệ chính xác TB", value: "93.6%", color: "bg-emerald-100 text-emerald-600" },
  ];

  const projects = [
    {
      name: "Phân loại chó mèo",
      status: "Đang hoạt động",
      statusColor: "bg-green-100 text-green-600",
      desc: "Phân loại · 5 ảnh · 1 annotator",
      progress: 40,
      accuracy: "94.5%",
    },
    {
      name: "Nhận dạng phương tiện giao thông",
      status: "Đang hoạt động",
      statusColor: "bg-green-100 text-green-600",
      desc: "Đánh dấu · 3 ảnh · 2 annotator",
      progress: 50,
      accuracy: "95.8%",
    },
    {
      name: "Phân loại cảm xúc khuôn mặt",
      status: "Hoàn thành",
      statusColor: "bg-indigo-100 text-indigo-600",
      desc: "Phân loại · 0 ảnh · 0 annotator",
      progress: 0,
      accuracy: "N/A",
    },
    {
      name: "Nhận dạng khối u",
      status: "Chờ xử lý",
      statusColor: "bg-gray-100 text-gray-600",
      desc: "Đánh dấu · 2 ảnh · 0 annotator",
      progress: 0,
      accuracy: "N/A",
    },
  ];

  /* ➕ THÊM */
  const userStats = [
    { role: "Admin", count: 1, color: "bg-indigo-500" },
    { role: "Manager", count: 1, color: "bg-blue-500" },
    { role: "Annotator", count: 3, color: "bg-green-500" },
    { role: "Reviewer", count: 1, color: "bg-emerald-500" },
  ];

  const activities = [
    {
      title: "Tạo dự án",
      desc: "Đã tạo dự án 'Phân loại chó mèo'",
      time: "10:30:00 15/1/2024",
    },
    {
      title: "Giao việc",
      desc: "Đã giao dự án 'Phân loại chó mèo' cho Trần Thị B",
      time: "11:00:00 15/1/2024",
    },
    {
      title: "Gán nhãn",
      desc: "Đã hoàn thành 2/5 ảnh trong dự án 'Phân loại chó mèo'",
      time: "14:00:00 15/1/2024",
    },
    {
      title: "Kiểm duyệt",
      desc: "Đã duyệt 10 ảnh trong dự án 'Phân loại cảm xúc khuôn mặt'",
      time: "16:00:00 14/1/2024",
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Tổng quan hệ thống gán nhãn dữ liệu
          </p>
        </div>

        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          ➕ Thêm người dùng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}
            >
              📊
            </div>
            <div>
              <p className="text-gray-500 text-sm">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          📈 Tổng quan dự án
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Tiến độ và tỷ lệ chính xác của tất cả dự án
        </p>

        <div className="space-y-4">
          {projects.map((p, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 hover:shadow transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.desc}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${p.statusColor}`}
                >
                  {p.status}
                </span>
              </div>

              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Tiến độ</span>
                <span className="text-gray-500">
                  Tỷ lệ chính xác{" "}
                  <span className="text-green-600 font-semibold">
                    {p.accuracy}
                  </span>
                </span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-indigo-600"
                  style={{ width: `${p.progress}%` }}
                />
              </div>

              <div className="text-right text-xs text-gray-500 mt-1">
                {p.progress}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ➕ THỐNG KÊ + NHẬT KÝ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-1">Thống kê người dùng</h2>
          <p className="text-sm text-gray-500 mb-4">Phân bố theo vai trò</p>

          <div className="space-y-3">
            {userStats.map((u) => (
              <div
                key={u.role}
                className="flex justify-between items-center border rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${u.color}`} />
                  <span className="font-medium">{u.role}</span>
                </div>
                <span className="font-semibold">{u.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Nhật ký hoạt động</h2>
              <p className="text-sm text-gray-500">
                Các hoạt động gần đây trong hệ thống
              </p>
            </div>
            <button className="text-sm text-indigo-600 hover:underline">
              Xem tất cả →
            </button>
          </div>

          <div className="space-y-3">
            {activities.map((a, i) => (
              <div
                key={i}
                className="border rounded-lg p-4 flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  📌
                </div>
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm text-gray-600">{a.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    🕒 {a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
