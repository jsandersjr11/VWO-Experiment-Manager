# VWO Performance Dashboard - Google Cloud Setup Guide

This guide walks you through setting up Google OAuth authentication for the VWO Performance Dashboard.

## Step 1: Create Google Cloud Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter project name: "UX Experiment Dashboard" (or your preferred name)
5. Select your organization (Clearlink)
6. Click "Create"

## Step 2: Enable Required APIs

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"
4. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **Internal** (this restricts access to your Google Workspace organization)
3. Click "Create"

### Fill in the required information:

**App information:**
- App name: `UX Experiment Dashboard`
- User support email: Select your email from dropdown
- App logo: (Optional) Upload your company logo

**App domain:**
- Application home page: (Leave blank for development, add production URL later)
- Application privacy policy link: (Optional)
- Application terms of service link: (Optional)

**Authorized domains:**
- Add: `clearlink.com` (for production only - localhost is not allowed here)

> [!NOTE]
> The "Authorized domains" field does NOT accept localhost. This is only for production domains. For local development, you'll configure the redirect URIs in the next step (Step 4), which DOES accept localhost.

**Developer contact information:**
- Email addresses: Add your email

4. Click "Save and Continue"

### Scopes:

1. Click "Add or Remove Scopes"
2. Filter and select these scopes:
   - `email`
   - `profile`
   - `openid`
3. Click "Update"
4. Click "Save and Continue"

### Summary:

1. Review your settings
2. Click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "Create Credentials" at the top
3. Select "OAuth client ID"

### Configure the OAuth client:

**Application type:** Web application

**Name:** `VWO Dashboard Web Client`

**Authorized JavaScript origins:**
- For development: `http://localhost:3000`
- For production: `https://your-production-domain.com`

**Authorized redirect URIs:**
- For development: `http://localhost:3000/api/auth/callback/google`
- For production: `https://your-production-domain.com/api/auth/callback/google`

4. Click "Create"

## Step 5: Save Your Credentials

A dialog will appear with your credentials:

1. **Client ID**: Copy this (looks like: `123456789-abc123.apps.googleusercontent.com`)
2. **Client Secret**: Copy this (looks like: `GOCSPX-abc123xyz`)

⚠️ **Important**: Save these credentials securely. You'll need them for the `.env.local` file.

You can also download the JSON file for backup, but you'll enter the values manually in the environment file.

## Step 6: Update Environment Variables

1. Open your `.env.local` file in the dashboard directory
2. Add your credentials:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## Step 7: Domain Restriction (Already Configured)

Since you selected "Internal" for the OAuth consent screen, access is automatically restricted to users in your Google Workspace organization (clearlink.com).

The application code also includes an additional check to verify the email domain matches `clearlink.com`.

## Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Sign in with Google"

4. You should see the Google sign-in page

5. Sign in with your @clearlink.com account

6. If successful, you'll be redirected to the dashboard

## Troubleshooting

### Error: "redirect_uri_mismatch"

- Verify the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check for trailing slashes or typos
- Make sure `NEXTAUTH_URL` in `.env.local` is set to `http://localhost:3000`

### Error: "Access blocked: This app's request is invalid"

- Ensure the OAuth consent screen is configured
- Verify you've added all required scopes
- Check that the authorized domain includes `clearlink.com`

### Error: "Access Denied"

- Verify you're signing in with an @clearlink.com email
- Check that the OAuth consent screen is set to "Internal"
- Ensure `ALLOWED_DOMAIN` in `.env.local` is set to `clearlink.com`

## Production Deployment

When deploying to production:

1. Add your production domain to **Authorized JavaScript origins**
2. Add your production callback URL to **Authorized redirect URIs**
3. Update `NEXTAUTH_URL` in your production environment variables
4. Ensure you're using HTTPS (required for OAuth in production)

## Security Best Practices

- ✅ Never commit `.env.local` to version control
- ✅ Use different OAuth clients for development and production
- ✅ Regularly rotate your client secrets
- ✅ Monitor OAuth usage in Google Cloud Console
- ✅ Keep the OAuth consent screen information up to date
