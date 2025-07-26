# Environment Setup Guide

## Required Environment Variables

To resolve the current errors, you need to set up the following environment variables. Create a `.env.local` file in the root directory with these values:

### Google Services
```env
# Google Maps API (Required for geocoding and maps)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_MAP_ID=your_map_id_here

# Google Cloud Platform (Required for AI services and storage)
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id_here
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id_here
GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id_here
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=your_client_id_here
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name_here
```

### AI Services (Required for image analysis)
```env
# Gemini AI (Required for image analysis)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI (Alternative)
OPENAI_API_KEY=your_openai_api_key_here
```

### Firebase Configuration (Required for database)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

### Optional Services
```env
# Twilio (Optional - for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=your_twilio_phone_number_here
ADMIN_PHONE_NUMBER=your_admin_phone_number_here

# Weather Services (Optional)
TOMORROW_IO_API_KEY=your_tomorrow_io_api_key_here

# External Services (Optional)
NEXT_PUBLIC_SCRAPE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Current Errors and Solutions

### 1. **Firebase Firestore Connection Issues**
- **Error**: `unable to get local issuer certificate`
- **Solution**: SSL configuration has been added to handle development certificate issues

### 2. **Google Generative AI (Gemini) API Errors**
- **Error**: `Error fetching from https://generativelanguage.googleapis.com`
- **Solution**: 
  - Add `GEMINI_API_KEY` to your environment variables
  - SSL configuration has been added to handle certificate issues

### 3. **Google Maps Geocoding Issues**
- **Error**: API key missing or SSL certificate issues
- **Solution**: 
  - Add `GOOGLE_MAPS_API_KEY` to your environment variables
  - SSL configuration has been added

## How to Get API Keys

### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps JavaScript API, Places API, and Geocoding API
4. Create API credentials
5. Add billing information (required)

### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env.local` file

### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add a web app to get the configuration
4. Copy all the config values to your `.env.local` file

## Testing After Setup

After setting up the environment variables:

1. Restart your development server
2. Try submitting a report with an image
3. Check the console for any remaining errors
4. The AI image analysis should work properly
5. Geocoding should work for location addresses

## Fallback Behavior

If API keys are missing:
- Image analysis will return fallback responses
- Geocoding will be skipped
- Reports will still be saved to Firebase
- The application will continue to function with reduced features 