# ============================================================
#  Deployment Script
#  Automates deployment process
#
#  Usage:
#  1. chmod +x deploy.sh
#  2. ./deploy.sh
# ============================================================

#!/bin/bash

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="domaindagang-backend"
APP_DIR="/var/www/domaindagang"
LOG_FILE="/var/log/domaindagang-deploy.log"

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "[SUCCESS] $1" >> $LOG_FILE
}

warn() {
    echo -e "${YELLOW}⚠️ $1${NC}"
    echo "[WARN] $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}❌ $1${NC}"
    echo "[ERROR] $1" >> $LOG_FILE
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run as root: sudo ./deploy.sh"
    fi
}

# Check prerequisites
check_prereq() {
    log "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    success "Node.js: $(node --version)"

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 not found, installing..."
        npm install -g pm2
    fi
    success "PM2 installed"

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        warn "PostgreSQL not found, installing..."
        apt-get update && apt-get install -y postgresql postgresql-contrib
    fi
    success "PostgreSQL available"
}

# Pull latest code
pull_code() {
    log "Pulling latest code..."

    if [ ! -d "$APP_DIR/.git" ]; then
        warn "Repository not found at $APP_DIR, cloning..."
        git clone https://github.com/your-repo/domain-dagang.git $APP_DIR
    fi

    cd $APP_DIR
    git pull origin main
    success "Code pulled"
}

# Install dependencies
install_deps() {
    log "Installing dependencies..."

    cd $APP_DIR/backend
    npm install --production
    success "Dependencies installed"
}

# Run migrations
run_migrations() {
    log "Running database migrations..."

    # Check if database exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "domaindagang_db"; then
        log "Database exists, running migrations..."
        sudo -u postgres psql -d domaindagang_db -f $APP_DIR/backend/migrations/master_database.sql
        sudo -u postgres psql -d domaindagang_db -f $APP_DIR/backend/migrations/20260626_activation_retry_queue.sql
        success "Migrations completed"
    else
        warn "Database does not exist, skipping migrations"
    fi
}

# Restart application
restart_app() {
    log "Restarting application..."

    # Create logs directory
    mkdir -p $APP_DIR/backend/logs

    # Reload PM2
    cd $APP_DIR/backend
    pm2 delete $APP_NAME 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save

    # Wait for startup
    sleep 3

    # Check status
    if pm2 list | grep -q "$APP_NAME"; then
        success "Application started"
    else
        error "Application failed to start"
    fi
}

# Health check
health_check() {
    log "Running health check..."

    local retries=5
    local delay=2

    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:3009/ | grep -q '"status"'; then
            success "Health check passed"
            return 0
        fi

        retries=$((retries - 1))
        warn "Health check failed, retrying in ${delay}s... ($retries attempts left)"
        sleep $delay
    done

    error "Health check failed after all retries"
}

# Main deployment
main() {
    echo "=========================================="
    echo "  Domain Dagang Deployment Script"
    echo "=========================================="
    echo ""

    check_root
    check_prereq
    pull_code
    install_deps
    run_migrations
    restart_app
    health_check

    echo ""
    echo "=========================================="
    success "Deployment completed successfully!"
    echo "=========================================="
    echo ""
    echo "Application: $APP_NAME"
    echo "URL: http://localhost:3009"
    echo "Logs: pm2 logs $APP_NAME"
    echo "Status: pm2 status"
    echo ""
}

# Run
main
