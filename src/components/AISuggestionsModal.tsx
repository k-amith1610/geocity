'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Activity, TrendingUp, AlertTriangle, MapPin, Clock, Users, MessageCircle, Share2, Heart, Eye, Loader2, Thermometer, Droplets, Wind, Gauge, Send } from 'lucide-react';
import { EnhancedWeatherResponse, SocialMediaResponse, sendAIChat } from '@/lib/api';

// Chat message interface
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Utility function to format timestamp to relative time
const formatTimeAgo = (timestamp: string): string => {
  try {
    const postDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - postDate.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return postDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Unknown time';
  }
};

// Chat message component
const ChatMessage = ({ message }: { message: ChatMessage }) => {
  const isUser = message.type === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-[var(--color-primary)] text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm">{message.content}</p>
        </div>
        <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
};

// Chat input component
const ChatInput = ({ 
  value, 
  onChange, 
  onSend, 
  isLoading, 
  placeholder 
}: { 
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder: string;
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 border-t border-gray-200 bg-white">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
      />
      <button
        onClick={onSend}
        disabled={isLoading || !value.trim()}
        className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  weatherData?: EnhancedWeatherResponse | null;
  weatherDataDestination?: EnhancedWeatherResponse | null;
  socialMediaData?: SocialMediaResponse | null;
  isLoading: boolean;
  isLoadingWeather: boolean;
  isLoadingSocialMedia: boolean;
}

// Weather icon mapping
const getWeatherIcon = (iconName: string) => {
  switch (iconName.toLowerCase()) {
    case 'sun':
    case 'clear':
      return <Sun className="w-5 h-5 text-yellow-500" />;
    case 'cloud':
    case 'cloudy':
    case 'mostly cloudy':
    case 'partly cloudy':
      return <Cloud className="w-5 h-5 text-gray-500" />;
    case 'cloudrain':
    case 'rain':
    case 'drizzle':
      return <CloudRain className="w-5 h-5 text-blue-500" />;
    case 'cloudsnow':
    case 'snow':
    case 'flurries':
      return <CloudSnow className="w-5 h-5 text-blue-300" />;
    case 'cloudlightning':
    case 'thunderstorm':
      return <CloudLightning className="w-5 h-5 text-purple-500" />;
    default:
      return <Activity className="w-5 h-5 text-gray-500" />;
  }
};

// Risk level color mapping
const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'low':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export default function AISuggestionsModal({ 
  isOpen, 
  onClose, 
  origin, 
  destination, 
  weatherData, 
  weatherDataDestination, 
  socialMediaData, 
  isLoading, 
  isLoadingWeather, 
  isLoadingSocialMedia 
}: AISuggestionsModalProps) {
  const [activeTab, setActiveTab] = useState<'weather' | 'social'>('weather');
  
  // Chat state management
  const [weatherChatMessages, setWeatherChatMessages] = useState<ChatMessage[]>([]);
  const [socialChatMessages, setSocialChatMessages] = useState<ChatMessage[]>([]);
  const [weatherChatInput, setWeatherChatInput] = useState('');
  const [socialChatInput, setSocialChatInput] = useState('');
  const [isWeatherChatLoading, setIsWeatherChatLoading] = useState(false);
  const [isSocialChatLoading, setIsSocialChatLoading] = useState(false);

  // Refs for auto-scroll
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to chat area when new message is added
  useEffect(() => {
    const currentChatMessages = activeTab === 'weather' ? weatherChatMessages : socialChatMessages;
    
    if (currentChatMessages.length > 0) {
      // Scroll modal content to show chat area
      if (modalContentRef.current) {
        setTimeout(() => {
          modalContentRef.current?.scrollTo({
            top: modalContentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
      
      // Scroll chat messages to show latest message
      if (chatMessagesRef.current) {
        setTimeout(() => {
          chatMessagesRef.current?.scrollTo({
            top: chatMessagesRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 200);
      }
    }
  }, [weatherChatMessages, socialChatMessages, activeTab]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle weather chat
  const handleWeatherChatSend = async () => {
    if (!weatherChatInput.trim() || isWeatherChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: weatherChatInput.trim(),
      timestamp: new Date()
    };

    setWeatherChatMessages(prev => [...prev, userMessage]);
    setWeatherChatInput('');
    setIsWeatherChatLoading(true);

    try {
      const response = await sendAIChat({
        message: userMessage.content,
        context: {
          type: 'weather',
          data: {
            origin: weatherData,
            destination: weatherDataDestination,
            route: { origin, destination }
          }
        }
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: new Date()
      };

      setWeatherChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Weather chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setWeatherChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsWeatherChatLoading(false);
    }
  };

  // Handle social chat
  const handleSocialChatSend = async () => {
    if (!socialChatInput.trim() || isSocialChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: socialChatInput.trim(),
      timestamp: new Date()
    };

    setSocialChatMessages(prev => [...prev, userMessage]);
    setSocialChatInput('');
    setIsSocialChatLoading(true);

    try {
      const response = await sendAIChat({
        message: userMessage.content,
        context: {
          type: 'social',
          data: {
            socialMediaData,
            route: { origin, destination }
          }
        }
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: new Date()
      };

      setSocialChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Social chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setSocialChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSocialChatLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentChatMessages = activeTab === 'weather' ? weatherChatMessages : socialChatMessages;
  const currentChatInput = activeTab === 'weather' ? weatherChatInput : socialChatInput;
  const currentChatLoading = activeTab === 'weather' ? isWeatherChatLoading : isSocialChatLoading;
  const currentChatPlaceholder = activeTab === 'weather' 
    ? "Ask about weather conditions, risks, or recommendations..."
    : "Ask about social media trends, posts, or recommendations...";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">AI Route Insights</h2>
            <p className="text-xs opacity-90 mt-0.5">
              {origin} → {destination}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation - Fixed */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'weather'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Thermometer className="w-4 h-4" />
              <span>Weather & Environment</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'social'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Social Media Insights</span>
            </div>
          </button>
        </div>

        {/* Main Content Area - Scrollable */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Route</h3>
                <p className="text-sm text-gray-600">Gathering weather and social media insights...</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Weather Tab Content */}
              {activeTab === 'weather' && (
                <WeatherTab 
                  weatherData={weatherData} 
                  weatherDataDestination={weatherDataDestination}
                  isLoading={isLoadingWeather}
                />
              )}
              
              {/* Social Tab Content */}
              {activeTab === 'social' && (
                <SocialTab 
                  socialMediaData={socialMediaData}
                  isLoading={isLoadingSocialMedia}
                />
              )}

              {/* Chat Messages Section - Always at bottom of content */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className={`p-3 border-b border-gray-200 ${
                  activeTab === 'weather' 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50' 
                    : 'bg-gradient-to-r from-purple-50 to-pink-50'
                }`}>
                  <h3 className="text-sm font-semibold text-gray-900">AI Chat</h3>
                  <p className="text-xs text-gray-600">
                    {activeTab === 'weather' 
                      ? 'Ask about weather conditions, risks, or recommendations...'
                      : 'Get insights and recommendations based on social media data'
                    }
                  </p>
                </div>
                
                {/* Chat Messages - Scrollable */}
                <div ref={chatMessagesRef} className="h-48 overflow-y-auto p-4 bg-gray-50">
                  {currentChatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Ask me anything about the {activeTab === 'weather' ? 'weather' : 'social media'} data!</p>
                    </div>
                  ) : (
                    currentChatMessages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input - Fixed at Bottom */}
        <div className="border-t border-gray-200 bg-white flex-shrink-0">
          <ChatInput
            value={currentChatInput}
            onChange={activeTab === 'weather' ? setWeatherChatInput : setSocialChatInput}
            onSend={activeTab === 'weather' ? handleWeatherChatSend : handleSocialChatSend}
            isLoading={currentChatLoading}
            placeholder={currentChatPlaceholder}
          />
        </div>
      </div>
    </div>
  );
}

// Weather Tab Component - Simplified (no chat input)
function WeatherTab({ 
  weatherData, 
  weatherDataDestination, 
  isLoading
}: { 
  weatherData?: EnhancedWeatherResponse | null, 
  weatherDataDestination?: EnhancedWeatherResponse | null,
  isLoading: boolean;
}) {
  if (isLoading && !weatherData && !weatherDataDestination) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Weather Data</h3>
          <p className="text-sm text-gray-600">Gathering weather information for both locations...</p>
        </div>
      </div>
    );
  }

  if (!weatherData && !weatherDataDestination && !isLoading) {
    return (
      <div className="text-center py-8">
        <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Weather Data Unavailable</h3>
        <p className="text-sm text-gray-600">Unable to fetch weather information for this route.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Origin Location Info */}
      {weatherData && weatherData.location && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Origin</h3>
          </div>
          <p className="text-sm text-blue-800">{weatherData.location.address || 'N/A'}</p>
          {weatherData.location.zipCode && (
            <p className="text-xs text-blue-600 mt-1">ZIP: {weatherData.location.zipCode}</p>
          )}
        </div>
      )}

      {/* Destination Location Info */}
      {weatherDataDestination && weatherDataDestination.location && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Destination</h3>
          </div>
          <p className="text-sm text-blue-800">{weatherDataDestination.location.address || 'N/A'}</p>
          {weatherDataDestination.location.zipCode && (
            <p className="text-xs text-blue-600 mt-1">ZIP: {weatherDataDestination.location.zipCode}</p>
          )}
        </div>
      )}

      {/* Current Weather Grid */}
      {((weatherData && (weatherData.weather || weatherData.analysis)) || 
        (weatherDataDestination && (weatherDataDestination.weather || weatherDataDestination.analysis))) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Weather (Origin) */}
          {weatherData && (weatherData.weather || weatherData.analysis) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Current Conditions (Origin)</h3>
                {weatherData.weather && getWeatherIcon(weatherData.weather.icon || '')}
                {!weatherData.weather && weatherData.analysis && getWeatherIcon(weatherData.analysis.icon || '')}
              </div>
              <div className="space-y-2">
                {weatherData.weather ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Temperature</span>
                      <span className="text-sm font-medium">{weatherData.weather.temperature || 'N/A'}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Humidity</span>
                      <span className="text-sm font-medium">{weatherData.weather.humidity || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wind Speed</span>
                      <span className="text-sm font-medium">{weatherData.weather.windSpeed || 'N/A'} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Air Quality</span>
                      <span className="text-sm font-medium">{weatherData.weather.airQuality || 'N/A'}</span>
                    </div>
                  </>
                ) : weatherData.sensorData ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Temperature</span>
                      <span className="text-sm font-medium">{weatherData.sensorData.temperature || 'N/A'}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Humidity</span>
                      <span className="text-sm font-medium">{weatherData.sensorData.humidity || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Air Quality</span>
                      <span className="text-sm font-medium">{weatherData.sensorData.air_quality || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rain Level</span>
                      <span className="text-sm font-medium">{weatherData.sensorData.rain_level || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Weather data not available</div>
                )}
              </div>
            </div>
          )}

          {/* Current Weather (Destination) */}
          {weatherDataDestination && (weatherDataDestination.weather || weatherDataDestination.analysis) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Current Conditions (Destination)</h3>
                {weatherDataDestination.weather && getWeatherIcon(weatherDataDestination.weather.icon || '')}
                {!weatherDataDestination.weather && weatherDataDestination.analysis && getWeatherIcon(weatherDataDestination.analysis.icon || '')}
              </div>
              <div className="space-y-2">
                {weatherDataDestination.weather ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Temperature</span>
                      <span className="text-sm font-medium">{weatherDataDestination.weather.temperature || 'N/A'}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Humidity</span>
                      <span className="text-sm font-medium">{weatherDataDestination.weather.humidity || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wind Speed</span>
                      <span className="text-sm font-medium">{weatherDataDestination.weather.windSpeed || 'N/A'} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Air Quality</span>
                      <span className="text-sm font-medium">{weatherDataDestination.weather.airQuality || 'N/A'}</span>
                    </div>
                  </>
                ) : weatherDataDestination.sensorData ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Temperature</span>
                      <span className="text-sm font-medium">{weatherDataDestination.sensorData.temperature || 'N/A'}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Humidity</span>
                      <span className="text-sm font-medium">{weatherDataDestination.sensorData.humidity || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Air Quality</span>
                      <span className="text-sm font-medium">{weatherDataDestination.sensorData.air_quality || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rain Level</span>
                      <span className="text-sm font-medium">{weatherDataDestination.sensorData.rain_level || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Weather data not available</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Assessment (Origin) */}
      {weatherData && weatherData.analysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Risk Assessment (Origin)</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Environmental Risk</span>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${getRiskColor(weatherData.analysis.environmentalRisk || '')}`}>
                {weatherData.analysis.environmentalRisk?.toUpperCase() || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Air Quality</span>
              <span className="text-sm font-medium ml-2">{weatherData.analysis.airQualityCategory || 'N/A'}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Visibility</span>
              <span className="text-sm font-medium ml-2">{weatherData.weather?.visibility || 'N/A'} km</span>
            </div>
          </div>
        </div>
      )}

      {/* Risk Assessment (Destination) */}
      {weatherDataDestination && weatherDataDestination.analysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Risk Assessment (Destination)</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Environmental Risk</span>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${getRiskColor(weatherDataDestination.analysis.environmentalRisk || '')}`}>
                {weatherDataDestination.analysis.environmentalRisk?.toUpperCase() || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Air Quality</span>
              <span className="text-sm font-medium ml-2">{weatherDataDestination.analysis.airQualityCategory || 'N/A'}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Visibility</span>
              <span className="text-sm font-medium ml-2">{weatherDataDestination.weather?.visibility || 'N/A'} km</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis (Origin) */}
      {weatherData && weatherData.analysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="font-semibold text-gray-900">AI Analysis (Origin)</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
              <p className="text-sm text-gray-600">{weatherData.analysis.summary || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Forecast</h4>
              <p className="text-sm text-gray-600">{weatherData.analysis.forecast || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {weatherData.analysis.recommendations?.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                )) || <li className="text-sm text-gray-500">No recommendations available</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Health Advisory</h4>
              <p className="text-sm text-gray-600">{weatherData.analysis.healthAdvisory || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis (Destination) */}
      {weatherDataDestination && weatherDataDestination.analysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="font-semibold text-gray-900">AI Analysis (Destination)</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
              <p className="text-sm text-gray-600">{weatherDataDestination.analysis.summary || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Forecast</h4>
              <p className="text-sm text-gray-600">{weatherDataDestination.analysis.forecast || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {weatherDataDestination.analysis.recommendations?.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-[var(--color-primary)] mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                )) || <li className="text-sm text-gray-500">No recommendations available</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Health Advisory</h4>
              <p className="text-sm text-gray-600">{weatherDataDestination.analysis.healthAdvisory || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Sources */}
      {(weatherData || weatherDataDestination) && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">
            Data sources: {(weatherData?.dataSources || weatherDataDestination?.dataSources || []).join(', ') || 'N/A'} | 
            Generated by {(weatherData?.models?.analysis || weatherDataDestination?.models?.analysis || 'N/A')} | 
            {(weatherData?.timestamp || weatherDataDestination?.timestamp) ? new Date(weatherData?.timestamp || weatherDataDestination?.timestamp || '').toLocaleString() : 'N/A'}
          </p>
        </div>
      )}
    </div>
  );
}

// Social Media Tab Component - Simplified (no chat input)
function SocialTab({ 
  socialMediaData, 
  isLoading
}: { 
  socialMediaData?: SocialMediaResponse | null, 
  isLoading: boolean;
}) {
  if (isLoading && !socialMediaData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Social Media</h3>
          <p className="text-sm text-gray-600">Gathering recent social media posts and insights...</p>
        </div>
      </div>
    );
  }

  if (!socialMediaData && !isLoading) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Social Media Data Unavailable</h3>
        <p className="text-sm text-gray-600">Unable to fetch social media insights for this route.</p>
      </div>
    );
  }

  const { data } = socialMediaData!;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{data.totalPosts}</div>
          <div className="text-xs text-gray-600">Total Posts</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data.sources.length}</div>
          <div className="text-xs text-gray-600">Sources</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data.routes.length}</div>
          <div className="text-xs text-gray-600">Routes</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{data.keywords.length}</div>
          <div className="text-xs text-gray-600">Keywords</div>
        </div>
      </div>

      {/* Search Info */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-2">Search Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-purple-700 font-medium">Routes:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.routes.map((route: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  {route}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-purple-700 font-medium">Keywords:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.keywords.map((keyword: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Recent Social Media Posts</h3>
        {data.posts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No relevant posts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.posts.slice(0, 5).map((post: any) => (
              <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">{post.source}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{post.user}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(post.timestamp)}</span>
                  </div>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{post.text}</h4>
                
                {post.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{post.engagement.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{post.engagement.comments}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Share2 className="w-3 h-3" />
                      <span>{post.engagement.shares}</span>
                    </div>
                  </div>
                  
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View Post →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">
          Scraped from {data.sources.join(', ')} | 
          {data.totalPosts} posts found | 
          {new Date(data.scrapedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
} 