import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';

const Projects = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Projects" role="Manager" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Projects Page
          </h2>
          <p className="text-gray-600 mb-8">
            Trang này đang được phát triển...
          </p>
          <Link
            to="/manager/dashboard"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            ← Quay lại Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Projects;
