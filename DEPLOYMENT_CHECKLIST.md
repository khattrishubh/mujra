# MUJ.TV Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] **Frontend builds successfully** (`npm run build`)
- [ ] **Backend runs locally** (`cd server && node index.js`)
- [ ] **All features tested locally** (video chat, gender selection, etc.)
- [ ] **Git repository is up to date**

## 🚀 Backend Deployment

### Choose a Platform:
- [ ] **Railway** (Recommended - Easy setup)
- [ ] **Render** (Good free tier)
- [ ] **Heroku** (Requires credit card)

### Backend Setup:
- [ ] Create account on chosen platform
- [ ] Connect GitHub repository
- [ ] Set root directory to `/server`
- [ ] Deploy backend
- [ ] **Note the deployed URL** (e.g., `https://mujtv-backend.railway.app`)

## 🌐 Frontend Deployment (Netlify)

### Option A: Netlify CLI
- [ ] Install Netlify CLI: `npm install -g netlify-cli`
- [ ] Login: `netlify login`
- [ ] Deploy: `netlify deploy --prod --dir=dist`

### Option B: Netlify Dashboard
- [ ] Go to [netlify.com](https://netlify.com)
- [ ] Create new account/sign in
- [ ] Click "New site from Git"
- [ ] Connect GitHub repository
- [ ] Set build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
- [ ] Deploy site

## ⚙️ Environment Configuration

### Netlify Environment Variables:
- [ ] Go to Site settings > Environment variables
- [ ] Add: `VITE_BACKEND_URL=https://your-backend-url.railway.app`
- [ ] Replace with your actual backend URL

### Backend CORS Update:
- [ ] Update `server/index.js` CORS origins to include your Netlify domain
- [ ] Redeploy backend if needed

## 🧪 Testing

### Local Testing:
- [ ] Frontend connects to local backend
- [ ] Video chat works
- [ ] Gender selection works
- [ ] Chat functionality works

### Production Testing:
- [ ] Frontend connects to deployed backend
- [ ] Video chat works in production
- [ ] Camera/microphone permissions work
- [ ] All features function correctly

## 🔧 Troubleshooting

### Common Issues:
- [ ] **CORS errors**: Check backend CORS configuration
- [ ] **Socket connection failed**: Verify backend URL is correct
- [ ] **Build errors**: Check all dependencies are installed
- [ ] **WebRTC issues**: Ensure HTTPS is used in production

### Debug Steps:
- [ ] Check browser console for errors
- [ ] Check backend logs for errors
- [ ] Verify environment variables are set correctly
- [ ] Test with different browsers

## 📊 Post-Deployment

### Monitoring:
- [ ] Set up Netlify analytics
- [ ] Monitor backend logs
- [ ] Check for any errors in production

### Optimization:
- [ ] Enable Netlify caching
- [ ] Set up custom domain (optional)
- [ ] Configure SSL certificates

## 🎉 Success!

Once everything is working:
- [ ] Share your live URL
- [ ] Test with multiple users
- [ ] Monitor for any issues
- [ ] Consider adding analytics

---

**Need help?** Check the `DEPLOYMENT.md` file for detailed instructions.
