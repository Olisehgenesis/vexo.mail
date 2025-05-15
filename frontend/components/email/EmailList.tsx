'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Star, 
  Clock, 
  Paperclip, 
  BookmarkIcon,
  AlertCircle,
  CheckCircle,
  Database,
  Lock,
  Shield
} from 'lucide-react';
import { useEmails } from '@/context/EmailContext';

interface EmailListProps {
  onSelectEmail?: (emailId: string) => void;
  searchQuery?: string;
}

// Function to get a color based on a string (for consistent avatar colors)
const getColorFromString = (str: string) => {
  const colors = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  
  // Simple hash function to get a consistent index
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Make sure it's positive and map to colors array
  hash = Math.abs(hash);
  return colors[hash % colors.length];
};

const EmailList: React.FC<EmailListProps> = ({ 
  onSelectEmail = () => {}, 
  searchQuery = '' 
}) => {
  const { emails, loading, error, markAsRead, currentFolder, fetchEmail } = useEmails();
  const [filteredEmails, setFilteredEmails] = useState(emails || []);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  
  // Track window width for responsive font sizes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determine responsive font sizes
  const getFontSize = (baseSize: string, smallSize: string) => {
    if (windowWidth < 640) return smallSize;
    return baseSize;
  };
  
  // Filter emails based on search query
  useEffect(() => {
    if (!emails) return;
    
    if (searchQuery.trim() === '') {
      setFilteredEmails(emails);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = emails.filter(email => {
        // Search in subject, from, to
        return (
          (email.subject && email.subject.toLowerCase().includes(query)) ||
          (email.from && email.from.toLowerCase().includes(query)) ||
          (email.to && email.to.toLowerCase().includes(query)) ||
          // Also search in email body if available
          (email.text && email.text.toLowerCase().includes(query))
        );
      });
      setFilteredEmails(filtered);
    }
  }, [emails, searchQuery]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }
    
    // Otherwise show month, day and year
    return format(date, 'MMM d, yyyy');
  };
  
  // Get display name and first letter for avatar
  const getNameInfo = (email: string) => {
    // Try to extract a name from the email format "Name <email@example.com>"
    const nameMatch = email.match(/^([^<]+)/);
    if (nameMatch && nameMatch[1].trim()) {
      const name = nameMatch[1].trim();
      return {
        name,
        initial: name.charAt(0).toUpperCase()
      };
    }
    
    // Otherwise use the part before @ in the email
    const emailPart = email.split('@')[0];
    // Capitalize first letter and clean up dots, underscores, etc.
    const cleanName = emailPart
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      name: cleanName,
      initial: emailPart.charAt(0).toUpperCase()
    };
  };
  
  const handleEmailClick = async (emailId: string) => {
    // Mark as read when clicked
    if (!emails.find(email => email.id === emailId)?.isRead) {
      await markAsRead(emailId);
    }
    
    // Fetch the email details
    await fetchEmail(emailId);
    
    // Call the parent's onSelectEmail function
    onSelectEmail(emailId);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mb-3"></div>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">Loading emails...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <p className="text-base md:text-lg text-red-500 dark:text-red-400 mb-4">Error loading emails: {error}</p>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Empty state
  if (!filteredEmails || filteredEmails.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-500 mb-4">
          {currentFolder === 'inbox' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-10 w-10">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          ) : currentFolder === 'starred' ? (
            <Star className="h-10 w-10" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-10 w-10">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-1">No emails found</h3>
        <p className="text-base text-gray-600 dark:text-gray-300">
          {searchQuery ? 
            `No emails match your search for "${searchQuery}"` : 
            `Your ${currentFolder} is empty`}
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredEmails.map((email, index) => {
          const sender = getNameInfo(email.from || 'Unknown');
          const avatarColor = getColorFromString(email.from || 'Unknown');
          
          // Check if email is minted (default to false)
          const isMinted = email.minted || false;
          
          return (
            <motion.li 
              key={email.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => handleEmailClick(email.id)}
              className={`relative cursor-pointer group transition-all duration-300 ${
                isMinted
                  ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-750 dark:via-indigo-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100 dark:hover:from-gray-700 dark:hover:via-indigo-900/30 dark:hover:to-purple-900/30'
                  : email.isRead
                    ? 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-750 dark:hover:to-gray-700'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20'
              }`}
            >
              {/* Unread indicator */}
              {!email.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 dark:bg-blue-400"></div>
              )}
              
              {/* Minted indicator */}
              {isMinted && (
                <div className="absolute top-0 right-0 w-5 h-5 border-t-transparent border-l-transparent border-b-blue-500 border-r-blue-500 dark:border-b-blue-400 dark:border-r-blue-400 border-b-[20px] border-r-[20px]"></div>
              )}
              
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center space-x-4">
                  {/* Avatar with grid-style container for minted emails */}
                  <div className={`relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md ${
                    isMinted 
                      ? 'p-0.5 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500' 
                      : 'p-0.5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700'
                  }`}>
                    <div className={`absolute inset-0 ${
                      isMinted 
                        ? 'bg-grid-pattern opacity-50' 
                        : 'bg-grid-dots opacity-20'
                    }`}></div>
                    <div className={`w-full h-full rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-lg sm:text-xl`}>
                      {sender.initial}
                    </div>
                    {isMinted && (
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400 rounded-full flex items-center justify-center">
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className={`text-base sm:text-lg font-medium truncate ${
                          isMinted
                            ? 'text-indigo-800 dark:text-indigo-300'
                            : email.isRead
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-900 dark:text-white'
                        }`}>
                          {sender.name}
                        </p>
                        
                        {/* Minted badge - small and stylish */}
                        {isMinted && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm">
                            <Database className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                            On-chain
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        {/* Optional indicators */}
                        {email.hasAttachments && (
                          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2" />
                        )}
                        
                        {/* Time with special styling for minted emails */}
                        <time className={`text-sm sm:text-base ${
                          isMinted
                            ? 'text-indigo-600 dark:text-indigo-300 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatDate(email.sentAt || email.receivedAt || email.createdAt || new Date().toISOString())}
                        </time>
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <p className={`text-base sm:text-lg font-medium truncate ${
                        isMinted
                          ? 'text-blue-800 dark:text-blue-300'
                          : email.isRead
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-gray-900 dark:text-white'
                      }`}>
                        {email.subject}
                      </p>
                      <p className={`mt-1 text-sm sm:text-base truncate ${
                        isMinted
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {email.text ? email.text.substring(0, 120) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick action buttons that appear on hover */}
              <div className="absolute top-0 right-0 h-full flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  className="p-1.5 text-gray-400 hover:text-yellow-500 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Star functionality would go here
                  }}
                >
                  <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button 
                  className="p-1.5 text-gray-400 hover:text-blue-500 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Snooze functionality would go here
                  }}
                >
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </motion.li>
          );
        })}
      </ul>
      
      {/* Add this CSS for the grid patterns */}
      <style jsx global>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px);
          background-size: 5px 5px;
        }
        
        .bg-grid-dots {
          background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px);
          background-size: 8px 8px;
        }
        
        @media (prefers-color-scheme: dark) {
          .bg-grid-pattern {
            background-image: 
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
          }
          
          .bg-grid-dots {
            background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          }
        }
      `}</style>
    </div>
  );
};

export default EmailList;