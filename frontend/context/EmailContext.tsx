import React, { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { emailAPI } from '../utils/api';

// Create the email context
const EmailContext = createContext({});

export const EmailProvider = ({ children }) => {
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [currentFolder, setCurrentFolder] = useState('inbox');

  // Fetch emails for a folder
  const fetchEmails = async (folder = currentFolder, page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      const { emails, pagination } = await emailAPI.getEmails(folder, page, limit);
      
      setEmails(emails);
      setPagination(pagination);
      setCurrentFolder(folder);
      
      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError(error.response?.data?.error || error.message || 'Failed to fetch emails');
      toast.error('Failed to load emails');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch a single email
  const fetchEmail = async (emailId) => {
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
  const sendEmail = async (emailData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await emailAPI.sendEmail(emailData);
      
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
  const markAsRead = async (emailId) => {
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
  const markAsUnread = async (emailId) => {
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
  const moveToFolder = async (emailId, folder) => {
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
  const deleteEmail = async (emailId) => {
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
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};

// Custom hook to use the email context
export const useEmails = () => useContext(EmailContext);