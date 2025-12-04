# VWO Performance Dashboard

A real-time dashboard for monitoring VWO experiment performance with Google OAuth authentication restricted to Clearlink organization.

## Features

- 🔐 **Google OAuth Authentication** - Restricted to @clearlink.com domain
- 🔄 **Auto-refresh** - Automatic data updates every 5 minutes (configurable)
- 📊 **Real-time Metrics** - Conversion rates, revenue, RPV for all experiments
- 📈 **Data Visualization** - Interactive charts and performance graphs
- 🎨 **Modern UI** - Dark theme with glassmorphism effects
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with OAuth 2.0 credentials
- VWO account with API access

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For local development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
   - Click "Create"
   - Save the **Client ID** and **Client Secret**

5. Configure OAuth Consent Screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "Internal" (for Google Workspace users only)
   - Fill in the required fields:
     - App name: "VWO Performance Dashboard"
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue

6. Restrict to Organization Domain:
   - In the OAuth consent screen settings
   - Under "Test users" or "Domain restriction"
   - Add your domain: `clearlink.com`

### 2. VWO API Setup

1. Log in to your VWO account
2. Go to Settings > Personal Access Tokens
3. Generate a new API token
4. Copy your Account ID (found in the URL or account settings)

### 3. Environment Configuration

1. Copy the example environment file:
   ```bash
   cd dashboard
   cp env.example .env.local
   ```

2. Edit `.env.local` with your credentials:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<generate-with-command-below>
   
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   
   ALLOWED_DOMAIN=clearlink.com
   
   VWO_ACCOUNT_ID=<your-vwo-account-id>
   VWO_API_TOKEN=<your-vwo-api-token>
   
   REFRESH_INTERVAL=300000
   ```

3. Generate a secure NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

### 4. Install Dependencies

```bash
cd dashboard
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign In**: Click "Sign in with Google" and use your @clearlink.com email
2. **View Experiments**: See all running VWO experiments with performance metrics
3. **Toggle Views**: Switch between card view and chart view
4. **Auto-refresh**: Toggle automatic data refresh on/off
5. **Manual Refresh**: Click the refresh button to update data immediately

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Update `NEXTAUTH_URL` to your production domain
5. Add production redirect URI to Google Cloud Console
6. Deploy!

### Other Platforms

The dashboard can be deployed to any platform that supports Next.js:
- AWS Amplify
- Google Cloud Run
- Netlify
- Railway
- DigitalOcean App Platform

**Important**: Always use HTTPS in production for OAuth to work properly.

## Configuration

### Auto-refresh Interval

Change the refresh interval by updating `REFRESH_INTERVAL` in `.env.local`:
- Value is in milliseconds
- Default: 300000 (5 minutes)
- Example: 60000 = 1 minute

### Allowed Domain

To allow multiple domains or change the restriction:
1. Update `ALLOWED_DOMAIN` in `.env.local`
2. Update the domain restriction in Google Cloud Console

## Troubleshooting

### "Access Denied" Error

- Verify you're using an @clearlink.com email address
- Check that the domain is correctly configured in Google Cloud Console
- Ensure the OAuth consent screen is set to "Internal"

### VWO API Errors

- Verify your VWO Account ID and API Token are correct
- Check that the API token has the necessary permissions
- Ensure your VWO account has active experiments

### Authentication Not Working

- Verify `NEXTAUTH_URL` matches your current domain
- Check that redirect URIs are correctly configured in Google Cloud Console
- Ensure `NEXTAUTH_SECRET` is set and not empty

## Support

For issues or questions, contact your development team or refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [VWO API Documentation](https://developers.vwo.com)
