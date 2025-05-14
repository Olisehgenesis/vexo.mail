'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { emailAPI } from '@/utils/emailAPI';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  isRead: boolean;
  sentAt?: string;
  receivedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface EmailContextType {
  emails: Email[];
  currentEmail: Email | null;
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  currentFolder: string;
  fetchEmails: (folder?: string, page?: number, limit?: number) => Promise<Email[]>;
  fetchEmail: (emailId: string) => Promise<Email | null>;
  sendEmail: (emailData: any) => Promise<any>;
  markAsRead: (emailId: string) => Promise<any>;
  markAsUnread: (emailId: string) => Promise<any>;
  moveToFolder: (emailId: string, folder: string) => Promise<any>;
  deleteEmail: (emailId: string) => Promise<any>;
  lastRefreshTime: Date | null;
}

// 10 minutes in milliseconds
const REFRESH_INTERVAL = 10 * 60 * 1000;

// Create the email context with default values
const EmailContext = createContext<EmailContextType>({
  emails: [],
  currentEmail: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  },
  currentFolder: 'inbox',
  fetchEmails: async () => [],
  fetchEmail: async () => null,
  sendEmail: async () => null,
  markAsRead: async () => null,
  markAsUnread: async () => null,
  moveToFolder: async () => null,
  deleteEmail: async () => null,
  lastRefreshTime: null,
});

export const EmailProvider = ({ children }: { children: React.ReactNode }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  // Use refs to avoid dependency issues with useEffect
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const currentFolderRef = useRef(currentFolder);
  const paginationRef = useRef(pagination);
  
  // Update refs when state changes
  useEffect(() => {
    currentFolderRef.current = currentFolder;
  }, [currentFolder]);
  
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Memoize the fetchEmails function to prevent dependency issues
  const fetchEmails = useCallback(async (folder = currentFolder, page = 1, limit = 20) => {
    if (typeof window === 'undefined') return [];
    
    // Prevent multiple concurrent refreshes
    if (isRefreshingRef.current) return emails;
    
    try {
      isRefreshingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await emailAPI.getEmails(folder, page, limit);
      
      if (!response) {
        throw new Error('No response from email API');
      }
      
      const { emails: emailData, pagination: paginationData } = response;
      
      // Update state with fetched data
      setEmails(emailData || []);
      setPagination(paginationData || pagination);
      setCurrentFolder(folder);
      setLastRefreshTime(new Date());
      
      return emailData || [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError(error.response?.data?.error || error.message || 'Failed to fetch emails');
      toast.error('Failed to load emails');
      return [];
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Setup auto-refresh timer - This effect runs only once after component mounts
  useEffect(() => {
    // Function to schedule the next refresh
    const scheduleNextRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      
      refreshTimerRef.current = setTimeout(() => {
        if (!isRefreshingRef.current && currentFolderRef.current) {
          console.log(`Auto-refresh triggered after ${REFRESH_INTERVAL/60000} minutes for folder ${currentFolderRef.current}`);
          // Use the refs to get the current values
          fetchEmails(
            currentFolderRef.current, 
            paginationRef.current.page, 
            paginationRef.current.limit
          ).then(() => {
            // Schedule the next refresh after this one completes
            scheduleNextRefresh();
          });
        } else {
          // If we can't refresh now, try again later
          scheduleNextRefresh();
        }
      }, REFRESH_INTERVAL);
      
      console.log(`Next auto-refresh scheduled for ${new Date(Date.now() + REFRESH_INTERVAL).toLocaleTimeString()}`);
    };

    // Only setup timer on client-side
    if (typeof window !== 'undefined') {
      console.log('Email context initialized, setting up auto-refresh timer');
      scheduleNextRefresh();
    }
    
    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        console.log('Auto-refresh timer cleared on unmount');
      }
    };
  }, [fetchEmails]); // Only depend on the memoized fetchEmails function

  // Fetch a single email
  const fetchEmail = async (emailId: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const email = await emailAPI.getEmail(emailId);
      
      setCurrentEmail(email);
      return email;
    } catch (error) {
      console.error('Error fetching email:', error);
      setError(error.response?.data?.error || error.message || 'Failed to fetch email');
      toast.error('Failed to load email');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Send an email
  const sendEmail = async (emailData: any) => {
    if (typeof window === 'undefined') return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await emailAPI.sendEmail(emailData);
      
      // Refresh emails in the sent folder if we're currently viewing it
      if (currentFolder === 'sent') {
        fetchEmails('sent', pagination.page, pagination.limit);
      }
      
      toast.success('Email sent successfully');
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error.response?.data?.error || error.message || 'Failed to send email');
      toast.error('Failed to send email');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Mark email as read
  const markAsRead = async (emailId: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const result = await emailAPI.markAsRead(emailId);
      
      // Update emails list
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, isRead: true } : email
      ));
      
      return result;
    } catch (error) {
      console.error('Error marking email as read:', error);
      toast.error('Failed to update email');
      return null;
    }
  };

  // Mark email as unread
  const markAsUnread = async (emailId: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const result = await emailAPI.markAsUnread(emailId);
      
      // Update emails list
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, isRead: false } : email
      ));
      
      return result;
    } catch (error) {
      console.error('Error marking email as unread:', error);
      toast.error('Failed to update email');
      return null;
    }
  };

  // Move email to folder
  const moveToFolder = async (emailId: string, folder: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const result = await emailAPI.moveToFolder(emailId, folder);
      
      // Remove from current list if moving out of current folder
      if (folder !== currentFolder) {
        setEmails(emails.filter(email => email.id !== emailId));
      }
      
      toast.success(`Moved to ${folder}`);
      return result;
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error('Failed to move email');
      return null;
    }
  };

  // Delete email (move to trash)
  const deleteEmail = async (emailId: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const result = await emailAPI.deleteEmail(emailId);
      
      // Remove from current list
      setEmails(emails.filter(email => email.id !== emailId));
      
      toast.success('Email deleted');
      return result;
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
      return null;
    }
  };

  // Context value
  const value = {
    emails,
    currentEmail,
    loading,
    error,
    pagination,
    currentFolder,
    fetchEmails,
    fetchEmail,
    sendEmail,
    markAsRead,
    markAsUnread,
    moveToFolder,
    deleteEmail,
    lastRefreshTime,
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};

// Custom hook to use the email context
export const useEmails = () => {
  return useContext(EmailContext);
};

export default EmailContext;