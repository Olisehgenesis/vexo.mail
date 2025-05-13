import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

// Folder navigation items
const folders = [
  { name: 'Inbox', href: '/dashboard', icon: InboxIcon },
  { name: 'Sent', href: '/dashboard?folder=sent', icon: PaperAirplaneIcon },
  { name: 'Drafts', href: '/dashboard?folder=drafts', icon: DocumentTextIcon },
  { name: 'Archive', href: '/dashboard?folder=archive', icon: ArchiveBoxIcon },
  { name: 'Trash', href: '/dashboard?folder=trash', icon: TrashIcon },
];

const Navigation = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Get current folder from URL
  const currentFolder = router.query.folder || 'inbox';
  
  // Determine if a nav item is active
  const isActive = (href) => {
    if (href === '/dashboard' && router.pathname === '/dashboard' && !router.query.folder) {
      return true;
    }
    return router.asPath === href;
  };

  return (
    <nav className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* User info */}
      <div className="px-4 py-5 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
              {user?.emailAddress?.charAt(0).toUpperCase() || 'V'}
            </div>
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.emailAddress || 'Loading...'}</p>
            <p className="text-xs text-gray-500 truncate">
              {user?.walletAddress
                ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Compose button */}
      <div className="p-4">
        <Link
          href="/compose"
          className="btn btn-primary w-full flex justify-center"
        >
          Compose
        </Link>
      </div>
      
      {/* Folder navigation */}
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1 py-2">
          {folders.map((folder) => (
            <li key={folder.name}>
              <Link
                href={folder.href}
                className={`flex items-center px-4 py-2 text-sm font-medium ${
                  isActive(folder.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <folder.icon
                  className={`mr-3 h-5 w-5 ${
                    isActive(folder.href) ? 'text-primary-500' : 'text-gray-400'
                  }`}
                  aria-hidden="true"
                />
                {folder.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Footer and logout */}
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={logout}
          className="btn btn-secondary w-full"
        >
          Sign Out
        </button>
        <div className="mt-4 text-xs text-center text-gray-500">
          Vexo.social © 2023
        </div>
      </div>
    </nav>
  );
};

export default Navigation;