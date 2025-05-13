// pages/index.js
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Vexo.social - Web3 Email</title>
        <meta name="description" content="Web3 email system using wallet authentication" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-primary-600">vexo.social</h1>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Web3 Email System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in with your crypto wallet to access your email
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Own your email with crypto wallet authentication
          </p>
        </div>
      </div>
    </div>
  );
}