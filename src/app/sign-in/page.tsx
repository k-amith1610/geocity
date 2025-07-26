"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import Spline from '@splinetool/react-spline'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { ToastContainer } from '@/components/Toast'
import GoogleSignIn from '@/components/GoogleSignIn'

const SignInPage = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const router = useRouter();
    const { toasts, removeToast, showError, showSuccess } = useToast();

    const handleGoogleSuccess = () => {
        showSuccess('Welcome Back!', 'Successfully signed in with Google.');
        setTimeout(() => {
            router.push('/');
        }, 1000);
    };

    const handleGoogleError = (error: string) => {
        showError('Google Sign-In Failed', error);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
        
        // Clear submit error when user starts typing
        if (errors.submit) {
            setErrors(prev => ({ ...prev, submit: "" }));
        }
    };

    const handleFocus = (field: string) => {
        setFocusedField(field);
    };

    const handleBlur = (field: string) => {
        setFocusedField(null);
        validateField(field, formData[field as keyof typeof formData]);
    };

    const validateField = (field: string, value: string) => {
        let error = "";
        
        switch (field) {
            case "email":
                if (!value) {
                    error = "Email is required";
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = "Please enter a valid email address";
                }
                break;
            case "password":
                if (!value) {
                    error = "Password is required";
                }
                break;
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
        return error;
    };

    const validateForm = () => {
        const emailError = validateField('email', formData.email);
        const passwordError = validateField('password', formData.password);
        
        return !emailError && !passwordError;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Clear any previous submit errors
        setErrors(prev => ({ ...prev, submit: "" }));
        
        // Validate form
        const isValid = validateForm();
        
        if (isValid) {
            setIsLoading(true);
            
            try {
                await login(formData.email, formData.password);
                
                // Show success message
                showSuccess('Welcome Back!', 'Successfully signed in to your account.');
                
                // Redirect to main page after a short delay
                setTimeout(() => {
                    router.push('/');
                }, 1000);
                
            } catch (error: any) {
                console.error('Login error:', error);
                
                // Handle different error scenarios
                let errorMessage = 'Something went wrong. Please try again.';
                
                if (error.message) {
                    if (error.message.includes('User not found')) {
                        errorMessage = 'No account found with this email address.';
                    } else if (error.message.includes('Invalid password')) {
                        errorMessage = 'Incorrect password. Please try again.';
                    } else if (error.message.includes('Invalid email')) {
                        errorMessage = 'Please enter a valid email address.';
                    } else if (error.message.includes('Too many failed login attempts')) {
                        errorMessage = 'Too many failed attempts. Please try again later.';
                    } else if (error.message.includes('Failed to login')) {
                        errorMessage = 'Login failed. Please check your credentials and try again.';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                showError('Login Failed', errorMessage);
                setErrors(prev => ({ ...prev, submit: errorMessage }));
            } finally {
                setIsLoading(false);
            }
        }
    };

    const getBorderColor = (field: string) => {
        if (focusedField === field) {
            return 'border-[var(--color-accent)]';
        }
        if (formData[field as keyof typeof formData]) {
            return 'border-[var(--color-accent)]';
        }
        return 'border-[var(--color-border)]';
    };

    const getLabelColor = (field: string) => {
        if (focusedField === field || formData[field as keyof typeof formData]) {
            return 'text-[var(--color-accent)]';
        }
        return 'text-[var(--color-text-primary)]';
    };

  return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {/* Left Section - Spline Animation */}
            <div className="w-full lg:w-1/2 flex flex-col bg-black h-64 md:h-80 lg:h-screen lg:min-h-screen">
                <Spline
                    scene="https://prod.spline.design/TlpQqcM0yiOobWdM/scene.splinecode"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />
            </div>

            {/* Right Section - Sign In Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                            Sign In
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            Welcome back! Sign in to your account
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="email" 
                                className={`block text-sm font-medium transition-colors duration-200 ${getLabelColor('email')}`}
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    type="email"
                                    className={`w-full px-3 py-3 text-base bg-transparent border-b-2 transition-all duration-300 ease-in-out ${getBorderColor('email')} outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder:text-gray-400`}
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    onFocus={() => handleFocus('email')}
                                    onBlur={() => handleBlur('email')}
                                    placeholder="Enter your email"
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                />
                            </div>
                            {errors.email && (
                                <p id="email-error" className="text-sm text-red-500 mt-1 flex items-center">
                                    <span className="mr-1">⚠</span>
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="password" 
                                className={`block text-sm font-medium transition-colors duration-200 ${getLabelColor('password')}`}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className={`w-full px-3 pr-12 py-3 text-base bg-transparent border-b-2 transition-all duration-300 ease-in-out ${getBorderColor('password')} outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder:text-gray-400`}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    onFocus={() => handleFocus('password')}
                                    onBlur={() => handleBlur('password')}
                                    placeholder="Enter your password"
                                    aria-describedby={errors.password ? "password-error" : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-50 rounded"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} />
                                    ) : (
                                        <Eye size={20} />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p id="password-error" className="text-sm text-red-500 mt-1 flex items-center">
                                    <span className="mr-1">⚠</span>
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <p className="text-sm text-red-500 mt-1 flex items-center">
                                <span className="mr-1">⚠</span>
                                {errors.submit}
                            </p>
                        )}

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[0.95] active:scale-[1.05] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign In */}
                    <div className="flex justify-center">
                        <GoogleSignIn
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account?{' '}
                            <Link 
                                href="/sign-up" 
                                className="text-blue-500 hover:text-blue-600 font-medium transition-colors duration-200 cursor-pointer"
                            >
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default SignInPage
