// components/email/ComposeEmail.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  XMarkIcon, 
  PaperAirplaneIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';
import { useEmails } from '../../contexts/EmailContext';

const ComposeEmail = () => {
  const router = useRouter();
  const { sendEmail, loading } = useEmails();
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    text: '',
  });
  const [error, setError] = useState('');

  // Check for query params (for reply functionality)
  useEffect(() => {
    if (router.query.to) {
      setFormData(prev => ({
        ...prev,
        to: router.query.to,
        subject: router.query.subject || '',
      }));
    }
  }, [router.query]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.to) {
      setError('Recipient is required');
      return;
    }

    try {
      await sendEmail(formData);
      router.push('/dashboard?folder=sent');
    } catch (err) {
      setError('Failed to send email');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Compose Email</h2>
        <button
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="to" className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="text"
              name="to"
              id="to"
              value={formData.to}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="recipient@example.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              id="subject"
              value={formData.subject}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Subject"
            />
          </div>
        </div>

        <div className="flex-1 p-4 pt-0">
          <label htmlFor="text" className="sr-only">
            Message
          </label>
          <textarea
            name="text"
            id="text"
            value={formData.text}
            onChange={handleChange}
            className="h-full w-full border-0 focus:ring-0 sm:text-sm"
            placeholder="Write your message here..."
          />
        </div>

        {error && (
          <div className="px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="px-4 py-3 bg-gray-100 text-right sm:px-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 mr-3"
          >
            <TrashIcon className="h-5 w-5 mr-1 -ml-1" />
            Discard
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-1 -ml-1" />
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComposeEmail;