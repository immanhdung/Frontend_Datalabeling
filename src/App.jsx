import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ReviewerDashboard from './pages/Reviewer/Dashboard';
import ReviewerTask from './pages/Reviewer/Task';
import ReviewerHistory from './pages/Reviewer/History';
import ReviewerAnalytics from './pages/Reviewer/Analytics';
import AnnotatorDashboard from './pages/Annotator/Dashboard';
import AnnotatorTask from './pages/Annotator/Task';
import AdminDashboard from './pages/Admin/Dashboard';

// Trang chủ để chọn role
function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🏷️ Data Labeling Platform
          </h1>
          <p className="text-xl text-white/90">
            Chọn vai trò của bạn để bắt đầu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Admin Card */}
          <Link to="/admin/dashboard">
            <div className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-6 group-hover:bg-red-600 transition-colors">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Admin</h2>
                <p className="text-gray-600 text-center mb-6">
                  Quản lý hệ thống và người dùng
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-2 w-full">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✓</span> Quản lý người dùng
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✓</span> Xem thống kê hệ thống
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✓</span> Cấu hình hệ thống
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✓</span> Giám sát hoạt động
                  </li>
                </ul>
                <button className="mt-8 w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors">
                  Vào Dashboard →
                </button>
              </div>
            </div>
          </Link>

          {/* Reviewer Card */}
          <Link to="/reviewer/dashboard">
            <div className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Reviewer</h2>
                <p className="text-gray-600 text-center mb-6">
                  Xem xét và duyệt các annotations từ annotators
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-2 w-full">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Review annotations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Approve/Reject tasks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Provide feedback
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Quality control
                  </li>
                </ul>
                <button className="mt-8 w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                  Vào Dashboard →
                </button>
              </div>
            </div>
          </Link>

          {/* Annotator Card */}
          <Link to="/annotator/dashboard">
            <div className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Annotator</h2>
                <p className="text-gray-600 text-center mb-6">
                  Gán nhãn dữ liệu cho các machine learning projects
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-2 w-full">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Label images, text, audio
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Complete tasks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Track progress
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> View feedback
                  </li>
                </ul>
                <button className="mt-8 w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors">
                  Vào Dashboard →
                </button>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-white/80 text-sm">
            💡 Tip: Bạn có thể chuyển đổi giữa các vai trò bất cứ lúc nào
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
        <Route path="/reviewer/task/:taskId" element={<ReviewerTask />} />
        <Route path="/reviewer/history" element={<ReviewerHistory />} />
        <Route path="/reviewer/analytics" element={<ReviewerAnalytics />} />
        <Route path="/annotator/dashboard" element={<AnnotatorDashboard />} />
        <Route path="/annotator/task/:taskId" element={<AnnotatorTask />} />
      </Routes>
    </Router>
  );
}

export default App;
