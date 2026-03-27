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

  const [rolesMap, setRolesMap] = useState({});
  const [selectedAnnotators, setSelectedAnnotators] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState(null);

  const selectedAnnotatorIds = useMemo(() => selectedAnnotators.map(u => u.id || u.userId), [selectedAnnotators]);
  const selectedReviewerId = useMemo(() => selectedReviewer?.id || selectedReviewer?.userId || null, [selectedReviewer]);

  const [paginatedAnnotators, setPaginatedAnnotators] = useState([]);
  const [paginatedReviewers, setPaginatedReviewers] = useState([]);
  const [annPage, setAnnPage] = useState(1);
  const [revPage, setRevPage] = useState(1);
  const [annTotalPages, setAnnTotalPages] = useState(1);
  const [revTotalPages, setRevTotalPages] = useState(1);
  const USER_PAGE_SIZE = 10;

  const [loadingUsers, setLoadingUsers] = useState(false);

  // Searching
  const [searchProject, setSearchProject] = useState('');
  const [userTaskCounts, setUserTaskCounts] = useState({});
  const [deadline, setDeadline] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [projRes, rolesRes, tasksRes, reviewsRes] = await Promise.allSettled([
        api.get('/projects').catch(() => api.get('/Projects')),
        api.get('/roles').catch(() => api.get('/Roles')),
        api.get('/tasks').catch(() => api.get('/Tasks')),
        api.get('/reviews').catch(() => api.get('/Reviews')),
      ]);

      const counts = {};

      if (projRes.status === 'fulfilled') {
        const pData = projRes.value.data?.data || projRes.value.data;
        setProjects(Array.isArray(pData?.items) ? pData.items : Array.isArray(pData) ? pData : []);
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

      if (tasksRes.status === 'fulfilled') {
        const tData = tasksRes.value.data?.data || tasksRes.value.data?.items || tasksRes.value.data || [];
        const taskList = Array.isArray(tData) ? tData : [];
        taskList.forEach(t => {
          const aid = t.assignedTo || t.annotatorId || t.assigneeId;
          if (aid) {
            counts[String(aid)] = (counts[String(aid)] || 0) + 1;
          }
        });
      }

      if (reviewsRes.status === 'fulfilled') {
        const rData = reviewsRes.value.data?.data || reviewsRes.value.data?.items || reviewsRes.value.data || [];
        const reviewList = Array.isArray(rData) ? rData : [];
        reviewList.forEach(r => {
          const rid = r.reviewedBy || r.reviewerId;
          if (rid) {
            counts[String(rid)] = (counts[String(rid)] || 0) + 1;
          }
        });
      }
      setUserTaskCounts(counts);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonnel = async (role, page) => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/users', {
        params: {
          Role: role,
          page,
          pageSize: USER_PAGE_SIZE,
        }
      });
      const raw = res.data;
      const users = (Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []);

      if (role === 'annotator') {
        setPaginatedAnnotators(users);
        setAnnTotalPages(raw?.totalPages || 1);
      } else {
        setPaginatedReviewers(users);
        setRevTotalPages(raw?.totalPages || 1);
      }
    } catch (err) {
      console.error(`Error fetching ${role}:`, err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (step === 3) {
      fetchPersonnel('annotator', annPage);
      fetchPersonnel('reviewer', revPage);
    }
  }, [step, annPage, revPage]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchDatasetsForProject = async (project) => {
    try {
      setLoadingDatasets(true);
      const projectId = project.id || project.projectId;
      let foundDatasets = [];

      try {
        const res = await api.get(`/projects/${projectId}/datasets`);
        const dData = res.data?.data || res.data?.items || res.data || [];
        if (Array.isArray(dData)) {
          foundDatasets = dData.map(ds => ({ ...ds, id: ds.id || ds.datasetId }));
        }
      } catch (e) {
        console.warn('[Datasets] GET /projects/{id}/datasets failed:', e?.message);
        if (project.datasets && Array.isArray(project.datasets)) {
          foundDatasets = project.datasets;
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
    let fullProject = project;
    try {
      const res = await api.get(`/projects/${projectId}`, { validateStatus: () => true });
      if (res.status === 200 || res.status === 201) {
        fullProject = { ...project, ...(res.data?.data || res.data || {}) };
      }
    } catch { }
    setSelectedProject(fullProject);
    fetchDatasetsForProject(fullProject);
    setStep(2);
    setSelectedDatasetId(null);
  };

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

  const attachDatasetToProject = async (datasetId, projectId) => {
    const addRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(datasetId) }, {
      validateStatus: () => true,
    });

    if (addRes.status === 200 || addRes.status === 201 || addRes.status === 204) {
      return true;
    }

    const errorMsg = String(addRes.data?.message || addRes.data?.title || '').toLowerCase();

    if (errorMsg.includes('already associated') || errorMsg.includes('exists')) {
      return true;
    }

    try {
      const projRes = await api.get('/projects', { validateStatus: () => true });
      const projectList = projRes.data?.items || projRes.data?.data || projRes.data || [];
      if (Array.isArray(projectList)) {
        for (const proj of projectList) {
          const pid = proj.projectId || proj.id;
          if (!pid || String(pid) === String(projectId)) continue;
          await api.post(`/datasets/remove/${pid}`, { datasetId: String(datasetId) }, {
            validateStatus: () => true,
          });
        }
      }
    } catch { }

    const finalRes = await api.post(`/datasets/add/${projectId}`, { datasetId: String(datasetId) }, {
      validateStatus: () => true,
    });
    return finalRes.status === 200 || finalRes.status === 201 || finalRes.status === 204;
  };

  const toISOStringSafe = (dateVal, fallbackMs) => {
    if (!dateVal) return new Date(fallbackMs).toISOString();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date(fallbackMs).toISOString() : d.toISOString();
  };

  const handleAssignSubmit = async () => {
    if (!selectedProject || !selectedDatasetId) return;
    if (!selectedAnnotatorIds || selectedAnnotatorIds.length < 2) {
      showMessage('warning', 'Vui lòng chọn ít nhất 2 Annotator.');
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

      let projectDetail = selectedProject;
      try {
        const projRes = await api.get(`/projects/${projectId}`, { validateStatus: () => true });
        if (projRes.status === 200) {
          projectDetail = projRes.data?.data || projRes.data || selectedProject;
        }
      } catch { }

      const allSelectedUsers = [...selectedAnnotatorIds, selectedReviewerId].filter(Boolean);
      for (const userId of allSelectedUsers) {
        try {
          await api.post(`/projects/${projectId}/members/${userId}`, null, {
            validateStatus: () => true,
          });
        } catch (e) { }
      }

      const attached = await attachDatasetToProject(selectedDatasetId, projectId);
      if (!attached) {
        console.warn('Could not confirm dataset attachment, proceeding anyway...');
      }
      await new Promise(r => setTimeout(r, 400));

      const datasetInfo = datasets.find(
        (d) => String(d.id || d.datasetId) === String(selectedDatasetId)
      );
      const startedAt = new Date().toISOString();
      const deadlineAt = deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const allAssigned = [...selectedAnnotatorIds, selectedReviewerId].filter(Boolean);
      const firstAnnotatorId = selectedAnnotatorIds[0];
      let successCount = 0;
      let realTaskId = null;
      const firstPayload = {
        projectId: String(projectId),
        datasetId: String(selectedDatasetId),
        assigments: [{
          assignedTo: String(firstAnnotatorId),
          startedAt,
          deadlineAt,
        }],
      };

      console.log('[AssignTasks] Gọi API thật cho annotator đầu tiên:', firstAnnotatorId);

      try {
        const firstRes = await api.post('/tasks/assign', firstPayload);
        const resData = firstRes.data?.data || firstRes.data || {};
        const taskInfo = Array.isArray(resData) ? resData[0] : resData;
        realTaskId = taskInfo?.taskId || taskInfo?.id || taskInfo?.Id || `real-${projectId}-${selectedDatasetId}`;

        console.log('[AssignTasks] API thành công, realTaskId:', realTaskId);

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
          assignedTo: String(firstAnnotatorId),
          assignedAt: startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
          dueDate: deadlineAt,
          progress: 0,
          totalItems: datasetInfo?.sampleCount || datasetInfo?.imagesCount || datasetInfo?.itemsCount || 0,
          items: [],
          totalAnnotators: selectedAnnotatorIds.length,
          _source: 'api_real',
        }, firstAnnotatorId);

        successCount = 1;
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.title || err.message;
        console.error('[AssignTasks] API assign thất bại:', errMsg);
        errorDetails.push(`Lỗi giao việc: ${errMsg}`);
      }

      if (realTaskId) {
        const remainingUsers = allAssigned.filter(id => id !== firstAnnotatorId);

        remainingUsers.forEach((userId) => {
          console.log('[AssignTasks] Lưu local cho userId:', userId, 'dùng taskId:', realTaskId);

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
            assignedTo: String(userId),
            assignedAt: startedAt,
            createdAt: startedAt,
            updatedAt: startedAt,
            dueDate: deadlineAt,
            progress: 0,
            totalItems: datasetInfo?.sampleCount || datasetInfo?.imagesCount || datasetInfo?.itemsCount || 0,
            items: [],
            totalAnnotators: selectedAnnotatorIds.length,
            _source: 'local_mirror',
          }, userId);

          successCount += 1;
        });
      }

      const totalExpected = selectedAnnotatorIds.length + (selectedReviewerId ? 1 : 0);

      if (successCount === totalExpected) {
        showMessage('success', `Giao việc thành công cho ${selectedAnnotatorIds.length} Annotator và 1 Reviewer!`);
        setTimeout(() => {
          setStep(1);
          setSelectedProject(null);
          setSelectedDatasetId(null);
          setSelectedAnnotators([]);
          setSelectedReviewer(null);
        }, 3000);
      } else if (successCount > 0) {
        showMessage('warning', `Giao việc thành công một phần (${successCount}/${totalExpected}). Lỗi: ${errorDetails.join('; ')}`);
      } else {
        showMessage('error', 'Giao việc thất bại hoàn toàn: ' + errorDetails.join(' | '));
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
        <div className="text-right shrink-0">
          <p className={`text-xs font-black ${userTaskCounts[String(uid)] > 5 ? 'text-red-500' : 'text-slate-600'}`}>
            {userTaskCounts[String(uid)] || 0} tasks
          </p>
          <p className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">Đang đảm nhận</p>
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
                  const isAlreadyAssigned = ds.isActive === false || ds.IsActive === false;

                  return (
                    <div
                      key={dsId}
                      onClick={() => !isAlreadyAssigned && setSelectedDatasetId(dsId)}
                      className={`p-8 rounded-[3rem] border-4 transition-all relative ${isAlreadyAssigned
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xl cursor-pointer'
                          : 'border-slate-50 bg-white hover:border-indigo-100 shadow-sm cursor-pointer'
                        }`}
                    >
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${isAlreadyAssigned ? 'bg-slate-200 text-slate-400' : isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                        }`}>
                        <Database className="w-8 h-8" />
                      </div>

                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-slate-900 text-xl mb-1 truncate max-w-[150px]">{ds.name}</h4>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                            {ds.sampleCount || ds.imagesCount || 0} ITEMS
                          </p>
                        </div>
                        {isAlreadyAssigned && (
                          <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                            Đã giao
                          </span>
                        )}
                      </div>

                      {isSelected && !isAlreadyAssigned && (
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

              {/* Chọn Deadline cho Task */}
              <div className="bg-slate-50 px-6 py-4 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">Task Deadline:</span>
                </div>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="flex-1 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 font-bold text-slate-900 focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                onClick={handleAssignSubmit}
                disabled={assigning || selectedAnnotatorIds.length < 2 || !selectedReviewerId || !deadline}
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
                    <h3 className="text-xl font-black text-slate-900">Annotators</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${selectedAnnotatorIds.length >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {selectedAnnotatorIds.length >= 2 ? `Đã chọn ${selectedAnnotatorIds.length} annotator` : `Đã chọn ${selectedAnnotatorIds.length}/2 annotator`}
                    </p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedAnnotatorIds.length >= 2 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                    <Users className="w-7 h-7" />
                  </div>
                </div>
                <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  {loadingUsers ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
                  ) : paginatedAnnotators.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-10">Không tìm thấy Annotator</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Selected Section */}
                      {selectedAnnotators.length > 0 && (
                        <div className="space-y-3 mb-8 bg-emerald-50/50 p-4 rounded-[2rem] border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-2 mb-2">Đăng chọn ({selectedAnnotators.length})</p>
                          <div className="grid grid-cols-1 gap-2">
                            {selectedAnnotators.map(u => (
                              renderSimpleUserCard(u, true, () => {
                                const uid = u.id || u.userId;
                                setSelectedAnnotators(prev => prev.filter(a => (a.id || a.userId) !== uid));
                              }, 'annotator')
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Danh sách Annotator</p>
                      {paginatedAnnotators
                        .filter(u => !selectedAnnotatorIds.includes(u.id || u.userId))
                        .map(u => {
                          const uid = u.id || u.userId;
                          const isSelected = selectedAnnotatorIds.includes(uid);
                          const handleToggle = () => {
                            if (isSelected) {
                              setSelectedAnnotators(prev => prev.filter(a => (a.id || a.userId) !== uid));
                            } else {
                              setSelectedAnnotators(prev => [...prev, u]);
                            }
                          };
                          return renderSimpleUserCard(u, isSelected, handleToggle, 'annotator');
                        })}

                      {annTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                          <button
                            disabled={annPage <= 1}
                            onClick={() => setAnnPage(p => p - 1)}
                            className="p-2 bg-slate-100 rounded-xl disabled:opacity-30"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-slate-500">Trang {annPage} / {annTotalPages}</span>
                          <button
                            disabled={annPage >= annTotalPages}
                            onClick={() => setAnnPage(p => p + 1)}
                            className="p-2 bg-slate-100 rounded-xl disabled:opacity-30"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Reviewer Column */}
              <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm flex flex-col h-[700px]">
                <div className="p-8 border-b-2 border-slate-50 flex items-center justify-between bg-indigo-50/30 rounded-t-[3rem]">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Reviewer</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${selectedReviewerId ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {selectedReviewerId ? "Đã lựa chọn Reviewer" : "Chọn duy nhất 1 người"}
                    </p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedReviewerId ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                </div>
                <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  {loadingUsers ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                  ) : paginatedReviewers.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-10">Không tìm thấy Reviewer</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Selected Section */}
                      {selectedReviewer && (
                        <div className="space-y-3 mb-8 bg-indigo-50/50 p-4 rounded-[2rem] border border-indigo-100">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-2 mb-2">Đã chọn</p>
                          {renderSimpleUserCard(selectedReviewer, true, () => setSelectedReviewer(null), 'reviewer')}
                        </div>
                      )}

                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Danh sách Reviewer</p>
                      {paginatedReviewers
                        .filter(u => (u.id || u.userId) !== selectedReviewerId)
                        .map(u => {
                          const uid = u.id || u.userId;
                          const isSelected = selectedReviewerId === uid;
                          return renderSimpleUserCard(u, isSelected, () => {
                            setSelectedReviewer(isSelected ? null : u);
                          }, 'reviewer');
                        })}

                      {revTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                          <button
                            disabled={revPage <= 1}
                            onClick={() => setRevPage(p => p - 1)}
                            className="p-2 bg-slate-100 rounded-xl disabled:opacity-30"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-slate-500">Trang {revPage} / {revTotalPages}</span>
                          <button
                            disabled={revPage >= revTotalPages}
                            onClick={() => setRevPage(p => p + 1)}
                            className="p-2 bg-slate-100 rounded-xl disabled:opacity-30"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
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
