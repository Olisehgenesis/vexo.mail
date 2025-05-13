// components/email/EmailList.js
import React from 'react';
import { useRouter } from 'next/router';
import { useEmails } from '../../contexts/EmailContext';
import EmailItem from './EmailItem';

const EmailList = () => {
  const router = useRouter();
  const { emails, loading, error, currentFolder, markAsRead } = useEmails();

  const handleEmailClick = (emailId) => {
    // Mark as read and navigate to email view
    markAsRead(emailId);
    router.push(`/email/${emailId}`);
  };

  const handleStarClick = (emailId) => {
    // Toggle star status
    // This would require a new API endpoint and context method
    console.log('Toggle star for', emailId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 text-lg">No emails in {currentFolder}</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {emails.map((email) => (
        <EmailItem
          key={email.id}
          email={email}
          onClick={handleEmailClick}
          onStar={handleStarClick}
        />
      ))}
    </div>
  );
};

export default EmailList;