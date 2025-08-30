#!/bin/bash
# docker-scripts.sh
# Docker management scripts for EcoStore services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

# Build all services
build_services() {
    print_header "Building EcoStore Services"
    
    print_status "Building Gateway Service..."
    docker build -t ecostore-gateway ./backend/services/Gateway
    
    print_status "Building Order Service..."
    docker build -t ecostore-order-service ./backend/services/order-service
    
    print_status "Building Payment Service..."
    docker build -t ecostore-payment-service ./backend/services/payment-service
    
    print_status "All services built successfully!"
}

# Start all services
start_services() {
    print_header "Starting EcoStore Services"
    
    # Check if .env.docker exists
    if [ ! -f .env.docker ]; then
        print_warning ".env.docker file not found. Creating from template..."
        cp .env.docker.example .env.docker
        print_warning "Please update .env.docker with your actual configuration!"
    fi
    
    print_status "Starting services with Docker Compose..."
    docker-compose -f docker-compose.services.yml --env-file .env.docker up -d
    
    print_status "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_health
}

# Stop all services
stop_services() {
    print_header "Stopping EcoStore Services"
    
    print_status "Stopping services..."
    docker-compose -f docker-compose.services.yml down
    
    print_status "Services stopped successfully!"
}

# Restart all services
restart_services() {
    print_header "Restarting EcoStore Services"
    
    stop_services
    sleep 5
    start_services
}

# Check service health
check_health() {
    print_header "Checking Service Health"
    
    services=("gateway:5000" "order-service:4003" "payment-service:4004")
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        print_status "Checking $name service..."
        
        # Check if container is running
        if docker ps --filter "name=ecostore-$name" --filter "status=running" -q | grep -q .; then
            echo -e "  ${GREEN}✓${NC} Container is running"
            
            # Check health endpoint
            if curl -f -s "http://localhost:$port/health" > /dev/null; then
                echo -e "  ${GREEN}✓${NC} Health endpoint responding"
            else
                echo -e "  ${RED}✗${NC} Health endpoint not responding"
            fi
        else
            echo -e "  ${RED}✗${NC} Container is not running"
        fi
        echo ""
    done
    
    # Check databases
    print_status "Checking databases..."
    if docker ps --filter "name=ecostore-mongo-order" --filter "status=running" -q | grep -q .; then
        echo -e "  ${GREEN}✓${NC} Order Service MongoDB is running"
    else
        echo -e "  ${RED}✗${NC} Order Service MongoDB is not running"
    fi
    
    if docker ps --filter "name=ecostore-mongo-payment" --filter "status=running" -q | grep -q .; then
        echo -e "  ${GREEN}✓${NC} Payment Service MongoDB is running"
    else
        echo -e "  ${RED}✗${NC} Payment Service MongoDB is not running"
    fi
    
    # Check RabbitMQ
    print_status "Checking message broker..."
    if docker ps --filter "name=ecostore-rabbitmq" --filter "status=running" -q | grep -q .; then
        echo -e "  ${GREEN}✓${NC} RabbitMQ is running"
        echo -e "  ${BLUE}ℹ${NC}  Management UI: http://localhost:15672 (admin/password123)"
    else
        echo -e "  ${RED}✗${NC} RabbitMQ is not running"
    fi
}

# View logs for a specific service
view_logs() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name"
        echo "Available services: gateway, order-service, payment-service, mongo-order, mongo-payment, rabbitmq"
        return 1
    fi
    
    print_header "Viewing logs for $1"
    docker-compose -f docker-compose.services.yml logs -f "ecostore-$1" 2>/dev/null || \
    docker-compose -f docker-compose.services.yml logs -f "$1"
}

# Clean up Docker resources
cleanup() {
    print_header "Cleaning Up Docker Resources"
    
    print_status "Stopping all services..."
    docker-compose -f docker-compose.services.yml down -v
    
    print_status "Removing unused images..."
    docker image prune -f
    
    print_status "Removing unused networks..."
    docker network prune -f
    
    print_status "Cleanup completed!"
}

