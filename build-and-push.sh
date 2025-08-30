#!/bin/bash
# build-and-push.sh

# Load environment variables
source .env.prod

# Check if Docker username is set
if [ "$DOCKER_USERNAME" = "YOUR_DOCKER_USERNAME" ]; then
    echo "❌ Please set your Docker Hub username in .env.prod"
    exit 1
fi

echo "🚀 Building and pushing EcoStore microservices..."
echo "📦 Docker Username: $DOCKER_USERNAME"
echo "🏷️  Version: ${VERSION:-latest}"

# Build and push each service
services=(
    "user-service:backend/services/user-service"
    "product-service:backend/services/product-service"
    "cart-service:backend/services/cart-service"
    "order-service:backend/services/order-service"
    "payment-service:backend/services/payment-service"
    "admin-service:backend/services/admin-service"
    "gateway:backend/services/Gateway"
)

for service in "${services[@]}"; do
    IFS=':' read -r name path <<< "$service"
    
    echo ""
    echo "🔨 Building $name..."
    
    # Build the image
    docker build -t "$DOCKER_USERNAME/ecostore-$name:${VERSION:-latest}" "$path"
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful for $name"
        
        # Push to Docker Hub
        echo "📤 Pushing $name to Docker Hub..."
        docker push "$DOCKER_USERNAME/ecostore-$name:${VERSION:-latest}"
        
        if [ $? -eq 0 ]; then
            echo "✅ Push successful for $name"
        else
            echo "❌ Push failed for $name"
            exit 1
        fi
    else
        echo "❌ Build failed for $name"
        exit 1
    fi
done

echo ""
echo "🎉 All services built and pushed successfully!"
echo "📋 Images pushed:"
for service in "${services[@]}"; do
    IFS=':' read -r name path <<< "$service"
    echo "   - $DOCKER_USERNAME/ecostore-$name:${VERSION:-latest}"
done

echo ""
echo "🚀 To deploy, run:"
echo "   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d"