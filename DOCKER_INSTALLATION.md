# Docker Installation and Setup Guide for Mac

## Step 1: Install Docker Desktop for Mac

### Option 1: Download from Docker Website
1. Go to https://www.docker.com/products/docker-desktop
2. Click "Download for Mac"
3. Choose the appropriate version:
   - **Apple Silicon (M1/M2/M3)**: Download "Mac with Apple chip"
   - **Intel**: Download "Mac with Intel chip"
4. Open the downloaded `.dmg` file
5. Drag Docker to your Applications folder
6. Open Docker Desktop from Applications
7. Follow the setup wizard

### Option 2: Install via Homebrew
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app
```

## Step 2: Verify Docker Installation

After Docker Desktop is running, open a new terminal and run:

```bash
docker --version
docker-compose --version
```

You should see output like:
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

## Step 3: Deploy InteractiveHub

Once Docker is installed and running:

### Quick Deploy (Recommended)
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
./deploy.sh
```

### Manual Deploy
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"

# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

## Step 4: Verify Deployment

1. **Check running containers:**
   ```bash
   docker-compose ps
   ```

2. **View Web API logs:**
   ```bash
   docker-compose logs -f webapi
   ```

3. **Access services:**
   - Web API: http://localhost:5280
   - Swagger UI: http://localhost:5280/swagger
   - MySQL: localhost:3306

## Common Issues and Solutions

### Issue: "Cannot connect to the Docker daemon"
**Solution:** Make sure Docker Desktop is running. Look for the Docker icon in your menu bar.

### Issue: Port already in use
**Solution:** Stop the service using the port or change the port in `docker-compose.yml`:
```bash
# Find what's using the port
lsof -i :5280
lsof -i :3306

# Kill the process or change the port mapping in docker-compose.yml
```

### Issue: Build fails with "No space left on device"
**Solution:** Clean up Docker resources:
```bash
docker system prune -a
docker volume prune
```

### Issue: MySQL connection errors
**Solution:** Wait for MySQL to fully start (usually takes 10-30 seconds):
```bash
docker-compose logs -f mysql
# Wait for "ready for connections" message
```

## Useful Docker Desktop Features

1. **Dashboard**: View and manage containers, images, volumes
2. **Settings > Resources**: Adjust CPU, Memory, Disk limits
3. **Settings > Docker Engine**: Advanced configuration
4. **Troubleshoot**: Built-in diagnostic tools

## Next Steps After Deployment

1. **Check API is working:**
   ```bash
   curl http://localhost:5280/api/Course/GetAllCourses
   ```

2. **Access Swagger for API testing:**
   Open http://localhost:5280/swagger in your browser

3. **Connect frontend to Docker API:**
   Update frontend environment to point to `http://localhost:5280`

## Stop and Cleanup

### Stop services (keep data)
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
docker-compose down
```

### Stop services and remove data
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
docker-compose down -v
```

### Clean script
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
./cleanup.sh
```

## Docker Desktop System Requirements

- **macOS**: 11 or newer
- **CPU**: 2 cores minimum (4 recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 20GB free space minimum

## Getting Help

- Docker Desktop Help: Click the Docker icon > Troubleshoot
- Docker Documentation: https://docs.docker.com
- InteractiveHub Deployment: See DOCKER_DEPLOYMENT.md
