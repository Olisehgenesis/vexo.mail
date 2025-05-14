'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isLoggedIn, loading } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, loading, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Vexo.social - Web3 Email System</title>
        <meta name="description" content="Decentralized web3 email system using wallet authentication" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Subtle background elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
      <div className="absolute bottom-0 right-0 w-1/3 h-32 bg-gradient-to-l from-blue-100 to-transparent opacity-30"></div>
      
      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}