'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Paperclip, Send, ChevronDown, Camera, File, Link, Smile } from 'lucide-react';
import { useEmails } from '@/context/EmailContext';
import { motion } from 'framer-motion';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ 
  isOpen, 
  onClose,
  onMinimize,
  initialTo = '',
  initialSubject = '',
  initialBody = ''
}) => {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  
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
        if (onClose) {
          // If there's content, confirm before closing
          if (to || subject || body) {
            if (window.confirm('Discard this message?')) {
              onClose();
            }
          } else {
            onClose();
          }
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, to, subject, body]);
  
  // Auto-save draft to localStorage with debounce
  useEffect(() => {
    if (isOpen && (to || subject || body)) {
      const draft = { to, cc, bcc, subject, body, lastEdited: new Date().toISOString() };
      const saveTimeout = setTimeout(() => {
        window.localStorage.setItem('emailDraft', JSON.stringify(draft));
        setDraftSaved(true);
        // Reset saved indicator after 2 seconds
        setTimeout(() => setDraftSaved(false), 2000);
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(saveTimeout);
    }
  }, [isOpen, to, cc, bcc, subject, body]);
  
  // Load draft from localStorage
  useEffect(() => {
    if (isOpen && !initialTo && !initialSubject && !initialBody) {
      const savedDraft = window.localStorage.getItem('emailDraft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setTo(draft.to || '');
          setCc(draft.cc || '');
          setBcc(draft.bcc || '');
          setSubject(draft.subject || '');
          setBody(draft.body || '');
          setShowCcBcc(Boolean(draft.cc || draft.bcc));
        } catch (e) {
          console.error('Error parsing draft:', e);
        }
      }
    }
  }, [isOpen, initialTo, initialSubject, initialBody]);
  
  const resetForm = () => {
    setTo('');
    setCc('');
    setBcc('');
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
        cc,
        bcc,
        subject: subject || '(No subject)',
        text: body,
        html: body.replace(/\n/g, '<br>')
      };
      
      // Send email using the context
      if (sendEmail) {
        await sendEmail(emailData);
        
        // Clear the draft when successful
        window.localStorage.removeItem('emailDraft');
        onClose();
      } else {
        throw new Error('Email service not available');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setHasError(true);
      setErrorMessage(error?.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div 
      className="fixed inset-x-0 bottom-0 flex justify-end items-end z-50 pr-4 pb-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-t-lg shadow-xl flex flex-col"
        style={{ height: '70vh', maxHeight: '700px' }}
      >
        {/* Header */}
        <div className="bg-gray-800 dark:bg-gray-900 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
          <h3 className="text-sm font-medium">New Message</h3>
          <div className="flex space-x-2">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="text-gray-300 hover:text-white focus:outline-none p-1 rounded-full hover:bg-gray-700"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white focus:outline-none p-1 rounded-full hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none p-4 border-b dark:border-gray-700">
            <div className="mb-3 flex items-center">
              <label htmlFor="to" className="w-12 text-gray-500 dark:text-gray-400 text-sm">To</label>
              <input
                ref={toInputRef}
                type="text"
                placeholder="Recipients"
                className="w-full px-2 py-1.5 border-b border-transparent focus:border-blue-500 focus:outline-none bg-transparent dark:text-white"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="ml-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showCcBcc ? 'Hide' : 'Cc/Bcc'}
              </button>
            </div>
            
            {showCcBcc && (
              <>
                <div className="mb-3 flex items-center">
                  <label htmlFor="cc" className="w-12 text-gray-500 dark:text-gray-400 text-sm">Cc</label>
                  <input
                    type="text"
                    placeholder="Carbon copy recipients"
                    className="w-full px-2 py-1.5 border-b border-transparent focus:border-blue-500 focus:outline-none bg-transparent dark:text-white"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                  />
                </div>
                <div className="mb-3 flex items-center">
                  <label htmlFor="bcc" className="w-12 text-gray-500 dark:text-gray-400 text-sm">Bcc</label>
                  <input
                    type="text"
                    placeholder="Blind carbon copy recipients"
                    className="w-full px-2 py-1.5 border-b border-transparent focus:border-blue-500 focus:outline-none bg-transparent dark:text-white"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div>
              <input
                type="text"
                placeholder="Subject"
                className="w-full px-2 py-1.5 border-b border-transparent focus:border-blue-500 focus:outline-none bg-transparent dark:text-white"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>
          
          {/* Message body */}
          <div className="flex-1 overflow-auto p-4">
            <textarea
              className="w-full h-full resize-none focus:outline-none bg-transparent dark:text-white"
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            ></textarea>
          </div>
          
          {/* Error message */}
          {hasError && (
            <div className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm">
              {errorMessage}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex-none p-4 border-t dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <div className="relative">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none group relative"
                  title="Attach files"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 min-w-[160px] border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <File className="h-4 w-4 mr-2" />
                      Attach file
                    </button>
                    <button
                      type="button"
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Attach image
                    </button>
                    <button
                      type="button"
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Insert link
                    </button>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                title="Insert emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              
              {/* Draft saved indicator */}
              {draftSaved && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 animate-fade-in-out">
                  Draft saved
                </span>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isSending}
              className={`px-4 py-2 rounded-md text-white ${
                isSending 
                  ? 'bg-blue-400 dark:bg-blue-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
              } flex items-center transition-colors duration-200`}
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
    </motion.div>
  );
};

export default ComposeModal;