# InteractiveHub Docker Deployment Guide

## Prerequisites
- Docker Desktop for Mac installed and running
- Docker Compose installed (comes with Docker Desktop)

## Quick Start

### 1. Build and Start All Services
```bash
# From the project root directory
docker-compose up -d
```

This will:
- Pull the MySQL 8.0 image
- Build the .NET 9.0 Web API image
- Start both containers
- Create a network for communication between services
- Set up persistent volumes for data

### 2. Check Service Status
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f webapi
docker-compose logs -f mysql
```

### 3. Access the Services
- **Web API**: http://localhost:5280
- **Swagger UI**: http://localhost:5280/swagger
- **MySQL**: localhost:3306 (accessible from host)

## Useful Commands

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes (⚠️ This will delete all data)
```bash
docker-compose down -v
```

### Rebuild Web API (after code changes)
```bash
docker-compose up -d --build webapi
```

### View Real-time Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f webapi
docker-compose logs -f mysql
```

### Access MySQL Console
```bash
docker exec -it interactivehub-mysql mysql -u root -p
# Password: 1qaz3edc
```

### Access Web API Container Shell
```bash
docker exec -it interactivehub-webapi /bin/bash
```

### Restart a Specific Service
```bash
docker-compose restart webapi
docker-compose restart mysql
```

## Database Management

### Run Migrations (if using EF Core)
```bash
# From inside the webapi container
docker exec -it interactivehub-webapi dotnet ef database update
```

### Backup Database
```bash
docker exec interactivehub-mysql mysqldump -u root -p1qaz3edc DevInteractiveHubDB > backup.sql
```

### Restore Database
```bash
docker exec -i interactivehub-mysql mysql -u root -p1qaz3edc DevInteractiveHubDB < backup.sql
```

## Troubleshooting

### Check if containers are running
```bash
docker ps
```

### Check container logs for errors
```bash
docker-compose logs webapi
```

### Restart everything
```bash
docker-compose down
docker-compose up -d
```

### Clean up and start fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## Environment Variables

You can override environment variables by creating a `.env` file in the project root:

```env
# Example .env file
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=DevInteractiveHubDB
WEBAPI_PORT=5280
MYSQL_PORT=3306
```

## Production Considerations

For production deployment, consider:
1. Change default passwords in `docker-compose.yml`
2. Use environment variables or secrets management
3. Enable HTTPS/SSL
4. Set up proper logging and monitoring
5. Configure backups for the database
6. Use production-grade configuration in `appsettings.Production.json`
7. Review security settings in `Auth0` and `GitHub` tokens

## Notes

- The MySQL data is persisted in a Docker volume named `mysql-data`
- Web API logs are persisted in a Docker volume named `webapi-logs`
- Both services are connected via a custom Docker network `interactivehub-network`
- The Web API waits for MySQL to be healthy before starting
