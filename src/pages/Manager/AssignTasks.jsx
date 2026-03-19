import React, { useState, useEffect, useMemo } from 'react';
import api from '../../config/api';
import Header from '../../components/common/Header';
import { assignLocalTaskToUser } from '../../utils/annotatorTaskHelpers';
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
  ArrowLeft,
} from 'lucide-react';

export default function AssignTasks() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [assigning, setAssigning] = useState(false);

  // Workflow steps: 1: Project, 2: Dataset, 3: Personnel
  const [step, setStep] = useState(1);

  // Selections
  const [selectedProject, setSelectedProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);

  const [users, setUsers] = useState([]);
  const [rolesMap, setRolesMap] = useState({});
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState(null); // Changed from 3 to 1
  const [selectedReviewerId, setSelectedReviewerId] = useState(null);     // 1 reviewer

  // Searching
  const [searchProject, setSearchProject] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [projRes, usersRes, rolesRes] = await Promise.allSettled([
        api.get('/projects').catch(() => api.get('/Projects')),
        api.get('/users').catch(() => api.get('/Users')),
        api.get('/roles').catch(() => api.get('/Roles')),
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
        roles.forEach((role) => {
          const rid = role?.id ?? role?.roleId;
          const rname = String(role?.roleName ?? role?.name ?? '').toLowerCase();
          if (rid) nextRolesMap[String(rid)] = rname;
        });
        setRolesMap(nextRolesMap);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
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
      let foundDatasets = [];

      try {
        const res = await api.get(`/projects/${projectId}`);
        const projectDetail = res.data?.data || res.data || {};
        if (Array.isArray(projectDetail?.datasets) && projectDetail.datasets.length > 0) {
          foundDatasets = projectDetail.datasets;
        }
      } catch (e) {
        console.warn('[Datasets] Could not fetch project detail:', e?.message);
      }

      if (foundDatasets.length === 0) {
        try {
          const dsRes = await api.get(`/datasets?ProjectId=${projectId}`);
          const dsData = dsRes.data?.items || dsRes.data?.data || dsRes.data;
          if (Array.isArray(dsData) && dsData.length > 0) {
            foundDatasets = dsData.map(ds => ({ ...ds, id: ds.id || ds.datasetId }));
          }
        } catch (e) {
          console.warn('[Datasets] Could not fetch datasets by projectId:', e?.message);
        }
      }

      setDatasets(foundDatasets);
    } catch (err) {
      console.error('[Datasets] Error fetching datasets:', err);
      setDatasets([]);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const handleProjectSelect = async (project) => {
    const projectId = project.id || project.projectId;
    // Fetch project detail để lấy deadline và các thông tin đầy đủ
    let fullProject = project;
    try {
      const res = await api.get(`/projects/${projectId}`, { validateStatus: () => true });
      if (res.status === 200 || res.status === 201) {
        fullProject = { ...project, ...(res.data?.data || res.data || {}) };
      }
    } catch { /* use basic project info */ }
    setSelectedProject(fullProject);
    fetchDatasetsForProject(project);
    setStep(2);
    setSelectedDatasetId(null);
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
    return projects.filter((p) => {
      const name = String(p.name || p.title || p.projectName || p.id || '').toLowerCase();
      return name.includes(searchProject.toLowerCase());
    });
  }, [projects, searchProject]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Attach dataset vào project, tự động move nếu đang ở project khác
  const attachDatasetToProject = async (datasetId, projectId) => {
    // 1. Try to add directly
    const addRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(datasetId) }, {
      validateStatus: () => true,
    });

    if (addRes.status === 200 || addRes.status === 201 || addRes.status === 204) {
      return true;
    }

    const errorMsg = String(addRes.data?.message || addRes.data?.title || '').toLowerCase();

    // If already in this project, we are good
    if (errorMsg.includes('already associated') || errorMsg.includes('exists')) {
      return true;
    }

    // 2. If it's in another project, we need to find and remove it first (only if absolutely necessary)
    // For now, let's just log and try a silent remove from all other known projects
    try {
      const projRes = await api.get('/projects', { validateStatus: () => true });
      const projectList = projRes.data?.items || projRes.data?.data || projRes.data || [];
      if (Array.isArray(projectList)) {
        for (const proj of projectList) {
          const pid = proj.projectId || proj.id;
          if (!pid || String(pid) === String(projectId)) continue;

          // Silently try to remove
          await api.post(`/datasets/remove/${pid}`, { datasetId: String(datasetId) }, {
            validateStatus: () => true,
          });
        }
      }
    } catch { /* ignore fetching projects error */ }

    // Final attempt to add
    const finalRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(datasetId) }, {
      validateStatus: () => true,
    });
    return finalRes.status === 200 || finalRes.status === 201 || finalRes.status === 204;
  };

  const handleAssignSubmit = async () => {
    if (!selectedProject || !selectedDatasetId) return;
    if (!selectedAnnotatorId) {
      showMessage('warning', 'Vui lòng chọn 1 Annotator.');
      return;
    }
    if (!selectedReviewerId) {
      showMessage('warning', 'Vui lòng chọn 1 Reviewer.');
      return;
    }

    setAssigning(true);
    let errorDetails = [];

    try {
      const projectId = selectedProject.id || selectedProject.projectId;

      // ✅ Fetch project detail để lấy deadline thực tế (manager có quyền GET)
      let projectDetail = selectedProject;
      try {
        const projRes = await api.get(`/projects/${projectId}`, { validateStatus: () => true });
        if (projRes.status === 200) {
          projectDetail = projRes.data?.data || projRes.data || selectedProject;
        }
      } catch { /* fallback to selectedProject */ }

      const allSelectedUsers = [selectedAnnotatorId, selectedReviewerId].filter(Boolean);

      // 1. Add all users to project as members (ignore errors)
      for (const userId of allSelectedUsers) {
        try {
          await api.post(`/projects/${projectId}/members/${userId}`, null, {
            validateStatus: () => true,
          });
        } catch (e) { /* ignore */ }
      }

      // 2. Attach dataset
      const attached = await attachDatasetToProject(selectedDatasetId, projectId);
      if (!attached) {
        console.warn('Could not confirm dataset attachment, proceeding anyway...');
      }
      await new Promise(r => setTimeout(r, 400));

      const datasetInfo = datasets.find(
        (d) => String(d.id || d.datasetId) === String(selectedDatasetId)
      );

      let successCount = 0;

      // 3. Assign cho annotator duy nhất
      try {
        const assignPayload = {
          assignedTo: String(selectedAnnotatorId),
          projectId: String(projectId),
          datasetId: String(selectedDatasetId),
          timeLimitMinutes: 60,
        };

        console.log(`[Flow] Assigning to ${selectedAnnotatorId}...`);
        const assignRes = await api.post('/tasks/assign', assignPayload);
        const resData = assignRes.data?.data || assignRes.data || {};
        const realTaskId = resData.taskId || resData.id || resData.Id;

        if (realTaskId) {
          const projectDeadline = projectDetail?.deadline || projectDetail?.dueDate || projectDetail?.endDate;
          assignLocalTaskToUser({
            id: realTaskId,
            title: projectDetail?.name || selectedProject?.name || 'Nhiệm vụ mới',
            description: projectDetail?.description || selectedProject?.description || '',
            type: 'image',
            status: 'pending',
            projectName: projectDetail?.name || selectedProject?.name || 'Dự án',
            projectId: String(projectId),
            datasetName: datasetInfo?.name || 'Bộ dữ liệu',
            datasetId: String(selectedDatasetId),
            assignedTo: String(selectedAnnotatorId),
            assignedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dueDate: projectDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress: 0,
            totalItems: datasetInfo?.sampleCount || datasetInfo?.imagesCount || datasetInfo?.itemsCount || 0,
            items: [],
            _source: 'api',
          }, selectedAnnotatorId);
        }
        successCount = 1;
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.title || err.message;
        console.error(`Assign failed for user ${selectedAnnotatorId}:`, errMsg, err.response?.data);
        errorDetails.push(`User ${selectedAnnotatorId}: ${errMsg}`);
      }

      if (successCount > 0) {
        showMessage('success', 'Giao việc thành công!');

        setTimeout(() => {
          setStep(1);
          setSelectedProject(null);
          setSelectedDatasetId(null);
          setSelectedAnnotatorId(null);
          setSelectedReviewerId(null);
        }, 3000);
      } else {
        const finalError = errorDetails.length > 0 ? errorDetails.join(' | ') : 'Lỗi không xác định';
        showMessage('error', 'Giao việc thất bại hoàn toàn: ' + finalError);
      }
    } catch (err) {
      console.error('Assignment workflow error:', err);
      showMessage('error', 'Giao việc thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setAssigning(false);
    }
  };

  const renderSimpleUserCard = (u, isSelected, onClick, type) => {
    const uid = u.id || u.userId;
    const themeColor = type === 'annotator' ? 'emerald' : 'indigo';

    return (
      <div
        key={uid}
        onClick={onClick}
        className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 ${isSelected
          ? `border-${themeColor}-500 bg-${themeColor}-50/50 shadow-md`
          : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
          }`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-inner ${isSelected ? `bg-${themeColor}-600` : 'bg-slate-200 text-slate-500'}`}>
          {u.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-slate-900 text-sm truncate">{u.username || u.displayName}</h4>
          <p className="text-[10px] font-bold text-slate-400 truncate">{u.email || u.displayName}</p>
        </div>
        {isSelected && <CheckCircle2 className={`w-5 h-5 text-${themeColor}-600 shrink-0`} />}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header title="Hệ Thống Giao Việc" role="Manager" />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Stepper */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { s: 1, label: 'Chọn Dự Án', icon: FolderKanban },
            { s: 2, label: 'Chọn Dataset', icon: Database },
            { s: 3, label: 'Giao Nhân Sự', icon: Users },
          ].map((item) => (
            <div
              key={item.s}
              className={`p-4 rounded-3xl flex items-center gap-4 border-2 transition-all ${step >= item.s ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-slate-100'}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${step >= item.s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${step >= item.s ? 'text-indigo-100' : 'text-slate-400'}`}>Bước {item.s}</p>
                <p className={`text-sm font-black ${step >= item.s ? 'text-white' : 'text-slate-700'}`}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {message.text && (
          <div className={`mb-8 p-4 rounded-2xl border-2 font-black flex items-center shadow-xl animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : message.type === 'error' ? 'bg-red-500 text-white border-red-400' : 'bg-amber-500 text-white border-amber-400'}`}>
            <Info className="w-5 h-5 mr-3 shrink-0" /> {message.text}
          </div>
        )}

        {/* STEP 1: PROJECT LIST */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chọn 1 dự án để giao việc</h2>
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
                filteredProjects.map((proj) => (
                  <div
                    key={proj.id || proj.projectId}
                    onClick={() => handleProjectSelect(proj)}
                    className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="w-14 h-14 bg-slate-50 group-hover:bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-slate-400 group-hover:text-white mb-6 transition-all duration-500">
                      <FolderKanban className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-1">{proj.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-8 font-medium">
                      {proj.description || 'Chưa có mô tả'}
                    </p>
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

        {/* STEP 2: DATASET */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep(1)} className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Chọn 1 Dataset</h2>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Dự án: {selectedProject?.name}</p>
                </div>
              </div>
              {selectedDatasetId && (
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-3xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Tiếp Tục <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingDatasets ? (
                <div className="col-span-full py-20 flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                </div>
              ) : datasets.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                  <Database className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-black">Dự án này chưa có dataset.</p>
                </div>
              ) : (
                datasets.map((ds) => {
                  const dsId = ds.id || ds.datasetId;
                  const isSelected = selectedDatasetId === dsId;
                  return (
                    <div
                      key={dsId}
                      onClick={() => setSelectedDatasetId(dsId)}
                      className={`p-8 rounded-[3rem] border-4 transition-all cursor-pointer relative ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-xl' : 'border-slate-50 bg-white hover:border-indigo-100 shadow-sm'}`}
                    >
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                        <Database className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-slate-900 text-xl mb-1">{ds.name}</h4>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                        {ds.sampleCount || ds.imagesCount || 0} ITEMS
                      </p>
                      {isSelected && (
                        <div className="absolute top-6 right-8 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                          <CheckSquare className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 3: PERSONNEL (Annotators & Reviewer Combined) */}
        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-md gap-6">
              <div className="flex items-center gap-6">
                <button onClick={() => setStep(2)} className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Thiết Lập Nhân Sự</h2>
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Dataset: {datasets.find(d => (d.id || d.datasetId) === selectedDatasetId)?.name}</p>
                </div>
              </div>
              <button
                onClick={handleAssignSubmit}
                disabled={assigning || !selectedAnnotatorId || !selectedReviewerId}
                className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black shadow-2xl hover:bg-black transition-all disabled:opacity-20 flex items-center gap-4 border-2 border-slate-800"
              >
                {assigning ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserCheck className="w-6 h-6" />}
                Xác Nhận & Giao Việc
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Annotators Column */}
              <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm flex flex-col h-[700px]">
                <div className="p-8 border-b-2 border-slate-50 flex items-center justify-between bg-emerald-50/30 rounded-t-[3rem]">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Annotator</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${selectedAnnotatorId ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {selectedAnnotatorId ? 'Đã lựa chọn 1 annotator' : 'Chọn duy nhất 1 người'}
                    </p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedAnnotatorId ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                    <Users className="w-7 h-7" />
                  </div>
                </div>
                <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  {annotators.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-10">Không tìm thấy Annotator</p>
                  ) : (
                    annotators.map(u => {
                      const uid = u.id || u.userId;
                      const isSelected = selectedAnnotatorId === uid;
                      return renderSimpleUserCard(u, isSelected, () => {
                        setSelectedAnnotatorId(isSelected ? null : uid);
                      }, 'annotator');
                    })
                  )}
                </div>
              </div>

              {/* Reviewer Column */}
              <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm flex flex-col h-[700px]">
                <div className="p-8 border-b-2 border-slate-50 flex items-center justify-between bg-indigo-50/30 rounded-t-[3rem]">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Reviewer</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${selectedReviewerId ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {selectedReviewerId ? 'Đã lựa chọn 1 reviewer' : 'Chọn duy nhất 1 người'}
                    </p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedReviewerId ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                </div>
                <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  {reviewers.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-10">Không tìm thấy Reviewer</p>
                  ) : (
                    reviewers.map(u => {
                      const uid = u.id || u.userId;
                      const isSelected = selectedReviewerId === uid;
                      return renderSimpleUserCard(u, isSelected, () => setSelectedReviewerId(isSelected ? null : uid), 'reviewer');
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
