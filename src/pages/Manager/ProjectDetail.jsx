import { Link, useParams } from 'react-router-dom';
import Header from '../../components/common/Header';

const ProjectDetail = () => {
  const { projectId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={`Project #${projectId}`} role="Manager" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Project Detail Page
          </h2>
          <p className="text-gray-600 mb-2">
            Project ID: <span className="font-mono font-bold">{projectId}</span>
          </p>
          <p className="text-gray-600 mb-8">
            Trang này đang được phát triển...
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/manager/projects"
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Quay lại Projects
            </Link>
            <Link
              to="/manager/dashboard"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
