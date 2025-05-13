// components/email/EmailItem.js
import React from 'react';
import { format } from 'date-fns';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const EmailItem = ({ email, onClick, onStar }) => {
  const { id, from, subject, isRead, isStarred, sentAt, receivedAt } = email;
  const timestamp = sentAt || receivedAt;
  const formattedDate = format(new Date(timestamp), 'MMM d');

  return (
    <div
      onClick={() => onClick(id)}
      className={`px-4 py-3 flex items-center cursor-pointer border-b border-gray-200 ${
        isRead ? 'bg-white' : 'bg-blue-50'
      } hover:bg-gray-100`}
    >
      <div className="min-w-0 flex-1 flex">
        <div className="flex-shrink-0 mr-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar(id);
            }}
            className="text-gray-400 hover:text-yellow-500"
          >
            {isStarred ? (
              <StarIconSolid className="h-5 w-5 text-yellow-400" />
            ) : (
              <StarIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${isRead ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
            {from}
          </p>
          <p className="text-sm text-gray-900 truncate">{subject}</p>
        </div>

        <div className="ml-3 flex-shrink-0">
          <p className="text-sm text-gray-500">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
};

export default EmailItem;