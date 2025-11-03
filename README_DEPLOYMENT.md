# 🚀 InteractiveHub Docker 部署指南

## 📋 配置總結

- **公網IP**: `61.244.130.65`
- **API端口**: `9681`
- **端口範圍**: `9680-9688` (已設置防火牆映射)
- **數據庫端口**: `3306` (本地訪問)

## ⚠️ 當前狀態

根據檢查結果，**Docker 尚未安裝**。請先完成安裝步驟。

## 📦 安裝 Docker Desktop

### 方法 1: 官網下載（推薦）

1. **訪問下載頁面**
   ```
   https://www.docker.com/products/docker-desktop
   ```

2. **選擇正確版本**
   - **Apple Silicon (M1/M2/M3/M4)**: 選擇 "Mac with Apple chip"
   - **Intel 芯片**: 選擇 "Mac with Intel chip"

3. **安裝步驟**
   - 打開下載的 `.dmg` 文件
   - 將 Docker 拖到 Applications 文件夾
   - 從 Applications 啟動 Docker Desktop
   - 等待 Docker 圖標出現在菜單欄

### 方法 2: 使用 Homebrew

```bash
# 安裝 Homebrew (如果還沒有)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 Docker Desktop
brew install --cask docker

# 啟動 Docker Desktop
open /Applications/Docker.app
```

### 驗證安裝

打開新的終端窗口，運行：
```bash
docker --version
docker-compose --version
```

應該看到類似輸出：
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

## 🚀 部署步驟

### 1. 檢查環境
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
./check-deployment.sh
```

### 2. 執行部署
```bash
./deploy.sh
```

部署腳本會自動：
- ✅ 停止舊容器
- ✅ 構建新的 Docker 鏡像
- ✅ 啟動 MySQL 數據庫
- ✅ 啟動 Web API
- ✅ 等待服務就緒

### 3. 手動部署（可選）
```bash
# 停止現有服務
docker-compose down

# 構建並啟動
docker-compose up -d --build

# 查看日誌
docker-compose logs -f
```

## 🌐 訪問服務

部署成功後：

### 本地訪問（在你的 Mac 上）
```
Web API:  http://localhost:9681
Swagger:  http://localhost:9681/swagger
```

### 公網訪問（從任何地方）
```
Web API:  http://61.244.130.65:9681
Swagger:  http://61.244.130.65:9681/swagger
```

## 🧪 測試部署

### 測試本地連接
```bash
curl http://localhost:9681/swagger
```

### 測試公網連接
```bash
curl http://61.244.130.65:9681/swagger
```

### 測試 API 端點
```bash
# 本地
curl http://localhost:9681/api/Course/GetAllCourses

# 公網
curl http://61.244.130.65:9681/api/Course/GetAllCourses
```

## 📱 前端配置

更新前端環境變量文件：

### `.env.development`
```env
NEXT_PUBLIC_API_URL=http://localhost:9681
```

### `.env.production`
```env
NEXT_PUBLIC_API_URL=http://61.244.130.65:9681
```

## 🔧 常用命令

```bash
# 查看容器狀態
docker-compose ps

# 查看日誌
docker-compose logs -f webapi
docker-compose logs -f mysql

# 重啟服務
docker-compose restart webapi

# 停止服務（保留數據）
docker-compose down

# 停止服務（刪除數據）
docker-compose down -v

# 重新構建並啟動
docker-compose up -d --build

# 進入容器
docker exec -it interactivehub-webapi /bin/bash
docker exec -it interactivehub-mysql /bin/bash

# 查看資源使用
docker stats
```

## 🐛 故障排查

### 問題 1: Docker 命令找不到
```bash
# 確認 Docker Desktop 正在運行
# 檢查菜單欄是否有 Docker 圖標

# 重新啟動 Docker Desktop
open /Applications/Docker.app

# 重新打開終端
```

### 問題 2: 端口被佔用
```bash
# 查看誰在使用端口 9681
lsof -i :9681

# 如果需要，停止佔用端口的進程
kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
```

### 問題 3: 無法從公網訪問
```bash
# 1. 確認容器正在運行
docker-compose ps

# 2. 確認端口正在監聽
lsof -i :9681

# 3. 檢查 Mac 局域網 IP
ifconfig | grep "inet "
ipconfig getifaddr en0  # WiFi
ipconfig getifaddr en1  # 以太網

# 4. 確認路由器端口映射設置
# 外部端口: 9681
# 內部 IP: <你的 Mac 局域網 IP>
# 內部端口: 9681

# 5. 檢查 macOS 防火牆
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

### 問題 4: MySQL 連接失敗
```bash
# 等待 MySQL 完全啟動（需要 10-30 秒）
docker-compose logs -f mysql

# 看到 "ready for connections" 後再測試

# 重啟 MySQL
docker-compose restart mysql
```

### 問題 5: CORS 錯誤
確認 `docker-compose.yml` 中的 CORS 配置包含你的域名：
```yaml
- CORS__AllowedOrigins=http://61.244.130.65:9681,http://localhost:3000,http://localhost:9681
```

## 📊 監控和維護

### 實時監控
```bash
# 查看所有日誌
docker-compose logs -f

# 查看資源使用
docker stats

# 查看容器詳情
docker inspect interactivehub-webapi
```

### 數據備份
```bash
# 備份數據庫
docker exec interactivehub-mysql mysqldump -u root -p1qaz3edc DevInteractiveHubDB > backup_$(date +%Y%m%d_%H%M%S).sql

# 還原數據庫
docker exec -i interactivehub-mysql mysql -u root -p1qaz3edc DevInteractiveHubDB < backup_YYYYMMDD_HHMMSS.sql
```

### 更新代碼
```bash
cd "/Users/kelchan/5241 project/groupproject-team_17"
git pull
docker-compose up -d --build webapi
```

## 🔒 安全建議

在生產環境使用前，請修改：

1. **數據庫密碼** (`docker-compose.yml`)
2. **GitHub Token** (使用環境變量)
3. **DeepSeek API Key** (使用環境變量)
4. **啟用 HTTPS** (使用 Nginx 反向代理)
5. **限制訪問** (配置防火牆規則)

## 📚 相關文檔

- `DOCKER_INSTALLATION.md` - Docker 安裝詳細指南
- `DOCKER_DEPLOYMENT.md` - Docker 部署詳細說明
- `DEPLOYMENT_CONFIG.md` - 公網部署配置說明
- `deploy.sh` - 自動部署腳本
- `cleanup.sh` - 清理腳本
- `check-deployment.sh` - 部署檢查腳本

## 📞 需要幫助？

如果遇到問題：
1. 運行 `./check-deployment.sh` 檢查狀態
2. 查看 Docker 日誌: `docker-compose logs -f`
3. 檢查文檔: `DEPLOYMENT_CONFIG.md`

## 快速開始總結

```bash
# 1. 安裝 Docker Desktop
# https://www.docker.com/products/docker-desktop

# 2. 啟動 Docker Desktop
open /Applications/Docker.app

# 3. 檢查環境
cd "/Users/kelchan/5241 project/groupproject-team_17"
./check-deployment.sh

# 4. 部署
./deploy.sh

# 5. 測試
curl http://localhost:9681/swagger
curl http://61.244.130.65:9681/swagger
```

祝部署順利！🎉
