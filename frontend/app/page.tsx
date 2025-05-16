'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Mail, ShieldCheck, Flashlight, Diamond, Sparkles, Send, MessageSquareText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isLoggedIn, loading } = useAuth();
  const [activeFeature, setActiveFeature] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  const typingTimer = useRef(null);

  const exampleMessages = [
    {
      from: "jesse.base.eth@vexo.social",
      to: "olisehgenesis.base.eth",
      message: "Hey, how is it boss? Got the report done early."
    },
    {
      from: "olisehgenesis.base.eth@vexo.social",
      to: "jesse.base.eth",
      message: "All well my man! Great work on the report."
    },
    {
      from: "sarah.base.eth@vexo.social",
      to: "0xcrypto.base.eth",
      message: "Are we still on for the DAO meeting tomorrow?"
    }
  ];

  const features = [
    {
      title: "Decentralized Emails",
      description: "Your emails stored on the blockchain, not on corporate servers.",
      icon: <Mail className="w-6 h-6 text-blue-500 animate-bounce" />
    },
    {
      title: "Wallet Authentication",
      description: "One-click access with your crypto wallet. No passwords needed.",
      icon: <ShieldCheck className="w-6 h-6 text-green-500 animate-pulse" />
    },
    {
      title: "Base Blockchain",
      description: "Built on Base for speed, security, and low transaction fees.",
      icon: <Flashlight className="w-6 h-6 text-yellow-500 animate-spin-slow" />
    },
    {
      title: "Mint Your Messages",
      description: "Turn important emails into NFTs for permanent preservation.",
      icon: <Diamond className="w-6 h-6 text-purple-500 animate-ping" />
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  useEffect(() => {
    const startTypingAnimation = () => {
      const currentExample = exampleMessages[typingIndex];
      setTimeout(() => {
        setTypingIndex((prev) => (prev + 1) % exampleMessages.length);
      }, 4000);
    };
    startTypingAnimation();
  }, [typingIndex]);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-gray-800 font-sans">
      <Head>
        <title>Vexo.social - Web3 Email System</title>
        <meta name="description" content="Decentralized web3 email system using wallet authentication" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="flex justify-between items-center px-6 py-4 border-b shadow-sm sticky top-0 bg-white z-50">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="text-white w-4 h-4" />
          </motion.div>
          <h1 className="text-lg font-semibold">vexo.social</h1>
        </div>
        <nav className="hidden md:flex space-x-6 text-sm">
          <a href="#features" className="hover:text-blue-600">Features</a>
          <a href="#why" className="hover:text-blue-600">Why Vexo</a>
          <a href="#login" className="hover:text-blue-600">Login</a>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        <div>
          <motion.h2 className="text-4xl font-bold mb-4 text-blue-700" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>Email meets Web3</motion.h2>
          <motion.p className="text-lg mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>Use your Base Name or wallet to send and receive emails. Fully decentralized. 100% private. Welcome to the future of messaging.</motion.p>

          <div className="space-y-4 mb-10">
            {exampleMessages.map((msg, index) => (
              <motion.div 
                key={index} 
                className="bg-white border border-blue-100 rounded-lg p-4 shadow-md"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
              >
                <p className="text-sm text-gray-500">From: <span className="text-gray-700 font-medium">{msg.from}</span></p>
                <p className="text-sm text-gray-500">To: <span className="text-gray-700 font-medium">{msg.to}</span></p>
                <p className="mt-2 text-gray-800 flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-blue-400" /> {msg.message}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Why Choose Vexo</h3>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className={`flex items-start space-x-4 transition-opacity ${index === activeFeature ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === activeFeature ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div>{feature.icon}</div>
                  <div>
                    <h4 className="font-semibold">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div id="login" className="w-full max-w-md mx-auto" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
          <div className="bg-white border border-gray-200 shadow-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-center text-blue-600">Sign in to Vexo</h3>
            <LoginForm />
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Your wallet becomes your inbox identity:</p>
            <p className="mt-2 font-mono text-blue-600">you.base.eth@vexo.social</p>
          </div>
        </motion.div>
      </main>

      <footer className="py-6 border-t text-center text-sm text-gray-500">
        <p>vexo.social © 2023–2025</p>
      </footer>
    </div>
  );
}