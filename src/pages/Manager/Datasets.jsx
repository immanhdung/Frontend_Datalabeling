import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';

const Datasets = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Datasets" role="Manager" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Datasets Page
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

export default Datasets;
