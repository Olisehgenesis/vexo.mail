// components/email/EmailView.js
import React from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  ArchiveBoxIcon,
  ReplyIcon
} from '@heroicons/react/24/outline';
import { useEmails } from '../../contexts/EmailContext';

const EmailView = ({ emailId }) => {
  const router = useRouter();
  const { currentEmail, loading, error, deleteEmail, moveToFolder } = useEmails();

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleDelete = async () => {
    await deleteEmail(emailId);
    router.push('/dashboard');
  };

  const handleArchive = async () => {
    await moveToFolder(emailId, 'archive');
    router.push('/dashboard');
  };

  const handleReply = () => {
    router.push({
      pathname: '/compose',
      query: { 
        to: currentEmail.from,
        subject: `Re: ${currentEmail.subject}`,
        reply: true
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!currentEmail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Email not found</div>
      </div>
    );
  }

  const { from, to, subject, text, html, sentAt, receivedAt } = currentEmail;
  const timestamp = sentAt || receivedAt;
  const formattedDate = timestamp ? format(new Date(timestamp), 'PPpp') : '';

  return (
    <div className="h-full flex flex-col">
      {/* Email header */}
      <div className="bg-white shadow p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{subject}</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleReply}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full"
            title="Reply"
          >
            <ReplyIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleArchive}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full"
            title="Archive"
          >
            <ArchiveBoxIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-auto p-4 bg-white">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-lg font-medium text-gray-900">{from}</p>
              <p className="text-sm text-gray-500">To: {to}</p>
            </div>
            <p className="text-sm text-gray-500">{formattedDate}</p>
          </div>
        </div>

        {/* Email body */}
        {html ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800">{text}</div>
        )}
      </div>
    </div>
  );
};

export default EmailView;