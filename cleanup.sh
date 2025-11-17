#!/bin/bash

echo "Cleaning up Docker resources..."
echo ""

# Stop and remove containers
echo "Stopping containers..."
docker-compose down

# Optional: Remove volumes (uncomment if you want to delete data)
# echo "Removing volumes..."
# docker-compose down -v

# Optional: Clean up unused Docker resources (uncomment to use)
# echo "Cleaning up Docker system..."
# docker system prune -f

echo ""
echo "Cleanup complete!"
echo ""
echo "To delete all data including database, run:"
echo "   docker-compose down -v"
