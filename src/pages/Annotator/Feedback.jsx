import React, { useMemo } from "react";
import Header from "../../components/common/Header";
import { MessageSquare, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";

const getCurrentUser = () => {
  const userRaw = localStorage.getItem("user");
  return userRaw ? JSON.parse(userRaw) : null;
};

const normalizeString = (value) => String(value ?? "").trim().toLowerCase();

export default function AnnotatorFeedback() {
  const feedbackItems = useMemo(() => {
    const currentUser = getCurrentUser();
    const currentUsername = normalizeString(currentUser?.username);

    const reviewHistoryRaw = localStorage.getItem("reviewHistory");
    const reviewHistory = reviewHistoryRaw ? JSON.parse(reviewHistoryRaw) : [];
    const records = Array.isArray(reviewHistory) ? reviewHistory : [];

    return records
      .filter((record) => {
        const isRejected = normalizeString(record.decision) === "rejected";
        if (!isRejected) return false;

        if (!currentUsername) return true;

        const annotatorName = normalizeString(record.annotatorName);
        return annotatorName.includes(currentUsername) || currentUsername.includes(annotatorName);
      })
      .sort((a, b) => new Date(b.reviewedAt ?? b.createdAt ?? 0) - new Date(a.reviewedAt ?? a.createdAt ?? 0));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Trung tâm phản hồi" userName="Annotator" userRole="annotator" />

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 mb-10 overflow-hidden relative">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-purple-50 rounded-[1.5rem] flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hộp thư Feedback</h2>
              <p className="text-slate-500 font-medium">Xem các phản hồi và yêu cầu sửa đổi từ người kiểm duyệt.</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-purple-50/50 to-transparent"></div>
        </div>

        {feedbackItems.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-20 text-center">
            <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-slate-700 font-black text-lg">Tuyệt vời! Không có feedback nào</p>
            <p className="text-slate-400 text-sm mt-2">Tất cả nhiệm vụ của bạn đều đạt yêu cầu hoặc đang đợi kiểm duyệt.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {feedbackItems.map((item, index) => (
              <div
                key={`${item.taskId || item.id || index}`}
                className="group bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 hover:shadow-xl hover:border-red-100 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-red-600 transition-colors">
                          {item.taskTitle || item.taskId || "Nhiệm vụ chưa rõ tên"}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          Project: {item.projectName || "N/A"}
                        </p>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 shadow-sm shadow-red-50">
                      Cần chỉnh sửa
                    </span>
                  </div>

                  <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-slate-700 relative group-hover:bg-white group-hover:border-red-50 transition-all duration-500">
                    <div className="flex items-center gap-2 mb-3 text-slate-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Nội dung phản hồi</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed italic">
                      "{item.feedback || "Reviewer chưa để lại nội dung chi tiết."}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-6 border-t border-dashed border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <Clock className="w-4 h-4" />
                      {new Date(item.reviewedAt || item.createdAt || Date.now()).toLocaleString("vi-VN")}
                    </div>
                    <button
                      onClick={() => {
                        // Logic to go to task to fix it
                        if (item.taskId) window.location.href = `/annotator/tasks/${item.taskId}`;
                      }}
                      className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-2 group/btn"
                    >
                      XỬ LÝ NGAY
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/20 rounded-full translate-x-16 -translate-y-16 scale-0 group-hover:scale-100 transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
