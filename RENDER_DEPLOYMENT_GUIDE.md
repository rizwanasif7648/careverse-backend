# Render Deployment Guide - Careverse Backend

Complete guide to deploy the Careverse AI healthcare platform on Render.

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Render account (sign up at https://render.com)
- [ ] GitHub repository access (already done ✅)
- [ ] All required API keys ready:
  - OpenAI API key
  - Pinecone API key
  - Serper API key
  - Google Places API key
  - JWT secret (generate a secure random string)

## 🚀 Deployment Steps

### Step 1: Create PostgreSQL Database

1. Log in to your Render dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure database:
   - **Name**: `careverse-db`
   - **Database**: `careverse_db`
   - **User**: `careverse_user` (or leave default)
   - **Region**: Choose closest to your users
   - **Plan**: 
     - Free tier for testing (limited storage)
     - Starter ($7/month) for production
4. Click **"Create Database"**
5. Wait for database to provision (2-3 minutes)
6. **Save the connection details** - you'll need:
   - Internal Database URL (for connecting from Render services)
   - External Database URL (for local migrations)

### Step 2: Create Redis Instance (Optional but Recommended)

1. Click **"New +"** → **"Redis"**
2. Configure Redis:
   - **Name**: `careverse-redis`
   - **Region**: Same as your database
   - **Plan**: Starter ($10/month)
   - **Maxmemory Policy**: `allkeys-lru` (recommended for caching)
3. Click **"Create Redis"**
4. **Save the Redis URL** from the dashboard

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Select **"Build and deploy from a Git repository"**
   - Click **"Connect account"** if not already connected
   - Choose repository: `rizwanasif7648/careverse-backend`
   - Select branch: `deployment/render-setup`
3. Configure service:
   - **Name**: `careverse-api`
   - **Region**: Same as database
   - **Branch**: `deployment/render-setup`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: 
     - Free tier for testing (sleeps after inactivity)
     - Starter ($7/month) for production (always on)

### Step 4: Configure Environment Variables

In the Web Service settings, add these environment variables:

#### Required Variables

```bash
# Node Environment
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (use Internal Database URL from Step 1)
DATABASE_URL=<your-postgres-internal-url>

# OR configure manually:
DB_HOST=<from-render-postgres>
DB_PORT=5432
DB_NAME=careverse_db
DB_USER=<from-render-postgres>
DB_PASSWORD=<from-render-postgres>
DB_DIALECT=postgres

# JWT Authentication (generate secure random strings)
JWT_SECRET=<generate-secure-random-string-min-32-chars>
JWT_REFRESH_SECRET=<generate-different-secure-random-string>
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# OpenAI Configuration
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# Pinecone Vector Database
PINECONE_API_KEY=<your-pinecone-api-key>
PINECONE_ENVIRONMENT=<your-pinecone-environment>
PINECONE_INDEX_NAME=careverse-medical-knowledge

# Web Search API (Required)
SERPER_API_KEY=<your-serper-api-key>

# Google Places API
GOOGLE_PLACES_API_KEY=<your-google-places-api-key>

# CORS (your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com
```

#### Optional Variables (Recommended)

```bash
# Redis (if you created Redis in Step 2)
REDIS_URL=<your-render-redis-url>

# OR configure manually:
REDIS_HOST=<from-render-redis>
REDIS_PORT=6379
REDIS_PASSWORD=<from-render-redis>

# Brave Search API (fallback)
BRAVE_SEARCH_API_KEY=<your-brave-api-key>

# Web Search Configuration
WEB_SEARCH_TIMEOUT_MS=10000
WEB_SEARCH_MAX_RETRIES=2
WEB_SEARCH_CACHE_ENABLED=true
WEB_SEARCH_CACHE_TTL_HOURS=6
WEB_SEARCH_MAX_RESULTS=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Step 5: Deploy the Service

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the application
   - Start the server
3. Monitor the deployment logs
4. Wait for "Your service is live 🎉" message

### Step 6: Run Database Migrations

After the first deployment, you need to run migrations:

#### Option A: Using Render Shell (Recommended)

1. Go to your Web Service dashboard
2. Click **"Shell"** tab
3. Run migration command:
```bash
npm run db:migrate
```

#### Option B: Using Local Connection

1. Install Sequelize CLI locally:
```bash
npm install -g sequelize-cli
```

2. Set environment variable with External Database URL:
```bash
export DATABASE_URL="<external-database-url-from-render>"
```

3. Run migrations:
```bash
npm run db:migrate
```

### Step 7: Verify Deployment

1. **Check Health Endpoint**:
   - Visit: `https://careverse-api.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"...","environment":"production"}`

2. **Test API Endpoints**:
   - Use Postman collection: `postman_collection.json`
   - Update base URL to your Render URL
   - Test authentication endpoints first

3. **Monitor Logs**:
   - Go to Web Service → Logs tab
   - Check for any errors or warnings
   - Verify database connection success

## 🔧 Post-Deployment Configuration

### Set Up Pinecone Index

1. Log in to Pinecone dashboard
2. Create index:
   - **Name**: `careverse-medical-knowledge`
   - **Dimensions**: 1536 (for OpenAI embeddings)
   - **Metric**: cosine
   - **Pod Type**: Starter or Standard
3. Populate index with medical knowledge (if needed)

### Configure CORS for Frontend

Update `CORS_ORIGIN` environment variable with your actual frontend URL:
```bash
CORS_ORIGIN=https://your-frontend-app.vercel.app
```

### Set Up Custom Domain (Optional)

1. Go to Web Service → Settings
2. Click **"Custom Domain"**
3. Add your domain (e.g., `api.careverse.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

## 📊 Monitoring & Maintenance

### Monitor Service Health

- **Render Dashboard**: Check CPU, memory, and response times
- **Logs**: Monitor for errors and performance issues
- **Health Endpoint**: Set up external monitoring (e.g., UptimeRobot)

### Database Backups

- Render automatically backs up PostgreSQL databases
- Free tier: Daily backups (7-day retention)
- Paid tiers: More frequent backups with longer retention

### Scaling Considerations

**When to Scale Up:**
- Response times > 2 seconds consistently
- CPU usage > 80% regularly
- Memory usage approaching limits
- Database connection pool exhausted

**Scaling Options:**
- Upgrade Web Service plan (more CPU/RAM)
- Upgrade Database plan (more connections/storage)
- Enable Redis caching (if not already)
- Optimize database queries and indexes

## 💰 Cost Estimation

### Minimal Setup (Testing)
- Web Service: Free tier (sleeps after inactivity)
- PostgreSQL: Free tier (limited storage)
- Redis: Skip initially
- **Total: $0/month**

### Starter Setup (Small Production)
- Web Service: Starter ($7/month)
- PostgreSQL: Starter ($7/month)
- Redis: Skip or use external free tier
- **Total: $14/month**

### Production Setup (Recommended)
- Web Service: Standard ($25/month)
- PostgreSQL: Standard ($20/month)
- Redis: Starter ($10/month)
- **Total: $55/month**

### External API Costs (Separate)
- OpenAI: Pay-per-use (~$0.03 per 1K tokens for GPT-4)
- Pinecone: Free tier or $70/month for standard
- Serper: Free tier (2,500 searches) or $5 per 1K searches
- Google Places: $0-$200/month depending on usage

## 🐛 Troubleshooting

### Service Won't Start

**Check logs for:**
- Missing environment variables
- Database connection errors
- Port binding issues

**Solutions:**
- Verify all required env vars are set
- Check DATABASE_URL is correct
- Ensure PORT is set to 5000

### Database Connection Failed

**Symptoms:**
- "Unable to connect to database" in logs
- 500 errors on all endpoints

**Solutions:**
- Use Internal Database URL (not External)
- Verify database is running
- Check database credentials
- Ensure database and service are in same region

### Redis Connection Issues

**Symptoms:**
- Caching not working
- "Redis connection failed" warnings

**Solutions:**
- Verify REDIS_URL is correct
- Check Redis instance is running
- Redis is optional - service works without it

### API Key Errors

**Symptoms:**
- "Invalid API key" errors
- AI features not working

**Solutions:**
- Verify all API keys are correct
- Check API key quotas/limits
- Test keys independently before deployment

### High Response Times

**Causes:**
- Free tier cold starts (service sleeps)
- Database query performance
- External API latency

**Solutions:**
- Upgrade to paid tier (no cold starts)
- Enable Redis caching
- Optimize database queries
- Review external API timeouts

## 🔄 Continuous Deployment

Render automatically deploys when you push to the connected branch:

1. Make changes locally
2. Commit and push to `deployment/render-setup` branch
3. Render detects changes and redeploys automatically
4. Monitor deployment in Render dashboard

### Manual Deploy

If needed, trigger manual deploy:
1. Go to Web Service dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Custom Domains](https://render.com/docs/custom-domains)

## ✅ Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Redis instance created (optional)
- [ ] Web service created and connected to GitHub
- [ ] All environment variables configured
- [ ] Service deployed successfully
- [ ] Database migrations run
- [ ] Health endpoint responding
- [ ] API endpoints tested
- [ ] Pinecone index configured
- [ ] CORS configured for frontend
- [ ] Monitoring set up
- [ ] Documentation updated with production URLs

## 🎉 Success!

Your Careverse backend is now live on Render! 

**Next Steps:**
1. Test all API endpoints with Postman
2. Deploy your frontend and connect to this API
3. Set up monitoring and alerts
4. Configure custom domain (optional)
5. Review and optimize performance

**Your API URL**: `https://careverse-api.onrender.com`

For support, check Render's documentation or contact their support team.
