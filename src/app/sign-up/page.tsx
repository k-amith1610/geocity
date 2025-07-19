"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import Spline from '@splinetool/react-spline'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { ToastContainer } from '@/components/Toast'

const SignUpPage = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        address: "",
        phoneNumber: ""
    });
    
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { signup } = useAuth();
    const router = useRouter();
    const { toasts, removeToast, showError, showSuccess } = useToast();

    // Re-validate confirm password when password changes
    useEffect(() => {
        if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
        } else if (formData.confirmPassword && formData.password === formData.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: "" }));
        }
    }, [formData.password, formData.confirmPassword]);

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
            case "name":
                if (!value) {
                    error = "Name is required";
                } else if (value.length < 2) {
                    error = "Name must be at least 2 characters";
                }
                break;
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
                } else if (value.length < 8) {
                    error = "Password must be at least 8 characters";
                }
                break;
            case "confirmPassword":
                if (!value) {
                    error = "Please confirm your password";
                } else if (value !== formData.password) {
                    error = "Passwords do not match";
                }
                break;
            case "address":
                if (!value) {
                    error = "Address is required";
                }
                break;
            case "phoneNumber":
                if (!value) {
                    error = "Phone number is required";
                } else if (!/^\d{10,}$/.test(value.replace(/\D/g, ''))) {
                    error = "Please enter a valid phone number";
                }
                break;
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
        return error;
    };

    const validateForm = () => {
        const nameError = validateField('name', formData.name);
        const emailError = validateField('email', formData.email);
        const passwordError = validateField('password', formData.password);
        const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
        const addressError = validateField('address', formData.address);
        const phoneNumberError = validateField('phoneNumber', formData.phoneNumber);
        
        return !nameError && !emailError && !passwordError && !confirmPasswordError && !addressError && !phoneNumberError;
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
                await signup({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    address: formData.address,
                    phoneNumber: parseInt(formData.phoneNumber.replace(/\D/g, '')),
                    pointsEarned: 0,
                    raisedIssues: 0
                });
                
                // Show success message
                showSuccess('Account Created!', 'Your account has been successfully created. Welcome to GEOCITY!');
                
                // Redirect to main page after a short delay
                setTimeout(() => {
                    router.push('/');
                }, 1000);
                
            } catch (error: any) {
                console.error('Registration error:', error);
                
                // Handle different error scenarios
                let errorMessage = 'Something went wrong. Please try again.';
                
                if (error.message) {
                    if (error.message.includes('User with this email already exists')) {
                        errorMessage = 'An account with this email already exists. Please sign in instead.';
                    } else if (error.message.includes('Invalid email')) {
                        errorMessage = 'Please enter a valid email address.';
                    } else if (error.message.includes('Password too weak')) {
                        errorMessage = 'Password is too weak. Please choose a stronger password.';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                showError('Registration Failed', errorMessage);
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
        <div className="min-h-screen flex flex-col-reverse lg:flex-row bg-white">
            {/* Sign Up Form Section */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 min-h-screen lg:max-h-screen overflow-y-auto">
                <div className="w-full max-w-md space-y-8 py-8 lg:mt-24">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                            Sign Up
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            Create your account to get started
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Name Field */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="name" 
                                className={`block text-sm font-medium transition-colors duration-200 ${getLabelColor('name')}`}
                            >
                                Full Name
                            </label>
                            <div className="relative">
                                <input
                                    id="name"
                                    type="text"
                                    className={`w-full px-3 py-3 text-base bg-transparent border-b-2 transition-all duration-300 ease-in-out ${getBorderColor('name')} outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder:text-gray-400`}
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    onFocus={() => handleFocus('name')}
                                    onBlur={() => handleBlur('name')}
                                    placeholder="Enter your full name"
                                    aria-describedby={errors.name ? "name-error" : undefined}
                                />
                            </div>
                            {errors.name && (
                                <p id="name-error" className="text-sm text-red-500 mt-1 flex items-center">
                                    <span className="mr-1">⚠</span>
                                    {errors.name}
                                </p>
                            )}
                        </div>

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

                        {/* Address Field */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="address" 
                                className={`block text-sm font-medium transition-colors duration-200 ${getLabelColor('address')}`}
                            >
                                Address
                            </label>
                            <div className="relative">
                                <input
                                    id="address"
                                    type="text"
                                    className={`w-full px-3 py-3 text-base bg-transparent border-b-2 transition-all duration-300 ease-in-out ${getBorderColor('address')} outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder:text-gray-400`}
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    onFocus={() => handleFocus('address')}
                                    onBlur={() => handleBlur('address')}
                                    placeholder="Enter your address"
                                    aria-describedby={errors.address ? "address-error" : undefined}
                                />
                            </div>
                            {errors.address && (
                                <p id="address-error" className="text-sm text-red-500 mt-1 flex items-center">
                                    <span className="mr-1">⚠</span>
                                    {errors.address}
                                </p>
                            )}
                        </div>

                        {/* Phone Number Field */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="phoneNumber" 
                                className={`block text-sm font-medium transition-colors duration-200 ${getLabelColor('phoneNumber')}`}
                            >
                                Phone Number
                            </label>
                            <div className="relative">
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    className={`w-full px-3 py-3 text-base bg-transparent border-b-2 transition-all duration-300 ease-in-out ${getBorderColor('phoneNumber')} outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder:text-gray-400`}
                                    value={formData.phoneNumber}
                                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                    onFocus={() => handleFocus('phoneNumber')}
                                    onBlur={() => handleBlur('phoneNumber')}
                                    placeholder="Enter your phone number"
                                    aria-describedby={errors.phoneNumber ? "phoneNumber-error" : undefined}
                                />
                            </div>
                            {errors.phoneNumber && (
                                <p id="phoneNumber-error" className="text-sm text-red-500 mt-1 flex items-center">
                                    <span className="mr-1">⚠</span>
                                    {errors.phoneNumber}
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

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="confirmPassword" 
                                className={`block text-sm font-medium transition-colors duration-200 ${getLabelColor('confirmPassword')}`}
                            >
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    className={`w-full px-3 pr-12 py-3 text-base bg-transparent border-b-2 transition-all duration-300 ease-in-out ${getBorderColor('confirmPassword')} outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder:text-gray-400`}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                    onFocus={() => handleFocus('confirmPassword')}
                                    onBlur={() => handleBlur('confirmPassword')}
                                    placeholder="Confirm your password"
                                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-50 rounded"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={20} />
                                    ) : (
                                        <Eye size={20} />
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p id="confirmPassword-error" className="text-sm text-red-500 mt-1 flex items-center">
                                    <span className="mr-1">⚠</span>
                                    {errors.confirmPassword}
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

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[0.95] active:scale-[1.05] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link 
                                href="/sign-in" 
                                className="text-blue-500 hover:text-blue-600 font-medium transition-colors duration-200 cursor-pointer"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Section - Spline Animation */}
            <div className="w-full lg:w-1/2 flex flex-col bg-black h-64 md:h-80 lg:h-screen lg:min-h-screen">
                <Spline
                    scene="https://prod.spline.design/BlTa0Pd8MrQJoGop/scene.splinecode"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />
            </div>

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    )
}

export default SignUpPage
