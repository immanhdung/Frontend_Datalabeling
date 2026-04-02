import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import useReviewHistory from '../../hooks/useReviewHistory';
import {
  Search,
  CheckCircle2,
  Calendar,
  Database,
  BarChart3,
  Layers,
  ArrowUpRight,
  Filter,
  Activity,
  FileCheck,
  TrendingDown
} from 'lucide-react';

const Analytics = () => {
  const navigate = useNavigate();
  const { reviewHistory } = useReviewHistory();
  const [searchTerm, setSearchTerm] = useState('');

  // Group history by project
  const projectSummaries = useMemo(() => {
    const groups = {};
    
    reviewHistory.forEach(review => {
      const projectName = review.projectName || 'Dự án Hệ thống';
      if (!groups[projectName]) {
        groups[projectName] = {
          name: projectName,
          reviews: [],
          totalLabels: 0,
          approvedCount: 0,
          rejectedCount: 0,
          latestUpdate: null,
          type: review.type || 'IMAGE'
        };
      }
      
      const group = groups[projectName];
      group.reviews.push(review);
      group.totalLabels += (review.itemCount || 0);
      if (review.decision === 'approved') group.approvedCount++;
      else group.rejectedCount++;
      
      const reviewDate = new Date(review.reviewedAt);
      if (!group.latestUpdate || reviewDate > new Date(group.latestUpdate)) {
        group.latestUpdate = review.reviewedAt;
      }
    });
    
    return Object.values(groups).sort((a, b) => new Date(b.latestUpdate) - new Date(a.latestUpdate));
  }, [reviewHistory]);

  const filteredProjects = useMemo(() => {
    return projectSummaries.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projectSummaries, searchTerm]);

  const stats = useMemo(() => {
    const total = reviewHistory.length;
    const approved = reviewHistory.filter(r => r.decision === 'approved').length;
    const rejected = reviewHistory.filter(r => r.decision === 'rejected').length;
    return { total, approved, rejected };
  }, [reviewHistory]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Header title="Trung tâm Thống kê" userName="Reviewer" userRole="reviewer" />

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-8 py-10 shadow-sm pt-28">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-xs">
                <BarChart3 className="w-4 h-4" />
                Dữ liệu Review
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Thống kê kết quả</h1>
              <p className="text-slate-500 font-medium">Xem lại tổng quan các dự án bạn đã tham gia kiểm soát chất lượng</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-indigo-50 border border-indigo-100 px-6 py-4 rounded-3xl">
                <p className="text-indigo-600 text-[10px] font-black uppercase mb-1">Tổng project</p>
                <p className="text-3xl font-black text-indigo-700">{projectSummaries.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-3xl">
                <p className="text-emerald-600 text-[10px] font-black uppercase mb-1">Đã duyệt</p>
                <p className="text-3xl font-black text-emerald-700">{stats.approved}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 px-6 py-4 rounded-3xl">
                <p className="text-rose-600 text-[10px] font-black uppercase mb-1">Từ chối</p>
                <p className="text-3xl font-black text-rose-700">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-10">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án bạn đã review..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md font-bold text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Results Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Layers className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Chưa có dữ liệu thống kê</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Các dự án bạn thực hiện review sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((p, idx) => (
              <div
                key={idx}
                className="group bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden"
              >
                <div className="h-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 relative flex items-center justify-between">
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">{p.type || 'IMAGE'}</p>
                  </div>
                  <div className="bg-indigo-500 text-white p-2 rounded-full shadow-lg shadow-indigo-500/30">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Lần review cuối: {p.latestUpdate ? new Date(p.latestUpdate).toLocaleDateString('vi-VN') : 'Không rõ'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-50">
                      <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Đã duyệt</p>
                      <p className="text-xl font-black text-emerald-700">{p.approvedCount}</p>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-50">
                      <p className="text-[9px] font-black text-rose-600 uppercase mb-1">Từ chối</p>
                      <p className="text-xl font-black text-rose-700">{p.rejectedCount}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span>{p.reviews.length} lần review</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                        <span>{p.totalLabels} nhãn</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hoàn thành review project</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
