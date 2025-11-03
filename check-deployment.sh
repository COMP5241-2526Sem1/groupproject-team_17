#!/bin/bash

echo "🔍 檢查 Docker 安裝狀態..."
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker 已安裝"
    docker --version
    docker-compose --version
    echo ""

    # Check if Docker is running
    if docker info &> /dev/null; then
        echo "✅ Docker 正在運行"
        echo ""

        # Check containers
        echo "📦 檢查容器狀態:"
        docker-compose ps
        echo ""

        # Check if port 9681 is listening
        echo "🔌 檢查端口 9681:"
        if lsof -i :9681 &> /dev/null; then
            echo "✅ 端口 9681 正在監聽"
            lsof -i :9681
        else
            echo "❌ 端口 9681 未在監聽"
        fi
        echo ""

        # Test local connection
        echo "🌐 測試本地連接:"
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:9681/swagger > /tmp/curl_result 2>&1; then
            status_code=$(cat /tmp/curl_result)
            if [ "$status_code" = "200" ] || [ "$status_code" = "301" ] || [ "$status_code" = "302" ]; then
                echo "✅ 本地訪問成功 (HTTP $status_code)"
                echo "   http://localhost:9681/swagger"
            else
                echo "⚠️  本地訪問返回 HTTP $status_code"
            fi
        else
            echo "❌ 本地訪問失敗"
        fi
        echo ""

        # Get Mac IP addresses
        echo "🖥️  Mac 網絡地址:"
        echo "本地回環: 127.0.0.1"
        wifi_ip=$(ipconfig getifaddr en0 2>/dev/null)
        if [ -n "$wifi_ip" ]; then
            echo "WiFi (en0): $wifi_ip"
        fi
        ethernet_ip=$(ipconfig getifaddr en1 2>/dev/null)
        if [ -n "$ethernet_ip" ]; then
            echo "以太網 (en1): $ethernet_ip"
        fi
        echo "公網 IP: 61.244.130.65"
        echo ""

        echo "📋 部署信息總結:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "本地訪問:"
        echo "  • Web API:  http://localhost:9681"
        echo "  • Swagger:  http://localhost:9681/swagger"
        echo ""
        echo "公網訪問:"
        echo "  • Web API:  http://61.244.130.65:9681"
        echo "  • Swagger:  http://61.244.130.65:9681/swagger"
        echo ""
        echo "前端配置:"
        echo "  • API URL:  http://61.244.130.65:9681"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    else
        echo "❌ Docker 未運行"
        echo "請啟動 Docker Desktop: open /Applications/Docker.app"
    fi
else
    echo "❌ Docker 未安裝"
    echo ""
    echo "📥 請安裝 Docker Desktop:"
    echo "1. 訪問: https://www.docker.com/products/docker-desktop"
    echo "2. 下載並安裝適合你的 Mac 版本"
    echo "3. 啟動 Docker Desktop"
    echo "4. 重新運行此腳本"
    echo ""
    echo "或使用 Homebrew 安裝:"
    echo "brew install --cask docker"
fi