# Initialize project (first time setup)
init_project() {
    print_header "Initializing EcoStore Docker Setup"
    
    # Create necessary directories
    print_status "Creating data directories..."
    mkdir -p data/mongo-order data/mongo-payment data/rabbitmq
    
    # Copy environment file
    if [ ! -f .env.docker ]; then
        print_status "Creating environment file..."
        cp .env.docker.example .env.docker
    fi
    
    # Copy MongoDB init scripts
    print_status "Setting up MongoDB init scripts..."
    cat > init-mongo-order.js << 'EOF'
db.createUser({
  user: "orderuser",
  pwd: "orderpass123",
  roles: [{ role: "readWrite", db: "order-service" }]
});
db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "orderNumber": 1 }, { unique: true });
db.orders.createIndex({ "createdAt": -1 });
print("Order Service database initialized");
EOF
    
    cat > init-mongo-payment.js << 'EOF'
db.createUser({
  user: "paymentuser",
  pwd: "paymentpass123",
  roles: [{ role: "readWrite", db: "payment-service" }]
});
db.payments.createIndex({ "user_id": 1 });
db.payments.createIndex({ "transaction_id": 1 }, { unique: true, sparse: true });
print("Payment Service database initialized");
EOF
    
    print_status "Project initialized! Please update .env.docker with your configuration."
    print_warning "Don't forget to add your PayPal credentials to .env.docker"
}

# Show service status
status() {
    print_header "Service Status"
    docker-compose -f docker-compose.services.yml ps
}

# Development helpers
dev_rebuild() {
    print_header "Development: Rebuild and Restart"
    
    print_status "Stopping services..."
    docker-compose -f docker-compose.services.yml down
    
    print_status "Rebuilding images..."
    build_services
    
    print_status "Starting services..."
    start_services
}

# Database operations
db_reset() {
    print_header "Resetting Databases"
    print_warning "This will DELETE ALL DATA in the databases!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_status "Stopping services..."
        docker-compose -f docker-compose.services.yml down -v
        
        print_status "Removing database volumes..."
        docker volume rm ecostore_mongo-order-data ecostore_mongo-payment-data 2>/dev/null || true
        
        print_status "Starting services with fresh databases..."
        start_services
        
        print_status "Databases reset complete!"
    else
        print_status "Database reset cancelled."
    fi
}

# Backup databases
backup_db() {
    print_header "Backing Up Databases"
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_dir="backups/$timestamp"
    mkdir -p "$backup_dir"
    
    print_status "Backing up Order Service database..."
    docker exec ecostore-mongo-order mongodump --db order-service --out /tmp/backup
    docker cp ecostore-mongo-order:/tmp/backup "$backup_dir/order-service"
    
    print_status "Backing up Payment Service database..."
    docker exec ecostore-mongo-payment mongodump --db payment-service --out /tmp/backup
    docker cp ecostore-mongo-payment:/tmp/backup "$backup_dir/payment-service"
    
    print_status "Backup completed: $backup_dir"
}

# Show help
show_help() {
    print_header "EcoStore Docker Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  init          Initialize project (first time setup)"
    echo "  build         Build all service images"
    echo "  start         Start all services"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  status        Show service status"
    echo "  health        Check service health"
    echo "  logs [service] View logs for a service"
    echo "  cleanup       Clean up Docker resources"
    echo "  dev-rebuild   Development: rebuild and restart"
    echo "  db-reset      Reset all databases (DESTRUCTIVE)"
    echo "  backup        Backup databases"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 init                 # First time setup"
    echo "  $0 start               # Start all services"
    echo "  $0 logs gateway        # View gateway logs"
    echo "  $0 health              # Check service health"
    echo ""
}

# Main script logic
case "$1" in
    "init")
        init_project
        ;;
    "build")
        build_services
        ;;
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        status
        ;;
    "health")
        check_health
        ;;
    "logs")
        view_logs "$2"
        ;;
    "cleanup")
        cleanup
        ;;
    "dev-rebuild")
        dev_rebuild
        ;;
    "db-reset")
        db_reset
        ;;
    "backup")
        backup_db
        ;;
    "help"|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac