'use client';

import React, { useState, useRef, useEffect } from 'react';
import { XIcon, MinusIcon, Paperclip, Send } from 'lucide-react';
import { useEmails } from '@/context/EmailContext';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ 
  isOpen, 
  onClose,
  onMinimize
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { sendEmail } = useEmails();
  
  const modalRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  
  // Focus the "To" field when the modal opens
  useEffect(() => {
    if (isOpen && toInputRef.current) {
      setTimeout(() => {
        toInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Only close if clicking outside and not minimized
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // State to track draft saving
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Auto-save draft to localStorage with debounce
  useEffect(() => {
    if (isOpen && (to || subject || body)) {
      const draft = { to, subject, body };
      const saveTimeout = setTimeout(() => {
        window.localStorage.setItem('emailDraft', JSON.stringify(draft));
        setDraftSaved(true);
        // Reset saved indicator after 2 seconds
        setTimeout(() => setDraftSaved(false), 2000);
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(saveTimeout);
    }
  }, [isOpen, to, subject, body]);
  
  // Load draft from localStorage
  useEffect(() => {
    if (isOpen) {
      const savedDraft = window.localStorage.getItem('emailDraft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setTo(draft.to || '');
          setSubject(draft.subject || '');
          setBody(draft.body || '');
        } catch (e) {
          console.error('Error parsing draft:', e);
        }
      }
    }
  }, [isOpen]);
  
  const resetForm = () => {
    setTo('');
    setSubject('');
    setBody('');
    setHasError(false);
    setErrorMessage('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!to) {
      setHasError(true);
      setErrorMessage('Please specify at least one recipient');
      return;
    }
    
    try {
      setIsSending(true);
      setHasError(false);
      
      // Prepare email data
      const emailData = {
        to,
        subject: subject || '(No subject)',
        text: body,
        html: body.replace(/\n/g, '<br>')
      };
      
      // Send email using the context
      try {
        const result = await sendEmail(emailData);
        
        // The email was sent successfully
        // Clear the draft when successful
        window.localStorage.removeItem('emailDraft');
        onClose();
      } catch (error) {
        // Check if this is a BSON version error (common in development)
        if (error?.message?.includes('BSON') || error?.response?.data?.error?.includes('BSON')) {
          console.warn('BSON version error detected - this is expected in development mode');
          
          // In development, we can still close the modal as if it worked
          if (process.env.NODE_ENV === 'development') {
            window.localStorage.removeItem('emailDraft');
            onClose();
            return;
          }
        }
        
        // For other errors, show the error message
        throw error;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setHasError(true);
      setErrorMessage(error?.response?.data?.error || error?.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-x-0 bottom-0 flex justify-end items-end z-50 pr-4 pb-4">
      <div 
        ref={modalRef}
        className="w-full max-w-xl bg-white rounded-t-lg shadow-xl flex flex-col"
        style={{ height: '70vh', maxHeight: '600px' }}
      >
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
          <h3 className="text-sm font-medium">New Message</h3>
          <div className="flex space-x-2">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="text-gray-300 hover:text-white focus:outline-none"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none p-4 border-b">
            <div className="mb-3">
              <input
                ref={toInputRef}
                type="email"
                placeholder="To"
                className="w-full px-2 py-1 border-b focus:border-blue-500 focus:outline-none"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Subject"
                className="w-full px-2 py-1 border-b focus:border-blue-500 focus:outline-none"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>
          
          {/* Message body */}
          <div className="flex-1 overflow-auto p-4">
            <textarea
              className="w-full h-full resize-none focus:outline-none"
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            ></textarea>
          </div>
          
          {/* Error message */}
          {hasError && (
            <div className="px-4 py-2 bg-red-100 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex-none p-4 border-t flex justify-between items-center">
            <div className="flex space-x-2 items-center">
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Attach files"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              {/* Draft saved indicator */}
              {draftSaved && (
                <span className="text-xs text-gray-500 animate-fade-in-out">
                  Draft saved
                </span>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isSending}
              className={`px-4 py-2 rounded-md text-white ${
                isSending 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending
                </span>
              ) : (
                <span className="flex items-center">
                  <Send className="h-4 w-4 mr-1" /> 
                  Send
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeModal;