This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Running Frontend and Backend Separately

The repository now contains:
- Frontend (Next.js) at the repo root
- Backend (Express + TypeScript) in `backend/`

### Backend
1. Create `backend/.env` with:
   - `PORT=4000`
   - `CORS_ORIGIN=http://localhost:3000`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (use \n for newlines)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `RECAPTCHA_SECRET_KEY` (optional)
2. Install and run:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### Frontend
1. Add to `.env.local` at repo root:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```
2. Run:
   ```bash
   npm install
   npm run dev
   ```

### Updated client endpoints
- Login: `POST {API_BASE}/auth/login`
- Register: `POST {API_BASE}/auth/register`
- Rental application: `POST {API_BASE}/applications`

## Google Maps Setup

This project uses Google Maps for displaying bike locations. To set up Google Maps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Maps JavaScript API
4. Create credentials (API Key)
5. Create a `.env.local` file in the root directory with:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

## Cloudinary Setup

To store uploaded certificates in Cloudinary, add the following to `.env.local`:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Google reCAPTCHA (Invisible v2) Setup

Use Invisible reCAPTCHA to protect the login endpoint:

1. In the reCAPTCHA Admin Console, create keys for "reCAPTCHA v2" → "Invisible reCAPTCHA badge".
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
   RECAPTCHA_SECRET_KEY=your_secret_key_here
   ```
3. Restart the dev server after changing env variables.