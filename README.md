# 🌍 GEOCITY - Smart City Mapping Platform

A comprehensive smart city mapping application that combines real-time weather data, AI-powered route analysis, social media insights, and community reporting to provide intelligent urban navigation and environmental monitoring.

## 🚀 Live Demo

[Deploy on Vercel](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/geocity)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Implementation Details](#-implementation-details)
- [API Documentation](#-api-documentation)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🗺️ **Interactive Mapping**
- **Google Maps Integration**: Full-featured mapping with custom styling
- **Real-time Directions**: Multi-modal route planning (driving, walking, cycling)
- **Location Services**: GPS integration with custom location icons
- **Autocomplete**: Intelligent address suggestions using Google Places API

### 🌤️ **Weather & Environmental Intelligence**
- **Multi-Source Weather Data**: Tomorrow.io API + Firebase Realtime Database
- **AI-Powered Analysis**: Vertex AI Gemini 1.5 Flash for weather insights
- **Environmental Monitoring**: Air quality, humidity, temperature tracking
- **Health Advisories**: AI-generated health and safety recommendations

### 🤖 **AI-Powered Features**
- **Route Analysis**: Intelligent keyword generation for social media scraping
- **Contextual Chat**: AI assistant for weather and social media insights
- **Smart Recommendations**: Personalized route and safety suggestions
- **Data Fusion**: Combines multiple data sources for comprehensive analysis

### 📱 **Social Media Integration**
- **Real-time Scraping**: External service integration for social media data
- **Traffic Intelligence**: Reddit and RSS feed analysis for road conditions
- **Community Insights**: User-generated content analysis
- **Incident Reporting**: Real-time incident tracking and alerts

### 🔐 **Authentication & Security**
- **Firebase Authentication**: Secure user management with JWT tokens
- **Protected Routes**: Middleware-based route protection
- **Fraud Detection**: Device fingerprinting and IP tracking
- **Input Validation**: Comprehensive form validation and sanitization

### 📊 **Community Features**
- **Issue Reporting**: Photo-based incident reporting with location tagging
- **User Profiles**: Points system and contribution tracking
- **Real-time Updates**: Live data synchronization
- **Responsive Design**: Mobile-first responsive interface

## 🛠️ Tech Stack

### **Frontend Framework**
- **Next.js 15.4.1**: React framework with App Router
- **React 19.1.0**: Latest React with concurrent features
- **TypeScript 5**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework

### **AI & Machine Learning**
- **Genkit AI Framework**: Google's AI development framework
- **Vertex AI**: Google Cloud's ML platform
- **Gemini 1.5 Flash**: Advanced language model for analysis
- **OpenAI GPT-4o**: Alternative AI model for chat functionality

### **Maps & Location Services**
- **Google Maps JavaScript API**: Interactive mapping
- **Google Places API**: Address autocomplete and geocoding
- **Google Directions API**: Route planning and navigation
- **Custom Map Styling**: Professional map appearance

### **Weather & Environmental Data**
- **Tomorrow.io Weather API**: Comprehensive weather forecasting
- **Firebase Realtime Database**: Real-time sensor data storage
- **Multi-source Data Fusion**: Intelligent data combination
- **Environmental Monitoring**: Air quality and sensor data

### **Backend & Database**
- **Firebase Authentication**: User authentication and management
- **Firestore**: NoSQL document database
- **Firebase Realtime Database**: Real-time data synchronization
- **Next.js API Routes**: Serverless API endpoints

### **Social Media & External APIs**
- **External Scraping Service**: Social media data collection
- **Reddit API**: Community content analysis
- **RSS Feed Processing**: News and incident monitoring
- **Real-time Data Integration**: Live social media insights

### **UI/UX & Design**
- **Spline 3D Animations**: Interactive 3D loading animations
- **Lucide React Icons**: Modern icon library
- **Custom Design System**: Professional color scheme and components
- **Responsive Design**: Mobile-first approach

### **Development Tools**
- **ESLint**: Code linting and quality assurance
- **TypeScript**: Static type checking
- **Hot Reload**: Development server with Turbopack
- **Environment Management**: Secure configuration handling

## 🏗️ Architecture

### **Frontend Architecture**
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (10 endpoints)
│   ├── sign-in/           # Authentication pages
│   ├── sign-up/           # User registration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application
├── components/            # React components (8 files)
├── contexts/              # React contexts (1 file)
├── lib/                   # Utility libraries (3 files)
├── server/                # Server utilities
└── middleware.ts          # Next.js middleware
```

### **Component Architecture**
- **Header**: Navigation and user management
- **RoutePanel**: Route planning interface
- **GoogleMap**: Interactive mapping component
- **ReportModal**: Issue reporting system
- **AISuggestionsModal**: AI-powered insights
- **Toast**: Notification system
- **CyberLoader**: 3D loading animation
- **CustomLocationIcon**: Custom SVG icons

### **API Architecture**
- **RESTful Design**: Standard HTTP methods
- **Type Safety**: TypeScript interfaces for all endpoints
- **Error Handling**: Comprehensive error management
- **Rate Limiting**: API quota management
- **Authentication**: JWT-based security

## 📚 Implementation Details

### **1. Authentication System**

#### **Firebase Authentication Integration**
```typescript
// src/contexts/AuthContext.tsx
- Firebase Auth with email/password
- JWT token management
- User state persistence
- Protected route middleware
- Automatic token refresh
```

#### **Security Features**
- **Device Fingerprinting**: Browser canvas fingerprinting
- **IP Tracking**: Public IP detection with fallback services
- **Fraud Detection**: Suspicious activity monitoring
- **Input Validation**: Comprehensive form validation

### **2. Google Maps Integration**

#### **Core Mapping Features**
```typescript
// src/components/GoogleMap.tsx
- Google Maps JavaScript API v3
- Custom map styling with CSS variables
- Advanced markers with custom icons
- Directions rendering with custom polylines
- Places autocomplete integration
```

#### **Location Services**
- **GPS Integration**: Current location detection
- **Geocoding**: Address to coordinates conversion
- **Reverse Geocoding**: Coordinates to address conversion
- **Custom Icons**: Professional location markers

### **3. Weather & Environmental Intelligence**

#### **Multi-Source Data Integration**
```typescript
// src/app/api/enhanced-weather/route.ts
- Tomorrow.io Weather API integration
- Firebase Realtime Database sensor data
- AI-powered data fusion and analysis
- Real-time environmental monitoring
```

#### **AI Analysis Pipeline**
1. **Data Collection**: Fetch from multiple sources
2. **Data Validation**: Quality assessment
3. **AI Processing**: Gemini 1.5 Flash analysis
4. **Insight Generation**: Health advisories and recommendations
5. **Response Formatting**: Structured JSON output

#### **Environmental Monitoring**
- **Air Quality Index**: Real-time AQI tracking
- **Temperature Monitoring**: Celsius/Fahrenheit conversion
- **Humidity Tracking**: Relative humidity measurement
- **Rain Level Detection**: Precipitation monitoring

### **4. AI-Powered Features**

#### **Genkit AI Framework Integration**
```typescript
// AI Configuration
const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY! }),
    vertexAI({ projectId: process.env.GOOGLE_CLOUD_PROJECT! })
  ]
});
```

#### **AI Models Used**
- **Gemini 1.5 Flash**: Primary AI model for analysis
- **Vertex AI**: Google Cloud ML platform
- **OpenAI GPT-4o**: Alternative chat model
- **Custom Prompts**: Specialized prompts for each use case

#### **AI Applications**
1. **Weather Analysis**: Environmental risk assessment
2. **Route Optimization**: Intelligent route planning
3. **Keyword Generation**: Social media scraping optimization
4. **Chat Assistance**: Context-aware responses

### **5. Social Media Integration**

#### **External Service Architecture**
```typescript
// src/lib/api.ts
- External scraping service integration
- Reddit API for community content
- RSS feed processing
- Real-time data synchronization
```

#### **Data Processing Pipeline**
1. **Keyword Generation**: AI-powered keyword extraction
2. **Route Analysis**: Location-based content filtering
3. **Content Aggregation**: Multi-source data collection
4. **Insight Generation**: Traffic and incident analysis

### **6. Community Features**

#### **Issue Reporting System**
```typescript
// src/components/ReportModal.tsx
- Photo capture with camera integration
- Location tagging with GPS
- Device information collection
- Fraud detection algorithms
```

#### **User Management**
- **Points System**: Gamification for contributions
- **Profile Management**: User data and preferences
- **Activity Tracking**: Report history and statistics
- **Community Engagement**: Social features

### **7. Real-time Data Synchronization**

#### **Firebase Integration**
```typescript
// src/lib/fireBaseConfig.js
- Firestore for user data
- Realtime Database for sensor data
- Authentication state management
- Real-time updates and subscriptions
```

#### **Data Flow**
1. **Sensor Data**: IoT device integration
2. **User Data**: Profile and activity tracking
3. **Real-time Updates**: Live data synchronization
4. **Offline Support**: Local data caching

### **8. Performance Optimizations**

#### **Frontend Optimizations**
- **Code Splitting**: Dynamic imports and lazy loading
- **Image Optimization**: Next.js image optimization
- **Memoization**: React.memo and useMemo usage
- **Bundle Optimization**: Tree shaking and minification

#### **Backend Optimizations**
- **API Caching**: Response caching strategies
- **Database Indexing**: Firestore query optimization
- **Rate Limiting**: API quota management
- **Error Handling**: Graceful error recovery

## 🔌 API Documentation

### **Authentication Endpoints**

#### **POST /api/auth** - User Registration
```typescript
Request:
{
  name: string;
  email: string;
  password: string;
  address?: string;
  phoneNumber?: number;
}

