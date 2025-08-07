# MUJ.TV - Complete Render Deployment Guide

## 🚀 Step-by-Step Process to Deploy on Render

### Prerequisites
- Your code ready in the project directory
- Internet connection
- Email address for Render account

---

## Step 1: Create Render Account

### 1.1 Go to Render
1. Open your browser
2. Go to [render.com](https://render.com)
3. Click **"Get Started"**

### 1.2 Sign Up
1. Click **"Sign Up"**
2. Choose one of these options:
   - **GitHub** (if you have GitHub)
   - **Email** (if you don't have GitHub)
3. Complete the signup process
4. Verify your email if required

---

## Step 2: Deploy Backend Service

### 2.1 Create Backend Service
1. In Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Click **"Build and deploy from a Git repository"**

### 2.2 Connect Repository
1. If using GitHub:
   - Click **"Connect account"** (if not already connected)
   - Select your repository
2. If not using GitHub:
   - Click **"Deploy from existing repository"**
   - Enter your repository URL

### 2.3 Configure Backend Settings
Fill in these details:
- **Name**: `mujtv-backend`
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node index.js`

### 2.4 Deploy Backend
1. Click **"Create Web Service"**
2. Wait for deployment to complete (2-3 minutes)
3. **Save your backend URL** (e.g., `https://mujtv-backend.onrender.com`)

---

## Step 3: Deploy Frontend Service

### 3.1 Create Frontend Service
1. In Render dashboard, click **"New +"**
2. Select **"Static Site"**
3. Click **"Build and deploy from a Git repository"**

### 3.2 Connect Same Repository
1. Select the same repository you used for backend
2. Click **"Continue"**

### 3.3 Configure Frontend Settings
Fill in these details:
- **Name**: `mujtv-frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

### 3.4 Deploy Frontend
1. Click **"Create Static Site"**
2. Wait for deployment to complete (3-5 minutes)
3. **Save your frontend URL** (e.g., `https://mujtv-frontend.onrender.com`)

---

## Step 4: Connect Frontend and Backend

### 4.1 Set Environment Variable
1. Go to your frontend service in Render dashboard
2. Click on **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Add:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://mujtv-backend.onrender.com` (your backend URL)
5. Click **"Save Changes"**

### 4.2 Redeploy Frontend
1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Wait for redeployment to complete

---

## Step 5: Test Your Deployment

### 5.1 Test Backend
1. Open your backend URL in browser
2. Add `/api/health` to the URL
3. You should see: `{"status":"ok","timestamp":"..."}`

### 5.2 Test Frontend
1. Open your frontend URL in browser
2. You should see the MUJ.TV application
3. Allow camera/microphone permissions when prompted

### 5.3 Test Full Functionality
1. Enter your name and select gender
2. Click "Start Chat"
3. Test video chat functionality
4. Test chat messaging
5. Test random matching (users are matched regardless of gender)

---

## Step 6: Troubleshooting

### Common Issues and Solutions:

#### Issue 1: Backend Not Starting
**Symptoms**: Backend service shows "Failed" status
**Solution**:
1. Check build logs in Render dashboard
2. Ensure `server/package.json` exists
3. Verify Node.js version compatibility

#### Issue 2: Frontend Build Fails
**Symptoms**: Frontend service shows "Failed" status
**Solution**:
1. Check build logs in Render dashboard
2. Ensure all dependencies are in `package.json`
3. Verify build command is correct
4. **Dependency Conflict Fix**: If you see ERESOLVE errors with `@vitejs/plugin-basic-ssl`, this has been fixed in the code - the plugin has been removed as it's not needed for production deployment

#### Issue 3: CORS Errors
**Symptoms**: Browser console shows CORS errors
**Solution**:
1. Backend CORS is already configured for Render
2. Check that environment variable is set correctly
3. Redeploy frontend after setting environment variable

#### Issue 4: Socket Connection Failed
**Symptoms**: "Connection failed" in browser console
**Solution**:
1. Verify backend URL is correct in environment variable
2. Check that backend is running
3. Ensure both services are deployed successfully

#### Issue 5: Video Not Working
**Symptoms**: Camera/microphone not accessible
**Solution**:
1. Ensure you're using HTTPS (Render provides this)
2. Allow camera/microphone permissions in browser
3. Check browser console for WebRTC errors

---

## Step 7: Monitor and Maintain

### 7.1 Check Service Status
- Go to Render dashboard
- Monitor both services for any issues
- Check logs if problems occur

### 7.2 Update Your Application
1. Make changes to your code
2. Push to your repository (if using Git)
3. Render will automatically redeploy
4. Or manually redeploy from dashboard

### 7.3 Monitor Usage
- Check Render dashboard for resource usage
- Free tier includes 750 hours/month
- Monitor for any billing alerts

---

## Your Live URLs

After successful deployment, your application will be available at:

- **Frontend**: `https://mujtv-frontend.onrender.com`
- **Backend**: `https://mujtv-backend.onrender.com`

## Cost

- **Total Cost**: $0/month
- **Free Tier**: 750 hours/month (enough for 24/7)
- **No credit card required**

---

## Success Checklist

- [ ] Render account created
- [ ] Backend service deployed successfully
- [ ] Frontend service deployed successfully
- [ ] Environment variable set correctly
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Video chat functionality works
- [ ] Gender selection works
- [ ] Chat messaging works
- [ ] Gender-based matching works

---

🎉 **Congratulations! Your MUJ.TV application is now live on Render!**

**Need help?** Check the logs in Render dashboard or refer to the troubleshooting section above.
