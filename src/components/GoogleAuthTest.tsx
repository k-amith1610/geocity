'use client';

import React, { useState } from 'react';
import GoogleSignIn from './GoogleSignIn';
import { useToast } from './Toast';

export default function GoogleAuthTest() {
  const [isTesting, setIsTesting] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleGoogleSuccess = () => {
    showSuccess('Test Successful!', 'Google authentication is working correctly.');
    setIsTesting(false);
  };

  const handleGoogleError = (error: string) => {
    showError('Test Failed', `Google authentication error: ${error}`);
    setIsTesting(false);
  };

  const startTest = () => {
    setIsTesting(true);
    showSuccess('Test Started', 'Click the Google sign-in button to test authentication.');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Google Authentication Test</h2>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This component tests if Google authentication is properly configured.
        </p>
        
        <button
          onClick={startTest}
          disabled={isTesting}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {isTesting ? 'Testing...' : 'Start Test'}
        </button>
        
        {isTesting && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Click the button below to test Google sign-in:</p>
            <GoogleSignIn
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={false}
            />
          </div>
        )}
        
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Prerequisites:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Google authentication enabled in Firebase</li>
            <li>Valid Google Client ID in environment variables</li>
            <li>Authorized domains configured</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 