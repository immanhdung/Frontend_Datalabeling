import React, { useMemo } from "react";
import Header from "../../components/common/Header";
import { MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50">
      <Header title="Phản hồi" userName="Annotator" userRole="annotator" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Feedback từ Reviewer</h2>
          </div>
          <p className="text-sm text-gray-500">Các task bị từ chối sẽ hiển thị kèm ghi chú để bạn sửa lại.</p>
        </div>

        {feedbackItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Hiện chưa có feedback cần xử lý</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackItems.map((item, index) => (
              <div key={`${item.taskId || item.id || index}`} className="bg-white rounded-lg shadow-sm border border-red-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.taskTitle || item.taskId || "Task"}</h3>
                    <p className="text-sm text-gray-500">{item.projectName || "Không có project"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Từ chối
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {item.feedback || "Reviewer chưa để lại nội dung chi tiết."}
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  {new Date(item.reviewedAt || item.createdAt || Date.now()).toLocaleString("vi-VN")}
                </div>
              </div>
            ))}
          </div>
        )}

        {feedbackItems.length === 0 && (
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Dữ liệu feedback đang lấy từ local review history hiện có.
          </div>
        )}
      </main>
    </div>
  );
}