Response:
{
  user: {
    uid: string;
    email: string;
    name: string;
    // ... other user fields
  };
  token: string;
}
```

#### **PUT /api/auth** - User Login
```typescript
Request:
{
  email: string;
  password: string;
}

Response:
{
  user: User;
  token: string;
}
```

#### **DELETE /api/auth** - User Logout
```typescript
Response:
{
  message: string;
}
```

### **Weather & Environmental Endpoints**

#### **POST /api/enhanced-weather** - Weather Analysis
```typescript
Request:
{
  address: string;
}

Response:
{
  success: boolean;
  location: {
    address: string;
    coordinates: { latitude: number; longitude: number };
    zipCode?: string;
  };
  weather: WeatherData;
  analysis: {
    summary: string;
    forecast: string;
    recommendations: string[];
    healthAdvisory: string;
    environmentalRisk: 'low' | 'medium' | 'high';
    // ... other analysis fields
  };
  sensorData?: SensorData;
  timestamp: string;
  aiGenerated: boolean;
  models: {
    geocoding: string;
    weatherData?: string;
    sensorData?: string;
    analysis: string;
  };
  framework: string;
}
```

#### **GET /api/firebase-weather** - Sensor Data
```typescript
Query Parameters:
- zipCode?: string

Response:
{
  success: boolean;
  zipCode?: string;
  sensorData?: {
    air_quality: number;
    humidity: number;
    temperature: number;
    rain_level: number;
    location: { latitude: number; longitude: number };
  };
  timestamp: string;
  dataSource: string;
}
```

### **AI-Powered Endpoints**

#### **POST /api/ai-keywords** - Route Keywords
```typescript
Request:
{
  origin: string;
  destination: string;
}

