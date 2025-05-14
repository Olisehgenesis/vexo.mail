'use client';

import React, { useState } from 'react';
import { Pencil, Mail, Inbox, Send, Archive, Trash, Star } from 'lucide-react';
import ComposeModal from './ComposeModal';

interface ComposeFabProps {
  className?: string;
}

const ComposeFab: React.FC<ComposeFabProps> = ({ className = '' }) => {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const handleCompose = () => {
    setShowComposeModal(true);
    setIsMinimized(false);
  };
  
  const handleClose = () => {
    if (window.confirm('Discard this message?')) {
      setShowComposeModal(false);
    }
  };
  
  const handleMinimize = () => {
    setIsMinimized(true);
  };
  
  const handleRestore = () => {
    setIsMinimized(false);
  };
  
  return (
    <>
      {/* Compose Button */}
      <button
        onClick={handleCompose}
        className={`fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all flex items-center ${className}`}
      >
        <Pencil className="h-6 w-6" />
        <span className="ml-2 font-medium">Compose</span>
      </button>
      
      {/* Compose Modal */}
      <ComposeModal 
        isOpen={showComposeModal && !isMinimized} 
        onClose={handleClose}
        onMinimize={handleMinimize}
      />
      
      {/* Minimized State */}
      {showComposeModal && isMinimized && (
        <div 
          className="fixed bottom-6 right-6 bg-white rounded-md shadow-lg cursor-pointer z-50"
          onClick={handleRestore}
        >
          <div className="flex items-center p-3 bg-gray-800 text-white rounded-t-md">
            <Mail className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">New Message</span>
          </div>
        </div>
      )}
    </>
  );
};

export default ComposeFab;