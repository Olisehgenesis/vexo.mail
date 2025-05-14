'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Signature } from '@coinbase/onchainkit/signature';
import { useAccount, useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import { authAPI } from '@/utils/api';

const LoginForm = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // State
  const [step, setStep] = useState(1); // 1: Connect wallet, 2: Identity found, 3: Sign message
  const [baseName, setBaseName] = useState(null);
  const [emailAddress, setEmailAddress] = useState(null);
  const [loadingBaseName, setLoadingBaseName] = useState(false);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Track which addresses we've checked to avoid duplicate calls
  const [checkedAddresses, setCheckedAddresses] = useState(new Set());
  
  // Check wallet identity when connected
  useEffect(() => {
    if (isConnected && address && !checkedAddresses.has(address)) {
      checkIdentity(address);
    }
  }, [isConnected, address, checkedAddresses]);
  
  // Check identity from wallet address
  const checkIdentity = async (walletAddress) => {
    if (!walletAddress || checkedAddresses.has(walletAddress)) {
      return;
    }
    
    try {
      setLoadingBaseName(true);
      setError(null);
      
      // Mark this address as checked
      setCheckedAddresses(prev => new Set([...prev, walletAddress]));
      
      // Call API to check identity
      const data = await authAPI.checkBasename(walletAddress);
      console.log('Identity check result:', data);
      
      // Get nonce for authentication
      const nonceData = await authAPI.getNonce(walletAddress);
      console.log('Nonce received:', nonceData);
      setNonce(nonceData.nonce);
      
      // Update state with results
      if (data && data.baseName) {
        setBaseName(data.baseName);
        setEmailAddress(data.emailAddress);
      } else {
        // No name found
        setBaseName(null);
        setEmailAddress(data?.emailAddress || `${walletAddress.slice(0, 8).toLowerCase()}@vexo.social`);
      }
      
      // Move to identity found step
      setStep(2);
    } catch (error) {
      console.error('Error checking identity:', error);
      setError('Failed to verify wallet identity. Please try again.');
      
      // Fallback email
      if (walletAddress) {
        setEmailAddress(`${walletAddress.slice(0, 8).toLowerCase()}@vexo.social`);
      }
    } finally {
      setLoadingBaseName(false);
    }
  };
  
  // Handle wallet connection
  const handleConnect = (data) => {
    if (data?.address) {
      checkIdentity(data.address);
    }
  };
  
  // Handle disconnection
  const handleDisconnect = () => {
    disconnect();
    setBaseName(null);
    setEmailAddress(null);
    setStep(1);
    setNonce(null);
    setError(null);
  };
  
  // Process successful signature
  const handleSignatureSuccess = async (signature) => {
    try {
      setIsAuthenticating(true);
      setError(null);
      
      console.log("Signature successful", { 
        signatureType: typeof signature,
        signatureLength: signature?.length || 0
      });
      
      if (!address || !nonce) {
        throw new Error('Missing wallet address or nonce');
      }
      
      // Generate a public key from the signature
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes(signature)).slice(0, 42);
      
      console.log('Verifying signature on server...');
      
      // Verify signature on server and get token
      const response = await authAPI.verifySignature(
        address,
        signature,
        nonce,
        publicKey,
        baseName,
        emailAddress
      );
      
      console.log('Authentication successful:', response);
      
      if (response && response.token) {
        // Save auth data
        localStorage.setItem('vexo_token', response.token);
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        throw new Error('Invalid server response - no token received');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  // Handle signature error
  const handleSignatureError = (error) => {
    console.error('Signature error:', error);
    setError('Failed to sign message. Please try again.');
    setIsAuthenticating(false);
  };
  
  // Proceed to signature step
  const proceedToSignature = () => {
    setStep(3);
  };
  
  // Go back to previous step
  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
    setError(null);
  };
  
  // Refresh identity check
  const handleRefresh = () => {
    if (address) {
      // Remove from checked set
      setCheckedAddresses(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(address);
        return newSet;
      });
      
      // Re-check identity
      checkIdentity(address);
    }
  };
  
  // Try direct dashboard access (debug mode)
  const tryDirectDashboard = () => {
    if (process.env.NODE_ENV === 'development') {
      // In development, we'll try to go to dashboard without auth
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
          <span className="text-3xl font-bold text-blue-600">V</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">vexo.social</h1>
        <p className="text-sm text-gray-600 mt-1">Web3 Email System</p>
      </div>
      
      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Step 1: Connect Wallet */}
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in</h2>
            <p className="text-sm text-gray-600 mb-6">Connect your wallet to continue</p>
            
            {!isConnected ? (
              <Wallet onConnect={handleConnect}>
                <ConnectWallet 
                  buttonClassName="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out"
                />
              </Wallet>
            ) : (
              <div className="flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 mb-4">
                <div className="mr-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                Wallet connected
              </div>
            )}
            
            {loadingBaseName && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <p className="ml-2 text-sm text-gray-600">Checking identity...</p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Identity Found */}
        {step === 2 && (
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {baseName ? 'Identity found' : 'No identity found'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {baseName 
                ? 'We found an existing identity for your wallet' 
                : 'No existing identity was found for this wallet'}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <div className="flex items-start mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-700">{emailAddress}</p>
                </div>
              </div>
              
              {baseName && (
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Base Name</p>
                    <p className="text-sm text-gray-700">{baseName}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={proceedToSignature}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out"
              >
                {baseName 
                  ? 'Sign in with this identity' 
                  : 'Sign in without identity'}
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Back
                </button>
                
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Disconnect
                </button>
              </div>
              
              <button
                onClick={handleRefresh}
                className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
              >
                Refresh identity check
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={tryDirectDashboard}
                  className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors duration-200 mt-4"
                >
                  [Dev] Go to dashboard directly
                </button>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Step 3: Sign Message */}
        {step === 3 && nonce && (
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign to authenticate</h2>
            <p className="text-sm text-gray-600 mb-6">
              Sign this message with your wallet to access your email
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <p className="text-sm font-medium text-gray-900 mb-2">Message to sign:</p>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
                {`Sign this message to access your vexo.social email account.\n\nNonce: ${nonce}`}
              </pre>
            </div>
            
            <div className="flex flex-col space-y-4">
              {isAuthenticating ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                  <p className="text-sm text-blue-600">Authenticating...</p>
                </div>
              ) : (
                <Signature
                  message={`Sign this message to access your vexo.social email account.\n\nNonce: ${nonce}`}
                  onSuccess={handleSignatureSuccess}
                  onError={handleSignatureError}
                  label="Sign to authenticate"
                  className="w-full"
                />
              )}
              
              <button
                onClick={handleBack}
                disabled={isAuthenticating}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50"
              >
                Back
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{error}</p>
                
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={tryDirectDashboard}
                    className="text-xs text-gray-600 hover:underline mt-2"
                  >
                    [Dev] Skip authentication
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          vexo.social © 2023 - Own your email with crypto wallet authentication
        </p>
      </div>
      
      {/* Debug Information (Dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md text-xs">
          <h4 className="font-medium mb-2">Debug Info:</h4>
          <pre className="overflow-auto text-xs">
            {JSON.stringify({
              step,
              address,
              isConnected,
              baseName,
              emailAddress,
              nonce: nonce ? `${nonce.substring(0, 10)}...` : null,
              checkedAddressesCount: checkedAddresses.size,
              isAuthenticating
            }, null, 2)}
          </pre>
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={() => console.log('Full state:', {
                address,
                isConnected,
                baseName,
                emailAddress,
                nonce,
                error
              })}
              className="text-xs bg-gray-200 px-2 py-1 rounded"
            >
              Log State
            </button>
            <button 
              onClick={handleRefresh}
              className="text-xs bg-gray-200 px-2 py-1 rounded"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;