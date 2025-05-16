'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { 
  Mail, 
  ShieldCheck,
  Zap,
  Lock,
  Send,
  Star,
  MoreHorizontal,
  Trash2,
  Archive,
  Clock,
  ChevronRight,
  Sparkles,
  Inbox,
  MessageCircle,
  AlertCircle,
  Check,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isLoggedIn, loading } = useAuth();
  const [activeConversation, setActiveConversation] = useState(0);
  const [typedText, setTypedText] = useState('');
  const typingRef = useRef(null);
  const scrollRef = useRef(null);
  const [showLoader, setShowLoader] = useState(false);

  const Globe = (props: { className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );

  // Sample conversation data
  const conversations = [
    {
      id: 1,
      contact: "alex.base.eth",
      avatar: "A",
      avatarColor: "#4F46E5",
      unread: true,
      starred: true,
      subject: "Project Alpha Launch",
      preview: "Let's discuss the timeline for next week's launch.",
      time: "11:32 AM",
      messages: [
        {
          sender: "alex.base.eth",
          time: "Yesterday, 4:30 PM",
          content: "Hey there! Just wanted to touch base about Project Alpha. The team is ready for launch next week.",
          color: "#4F46E5"
        },
        {
          sender: "you.base.eth",
          time: "Yesterday, 5:15 PM",
          content: "Great to hear! Do we have all the marketing materials prepared?",
          color: "#0EA5E9"
        },
        {
          sender: "alex.base.eth",
          time: "Yesterday, 5:45 PM",
          content: "Most of them. We still need final approval on the press release. Can you review it today?",
          color: "#4F46E5"
        },
        {
          sender: "you.base.eth",
          time: "Yesterday, 6:20 PM",
          content: "Sure thing, I'll look at it this evening and send feedback.",
          color: "#0EA5E9"
        },
        {
          sender: "alex.base.eth",
          time: "11:32 AM",
          content: "Perfect! Let's discuss the timeline for next week's launch. I think we should consider a soft launch on Tuesday before the main announcement.",
          color: "#4F46E5"
        }
      ]
    },
    {
      id: 2,
      contact: "finance.base.eth",
      avatar: "F",
      avatarColor: "#059669",
      unread: false,
      starred: false,
      subject: "Q2 Budget Review",
      preview: "The numbers look promising. Revenue up 23%.",
      time: "Yesterday",
      messages: [
        {
          sender: "finance.base.eth",
          time: "Monday, 9:30 AM",
          content: "Hello, I've prepared the Q2 budget review for your consideration.",
          color: "#059669"
        },
        {
          sender: "you.base.eth",
          time: "Monday, 10:15 AM",
          content: "Thanks for preparing this. How are we looking compared to our projections?",
          color: "#0EA5E9"
        },
        {
          sender: "finance.base.eth",
          time: "Monday, 11:45 AM",
          content: "The numbers look promising. Revenue is up 23% from last quarter, and we've managed to keep expenses only 5% above budget.",
          color: "#059669"
        },
        {
          sender: "you.base.eth",
          time: "Monday, 2:20 PM",
          content: "That's excellent news! Let's schedule a meeting to discuss allocation for Q3.",
          color: "#0EA5E9"
        },
        {
          sender: "finance.base.eth",
          time: "Yesterday, 8:32 AM",
          content: "I've scheduled a meeting for next Monday at 10 AM. I'll send all the relevant documents beforehand.",
          color: "#059669"
        }
      ]
    },
    {
      id: 3,
      contact: "sarah.base.eth",
      avatar: "S",
      avatarColor: "#DB2777",
      unread: true,
      starred: true,
      subject: "New Design System",
      preview: "Check out the latest mockups for our rebrand!",
      time: "May 15",
      messages: [
        {
          sender: "sarah.base.eth",
          time: "May 13, 2:30 PM",
          content: "Hi there! I've been working on the new design system for our product suite.",
          color: "#DB2777"
        },
        {
          sender: "you.base.eth",
          time: "May 13, 3:15 PM",
          content: "That sounds exciting! How different is it from our current brand?",
          color: "#0EA5E9"
        },
        {
          sender: "sarah.base.eth",
          time: "May 14, 10:45 AM",
          content: "It's a complete refresh. New color palette, typography, and component library. The focus is on accessibility and modern aesthetics.",
          color: "#DB2777"
        },
        {
          sender: "you.base.eth",
          time: "May 14, 11:20 AM",
          content: "I'm looking forward to seeing it. When can you share some previews?",
          color: "#0EA5E9"
        },
        {
          sender: "sarah.base.eth",
          time: "May 15, 9:32 AM",
          content: "Check out the latest mockups for our rebrand! I've just uploaded them to our shared drive. Let me know what you think, especially about the new primary colors.",
          color: "#DB2777"
        }
      ]
    }
  ];

  const features = [
    {
      title: "Blockchain Secured",
      description: "Every message is cryptographically secured and stored on Base blockchain.",
      icon: <Lock className="w-6 h-6 text-white" />,
      color: "from-indigo-500 to-blue-600"
    },
    {
      title: "Lightning Fast",
      description: "Experience sub-second delivery times across the entire network.",
      icon: <Zap className="w-6 h-6 text-white" />,
      color: "from-amber-500 to-orange-600"
    },
    {
      title: "Web3 Native",
      description: "Send emails to any blockchain address or ENS name with ease.",
      icon: <Globe className="w-6 h-6 text-white" />,
      color: "from-emerald-500 to-teal-600"
    },
    {
      title: "Privacy First",
      description: "No data mining, no ads. Your conversations remain truly private.",
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      color: "from-pink-500 to-rose-600"
    }
  ];

  const typeMessage = () => {
    const currentConvo = conversations[activeConversation];
    const lastMessage = currentConvo.messages[currentConvo.messages.length - 1].content;
    let charIndex = 0;
    
    setTypedText('');
    
    clearInterval(typingRef.current);
    
    typingRef.current = setInterval(() => {
      if (charIndex < lastMessage.length) {
        setTypedText(prev => prev + lastMessage.charAt(charIndex));
        charIndex++;
      } else {
        clearInterval(typingRef.current);
      }
    }, 30); // Faster typing speed
  };
  
  useEffect(() => {
    // Show loader animation when changing conversations
    setShowLoader(true);
    setTypedText('');
    
    const timer = setTimeout(() => {
      setShowLoader(false);
      typeMessage();
      
      // Scroll to bottom of conversation
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 800);
    
    return () => {
      clearTimeout(timer);
      clearInterval(typingRef.current);
    };
  }, [activeConversation]);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, loading, router]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.08
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };
  
  const conversationAnimation = {
    initial: { 
      scale: 0.98,
      opacity: 0.5
    },
    animate: { 
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      scale: 0.98,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  // Function to simulate email send
  const handleSend = () => {
    setShowLoader(true);
    setTimeout(() => {
      setShowLoader(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 font-sans">
      <Head>
        <title>Vexo.social - Web3 Email System</title>
        <meta name="description" content="Decentralized web3 email system using wallet authentication" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
              Vexo.Social
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 md:py-20 mt-12">
        {/* App Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center mb-20">
          <motion.div 
            className="lg:col-span-5 lg:order-last"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="mb-6">
              <motion.div 
                className="inline-block mb-4 bg-gradient-to-r from-blue-500 to-violet-500 p-3 rounded-2xl"
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text">
                Email for Web3
              </h1>
              <p className="text-xl mb-6 text-slate-600">
                Professional communications directly from your Base Name. 
                Secure. Private. Decentralized.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="mb-8">
              <motion.div 
                className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-blue-500/5"
                variants={itemVariants}
                whileHover={{ boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.15)" }}
              >
                <motion.div 
                  className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <Mail className="w-8 h-8 text-white" />
                </motion.div>
                
                <h3 className="text-2xl font-bold mb-6 text-center text-slate-800">
                  Get Started with Vexo
                </h3>
                
                <LoginForm />
                
                <div className="mt-8 text-center">
                  <p className="text-sm text-slate-500 mb-2">Your wallet becomes your professional identity</p>
                  <div className="bg-slate-50 py-3 px-4 rounded-lg border border-slate-200">
                    <span className="font-mono text-blue-600">you.base.eth@vexo.social</span>
                  </div>
                  
                  <div className="mt-6 text-xs text-slate-400">
                    By connecting, you agree to our Terms of Service and Privacy Policy
                  </div>
                </div>
              </motion.div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-6 mb-6 text-slate-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center gap-1">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <span>No subscription needed</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
          
          {/* Email App Preview */}
          <motion.div 
            className="lg:col-span-7 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* App Container */}
            <div className="bg-white rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden border border-slate-200 relative">
              {/* App Frame */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                    vexo.social
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <motion.div
                    whileHover={{ scale: 1.1, color: "#3B82F6" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw className="w-5 h-5 cursor-pointer" />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1, color: "#3B82F6" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MoreHorizontal className="w-5 h-5 cursor-pointer" />
                  </motion.div>
                </div>
              </div>

              {/* App Content */}
              <div className="flex h-[500px]">
                {/* Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 overflow-y-auto hidden md:block">
                  {/* Folders */}
                  <div className="px-4 py-4">
                    <motion.button 
                      className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-blue-500/10 text-blue-600 mb-1"
                      whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}
                    >
                      <Inbox className="w-4 h-4" />
                      <span className="font-medium">Inbox</span>
                      <motion.div 
                        className="ml-auto bg-blue-500 text-xs font-semibold py-0.5 px-2 rounded-full text-white"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [0.8, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: 3, repeatDelay: 5 }}
                      >
                        3
                      </motion.div>
                    </motion.button>
                    
                    <motion.button 
                      className="flex items-center gap-2 w-full py-2 px-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors mb-1"
                      whileHover={{ x: 5 }}
                    >
                      <Star className="w-4 h-4" />
                      <span>Starred</span>
                    </motion.button>
                    
                    <motion.button 
                      className="flex items-center gap-2 w-full py-2 px-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors mb-1"
                      whileHover={{ x: 5 }}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Scheduled</span>
                    </motion.button>
                    
                    <motion.button 
                      className="flex items-center gap-2 w-full py-2 px-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors mb-1"
                      whileHover={{ x: 5 }}
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archived</span>
                    </motion.button>
                    
                    <motion.button 
                      className="flex items-center gap-2 w-full py-2 px-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Trash</span>
                    </motion.button>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-slate-200 my-2"></div>
                  
                  {/* Conversations List */}
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold uppercase text-slate-500 px-2 mb-2">Recent Conversations</h3>
                    
                    {conversations.map((convo, index) => (
                      <motion.div
                        key={convo.id}
                        className={`rounded-lg mb-2 cursor-pointer relative ${activeConversation === index ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        onClick={() => setActiveConversation(index)}
                        whileHover={{ x: 3 }}
                        animate={activeConversation === index ? {
                          backgroundColor: ["rgba(241, 245, 249, 0.5)", "rgba(241, 245, 249, 0.7)", "rgba(241, 245, 249, 0.5)"],
                        } : {}}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <div className="p-2 flex items-start gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-white" 
                            style={{ backgroundColor: convo.avatarColor }}
                          >
                            {convo.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-medium truncate ${convo.unread ? 'text-slate-900' : 'text-slate-600'}`}>
                                {convo.contact}
                              </span>
                              <span className="text-xs text-slate-500">{convo.time}</span>
                            </div>
                            <div className="text-xs text-slate-600 font-medium truncate mb-1">
                              {convo.subject}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {convo.preview}
                            </div>
                          </div>
                          
                          {/* Indicators */}
                          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            {convo.unread && (
                              <motion.div 
                                className="w-2 h-2 rounded-full bg-blue-500"
                                animate={{ 
                                  scale: [1, 1.2, 1],
                                  opacity: [1, 0.7, 1]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                            {convo.starred && (
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-white">
                  {/* Conversation Header */}
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" 
                        style={{ backgroundColor: conversations[activeConversation].avatarColor }}
                      >
                        {conversations[activeConversation].avatar}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {conversations[activeConversation].contact}
                        </div>
                        <div className="text-xs text-slate-500">
                          {conversations[activeConversation].subject}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <motion.button 
                        className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Star className={`w-4 h-4 ${conversations[activeConversation].starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </motion.button>
                      <motion.button 
                        className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Archive className="w-4 h-4" />
                      </motion.button>
                      <motion.button 
                        className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Conversation */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    <AnimatePresence mode="wait">
                      {showLoader ? (
                        <motion.div 
                          className="h-full flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key="loader"
                        >
                          <motion.div 
                            className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="conversation"
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          variants={conversationAnimation}
                        >
                          {conversations[activeConversation].messages.map((message, i) => (
                            <motion.div 
                              key={i}
                              className={`flex ${message.sender.includes('you') ? 'justify-end' : 'justify-start'}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <div 
                                className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-3 ${
                                  message.sender.includes('you') 
                                    ? 'bg-blue-600 text-white ml-8' 
                                    : 'bg-slate-100 text-slate-800 mr-8'
                                }`}
                                style={{ 
                                  borderBottomLeftRadius: !message.sender.includes('you') ? '0' : undefined,
                                  borderBottomRightRadius: message.sender.includes('you') ? '0' : undefined
                                }}
                              >
                                <div className="text-xs opacity-70 mb-1">{message.time}</div>
                                <div style={{ color: message.color }}>
                                  {i === conversations[activeConversation].messages.length - 1 
                                    ? typedText 
                                    : message.content}
                                  {i === conversations[activeConversation].messages.length - 1 && 
                                    typedText.length < message.content.length && 
                                    <motion.span 
                                      className="inline-block w-2 h-4 ml-1"
                                      style={{ backgroundColor: message.color }}
                                      animate={{ opacity: [1, 0, 1] }}
                                      transition={{ duration: 0.8, repeat: Infinity }}
                                    />
                                  }
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Compose Area */}
                  <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2">
                      <input 
                        type="text" 
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400" 
                        placeholder="Type your message..." 
                      />
                      <motion.button
                        className="ml-2 w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full"
                        whileHover={{ scale: 1.1, backgroundColor: "#3B82F6" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                      >
                        <Send className="w-4 h-4 text-white" />
                      </motion.button>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>End-to-end encrypted</span>
                      </div>
                      <div className="flex items-center">
                        <span>Secured by </span>
                        <span className="text-blue-600 ml-1">Base blockchain</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <motion.div 
              className="absolute -top-5 -right-5 w-20 h-20 bg-blue-500 opacity-10 rounded-full blur-xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div 
              className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500 opacity-10 rounded-full blur-xl"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />
          </motion.div>
        </div>
        
       {/* Features Section */}
       <motion.div 
         className="mb-24"
         initial="hidden"
         whileInView="visible"
         viewport={{ once: true }}
         variants={containerVariants}
       >
         <motion.h3 
           className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text"
           variants={itemVariants}
         >
           Web3 Email for Professionals
         </motion.h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {features.map((feature, index) => (
             <motion.div
               key={index}
               className={`bg-gradient-to-br ${feature.color} p-6 rounded-2xl shadow-lg`}
               variants={itemVariants}
               whileHover={{ 
                 y: -10,
                 boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.05)"
               }}
               transition={{ type: "spring", stiffness: 300, damping: 20 }}
             >
               <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-5">
                 {feature.icon}
               </div>
               <h4 className="font-semibold text-xl mb-3 text-white">{feature.title}</h4>
               <p className="text-white/80 text-sm">{feature.description}</p>
             </motion.div>
           ))}
         </div>
       </motion.div>
       
       {/* Testimonials */}
       <motion.div 
         className="mb-24"
         initial="hidden"
         whileInView="visible"
         viewport={{ once: true }}
         variants={containerVariants}
       >
         <motion.h3 
           className="text-3xl font-bold mb-12 text-center text-slate-800"
           variants={itemVariants}
         >
           Used by Web3 Professionals
         </motion.h3>
         
         <motion.div 
           className="grid grid-cols-1 md:grid-cols-3 gap-6"
           variants={containerVariants}
         >
           <motion.div 
             className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden"
             variants={itemVariants}
             whileHover={{ scale: 1.02 }}
           >
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-semibold">
                 D
               </div>
               <div>
                 <div className="font-medium text-slate-800">David.eth</div>
                 <div className="text-xs text-slate-500">NFT Marketplace Founder</div>
               </div>
             </div>
             <p className="text-slate-600 mb-2">
               "Vexo has transformed how our team communicates. The integrated wallet authentication means no more password resets or phishing concerns."
             </p>
             <div className="text-amber-400 flex">
               {[...Array(5)].map((_, i) => (
                 <Star key={i} className="w-4 h-4 fill-amber-400" />
               ))}
             </div>
             
             <motion.div 
               className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-500 opacity-10 rounded-full blur-xl"
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.2, 0.1]
               }}
               transition={{ duration: 5, repeat: Infinity }}
             />
           </motion.div>
           
           <motion.div 
             className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden"
             variants={itemVariants}
             whileHover={{ scale: 1.02 }}
           >
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">
                 J
               </div>
               <div>
                 <div className="font-medium text-slate-800">Jennifer.base</div>
                 <div className="text-xs text-slate-500">DeFi Protocol Lead</div>
               </div>
             </div>
             <p className="text-slate-600 mb-2">
               "The blockchain-based verification and end-to-end encryption gives us peace of mind when discussing sensitive financial matters."
             </p>
             <div className="text-amber-400 flex">
               {[...Array(5)].map((_, i) => (
                 <Star key={i} className="w-4 h-4 fill-amber-400" />
               ))}
             </div>
             
             <motion.div 
               className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500 opacity-10 rounded-full blur-xl"
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.2, 0.1]
               }}
               transition={{ duration: 5, repeat: Infinity, delay: 1 }}
             />
           </motion.div>
           
           <motion.div 
             className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden"
             variants={itemVariants}
             whileHover={{ scale: 1.02 }}
           >
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                 M
               </div>
               <div>
                 <div className="font-medium text-slate-800">Mark.lens</div>
                 <div className="text-xs text-slate-500">Web3 Developer</div>
               </div>
             </div>
             <p className="text-slate-600 mb-2">
               "I love that I can communicate directly from my ENS name. It's made professional networking in the Web3 space so much simpler."
             </p>
             <div className="text-amber-400 flex">
               {[...Array(5)].map((_, i) => (
                 <Star key={i} className="w-4 h-4 fill-amber-400" />
               ))}
             </div>
             
             <motion.div 
               className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500 opacity-10 rounded-full blur-xl"
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.2, 0.1]
               }}
               transition={{ duration: 5, repeat: Infinity, delay: 2 }}
             />
           </motion.div>
         </motion.div>
       </motion.div>
     </main>

     <footer className="py-6 border-t border-slate-200 text-center text-sm text-slate-500 mt-24">
       <p>vexo.social © 2023–2025</p>
     </footer>
   </div>
 );
}