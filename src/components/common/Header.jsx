import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ title, userName, userRole, onRefresh, actionButton }) => {
  const getRoleColor = (role) => {
    const colors = {
      reviewer: 'bg-blue-500',
      annotator: 'bg-green-500',
      manager: 'bg-purple-500',
      admin: 'bg-red-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleInitial = (role) => {
    const initials = {
      reviewer: 'R',
      annotator: 'A',
      manager: 'M',
      admin: 'AD',
    };
    return initials[role] || 'U';
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            {actionButton && actionButton}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Làm mới
                </span>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${getRoleColor(userRole)} rounded-full flex items-center justify-center text-white font-semibold`}>
                {getRoleInitial(userRole)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
