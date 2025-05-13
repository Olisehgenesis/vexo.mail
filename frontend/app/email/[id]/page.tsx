// pages/email/[id].js
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import EmailView from '../../components/email/EmailView';
import { useAuth } from '../../contexts/AuthContext';
import { useEmails } from '../../contexts/EmailContext';

export default function EmailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { fetchEmail, loading: emailLoading } = useEmails();
  
  // Check authentication
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, authLoading, router]);
  
  // Fetch email when ID changes
  useEffect(() => {
    if (isLoggedIn && id) {
      fetchEmail(id);
    }
  }, [isLoggedIn, id, fetchEmail]);
  
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
    <MainLayout title="View Email - Vexo.social">
      <EmailView emailId={id} />
    </MainLayout>
  );
}