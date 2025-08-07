#!/bin/bash

echo "🚀 MUJ.TV Deployment Script"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build files are in the 'dist' directory"
    echo ""
    echo "🌐 Next steps:"
    echo "1. Deploy your backend to Railway/Render/Heroku"
    echo "2. Update VITE_BACKEND_URL in your environment"
    echo "3. Deploy frontend to Netlify"
    echo ""
    echo "📖 See DEPLOYMENT.md for detailed instructions"
else
    echo "❌ Build failed!"
    exit 1
fi
