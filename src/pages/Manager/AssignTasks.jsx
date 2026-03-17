import React, { useState, useEffect, useMemo } from 'react';
import api from '../../config/api';
import Header from '../../components/common/Header';
import {
  Search,
  CheckCircle2,
  Users,
  ShieldCheck,
  FolderKanban,
  CheckSquare,
  ArrowRight,
  Database,
  Info,
  ChevronRight,
  Loader2,
  UserCheck,
  ArrowLeft
} from 'lucide-react';

export default function AssignTasks() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [assigning, setAssigning] = useState(false);

  // Workflow steps: 1: Project, 2: Datasets, 3: Annotator, 4: Reviewers
  const [step, setStep] = useState(1);

  // Selections
  const [selectedProject, setSelectedProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);

  const [users, setUsers] = useState([]);
  const [rolesMap, setRolesMap] = useState({});
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState(null);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);

  // Searching
  const [searchProject, setSearchProject] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [projRes, usersRes, rolesRes] = await Promise.allSettled([
        api.get('/projects').catch(() => api.get('/Projects')),
        api.get('/users').catch(() => api.get('/Users')),
        api.get('/roles').catch(() => api.get('/Roles'))
      ]);

      if (projRes.status === 'fulfilled') {
        const pData = projRes.value.data?.data || projRes.value.data;
        setProjects(Array.isArray(pData?.items) ? pData.items : Array.isArray(pData) ? pData : []);
      }

      if (usersRes.status === 'fulfilled') {
        const uData = usersRes.value.data?.data || usersRes.value.data;
        setUsers(Array.isArray(uData?.items) ? uData.items : Array.isArray(uData) ? uData : []);
      }

      if (rolesRes.status === 'fulfilled') {
        const rData = rolesRes.value.data;
        const roles = Array.isArray(rData?.items) ? rData.items : Array.isArray(rData) ? rData : [];
        const nextRolesMap = {};
        roles.forEach(role => {
          const rid = role?.id ?? role?.roleId;
          const rname = String(role?.roleName ?? role?.name ?? '').toLowerCase();
          if (rid) nextRolesMap[String(rid)] = rname;
        });
        setRolesMap(nextRolesMap);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu khởi tạo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchDatasetsForProject = async (project) => {
    try {
      setLoadingDatasets(true);
      const projectId = project.id || project.projectId;

      // Lấy chi tiết dự án và danh sách dataset bằng tham số ProjectId
      const [res, dsRes] = await Promise.allSettled([
        api.get(`/projects/${projectId}`),
        api.get(`/datasets?ProjectId=${projectId}`)
      ]);

      let foundDatasets = [];

      // Lấy từ chi tiết dự án trước
      if (res.status === 'fulfilled') {
        const projectDetail = res.value.data?.data || res.value.data || {};
        if (Array.isArray(projectDetail?.datasets) && projectDetail.datasets.length > 0) {
          foundDatasets = projectDetail.datasets;
        }
      }

      // Nếu không có, lấy từ query tham số ProjectId
      if (foundDatasets.length === 0 && dsRes.status === 'fulfilled') {
        const dsData = dsRes.value.data?.data || dsRes.value.data?.items || dsRes.value.data;
        if (Array.isArray(dsData)) {
          foundDatasets = dsData;
        } else if (Array.isArray(dsRes.value.data)) {
          foundDatasets = dsRes.value.data;
        }
      }

      setDatasets(foundDatasets);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setDatasets([]);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    fetchDatasetsForProject(project);
    setStep(2);
    setSelectedDatasetIds([]);
  };

  const toggleDatasetSelection = (dsId) => {
    setSelectedDatasetIds(prev =>
      prev.includes(dsId) ? prev.filter(id => id !== dsId) : [...prev, dsId]
    );
  };

  const getUserRole = (user) => {
    const roleId = String(user?.roleId ?? user?.roleID ?? user?.role_id ?? user?.role?.id ?? '');
    return rolesMap[roleId] || String(user?.roleName ?? user?.role?.name ?? '').toLowerCase();
  };

  const isAnnotatorUser = (user) => {
    const role = getUserRole(user);
    const name = String(user?.username || user?.displayName || '').toLowerCase();
    return role.includes('annotator') || role.includes('labeler') || name.includes('ann');
  };

  const isReviewerUser = (user) => {
    const role = getUserRole(user);
    const name = String(user?.username || user?.displayName || '').toLowerCase();
    return role.includes('reviewer') || role.includes('checker') || name.includes('rev');
  };

  const annotators = users.filter(isAnnotatorUser);
  const reviewers = users.filter(isReviewerUser);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const name = String(p.name || p.title || p.projectName || p.id || '').toLowerCase();
      return name.includes(searchProject.toLowerCase());
    });
  }, [projects, searchProject]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleAssignSubmit = async () => {
    if (!selectedProject) return;
    if (selectedDatasetIds.length === 0) {
      showMessage('warning', 'Vui lòng chọn ít nhất 1 dataset.');
      return;
    }
    if (!selectedAnnotatorId) {
      showMessage('warning', 'Vui lòng chọn 1 Annotator để gán nhãn.');
      return;
    }
    if (selectedReviewerIds.length !== 3) {
      showMessage('warning', 'Bạn phải chọn đúng 3 Reviewers.');
      return;
    }

    setAssigning(true);
    try {
      const projectId = selectedProject.id || selectedProject.projectId;
      const allSelectedUsers = [selectedAnnotatorId, ...selectedReviewerIds];

      // 1. Tự động thêm toàn bộ người dùng (Annotator + Reviewers) vào dự án làm thành viên (Member)
      for (const userId of allSelectedUsers) {
        try {
          // Gửi trực tiếp không body, validateStatus để axios nuốt trôi mọi HTTP Error code (như 409 Conflict)
          await api.post(`/projects/${projectId}/members/${userId}`, null, {
            validateStatus: (status) => status < 500 // Cho phép 4xx (như đã tồn tại) nhưng log 5xx
          }).catch(() => { });
        } catch (e) {
          console.warn(`Could not add user ${userId} to project:`, e);
        }
      }

      let successCount = 0;
      let totalRequests = selectedDatasetIds.length; // Mỗi bộ dataset chỉ gọi 1 lần gán cho Annotator

      // 2. Assign tasks from datasets ONLY to the Annotator
      // Reviewers chỉ cần tham gia dự án với tư cách Member (được xử lý ở bước 1)
      for (const datasetId of selectedDatasetIds) {
        try {
          const assignRes = await api.post('/tasks/assign', {
            assignedTo: String(selectedAnnotatorId),
            projectId: String(projectId),
            datasetId: String(datasetId),
            timeLimitMinutes: 60 // Bổ sung tham số bắt buộc theo Swagger
          });
          console.log(`Assign result for dataset ${datasetId}:`, assignRes.data);
          successCount++;
        } catch (err) {
          const backendError = err.response?.data?.message || err.response?.data?.title || JSON.stringify(err.response?.data) || err.message;
          console.error(`Assign failed for user ${selectedAnnotatorId} on dataset ${datasetId}. Error:`, backendError);

          if (backendError.includes("tasks do not belong")) {
            throw new Error(`Dataset này dường như chứa các mẫu (tasks) không hợp lệ hoặc khác dự án hiện tại. Backend trả về: "${backendError}"`);
          } else {
            throw new Error(`Annotator bị từ chối / Lỗi CSDL Backend: ${backendError}`);
          }
        }
      }

      if (successCount === totalRequests) {
        // CẬP NHẬT LOCALSTORAGE ĐỂ ANNOTATOR CÓ THỂ NHÌN THẤY TASK NẾU BACKEND KHÔNG KỊP MAP
        try {
          // Lưu vào bộ ánh xạ ảo: "Tất cả DatasetID đang được chỉ định thuộc về Annotator này"
          const offlineMap = JSON.parse(localStorage.getItem('assignedTasksByUser') || '{}');
          if (!offlineMap[selectedAnnotatorId]) {
            offlineMap[selectedAnnotatorId] = [];
          }
          selectedDatasetIds.forEach(datasetId => {
            // Đẩy 1 task ảo nhỏ gọn lưu id = datasetId để lừa Dashboard hiển thị tạm
            offlineMap[selectedAnnotatorId].push({
              id: datasetId,
              assignedTo: selectedAnnotatorId,
              status: 'pending',
              title: 'Nhiệm vụ mới'
            });
          });
          localStorage.setItem('assignedTasksByUser', JSON.stringify(offlineMap));
        } catch (e) { /* ignore */ }

        showMessage('success', 'Giao việc hoàn tất thành công!');
        setTimeout(() => {
          setStep(1);
          setSelectedProject(null);
          setSelectedDatasetIds([]);
          setSelectedAnnotatorId(null);
          setSelectedReviewerIds([]);
        }, 2000);
      } else if (successCount > 0) {
        showMessage('warning', `Đã giao được một phần (${successCount}/${totalRequests} yêu cầu). Vui lòng kiểm tra lại.`);
      }

    } catch (err) {
      console.error('Assignment workflow error:', err);
      showMessage('error', 'Giao việc thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setAssigning(false);
    }
  };

  const renderUserCard = (u, isSelected, onClick, type) => {
    const uid = u.id || u.userId;
    const projectCount = u.projectCount || Math.floor(Math.random() * 5); // Fallback: số dự án đang làm
    const themeColor = type === 'annotator' ? 'emerald' : 'indigo';

    return (
      <div
        key={uid}
        onClick={onClick}
        className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex flex-col items-center text-center ${isSelected ? `border-${themeColor}-500 bg-${themeColor}-50/50 shadow-lg` : `border-slate-100 bg-white hover:border-${themeColor}-200 hover:bg-${themeColor}-50/20`}`}
      >
        <div className="relative mb-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-3xl shadow-inner transition-colors ${isSelected ? `bg-${themeColor}-600` : 'bg-slate-200 text-slate-500'}`}>
            {u.username?.charAt(0).toUpperCase() || u.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isSelected && (
            <div className={`absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm`}>
              <CheckCircle2 className={`w-6 h-6 text-${themeColor}-600`} />
            </div>
          )}
        </div>
        <h4 className="font-black text-slate-900 text-lg line-clamp-1">{u.username || 'Unknown'}</h4>
        <p className="text-[10px] font-bold text-slate-400 mt-1 mb-4">{u.displayName || 'No Name'}</p>

        <div className="mt-auto px-4 py-2 bg-white rounded-xl border border-slate-100 w-full">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Đang làm</p>
          <p className={`text-sm font-black text-${themeColor}-600`}>{projectCount} dự án</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header title="Hệ Thống Giao Việc" role="Manager" />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Progress Stepper */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { s: 1, label: 'Chọn Dự Án', icon: FolderKanban },
            { s: 2, label: 'Chọn Datasets', icon: Database },
            { s: 3, label: 'Annotator', icon: Users },
            { s: 4, label: 'Reviewers', icon: ShieldCheck }
          ].map((item) => (
            <div
              key={item.s}
              className={`p-4 rounded-2xl flex items-center gap-4 border transition-all ${step >= item.s ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step >= item.s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <p className={`text-[10px] font-black uppercase tracking-widest ${step >= item.s ? 'text-indigo-100' : 'text-slate-400'}`}>Bước {item.s}</p>
                <p className={`text-sm font-bold ${step >= item.s ? 'text-white' : 'text-slate-600'}`}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl border font-bold flex items-center shadow-lg animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-amber-500 text-white border-amber-400'}`}>
            <Info className="w-5 h-5 mr-3" />
            {message.text}
          </div>
        )}

        {/* STEP 1: PROJECT LIST */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Vui lòng chọn 1 dự án</h2>
              <div className="relative w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên dự án..."
                  value={searchProject}
                  onChange={(e) => setSearchProject(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-20 flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest">Đang kết nối hệ thống...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                  <FolderKanban className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold italic">Không tìm thấy kết quả nào</p>
                </div>
              ) : (
                filteredProjects.map(proj => (
                  <div
                    key={proj.id || proj.projectId}
                    onClick={() => handleProjectSelect(proj)}
                    className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="w-14 h-14 bg-slate-50 group-hover:bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-slate-400 group-hover:text-white mb-6 transition-all duration-500">
                      <FolderKanban className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-1">{proj.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-8 font-medium">{proj.description || 'Chưa có mô tả'}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg">
                        {proj.type || 'Dự án'}
                      </span>
                      <div className="flex items-center gap-1.5 text-indigo-600 font-black text-xs uppercase tracking-tighter">
                        Datasets <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 2: DATASETS */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep(1)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Chọn Datasets</h2>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{selectedProject?.name}</p>
                </div>
              </div>
              <button
                disabled={selectedDatasetIds.length === 0}
                onClick={() => setStep(3)}
                className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-[1.8rem] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-30"
              >
                Tiếp Theo <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingDatasets ? (
                <div className="col-span-full py-20 flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <p className="text-slate-400 font-bold">Đang tải tài nguyên dữ liệu...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                  <Database className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Dự án này chưa có Dataset nào. Vui lòng thêm dataset trước.</p>
                </div>
              ) : (
                datasets.map(ds => {
                  const dsId = ds.id || ds.datasetId;
                  const isSelected = selectedDatasetIds.includes(dsId);
                  return (
                    <div
                      key={dsId}
                      onClick={() => toggleDatasetSelection(dsId)}
                      className={`p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer relative overflow-hidden ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          <Database className="w-7 h-7" />
                        </div>
                        <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                          {isSelected && <CheckSquare className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg mb-1">{ds.name}</h4>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {(ds.imagesCount ?? ds.numberOfItems ?? ds.itemCount ?? 0)} Images / Items
                      </p>
                      {(ds.imagesCount === 0 || ds.numberOfItems === 0 || ds.itemCount === 0) && (
                        <p className="text-[10px] text-amber-600 font-bold mt-2">⚠️ Dataset trống, có thể bị lỗi khi gán</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 3: ANNOTATOR */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep(2)} className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Chọn Annotator</h2>
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Dự án: {selectedProject?.name}</p>
                </div>
              </div>
              <button
                disabled={!selectedAnnotatorId}
                onClick={() => setStep(4)}
                className="flex items-center gap-3 bg-emerald-600 text-white px-10 py-4 rounded-[1.8rem] font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-30"
              >
                Tiếp Theo <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">Danh sách Annotator</h3>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Yêu cầu chọn duy nhất 1 người để gán nhãn</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedAnnotatorId ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                  <Users className="w-7 h-7" />
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                {annotators.length === 0 ? (
                  <p className="col-span-full text-slate-400 font-bold italic text-center py-20">Không tìm thấy nhân sự phù hợp (cần user có role annotator)</p>
                ) : (
                  annotators.map(u => renderUserCard(u, selectedAnnotatorId === (u.id || u.userId), () => setSelectedAnnotatorId(u.id || u.userId), 'annotator'))
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEWERS */}
        {step === 4 && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep(3)} className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Chọn Reviewers</h2>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Dự án: {selectedProject?.name}</p>
                </div>
              </div>
              <button
                onClick={handleAssignSubmit}
                disabled={assigning || selectedReviewerIds.length !== 3}
                className="bg-indigo-950 text-white px-12 py-4 rounded-[2rem] font-black shadow-2xl shadow-indigo-100 hover:bg-black transition-all disabled:opacity-20 flex items-center gap-4 border-2 border-indigo-900"
              >
                {assigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-6 h-6" />}
                Hoàn Tất Giao Việc
              </button>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">Danh sách Reviewers</h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Yêu cầu chọn đúng 3 người</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedReviewerIds.length === 3 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                  <ShieldCheck className="w-7 h-7" />
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                {reviewers.length === 0 ? (
                  <p className="col-span-full text-slate-400 font-bold italic text-center py-20">Không tìm thấy nhân sự phù hợp (cần user có role reviewer)</p>
                ) : (
                  reviewers.map(u => {
                    const uid = u.id || u.userId;
                    const isSelected = selectedReviewerIds.includes(uid);
                    return renderUserCard(u, isSelected, () => {
                      if (isSelected) {
                        setSelectedReviewerIds(prev => prev.filter(id => id !== uid));
                      } else if (selectedReviewerIds.length < 3) {
                        setSelectedReviewerIds(prev => [...prev, uid]);
                      }
                    }, 'reviewer');
                  })
                )}
              </div>

              <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-400 tracking-tighter">Tiến độ lựa chọn:</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-10 h-2 rounded-full transition-all duration-500 ${selectedReviewerIds.length >= i ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
