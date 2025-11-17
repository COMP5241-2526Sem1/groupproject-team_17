#!/bin/bash

echo "Starting InteractiveHub Deployment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "Docker is running"
echo ""

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

echo ""
echo "Building and starting services..."
docker-compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check status
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "Deployment complete!"
echo ""
echo "Access your services:"
echo "   - Frontend (Local):  http://localhost:9680"
echo "   - Frontend (Public): http://61.244.130.65:9680"
echo "   - Web API (Local):   http://localhost:9681"
echo "   - Web API (Public):  http://61.244.130.65:9681"
echo "   - Swagger (Local):   http://localhost:9681/swagger"
echo "   - Swagger (Public):  http://61.244.130.65:9681/swagger"
echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop with: docker-compose down"
