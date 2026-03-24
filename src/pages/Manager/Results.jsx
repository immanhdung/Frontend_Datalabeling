import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Database,
  Tag,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import {
  resolveApiData,
  getAssignedTasksByUserMap
} from "../../utils/annotatorTaskHelpers";

export default function ManagerResults() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      const data = resolveApiData(res);

      // Enhance projects with local stats if available
      const localTasksMap = getAssignedTasksByUserMap();
      const allLocalTasks = Object.values(localTasksMap).flat();

      const enhanced = (Array.isArray(data) ? data : []).map(p => {
        const pid = String(p.id || p.projectId || '');
        const projectTasks = allLocalTasks.filter(t => String(t.projectId || t.project?.id || '') === pid);

        const approvedTasks = projectTasks.filter(t => t.status === 'approved' || t.status === 'completed' || t.status === 'done');
        const approvedCount = approvedTasks.length;
        const totalTasks = projectTasks.length;

        // Calculate actual item counts and labels
        let assetsCount = 0;
        let totalLabels = 0;
        let latestUpdate = p.updatedAt || p.createdAt;

        projectTasks.forEach(t => {
          if (Array.isArray(t.items)) {
            assetsCount += t.items.length;
            t.items.forEach(it => {
              const annCount = (it.annotations?.length || 0) + (it.bboxes?.length || 0);
              totalLabels += annCount;
            });
          }
          if (t.updatedAt && (!latestUpdate || new Date(t.updatedAt) > new Date(latestUpdate))) {
            latestUpdate = t.updatedAt;
          }
        });

        return {
          ...p,
          approvedTasks: approvedCount,
          totalTasks: totalTasks,
          imagesCount: assetsCount || p.imagesCount || 0,
          labelsCount: totalLabels || p.labelsCount || 0,
          updatedAt: latestUpdate,
          completionRate: totalTasks > 0 ? Math.round((approvedCount / totalTasks) * 100) : (p.status === 'completed' ? 100 : 0)
        };
      });

      // Filter for projects that have at least one approved task or are marked as completed
      const results = enhanced.filter(p => p.approvedTasks > 0 || p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'completed');

      setProjects(results);
    } catch (err) {
      console.error("Fetch results error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-8 py-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-xs">
                <BarChart3 className="w-4 h-4" />
                Dữ liệu đã hoàn thiện
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kết quả gán nhãn</h1>
              <p className="text-slate-500 font-medium">Truy xuất và xem lại các bộ dữ liệu đã được Reviewer phê duyệt</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-3xl">
                <p className="text-emerald-600 text-[10px] font-black uppercase mb-1">Dự án hoàn tất</p>
                <p className="text-3xl font-black text-emerald-700">{projects.length}</p>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-10">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, dataset đã hoàn thiện..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-4 rounded-[1.5rem] hover:bg-slate-50 transition-all font-bold text-slate-700 shadow-sm">
            <Filter className="w-5 h-5 text-slate-500" />
            Lọc nâng cao
          </button>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[2rem] h-80 animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Layers className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Chưa có kết quả nào</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Các bộ dữ liệu sau khi được Reviewer phê duyệt sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((p) => (
              <div
                key={p.id || p.projectId}
                className="group bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden"
              >
                {/* Visual Header */}
                <div className="h-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 relative flex items-center justify-between">
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">{p.type || 'IMAGE'}</p>
                  </div>
                  <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  {/* Sub-decorative icons */}
                  <TrendingUp className="absolute bottom-2 right-4 w-12 h-12 text-white/5" />
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Hoàn tất: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Vừa xong'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tiến độ Duyệt</p>
                      <p className="text-xl font-black text-slate-800">{p.completionRate}%</p>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng nhãn</p>
                      <p className="text-xl font-black text-slate-800">{p.labelsCount || 0}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span>{p.imagesCount || 0} Assets</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{p.approvedTasks} Đạt chuẩn</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/manager/results/${p.id || p.projectId}`)}
                      className="w-full bg-slate-900 text-white flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all group/btn"
                    >
                      XEM KẾT QUẢ CHI TIẾT
                      <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}