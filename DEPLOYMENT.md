# MUJ.TV Deployment Guide

## Frontend Deployment (Netlify)

### 1. Build the Frontend
```bash
npm run build
```

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Option B: Deploy via Netlify Dashboard
1. Go to [netlify.com](https://netlify.com)
2. Create a new account or sign in
3. Click "New site from Git"
4. Connect your GitHub repository
5. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### 3. Environment Variables
In your Netlify dashboard, go to Site settings > Environment variables and add:
```
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

## Backend Deployment

### Option 1: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Create a new account or sign in
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repository
5. Set the root directory to `/server`
6. Add environment variables if needed
7. Deploy

### Option 2: Render
1. Go to [render.com](https://render.com)
2. Create a new account or sign in
3. Click "New" > "Web Service"
4. Connect your GitHub repository
5. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
6. Deploy

### Option 3: Heroku
1. Go to [heroku.com](https://heroku.com)
2. Create a new account or sign in
3. Create a new app
4. Connect your GitHub repository
5. Set the root directory to `/server`
6. Deploy

## Configuration Files

### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables
Create a `.env` file in your project root:
```env
# Backend URL for production
VITE_BACKEND_URL=https://your-backend-url.railway.app

# Development backend URL
VITE_DEV_BACKEND_URL=http://localhost:3001
```

## Deployment Steps

### 1. Deploy Backend First
1. Choose a platform (Railway recommended)
2. Deploy your backend server
3. Note the deployed URL (e.g., `https://mujtv-backend.railway.app`)

### 2. Update Frontend Configuration
1. Update `src/services/socketService.ts` with your backend URL
2. Or set the `VITE_BACKEND_URL` environment variable in Netlify

### 3. Deploy Frontend
1. Deploy to Netlify using the guide above
2. Set the environment variable in Netlify dashboard
3. Your site will be live at `https://your-site-name.netlify.app`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your backend allows requests from your Netlify domain
2. **Socket Connection Failed**: Check that the backend URL is correct
3. **Build Errors**: Ensure all dependencies are in `package.json`

### Backend CORS Configuration
Update your server's CORS settings in `server/index.js`:
```javascript
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174", 
      "https://your-site-name.netlify.app",
      "https://*.netlify.app"
    ],
    methods: ["GET", "POST"]
  }
});
```

## Testing Deployment

1. **Local Testing**: Run `npm run dev` and test locally
2. **Production Testing**: Deploy and test the live site
3. **WebRTC Testing**: Ensure camera/microphone permissions work in production

## Custom Domain (Optional)

1. In Netlify dashboard, go to Domain settings
2. Add your custom domain
3. Update DNS settings as instructed
4. Update backend CORS to include your custom domain

## Monitoring

- **Netlify Analytics**: View site performance in Netlify dashboard
- **Backend Logs**: Check your backend platform's logs for errors
- **Browser Console**: Check for client-side errors

## Security Notes

- Use HTTPS in production
- Set up proper CORS policies
- Consider rate limiting for your backend
- Monitor for abuse and implement safeguards
