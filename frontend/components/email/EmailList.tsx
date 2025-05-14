// components/email/EmailList.tsx
import React from 'react';
import { useEmails } from '@/context/EmailContext';

const EmailList = () => {
  const { emails, loading, error } = useEmails();

  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mb-2"></div>
        <p className="text-gray-500">Loading emails...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-red-500">Error loading emails: {error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500">No emails in this folder</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {emails.map((email) => (
          <li key={email.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <div className="flex items-center">
                  <p className={`text-sm font-medium ${email.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                    {email.fromName || email.from}
                  </p>
                </div>
                <div className="mt-1">
                  <p className={`text-sm ${email.isRead ? 'text-gray-400' : 'text-gray-700'}`}>
                    {email.subject}
                  </p>
                </div>
              </div>
              <div className="ml-2">
                <p className="text-xs text-gray-500">
                  {new Date(email.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EmailList;