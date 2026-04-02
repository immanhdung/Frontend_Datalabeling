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

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  const root = value?.data ?? value?.items ?? value?.results ?? value;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  return [];
};

export default function ManagerResults() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { getAssignedTasksByUserMap } = await import("../../utils/annotatorTaskHelpers");

      const [projRes, tasksRes] = await Promise.all([
        api.get("/projects", { params: { PageSize: 1000, pageSize: 1000 } }),
        api.get("/tasks", { params: { PageSize: 1000, pageSize: 1000 } }).catch(() => ({ data: [] })),
      ]);

      const apiProjects = toArray(projRes.data);
      const apiTasks = toArray(tasksRes.data);

      const localTasksMap = getAssignedTasksByUserMap();
      const allLocalTasks = [...apiTasks, ...Object.values(localTasksMap).flat()];

      const localProjects = [];
      const seenPids = new Set(apiProjects.map(p => String(p.id)));

      allLocalTasks.forEach(t => {
        const pid = String(t.projectId || t.project?.id || "");
        if (pid && !seenPids.has(pid)) {
          localProjects.push({
            id: pid,
            name: t.projectName || t.ProjectName || t.project?.name || `Dự án #${pid.slice(0, 5)}`,
            status: t.project?.status || 'Active',
            type: t.project?.type || 'Image',
            updatedAt: t.updatedAt
          });
          seenPids.add(pid);
        }
      });

      const projectsList = [...apiProjects, ...localProjects];

      const enhanced = projectsList.map(p => {
        const pid = String(p.id || p._id || p.projectId || '');
        const projectTasks = allLocalTasks.filter(t => {
          const tpid = String(t.projectId || t.project?.id || t.project_id || t.ProjectID || '');
          return tpid === pid && pid !== "";
        });

        const totalTasks = projectTasks.length;
        const reviewedCount = projectTasks.filter(t => {
          const s = String(t.status || "").toLowerCase();
          return ['approved', 'completed', 'done', 'rejected', 'finished', 'submitted'].includes(s);
        }).length;

        const approvedCount = projectTasks.filter(t =>
          ['approved', 'completed', 'done', 'finished'].includes(String(t.status || "").toLowerCase())
        ).length;

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
          totalTasks: totalTasks,
          reviewedTasks: reviewedCount,
          approvedTasks: approvedCount,
          imagesCount: assetsCount || p.imagesCount || 0,
          labelsCount: totalLabels || p.labelsCount || 0,
          updatedAt: latestUpdate,
          completionRate: totalTasks > 0 ? Math.round((reviewedCount / totalTasks) * 100) : (p.status === 'completed' ? 100 : 0)
        };
      });

      const results = enhanced.filter(p =>
        p.reviewedTasks > 0 ||
        ['approved', 'completed', 'done', 'finished'].includes(String(p.status || "").toLowerCase())
      );

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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const filteredProjects = projects.filter(
    (p) => {
      const matchSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.id).includes(searchTerm);

      return matchSearch;
    }
  );

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {paginatedProjects.map((p) => (
                <div
                  key={p.id || p.projectId}
                  className="group bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden"
                >
                  <div className="h-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 relative flex items-center justify-between">
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                      <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">{p.type || 'IMAGE'}</p>
                    </div>
                    <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-12 h-12 rounded-2xl font-bold transition-all shadow-sm ${currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