Response:
{
  success: boolean;
  data: {
    routes: string[];
    keywords: string[];
    maxPosts: number;
  };
  timestamp: string;
  aiGenerated: boolean;
  model: string;
  framework: string;
}
```

#### **POST /api/ai-chat** - AI Chat
```typescript
Request:
{
  message: string;
  context: {
    type: 'weather' | 'social';
    data: any;
  };
}

Response:
{
  response: string;
  timestamp: string;
}
```

### **User Management Endpoints**

#### **GET /api/user** - Get Users
```typescript
Query Parameters:
- id?: string;
- email?: string;
- page?: number;
- limit?: number;

Response:
{
  users: User[];
  total: number;
  page: number;
  limit: number;
}
```

#### **POST /api/user** - Create User
```typescript
Request:
{
  name: string;
  email: string;
  address?: string;
  phoneNumber?: number;
}

Response:
{
  id: string;
  name: string;
  email: string;
  // ... other user fields
}
```

#### **PUT /api/user** - Update User
```typescript
Query Parameters:
- id: string;

Request:
{
  name?: string;
  email?: string;
  address?: string;
  phoneNumber?: number;
}

Response:
{
  id: string;
  // ... updated user fields
}
```

### **Utility Endpoints**

#### **GET /api/health** - Health Check
```typescript
Response:
{
  status: string;
  message: string;
  timestamp: string;
  version: string;
  environment: string;
}
```

## 🚀 Installation

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Google Cloud Platform account
- Firebase project
- Tomorrow.io API key

### **1. Clone the Repository**
```bash
git clone https://github.com/yourusername/geocity.git
cd geocity
```

### **2. Install Dependencies**
```bash
npm install
# or
yarn install
```

### **3. Environment Setup**
Copy the example environment file and configure your variables:
```bash
cp .env.example .env.local
```

### **4. Run Development Server**
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## ⚙️ Environment Setup

### **Required Environment Variables**

#### **Google Services**
```env
# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_MAP_ID=your_map_id

