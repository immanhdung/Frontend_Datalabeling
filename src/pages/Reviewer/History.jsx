import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import useReviewHistory from '../../hooks/useReviewHistory';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  CheckCircle2,
  Calendar,
  Database,
  TrendingUp,
  BarChart3,
  Layers
} from 'lucide-react';

import { reviewAPI, projectAPI } from '../../config/api';

const ReviewHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reviewHistory } = useReviewHistory();
  const [projectGroups, setProjectGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAndGroup = async () => {
      try {
        setLoading(true);

        let projectList = [];
        try {
          const pRes = await projectAPI.getAll({ PageSize: 1000 });
          projectList = pRes.data?.data || pRes.data?.items || pRes.data || [];
        } catch (e) { }

        let apiHistory = [];
        try {
          const response = await reviewAPI.getAll({ PageSize: 1000, ReviewerId: user?.id });
          apiHistory = response?.data?.data || response?.data?.items || response?.data || [];
        } catch (e) { }

        const localHistory = (reviewHistory || []).filter(r => (String(r.reviewerId) === String(user?.id) || r.reviewerName === user?.name));

        const allReviews = [...localHistory];
        apiHistory.forEach(apiItem => {
          if (!allReviews.some(m => String(m.taskId || m.id) === String(apiItem.taskId || apiItem.id))) {
            allReviews.push(apiItem);
          }
        });

        const processed = allReviews.filter(r => ['approved', 'rejected', 'completed', 'done'].includes(String(r.decision || r.status || '').toLowerCase()));

        const groups = {};
        processed.forEach(review => {
          const pid = String(review.projectId || review.ProjectId || review.project?.id || '');
          if (!pid) return;

          if (!groups[pid]) {
            const pInfo = projectList.find(p => String(p.id) === pid) || {};
            groups[pid] = {
              id: pid,
              name: review.projectName || pInfo.name || pInfo.projectName || `Dự án #${pid.slice(0, 5)}`,
              description: pInfo.description || pInfo.description || 'Dự án đã kiểm duyệt hoàn tất.',
              type: pInfo.type || 'IMAGE',
              approvedCount: 0,
              rejectedCount: 0,
              totalLabels: 0,
              latestDate: review.reviewedAt,
            };
          }

          if (String(review.decision || review.status).toLowerCase().includes('approve')) groups[pid].approvedCount++;
          else groups[pid].rejectedCount++;

          groups[pid].totalLabels += (review.approvedCount || 0) + (review.rejectedCount || 0);
          if (new Date(review.reviewedAt) > new Date(groups[pid].latestDate)) {
            groups[pid].latestDate = review.reviewedAt;
          }
        });

        setProjectGroups(Object.values(groups));
      } catch (err) {
        setProjectGroups([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAndGroup();
  }, [reviewHistory, user]);

  const filteredGroups = projectGroups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Header title="Kết quả Kiểm duyệt" userName="Reviewer" userRole="reviewer" />

      <div className="bg-white border-b border-slate-200 px-8 py-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-xs">
                <BarChart3 className="w-4 h-4" />
                Lịch sử hoàn thiện
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kết quả đã kiểm duyệt</h1>
              <p className="text-slate-500 font-medium">Danh sách các dự án bạn đã hoàn thành việc phê duyệt và đánh giá</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-3xl">
                <p className="text-emerald-600 text-[10px] font-black uppercase mb-1">Dự án hoàn tất</p>
                <p className="text-3xl font-black text-emerald-700">{projectGroups.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-10">
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án đã kiểm duyệt..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[2rem] h-80 animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Layers className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Chưa có kết quả nào</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Các dự án sau khi bạn hoàn tất review sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGroups.map((p) => (
              <div
                key={p.id}
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
                    <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors truncate">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Ngày duyệt: {p.latestDate ? new Date(p.latestDate).toLocaleDateString('vi-VN') : 'Vừa xong'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Đã Duyệt</p>
                      <p className="text-xl font-black text-emerald-600">{p.approvedCount || 0}</p>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng nhãn</p>
                      <p className="text-xl font-black text-slate-800">{p.totalLabels || 0}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600 font-bold overflow-hidden">
                        <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate">Mô tả: {p.description || 'N/A'}</span>
                      </div>
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

export default ReviewHistory;
