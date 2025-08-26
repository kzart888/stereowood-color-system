# 部署指南

叠雕画颜色管理系统的快速部署指南。

## 1. 云服务器部署（Vultr Ubuntu）

### 服务器准备
```bash
# 创建用户并安装Docker
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
newgrp docker

# 配置防火墙
sudo ufw allow 9099
sudo ufw allow ssh
sudo ufw enable
```

### 首次部署
```bash
# 克隆项目
git clone https://github.com/kzart888/stereowood-color-system.git stereowood
cd stereowood

# 创建数据目录
mkdir -p ~/data ~/uploads

# 构建并运行
VERSION=$(date +%Y%m%d-%H%M)
docker build --no-cache -t stereowood-color-system:${VERSION} .
docker run -d --name stereowood-test \
  -p 9099:9099 \
  -e PORT=9099 \
  -e DB_FILE=/data/color_management.db \
  -e TZ=Asia/Shanghai \
  -e NODE_ENV=production \
  -v ~/data:/data \
  -v ~/uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:${VERSION}

# 验证部署
docker ps | grep stereowood
curl http://localhost:9099/
```

## 2. 重新部署（修复bug后）

```bash
ssh deploy@服务器IP

# 使用自动化脚本（推荐）
~/redeploy.sh

# 或者手动执行
cd ~/stereowood
git fetch origin
git reset --hard origin/main
docker stop stereowood-test && docker rm stereowood-test
VERSION=$(date +%Y%m%d-%H%M)
docker build --no-cache -t stereowood-color-system:${VERSION} .
docker run -d --name stereowood-test \
  -p 9099:9099 \
  -e PORT=9099 \
  -e DB_FILE=/data/color_management.db \
  -e TZ=Asia/Shanghai \
  -e NODE_ENV=production \
  -v ~/data:/data \
  -v ~/uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:${VERSION}
```

### 自动化脚本
```bash
# 创建重新部署脚本
cat > ~/redeploy.sh << 'EOF'
#!/bin/bash
set -e
cd ~/stereowood
docker stop stereowood-test && docker rm stereowood-test
git fetch origin && git reset --hard origin/main
VERSION=$(date +%Y%m%d-%H%M)
docker build --no-cache -t stereowood-color-system:${VERSION} .
docker run -d --name stereowood-test \
  -p 9099:9099 \
  -e PORT=9099 -e DB_FILE=/data/color_management.db \
  -e TZ=Asia/Shanghai -e NODE_ENV=production \
  -v ~/data:/data -v ~/uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:${VERSION}
echo "部署完成，访问: http://$(curl -s ifconfig.me):9099"
EOF
chmod +x ~/redeploy.sh
```

## 3. 群辉NAS部署

### 准备镜像
```bash
# 在有Docker的机器上构建镜像
git clone https://github.com/kzart888/stereowood-color-system.git
cd stereowood-color-system
docker build -t stereowood-color-system:latest .
docker save stereowood-color-system:latest | gzip > stereowood.tar.gz
```

### 群辉部署
1. **上传镜像**: 通过File Station上传 `stereowood.tar.gz`
2. **导入镜像**: Container Manager → 映像 → 新增 → 从文件添加
3. **创建容器**: 
   - 端口设置: `9099:9099`
   - 卷设置: 
     - `/volume1/docker/stereowood/data` → `/data`
     - `/volume1/docker/stereowood/uploads` → `/app/backend/uploads`
   - 环境变量:
     ```
     PORT=9099
     DB_FILE=/data/color_management.db
     TZ=Asia/Shanghai
     NODE_ENV=production
     ```
4. **启动容器**: 访问 `http://群辉IP:9099`

## 故障排除

```bash
# 查看日志
docker logs stereowood-test

# 强制删除容器
docker rm -f stereowood-test

# 检查端口占用
sudo netstat -tlnp | grep 9099

# 清理Docker缓存
docker system prune -a -f
```
