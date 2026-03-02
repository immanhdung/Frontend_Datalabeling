import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';

const CreateProject = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Create Project" role="Manager" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Create New Project
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

export default CreateProject;
