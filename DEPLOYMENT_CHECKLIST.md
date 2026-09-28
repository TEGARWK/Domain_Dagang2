# 🚀 Pre-Deployment Checklist
# Domain Dagang - Production Deployment Guide

---

## ⚠️ CRITICAL: Before First Deploy

### 1. Rotate All Secrets
```bash
# Generate new JWT Secret
openssl rand -base64 32

# Generate new database password
openssl rand -base64 24

# Update in .env file
```

### 2. Clean Git History (One Time Only)
```bash
# Run the cleanup script
bash scripts/git-cleanup.sh

# Force push (BE CAREFUL - this rewrites history!)
git push origin --force --all
git push origin --force --tags
```

### 3. Update Tripay IP Whitelist
```bash
# Verify current Tripay server IPs from their documentation
# https://tripay.co.id/developers
```

### 4. Set Daftarnama to Production URL
```bash
# In backend/.env
DAFTARNAMA_BASE_URL=https://api.dnama.id/v2

# Whitelist server IP in Daftarnama dashboard
```

---

## 📋 Pre-Deploy Checklist

### Environment Setup
- [ ] `NODE_ENV=production` set
- [ ] All secrets generated and configured
- [ ] `CLIENT_URL` set to actual domain
- [ ] `BACKEND_URL` set to actual API domain
- [ ] SSL certificates installed

### Database
- [ ] PostgreSQL accessible
- [ ] Migration `20260626_activation_retry_queue.sql` run
- [ ] Database indexes created
- [ ] Backup strategy configured

### Payment Gateway
- [ ] Tripay credentials updated to production
- [ ] Tripay webhook URL configured in Tripay dashboard
- [ ] Tripay IP whitelist updated
- [ ] Test transaction completed

### Domain Registrar
- [ ] Daftarnama production API key configured
- [ ] Server IP whitelisted in Daftarnama
- [ ] Daftarnama BASE_URL set to production

### Monitoring & Logging
- [ ] Error tracking (Sentry) configured
- [ ] Log aggregation set up
- [ ] Health check endpoint verified

### Process Management
- [ ] PM2 installed globally
- [ ] PM2 ecosystem file created
- [ ] Startup script configured

---

## 🏃 Deployment Steps

### 1. Server Setup
```bash
# SSH to server
ssh root@your-server-ip

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install Redis (optional but recommended)
apt-get install -y redis-server
```

### 2. Database Setup
```bash
# Create database
sudo -u postgres psql
CREATE DATABASE domaindagang_db;
CREATE USER dbadmin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE domaindagang_db TO dbadmin;
\q

# Run migrations
psql -U dbadmin -d domaindagang_db -f migrations/master_database.sql
psql -U dbadmin -d domaindagang_db -f migrations/20260626_activation_retry_queue.sql
```

### 3. Backend Deployment
```bash
# Clone repository
git clone https://github.com/your-repo/domain-dagang.git
cd domain-dagang/backend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
nano .env  # Edit with production values

# Run with PM2
pm2 start index.js --name domaindagang-backend
pm2 save
pm2 startup
```

### 4. Frontend Deployment (with Nginx)
```bash
# Build frontend
cd ..
npm install
npm run build

# Configure Nginx
# See nginx.conf section below
```

### 5. Nginx Configuration
```nginx
# /etc/nginx/sites-available/domaindagang

# Frontend (Main Domain)
server {
    listen 80;
    server_name domaindagang.com www.domaindagang.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name domaindagang.com www.domaindagang.com;

    ssl_certificate /etc/letsencrypt/live/domaindagang.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domaindagang.com/privkey.pem;

    root /var/www/domaindagang/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API Backend
server {
    listen 443 ssl http2;
    server_name api.domaindagang.com;

    ssl_certificate /etc/letsencrypt/live/api.domaindagang.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.domaindagang.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ Post-Deploy Verification

### Test Checklist
```bash
# 1. Health Check
curl https://api.domaindagang.com/

# 2. Test Registration Flow
# - Create user
# - Check domain availability
# - Create order
# - Complete payment
# - Verify domain activation

# 3. Test Payment Webhook
# - Simulate Tripay webhook
curl -X POST https://api.domaindagang.com/api/tripay/webhook \
  -H "Content-Type: application/json" \
  -d '{"reference": "TEST123"}'

# 4. Check Logs
pm2 logs domaindagang-backend --lines 50
```

### Monitoring
```bash
# Check PM2 status
pm2 status

# Check resource usage
pm2 monit

# Check logs
pm2 logs --error --lines 100
```

---

## 🔄 Rollback Plan

```bash
# If something goes wrong:
# 1. Stop current deployment
pm2 stop domaindagang-backend

# 2. Revert to previous version
git checkout v1.2.3
cd backend && npm install && pm2 restart domaindagang-backend

# 3. For database rollback
psql -U dbadmin -d domaindagang_db < backup/pre-deploy-backup.sql
```

---

## 📞 Emergency Contacts

- **Tripay Support**: https://tripay.co.id/support
- **Daftarnama Support**: https://daftarnama.id/support
- **Server Provider**: [Your provider info]

---

## 📝 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-06-26 | 2.2 | Production hardening applied |
