# HeartCheck ❤️

A private, shared relationship health tracking app for couples built with React Native and Expo.

## Overview

HeartCheck helps couples track their daily emotional connection, identify patterns, and strengthen their relationship through consistent micro-journaling and trend-based insights.

## Features

- **Daily Check-ins**: Mood and connection ratings with reflections
- **Pattern Detection**: AI-powered insights into relationship trends
- **Monthly Reports**: Comprehensive relationship health summaries
- **Partner Pairing**: Secure couple connection system
- **Privacy Controls**: Granular sharing permissions for entries
- **Guided Exercises**: Contextual relationship improvement activities

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Auth, Database, Storage)
- **Payments**: Stripe integration
- **State Management**: React hooks and context
- **Navigation**: React Navigation v6
- **Styling**: Custom design system with React Native StyleSheet

## Design System

### Colors
- **Primary Sage**: `#A3B9A7` - Buttons, highlights
- **Blush Pink**: `#F6D5D6` - Positive states, celebrations
- **Soft Cream**: `#FAF7F2` - Background
- **Warm Gray Text**: `#4B4B4B` - Primary text
- **Cool Gray Text**: `#7B7B7B` - Secondary text
- **Alert Coral**: `#F28B82` - Low connection alerts
- **Success Teal**: `#6BBF8D` - Positive streaks, high connection

### Typography
- **Font Family**: Inter (fallback: system-ui)
- **Weights**: Regular (400), Medium (500), Semi-bold (600), Bold (700)
- **Sizes**: H1 (24px), H2 (20px), Body (16px), Small (14px)

### Spacing
- **Base Unit**: 8px spacing scale
- **Padding**: 16px standard margins
- **Border Radius**: 4px, 8px, 12px, 16px variants

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HeartCheck
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on physical device

## Project Structure

```
src/
├── components/          # Reusable UI components
├── constants/           # Design system constants
│   ├── colors.ts       # Color palette
│   ├── typography.ts   # Font definitions
│   └── spacing.ts      # Layout constants
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── screens/            # App screens
│   ├── onboarding/     # Welcome, setup, pairing
│   └── main/           # Dashboard, check-in, reports
├── services/           # External service integrations
│   └── supabase.ts     # Database and auth
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
└── hooks/              # Custom React hooks
```

## Key Components

### Onboarding Flow
- **WelcomeScreen**: App introduction and CTA
- **AccountSetupScreen**: User registration and profile creation
- **PairPartnerScreen**: Couple pairing via invite codes

### Main App
- **DashboardScreen**: Connection overview and recent activity
- **DailyCheckInScreen**: Mood, connection, and reflection inputs
- **ReportsScreen**: Monthly relationship health summaries
- **ProfileScreen**: User settings and account management
- **SubscriptionScreen**: Pricing plans and payment

## Database Schema

### Tables
- `users`: User profiles and preferences
- `couples`: Partner relationships
- `check_ins`: Daily emotional check-ins
- `subscriptions`: Payment and plan information
- `pattern_alerts`: AI-generated relationship insights

## Authentication Flow

1. User signs up with email/password
2. Profile creation with relationship details
3. Partner pairing via secure invite codes
4. Daily check-ins with privacy controls
5. Subscription management for premium features

## Subscription Model

- **Free Trial**: 7 days with full feature access
- **Monthly Plan**: $6.99/month
- **Annual Plan**: $59.99/year (28% savings)
- **Features**: Unlimited check-ins, reports, exercises, alerts

## Development

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Consistent naming conventions
- Comprehensive error handling

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Building
```bash
# Build for production
npx expo build:android
npx expo build:ios

# Build for web
npx expo build:web
```

## Deployment

### Expo Application Services (EAS)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure build
eas build:configure

# Build for stores
eas build --platform all
```

### App Store Deployment
1. Configure app.json with store details
2. Build production version with EAS
3. Submit to App Store Connect
4. Configure TestFlight for beta testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions:
- Email: support@heartcheck.app
- Documentation: [docs.heartcheck.app](https://docs.heartcheck.app)
- Community: [community.heartcheck.app](https://community.heartcheck.app)

## Roadmap

### Phase 1 (Current)
- ✅ Core check-in functionality
- ✅ Basic dashboard and reports
- ✅ User authentication and pairing
- ✅ Subscription framework

### Phase 2 (Q2 2024)
- 🔄 Advanced pattern detection
- 🔄 Guided exercises library
- 🔄 Partner communication tools
- 🔄 Web companion app

### Phase 3 (Q3 2024)
- 📋 Relationship coaching integration
- 📋 Advanced analytics and insights
- 📋 Social features (anonymous)
- 📋 API for third-party integrations

---

Built with ❤️ for stronger relationships
