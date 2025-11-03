# InteractiveHub 公網部署配置

## 網絡配置信息

- **公網IP**: 61.244.130.65
- **端口映射**: 9680-9688 已在防火牆設置
- **API端口**: 9681
- **MySQL端口**: 3306 (本地訪問)

## 部署步驟

### 1. 確認Docker已安裝並運行

如果還沒有安裝Docker，請參考 `DOCKER_INSTALLATION.md` 文件。

檢查Docker狀態：
```bash
docker --version
docker-compose --version
```

如果看到 "command not found"，請先安裝Docker Desktop。

### 2. 部署到Docker

```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
./deploy.sh
```

或者手動部署：
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
docker-compose down
docker-compose up -d --build
docker-compose logs -f
```

### 3. 訪問服務

部署完成後，可以通過以下方式訪問：

#### 本地訪問（在Mac上）
- **Web API**: http://localhost:9681
- **Swagger UI**: http://localhost:9681/swagger
- **健康檢查**: http://localhost:9681/health

#### 公網訪問（從外部）
- **Web API**: http://61.244.130.65:9681
- **Swagger UI**: http://61.244.130.65:9681/swagger
- **健康檢查**: http://61.244.130.65:9681/health

### 4. 測試API連接

```bash
# 本地測試
curl http://localhost:9681/api/Course/GetAllCourses

# 公網測試
curl http://61.244.130.65:9681/api/Course/GetAllCourses
```

## 前端配置

更新前端的API端點配置：

### 開發環境 (frontend/web-app/.env.development)
```env
NEXT_PUBLIC_API_URL=http://localhost:9681
```

### 生產環境 (frontend/web-app/.env.production)
```env
NEXT_PUBLIC_API_URL=http://61.244.130.65:9681
```

## Auth0 配置更新

由於API端點改變，需要更新Auth0設置：

1. 登錄 Auth0 Dashboard: https://manage.auth0.com
2. 進入你的應用設置
3. 更新以下配置：
   - **Allowed Callback URLs**: 添加 `http://61.244.130.65:9681/callback`
   - **Allowed Logout URLs**: 添加 `http://61.244.130.65:9681`
   - **Allowed Web Origins**: 添加 `http://61.244.130.65:9681`
   - **API Identifier (Audience)**: 更新為 `http://61.244.130.65:9681`

## 防火牆配置確認

確保以下端口已開放：

- **9681**: Web API 端口（必須）
- **9680-9688**: 預留端口範圍

### macOS 本地防火牆
```bash
# 檢查防火牆狀態
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 如果防火牆開啟，添加Docker例外
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Docker.app
```

### 路由器端口映射
確認路由器已設置端口映射：
- 外部端口: 9681
- 內部IP: Mac的局域網IP
- 內部端口: 9681

## 監控和日誌

### 查看實時日誌
```bash
# 所有服務
docker-compose logs -f

# 只看Web API
docker-compose logs -f webapi

# 只看MySQL
docker-compose logs -f mysql
```

### 檢查容器狀態
```bash
docker-compose ps
```

### 查看資源使用
```bash
docker stats
```

## 故障排查

### 問題：無法從公網訪問
```bash
# 1. 檢查Docker容器是否運行
docker-compose ps

# 2. 檢查端口是否監聽
netstat -an | grep 9681
# 或
lsof -i :9681

# 3. 測試本地連接
curl http://localhost:9681/swagger

# 4. 檢查防火牆
sudo pfctl -s rules | grep 9681
```

### 問題：API返回CORS錯誤
檢查 `docker-compose.yml` 中的 CORS 配置：
```yaml
- CORS__AllowedOrigins=http://61.244.130.65:9681,http://localhost:3000,http://localhost:9681
```

### 問題：MySQL連接失敗
```bash
# 等待MySQL完全啟動
docker-compose logs -f mysql
# 看到 "ready for connections" 消息後再測試

# 重啟MySQL
docker-compose restart mysql
```

## 數據管理

### 備份數據庫
```bash
docker exec interactivehub-mysql mysqldump -u root -p1qaz3edc DevInteractiveHubDB > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 還原數據庫
```bash
docker exec -i interactivehub-mysql mysql -u root -p1qaz3edc DevInteractiveHubDB < backup_YYYYMMDD_HHMMSS.sql
```

### 清理舊數據重新開始
```bash
docker-compose down -v
docker-compose up -d --build
```

## 安全建議

### 生產環境部署前必須修改：

1. **數據庫密碼**
   在 `docker-compose.yml` 中修改：
   ```yaml
   MYSQL_ROOT_PASSWORD: 你的強密碼
   ```

2. **GitHub Token**
   使用環境變量或密鑰管理服務

3. **DeepSeek API Key**
   不要將密鑰提交到Git

4. **啟用HTTPS**
   使用反向代理（如Nginx）配置SSL證書

5. **限制訪問**
   配置防火牆規則，只允許必要的IP訪問

## 性能優化

### Docker資源限制
在 `docker-compose.yml` 中添加：
```yaml
webapi:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### MySQL優化
```yaml
mysql:
  command: --default-authentication-plugin=mysql_native_password --max_connections=500
```

## 更新部署

當代碼更新後：
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
git pull
docker-compose up -d --build webapi
```

## 停止服務

```bash
# 停止但保留數據
docker-compose down

# 停止並刪除所有數據
docker-compose down -v

# 使用清理腳本
./cleanup.sh
```

## 常用命令速查

```bash
# 啟動服務
docker-compose up -d

# 重啟Web API
docker-compose restart webapi

# 查看日誌
docker-compose logs -f webapi

# 進入容器
docker exec -it interactivehub-webapi /bin/bash

# 查看網絡
docker network inspect groupproject-team_17_interactivehub-network

# 查看卷
docker volume ls
```

## 獲取Mac局域網IP地址

```bash
# 查看所有網絡接口
ifconfig | grep "inet "

# 或者使用
ipconfig getifaddr en0  # WiFi
ipconfig getifaddr en1  # 以太網
```

## 技術支援

如遇問題，請查看：
1. Docker容器日誌: `docker-compose logs -f`
2. Mac系統日誌: Console.app
3. 防火牆設置: 系統偏好設置 > 安全性與隱私 > 防火牆

## 快速部署總結

```bash
# 1. 安裝Docker Desktop（如果未安裝）
# 下載: https://www.docker.com/products/docker-desktop

# 2. 啟動Docker Desktop
open /Applications/Docker.app

# 3. 部署
cd "/Users/kelchan/5241 project/groupproject-team_17"
./deploy.sh

# 4. 測試
curl http://localhost:9681/swagger
curl http://61.244.130.65:9681/swagger

# 5. 查看日誌
docker-compose logs -f webapi
```
