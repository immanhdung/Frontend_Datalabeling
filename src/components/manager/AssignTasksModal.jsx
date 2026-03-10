import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Users,
    ShieldCheck,
    CheckSquare,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FolderKanban,
    ClipboardList
} from 'lucide-react';
import api, { taskAPI, userAPI, roleAPI } from '../../config/api';

export default function AssignTasksModal({ project, isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [rolesMap, setRolesMap] = useState({ '1': 'admin', '2': 'manager', '3': 'annotator', '4': 'reviewer' });
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchUser, setSearchUser] = useState('');

    const [selectedAnnotators, setSelectedAnnotators] = useState([]);
    const [selectedReviewers, setSelectedReviewers] = useState([]);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    const toArrayData = (res) => {
        const data = res?.data?.items || res?.data?.data || res?.data || [];
        return Array.isArray(data) ? data : [];
    };

    const dedupeUsers = (arr) => {
        const seen = new Set();
        return arr.filter(u => {
            const id = u?.id ?? u?._id ?? u?.userId ?? u?.username;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    };

    const getUserRole = (user) => {
        const rid = user?.roleId ?? user?.role_id;
        if (rid && rolesMap[String(rid)]) return rolesMap[String(rid)];

        const rname = (user?.roleName ?? user?.role?.name ?? user?.role ?? '').toLowerCase();
        return rname;
    };

    const isAnnotatorUser = (user) => {
        const role = getUserRole(user);
        if (role === 'admin' || role === 'manager') return false;
        if (role.includes('annotator') || role.includes('labeler')) return true;
        const name = String(user?.username || user?.displayName || '').toLowerCase();
        if (name.includes('annotator') || name.includes('labeler') || name.includes('ann')) return true;
        return (role.includes('staff') || role === '');
    };

    const isReviewerUser = (user) => {
        const role = getUserRole(user);
        if (role === 'admin' || role === 'manager') return false;
        if (role.includes('reviewer') || role.includes('checker')) return true;
        const name = String(user?.username || user?.displayName || '').toLowerCase();
        if (name.includes('reviewer') || name.includes('checker') || name.includes('rev')) return true;
        return false;
    };

    const getUserDisplayName = (user) => user?.displayName ?? user?.name ?? user?.username ?? user?.full_name ?? 'Unknown User';
    const getUserId = (user) => user?.id ?? user?._id ?? user?.userId ?? user?.username ?? user?.email ?? null;

    const loadData = async () => {
        if (!isOpen) return;
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.allSettled([
                userAPI.getAll(),
                roleAPI.getAll()
            ]);

            if (rolesRes.status === 'fulfilled') {
                const roles = toArrayData(rolesRes.value);
                const nextRolesMap = {};
                roles.forEach(role => {
                    const rid = role?.id ?? role?.roleId;
                    const rname = String(role?.roleName ?? role?.name ?? '').toLowerCase();
                    if (rid) nextRolesMap[String(rid)] = rname;
                });
                setRolesMap(nextRolesMap);
            }

            const apiUsers = usersRes.status === 'fulfilled' ? toArrayData(usersRes.value) : [];
            let allUsers = apiUsers;

            if (allUsers.length === 0 && import.meta.env.DEV) {
                allUsers = [
                    { id: 'dev-ann-1', userId: 'dev-ann-1', username: 'annotator1', displayName: 'Annotator 1', roleName: 'annotator' },
                    { id: 'dev-ann-2', userId: 'dev-ann-2', username: 'annotator2', displayName: 'Annotator 2', roleName: 'annotator' },
                    { id: 'dev-rev-1', userId: 'dev-rev-1', username: 'reviewer1', displayName: 'Reviewer 1', roleName: 'reviewer' },
                    { id: 'dev-rev-2', userId: 'dev-rev-2', username: 'reviewer2', displayName: 'Reviewer 2', roleName: 'reviewer' },
                ];
            }
            setUsers(dedupeUsers(allUsers));
        } catch (error) {
            console.error('Error load data for modal', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Reset selections
        setSelectedAnnotators([]);
        setSelectedReviewers([]);
    }, [isOpen]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (!searchUser) return true;
            const search = searchUser.toLowerCase();
            return (
                getUserDisplayName(u).toLowerCase().includes(search) ||
                String(u.username || '').toLowerCase().includes(search)
            );
        });
    }, [users, searchUser]);

    const annotators = filteredUsers.filter(isAnnotatorUser);
    const reviewers = filteredUsers.filter(isReviewerUser);

    const toggleSelection = (userId, type) => {
        if (type === 'annotator') {
            setSelectedAnnotators(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
        } else {
            setSelectedReviewers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
        }
    };

    const handleAssignSubmit = async () => {
        if (selectedAnnotators.length === 0 && selectedReviewers.length === 0) {
            showMessage('warning', 'Vui lòng chọn ít nhất 1 người để giao việc.');
            return;
        }

        setAssigning(true);
        const allSelectedIds = [...selectedAnnotators, ...selectedReviewers];
        const projectId = project.id || project.projectId;

        try {
            for (const uid of allSelectedIds) {
                try {
                    await taskAPI.assign(projectId, uid);
                } catch (e) {
                    console.warn(`Assign failed for user ${uid}:`, e);
                }
            }
            showMessage('success', `Đã giao việc cho ${allSelectedIds.length} nhân sự thành công!`);
            setTimeout(() => onClose(), 2000);
        } catch (error) {
            showMessage('error', 'Giao việc thất bại');
        } finally {
            setAssigning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <FolderKanban className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">Giao việc cho dự án</h2>
                            <p className="text-sm font-bold text-indigo-600 truncate max-w-lg">{project?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Message Banner */}
                {message.text && (
                    <div className={`m-4 p-4 rounded-2xl border font-bold flex items-center shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            message.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
                        {message.text}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên nhân sự..."
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 text-sm font-bold"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase text-slate-400 mr-2">Đã chọn:</span>
                            <div className="flex items-center gap-2">
                                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">
                                    {selectedAnnotators.length} Annotators
                                </div>
                                <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-black">
                                    {selectedReviewers.length} Reviewers
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                        {/* Annotator Column */}
                        <div className="bg-emerald-50/20 border border-emerald-100 rounded-3xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Users className="w-5 h-5 text-emerald-600" />
                                    Annotator ({annotators.length})
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p className="text-xs font-bold">Đang tải...</p>
                                    </div>
                                ) : annotators.length === 0 ? (
                                    <p className="text-center text-slate-400 py-10 text-sm font-medium italic">Không thấy nhân sự phù hợp</p>
                                ) : (
                                    annotators.map(u => {
                                        const uid = getUserId(u);
                                        const isSelected = selectedAnnotators.includes(uid);
                                        return (
                                            <div
                                                key={uid}
                                                onClick={() => toggleSelection(uid, 'annotator')}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-white shadow-lg' : 'border-transparent bg-white/60 hover:border-emerald-200'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'
                                                    }`}>
                                                    {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">{getUserDisplayName(u)}</p>
                                                    <p className="text-xs text-slate-400 font-bold">{u.username || u.email}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Reviewer Column */}
                        <div className="bg-violet-50/20 border border-violet-100 rounded-3xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-violet-100 flex items-center justify-between bg-violet-50/50">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <ShieldCheck className="w-5 h-5 text-violet-600" />
                                    Reviewer ({reviewers.length})
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p className="text-xs font-bold">Đang tải...</p>
                                    </div>
                                ) : reviewers.length === 0 ? (
                                    <p className="text-center text-slate-400 py-10 text-sm font-medium italic">Không thấy nhân sự phù hợp</p>
                                ) : (
                                    reviewers.map(u => {
                                        const uid = getUserId(u);
                                        const isSelected = selectedReviewers.includes(uid);
                                        return (
                                            <div
                                                key={uid}
                                                onClick={() => toggleSelection(uid, 'reviewer')}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-violet-500 bg-white shadow-lg' : 'border-transparent bg-white/60 hover:border-violet-200'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-violet-500 border-violet-500' : 'bg-white border-slate-200'
                                                    }`}>
                                                    {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">{getUserDisplayName(u)}</p>
                                                    <p className="text-xs text-slate-400 font-bold">{u.username || u.email}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t bg-slate-50/80 flex items-center justify-between">
                    <div className="text-slate-500">
                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Dự án</p>
                        <p className="text-sm font-black text-slate-900 truncate max-w-xs">{project?.name}</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-900 transition-colors"
                            disabled={assigning}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleAssignSubmit}
                            disabled={assigning || (selectedAnnotators.length === 0 && selectedReviewers.length === 0)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {assigning && <Loader2 className="w-4 h-4 animate-spin" />}
                            {assigning ? 'Đang giao việc...' : `Xác nhận giao (${selectedAnnotators.length + selectedReviewers.length})`}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
