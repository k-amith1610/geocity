'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function GoogleSignIn({ 
  onSuccess, 
  onError, 
  className = '', 
  disabled = false 
}: GoogleSignInProps) {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      });
    };

    const initializeGoogleAuth = async () => {
      try {
        await loadGoogleScript();

        if (!window.google?.accounts?.id || isInitialized.current) {
          return;
        }

        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            try {
              await loginWithGoogle(response.credential);
              onSuccess?.();
            } catch (error: any) {
              console.error('Google sign-in error:', error);
              onError?.(error.message || 'Google authentication failed');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render the Google sign-in button
        if (buttonRef.current && !disabled) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 280,
          });
        }

        isInitialized.current = true;
      } catch (error) {
        console.error('Failed to initialize Google auth:', error);
        onError?.('Failed to initialize Google authentication');
      }
    };

    initializeGoogleAuth();
  }, [loginWithGoogle, onSuccess, onError, disabled]);

  // Re-render button when disabled state changes
  useEffect(() => {
    if (isInitialized.current && buttonRef.current) {
      buttonRef.current.innerHTML = '';
      if (!disabled) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 280,
        });
      }
    }
  }, [disabled]);

  return (
    <div 
      ref={buttonRef} 
      className={`google-signin-button ${className}`}
      style={{ 
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    />
  );
} 