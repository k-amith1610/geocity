'use client';

import React from 'react';
import GoogleAuthTest from '@/components/GoogleAuthTest';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/components/Toast';

export default function TestGoogleAuthPage() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Google Authentication Test
          </h1>
          <p className="text-gray-600">
            Test your Google authentication setup
          </p>
        </div>
        
        <GoogleAuthTest />
        
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="text-blue-500 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            ← Back to Home
          </a>
        </div>
      </div>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
} 