# Google Cloud Platform
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
```

#### **AI Services**
```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# OpenAI (Alternative)
OPENAI_API_KEY=your_openai_api_key
```

#### **Weather Services**
```env
# Tomorrow.io Weather API
TOMORROW_IO_API_KEY=your_tomorrow_io_api_key
```

#### **Firebase Configuration**
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

#### **External Services**
```env
# Social Media Scraping Service
NEXT_PUBLIC_SCRAPE_URL=http://localhost:8000

# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### **API Key Setup Instructions**

#### **1. Google Maps API**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps JavaScript API, Places API, and Directions API
4. Create API credentials
5. Add billing information (required for API usage)

#### **2. Firebase Setup**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Create Firestore database
5. Set up Realtime Database
6. Download configuration and add to environment variables

#### **3. Tomorrow.io Weather API**
1. Sign up at [Tomorrow.io](https://www.tomorrow.io/)
2. Create an account and get API key
3. Add to environment variables

#### **4. Google AI (Gemini)**
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create API key for Gemini
3. Add to environment variables

## 📖 Usage

### **1. User Registration & Authentication**
- Navigate to `/sign-up` to create an account
- Use `/sign-in` to access existing account
- Authentication state persists across sessions

### **2. Route Planning**
- Use the route panel to enter origin and destination
- Select travel mode (driving, walking, cycling)
- View real-time directions on the map
- Access AI-powered route insights

### **3. Weather & Environmental Data**
- Weather data automatically loads for route locations
- View comprehensive environmental analysis
- Access health advisories and recommendations
- Monitor air quality and sensor data

### **4. AI Insights**
- Click "AI Insights" after planning a route
- View weather analysis and social media insights
- Chat with AI assistant for detailed information
- Get personalized recommendations

### **5. Issue Reporting**
- Click "Report an Issue" in the header
- Take photos or upload images
- Add location and description
- Submit reports for community review

### **6. Social Media Integration**
- View real-time social media posts
- Analyze traffic patterns and incidents
- Access community-generated content
- Monitor road conditions and alerts

## 🚀 Deployment

### **Vercel Deployment (Recommended)**

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy automatically

3. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure production API keys are configured
   - Set up custom domains if needed

### **Other Deployment Options**

#### **Netlify**
```bash
# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=out
```

#### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Production Considerations**

#### **Performance Optimization**
- Enable Next.js image optimization
- Configure CDN for static assets
- Implement caching strategies
- Monitor Core Web Vitals

#### **Security Measures**
- Use HTTPS in production
- Implement rate limiting
- Configure CORS properly
- Secure environment variables

#### **Monitoring & Analytics**
- Set up error tracking (Sentry)
- Configure analytics (Google Analytics)
- Monitor API usage and quotas
- Set up uptime monitoring

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### **Code Standards**
- Follow TypeScript best practices
- Use ESLint for code quality
- Write meaningful commit messages
- Add proper documentation

### **Testing**
```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (when implemented)
npm run test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Maps Platform** for mapping services
- **Firebase** for backend infrastructure
- **Tomorrow.io** for weather data
- **Google AI** for artificial intelligence capabilities
- **Spline** for 3D animations
- **Next.js** team for the amazing framework

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Built with ❤️ for smart cities and better urban experiences**
