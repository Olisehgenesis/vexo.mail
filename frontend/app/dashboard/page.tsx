'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import EmailList from '@/components/email/EmailList';
import EmailView from '@/components/email/EmailView';
import ComposeFab from '@/components/email/ComposeFab';
import WalletModal from '@/components/auth/WalletModal';
import { useAuth } from '@/context/AuthContext';
import { useEmails } from '@/context/EmailContext';
import { authAPI } from '@/utils/api';
import authState from '@/utils/authState';
import { 
  Inbox, 
  Send, 
  Star, 
  Archive, 
  Trash, 
  RefreshCw, 
  Menu, 
  User,
  Settings,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading, checkToken } = useAuth();
  
  // Email context
  const emailContext = useEmails();
  const { 
    emails,
    fetchEmails, 
    currentFolder, 
    loading: emailsLoading, 
    lastRefreshTime,
    currentEmail,
  } = emailContext || {};
  
  // Auth and UI states
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Get folder from query
  const searchParams = useSearchParams();
  const folder = searchParams?.get('folder') || 'inbox';
  
  // Check for mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Authentication check
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const isAuthenticated = await checkToken();
        if (!isAuthenticated) {
          try {
            // Try to force login if token exists
            if (authState.hasValidToken()) {
              const response = await authAPI.getMe();
              if (response && response.user) {
                authState.setUser(response.user);
              }
            }
          } catch (error) {
            console.error('Force login failed:', error);
          }
        }
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth verification error:', error);
        setAuthChecked(true);
        setAuthError('Authentication failed');
      }
    };
    
    authenticateUser();
  }, [checkToken]);
  
  // Fetch emails when authenticated and folder changes
  useEffect(() => {
    const authenticated = isLoggedIn || (typeof window !== 'undefined' && authState.isLoggedIn);
    
    if (authenticated && folder && authChecked && typeof fetchEmails === 'function') {
      fetchEmails(folder);
    }
  }, [isLoggedIn, folder, fetchEmails, authChecked]);
  
  // Handle folder change
  const changeFolder = (newFolder: string) => {
    setSelectedEmailId(null);
    // setCurrentEmail(null);
    router.push(`/dashboard?folder=${newFolder}`);
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    if (typeof fetchEmails !== 'function') return;
    
    setIsRefreshing(true);
    await fetchEmails(folder);
    setIsRefreshing(false);
  };
  
  // Handle email selection
  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    
    // Close sidebar on mobile when email is selected
    if (isMobileView) {
      setSidebarOpen(false);
    }
  };
  
  // Handle back to list
  const handleBackToList = () => {
    setSelectedEmailId(null);
    // setCurrentEmail(null);
    
    // Open sidebar on mobile when going back to list
    if (isMobileView) {
      setSidebarOpen(true);
    }
  };
  
  // Format title for folder
  const formatTitle = (folder: string) => {
    return folder.charAt(0).toUpperCase() + folder.slice(1);
  };
  
  // Navigation items
  const navItems = [
    { icon: Inbox, label: 'Inbox', folder: 'inbox' },
    { icon: Send, label: 'Sent', folder: 'sent' },
    { icon: Star, label: 'Starred', folder: 'starred' },
    { icon: Archive, label: 'Archive', folder: 'archive' },
    { icon: Trash, label: 'Trash', folder: 'trash' },
  ];
  
  // Loading state
  if (authLoading || !authChecked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-500">Loading your emails...</p>
      </div>
    );
  }
  
  // Auth error state
  if (!isLoggedIn && authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-red-500 text-5xl mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-16 w-16 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">{authError || 'Please connect your wallet to access your emails'}</p>
          
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile sidebar toggle */}
      {isMobileView && (
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-20 left-4 z-30 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg"
        >
          {sidebarOpen ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
        </button>
      )}
      
      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-20 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full`}
      >
        {/* Logo and toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Vexo Mail</span>
            </div>
          </div>
          {isMobileView && (
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* User info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowWalletModal(true)}
            className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.walletAddress?.substring(2, 4).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium">
                {user?.walletAddress 
                  ? `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`
                  : 'Connect Wallet'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.emailAddress || 'No email address'}
              </p>
            </div>
          </button>
        </div>
        
        {/* Folder navigation */}
        <nav className="mt-4 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.folder}
              onClick={() => changeFolder(item.folder)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                folder === item.folder
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon 
                className={`mr-3 h-5 w-5 ${
                  folder === item.folder
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
              />
              {item.label}
              
              {/* Count indicator - would be dynamic in a real app */}
              {item.folder === 'inbox' && (
                <span className={`ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium px-2 py-0.5 rounded-full ${
                  folder === item.folder ? 'bg-blue-200 dark:bg-blue-800' : ''
                }`}>
                  {emails?.length || 0}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        {/* Settings */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Settings className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
            Settings
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            {!isMobileView && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-medium text-gray-900 dark:text-white">
              {selectedEmailId && currentEmail ? currentEmail.subject : formatTitle(folder)}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {!selectedEmailId && (
              <>
                <div className="relative hidden md:block">
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-4 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`p-2 rounded-full ${
                    isRefreshing ? 'text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="Refresh"
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowWalletModal(true)}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Account"
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </header>
        
        {/* Email content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {emailsLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Loading emails...</p>
            </div>
          ) : selectedEmailId ? (
            <div className="h-full">
              <EmailView 
                emailId={selectedEmailId} 
                onBack={handleBackToList}
              />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto px-4 py-4 md:px-6 md:py-6">
              <EmailList onSelectEmail={handleSelectEmail} searchQuery={searchQuery} />
            </div>
          )}
        </main>
      </div>
      
      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
      
      {/* Compose Button */}
      <ComposeFab />
    </div>
  );
}