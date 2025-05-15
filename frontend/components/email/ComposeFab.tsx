'use client';

import React, { useState } from 'react';
import { Pencil, Mail, X, Minus } from 'lucide-react';
import ComposeModal from './ComposeModal';
import { motion, AnimatePresence } from 'framer-motion';

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
      <motion.button
        onClick={handleCompose}
        className={`fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center ${className}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Pencil className="h-6 w-6" />
        <span className="ml-2 font-medium">Compose</span>
      </motion.button>
      
      {/* Compose Modal */}
      <AnimatePresence>
        {showComposeModal && !isMinimized && (
          <ComposeModal 
            isOpen={true} 
            onClose={handleClose}
            onMinimize={handleMinimize}
          />
        )}
      </AnimatePresence>
      
      {/* Minimized State */}
      <AnimatePresence>
        {showComposeModal && isMinimized && (
          <motion.div 
            className="fixed bottom-6 right-6 bg-white rounded-md shadow-lg cursor-pointer z-50 w-64 overflow-hidden"
            onClick={handleRestore}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="flex items-center justify-between p-3 bg-gray-800 text-white">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">New Message</span>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="p-1 rounded-full hover:bg-gray-700 text-gray-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ComposeFab;