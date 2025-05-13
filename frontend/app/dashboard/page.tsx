// pages/dashboard.js
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../components/layout/MainLayout';
import EmailList from '../components/email/EmailList';
import { useAuth } from '../contexts/AuthContext';
import { useEmails } from '../contexts/EmailContext';

export default function Dashboard() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { fetchEmails, currentFolder, loading: emailsLoading } = useEmails();
  
  // Get folder from query
  const folder = router.query.folder || 'inbox';
  
  // Check authentication
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, authLoading, router]);
  
  // Fetch emails when folder changes
  useEffect(() => {
    if (isLoggedIn && folder) {
      fetchEmails(folder);
    }
  }, [isLoggedIn, folder, fetchEmails]);
  
  // Format title based on folder
  const formatTitle = (folder) => {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
  };
  
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return null; // Will redirect to login
  }
  
  return (
    <MainLayout title={`${formatTitle(folder)} - Vexo.social`}>
      <div className="h-full flex flex-col">
        <div className="bg-white shadow">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-lg font-medium text-gray-900">{formatTitle(folder)}</h1>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <EmailList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}