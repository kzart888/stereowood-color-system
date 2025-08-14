# 部署指南

本文档详细说明如何将叠雕画颜色管理系统部署到不同环境。

## 目录

- [本地开发环境部署](#本地开发环境部署)
- [云服务器部署（Ubuntu）](#云服务器部署ubuntu)
- [群辉NAS部署](#群辉nas部署)
- [Docker部署选项](#docker部署选项)
- [故障排除](#故障排除)

## 本地开发环境部署

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- Git

### 步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/kzart888/stereowood-color-system.git
   cd stereowood-color-system
   ```

2. **安装依赖**
   ```bash
   cd backend
   npm install
   ```

3. **启动后端服务**
   ```bash
   npm start
   # 或
   node server.js
   ```

4. **访问应用**
   - 浏览器访问：`http://localhost:9099`
   - 后端API：`http://localhost:9099/api`

### 配置说明
- 端口：9099（可通过环境变量 `PORT` 修改）
- 数据库：SQLite，自动创建在 `backend/color_management.db`
- 上传目录：`backend/uploads/`

## 云服务器部署（Ubuntu）

### 服务器准备

1. **创建部署用户**
   ```bash
   sudo adduser deploy
   sudo usermod -aG sudo deploy
   su - deploy
   ```

2. **安装Docker**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 安装Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker deploy
   newgrp docker
   
   # 验证安装
   docker --version
   ```

3. **配置防火墙**
   ```bash
   sudo ufw allow 9099
   sudo ufw allow ssh
   sudo ufw enable
   ```

### 部署流程

1. **拉取源码**
   ```bash
   git clone https://github.com/kzart888/stereowood-color-system.git stereowood
   cd stereowood
   ```

2. **构建Docker镜像**
   ```bash
   export VERSION=0.6.4  # 替换为当前版本
   docker build --no-cache -t stereowood-color-system:${VERSION} .
   ```

3. **创建数据目录**
   ```bash
   mkdir -p ~/data ~/uploads
   ```

4. **运行容器**
   ```bash
   docker run -d --name stereowood \
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

5. **验证部署**
   ```bash
   # 检查容器状态
   docker ps
   
   # 查看日志
   docker logs stereowood
   
   # 测试API
   curl http://localhost:9099/api/categories
   ```

6. **访问应用**
   - 浏览器访问：`http://服务器IP:9099`

### 更新部署

#### 快速重新部署（修复bug后）

当您在本地修复了bug并需要重新部署到服务器时，请按以下步骤操作：

1. **连接到服务器并检查环境**
   ```bash
   ssh deploy@服务器IP
   
   # 检查当前目录
   pwd
   
   # 检查是否存在项目目录
   ls -la ~/stereowood
   
   # 如果目录存在，进入项目目录
   cd ~/stereowood
   
   # 验证是否为git仓库
   if [ -d ".git" ]; then
     echo "✅ Git仓库存在"
     git status
   else
     echo "❌ 不是Git仓库，需要重新克隆"
   fi
   ```

2. **停止并删除旧容器**
   ```bash
   # 停止正在运行的容器
   docker stop stereowood-test
   
   # 删除旧容器（保留数据）
   docker rm stereowood-test
   
   # 确认容器已删除
   docker ps -a | grep stereowood
   ```

3. **拉取最新代码**
   ```bash
   # 确认当前在项目目录中
   pwd
   ls -la
   
   # 如果不在项目目录，切换到正确目录
   cd ~/stereowood
   
   # 验证是否为git仓库
   git status
   
   # 检查是否有本地修改冲突
   if git status | grep -q "modified:"; then
     echo "⚠️  检测到本地有修改，将强制覆盖为GitHub最新版本"
     
     # 丢弃所有本地修改，强制使用远程最新代码
     git fetch origin
     git reset --hard origin/main
     git clean -fd  # 删除未跟踪的文件
     
     echo "✅ 已强制更新到GitHub最新版本"
   else
     # 没有冲突，正常拉取
     git pull origin main
   fi
   
   # 确认代码已更新
   git log --oneline -5
   ```

   **如果遇到merge冲突或想要强制覆盖服务器代码：**
   ```bash
   # 方法1：强制重置到远程最新版本（推荐）
   git fetch origin
   git reset --hard origin/main
   git clean -fd
   
   # 方法2：如果上面不行，删除重新克隆
   cd ~
   rm -rf ~/stereowood
   git clone https://github.com/kzart888/stereowood-color-system.git ~/stereowood
   cd ~/stereowood
   ```

4. **清理旧镜像（可选但推荐）**
   ```bash
   # 查看现有镜像
   docker images | grep stereowood
   
   # 删除旧镜像以节省空间
   docker rmi stereowood-color-system:旧版本号
   ```

5. **重新构建镜像**
   ```bash
   # 设置新版本号
   export VERSION=$(date +%Y%m%d-%H%M)  # 或使用 0.6.5 等版本号
   
   # 清理构建缓存并重新构建
   docker build --no-cache -t stereowood-color-system:${VERSION} .
   
   # 验证镜像构建成功
   docker images | grep stereowood
   ```

6. **启动新容器**
   ```bash
   # 使用相同的数据卷重新启动
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

7. **验证部署成功**
   ```bash
   # 检查容器状态
   docker ps | grep stereowood
   
   # 查看启动日志
   docker logs -f stereowood-test
   
   # 测试健康检查
   curl http://localhost:9099/
   
   # 测试API接口
   curl http://localhost:9099/api/categories
   ```

8. **验证bug修复**
   ```bash
   # 在浏览器中访问应用
   echo "请在浏览器中访问 http://服务器IP:9099"
   echo "验证修复的功能是否正常工作"
   ```

#### 完整版本升级流程

1. **备份当前数据**
   ```bash
   # 备份数据库
   cp ~/data/color_management.db ~/data/color_management.db.backup.$(date +%Y%m%d)
   
   # 备份上传文件
   tar -czf ~/uploads_backup_$(date +%Y%m%d).tar.gz ~/uploads/
   ```

2. **拉取最新代码**
   ```bash
   cd ~/stereowood
   git pull origin main
   ```

3. **重建并部署**
   ```bash
   docker stop stereowood && docker rm stereowood
   export VERSION=新版本号
   docker build --no-cache -t stereowood-color-system:${VERSION} .
   # 重新运行容器命令（同上）
   ```

## 群辉NAS部署

### 前置要求
- 群辉NAS DSM 7.0+
- 安装 Container Manager 套件

### 准备镜像

#### 方法一：从云服务器导出
```bash
# 在云服务器上导出镜像
docker save stereowood-color-system:0.6.4 | gzip -9 > ~/stereowood-0.6.4.tar.gz

# 下载到本地
scp deploy@服务器IP:~/stereowood-0.6.4.tar.gz .
```

#### 方法二：本地构建
```bash
# 在本地有Docker环境的机器上
git clone https://github.com/kzart888/stereowood-color-system.git
cd stereowood-color-system
docker build -t stereowood-color-system:0.6.4 .
docker save stereowood-color-system:0.6.4 | gzip -9 > stereowood-0.6.4.tar.gz
```

### 群辉部署步骤

1. **上传镜像文件**
   - 通过File Station将 `stereowood-0.6.4.tar.gz` 上传到群辉

2. **导入Docker镜像**
   - 打开Container Manager
   - 点击"映像" -> "新增" -> "从文件添加"
   - 选择上传的tar.gz文件导入

3. **创建容器**
   - 选择导入的镜像，点击"启动"
   - 配置如下：

   **常规设置**
   - 容器名称：`stereowood-color-system`
   - 执行命令：保持默认

   **端口设置**
   - 容器端口：9099
   - 本机端口：9099（或其他可用端口）

   **卷设置**
   ```
   本机路径                          -> 装载路径
   /volume1/docker/stereowood/data   -> /data
   /volume1/docker/stereowood/uploads -> /app/backend/uploads
   ```

   **环境变量**
   ```
   PORT=9099
   DB_FILE=/data/color_management.db
   TZ=Asia/Shanghai
   NODE_ENV=production
   ```

4. **启动容器**
   - 点击"应用"创建并启动容器

5. **访问应用**
   - 浏览器访问：`http://群辉IP:9099`

### 数据备份与恢复

**备份**
```bash
# 复制以下目录
/volume1/docker/stereowood/data/     # 数据库文件
/volume1/docker/stereowood/uploads/  # 上传的图片
```

**恢复**
- 将备份文件复制回对应目录
- 重启容器

## Docker部署选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 9099 | 服务端口 |
| DB_FILE | /data/color_management.db | 数据库文件路径 |
| NODE_ENV | production | 运行环境 |
| TZ | Asia/Shanghai | 时区 |

### 卷挂载

| 容器路径 | 说明 | 推荐本机路径 |
|----------|------|-------------|
| /data | 数据库存储 | ~/data 或 /volume1/docker/stereowood/data |
| /app/backend/uploads | 上传文件存储 | ~/uploads 或 /volume1/docker/stereowood/uploads |

### 健康检查

容器内置健康检查，每30秒检查一次服务状态：
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9099/ || exit 1
```

## 故障排除

### 重新部署故障排除

1. **Git冲突和本地修改问题**
   ```bash
   # 遇到 "Your local changes would be overwritten by merge" 错误
   cd ~/stereowood
   
   # 查看冲突文件
   git status
   
   # 强制丢弃所有本地修改，使用GitHub最新代码
   git fetch origin
   git reset --hard origin/main
   git clean -fd
   
   # 验证已更新到最新版本
   git log --oneline -3
   ```

2. **容器名称冲突**
   ```bash
   # 如果提示容器名已存在
   docker ps -a | grep stereowood
   docker rm -f stereowood-test  # 强制删除
   ```

2. **端口被占用**
   ```bash
   # 检查端口占用情况
   sudo netstat -tlnp | grep 9099
   
   # 如果需要杀死占用进程
   sudo kill -9 $(sudo lsof -t -i:9099)
   ```

3. **数据库初始化顺序问题**
   ```bash
   # 如果看到 "no such table: color_categories" 错误
   # 这是因为数据库表还未完全创建完成
   
   # 查看容器日志确认问题
   docker logs stereowood-test
   
   # 解决方案：重新部署最新版本（已修复此问题）
   cd ~/stereowood
   git pull origin main  # 或使用强制更新命令
   docker stop stereowood-test && docker rm stereowood-test
   docker build --no-cache -t stereowood-color-system:latest .
   # 重新启动容器...
   ```

4. **镜像构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a -f
   
   # 检查磁盘空间
   df -h
   
   # 重新构建
   docker build --no-cache -t stereowood-color-system:latest .
   ```

5. **数据丢失问题**
   ```bash
   # 检查数据卷是否正确挂载
   docker inspect stereowood-test | grep -A 10 "Mounts"
   
   # 确认数据文件存在
   ls -la ~/data/color_management.db
   ls -la ~/uploads/
   ```

5. **服务无响应**
   ```bash
   # 检查容器内部状态
   docker exec -it stereowood-test ps aux
   
   # 检查端口监听
   docker exec -it stereowood-test netstat -tlnp
   
   # 重启容器
   docker restart stereowood-test
   ```

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep 9099
   # 或使用其他端口
   docker run -p 8080:9099 ...
   ```

2. **容器启动失败**
   ```bash
   # 查看日志
   docker logs 容器名
   
   # 进入容器调试
   docker exec -it 容器名 sh
   ```

3. **数据库权限问题**
   ```bash
   # 检查卷挂载权限
   ls -la ~/data
   sudo chown -R 1000:1000 ~/data
   ```

4. **图片无法显示**
   - 检查uploads目录权限
   - 确认卷挂载正确
   - 查看浏览器开发者工具网络请求

5. **浏览器控制台警告（aria-hidden）**
   - 如果看到关于 `aria-hidden on <body>` 的警告
   - 这通常是浏览器扩展（如书签管理器）引起的
   - 不影响应用功能，可以安全忽略
   - 或尝试在无痕模式下访问应用

### 日志查看

```bash
# Docker日志
docker logs -f stereowood

# 容器内应用日志
docker exec stereowood tail -f /var/log/app.log
```

### 性能监控

```bash
# 容器资源使用
docker stats stereowood

# 系统资源
htop
df -h
```

## 安全建议

1. **使用HTTPS**
   - 建议在生产环境使用Nginx反向代理配置SSL

2. **防火墙配置**
   ```bash
   # 仅开放必要端口
   sudo ufw allow 9099
   sudo ufw deny 3000  # 确保旧端口被禁用
   ```

3. **定期备份**
   - 设置定时任务备份数据库和上传文件
   - 验证备份文件完整性

4. **更新维护**
   - 定期更新系统和Docker
   - 关注项目更新，及时升级

## 版本管理

### 版本号约定
- 主版本号.次版本号.修订号（如：0.6.4）
- 主版本号：重大架构变更
- 次版本号：新功能添加
- 修订号：bug修复和小改进

### 升级流程

#### 开发环境到生产环境的完整流程

1. **本地开发完成**
   ```bash
   # 在本地测试通过后
   git add .
   git commit -m "fix: 修复XXX问题"
   git push origin main
   ```

2. **服务器端更新部署**
   ```bash
   # SSH连接到服务器
   ssh deploy@服务器IP
   
   # 切换到项目目录
   cd ~/stereowood
   
   # 执行快速重新部署流程
   ./scripts/redeploy.sh  # 或手动执行上述步骤
   ```

3. **创建重新部署脚本（推荐）**
   ```bash
   # 在服务器上创建重新部署脚本
   cat > ~/redeploy.sh << 'EOF'
   #!/bin/bash
   set -e
   
   echo "=== 开始重新部署 Stereowood 颜色管理系统 ==="
   
   # 记录开始时间
   START_TIME=$(date)
   
   # 0. 检查并准备项目目录
   echo "检查项目目录..."
   if [ ! -d "~/stereowood" ] || [ ! -d "~/stereowood/.git" ]; then
     echo "项目目录不存在或不是Git仓库，重新克隆..."
     rm -rf ~/stereowood
     git clone https://github.com/kzart888/stereowood-color-system.git ~/stereowood
   fi
   
   cd ~/stereowood
   
   # 1. 停止并删除旧容器
   echo "停止旧容器..."
   docker stop stereowood-test || true
   docker rm stereowood-test || true
   
   # 2. 拉取最新代码
   echo "拉取最新代码..."
   git fetch origin
   git reset --hard origin/main  # 强制更新到最新版本，丢弃本地修改
   git clean -fd  # 清理未跟踪的文件
   
   # 3. 构建新镜像
   echo "构建新镜像..."
   VERSION=$(date +%Y%m%d-%H%M)
   docker build --no-cache -t stereowood-color-system:${VERSION} .
   
   # 4. 启动新容器
   echo "启动新容器..."
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
   
   # 5. 等待服务启动
   echo "等待服务启动..."
   sleep 10
   
   # 6. 健康检查
   echo "执行健康检查..."
   for i in {1..10}; do
     if curl -f http://localhost:9099/ > /dev/null 2>&1; then
       echo "✅ 服务启动成功！"
       break
     fi
     if [ $i -eq 10 ]; then
       echo "❌ 服务启动失败，请查看日志"
       docker logs stereowood-test
       exit 1
     fi
     echo "等待服务启动... ($i/10)"
     sleep 5
   done
   
   # 7. 清理旧镜像（保留最近3个）
   echo "清理旧镜像..."
   docker images stereowood-color-system --format "table {{.Tag}}\t{{.CreatedAt}}" | tail -n +2 | sort -k2 -r | tail -n +4 | awk '{print $1}' | xargs -r -I {} docker rmi stereowood-color-system:{} || true
   
   END_TIME=$(date)
   echo "=== 重新部署完成 ==="
   echo "开始时间: $START_TIME"
   echo "结束时间: $END_TIME"
   echo "访问地址: http://$(curl -s ifconfig.me):9099"
   EOF
   
   # 设置执行权限
   chmod +x ~/redeploy.sh
   ```

4. **使用重新部署脚本**
   ```bash
   # 执行重新部署脚本
   ~/redeploy.sh
   
   # 或者如果您更喜欢手动步骤，可以按照上面的详细流程操作
   ```

#### 回滚机制

万一新版本有问题，可以快速回滚：

```bash
# 1. 停止问题版本
docker stop stereowood-test
docker rm stereowood-test

# 2. 启动之前的稳定版本
docker run -d --name stereowood-test \
  -p 9099:9099 \
  -e PORT=9099 \
  -e DB_FILE=/data/color_management.db \
  -e TZ=Asia/Shanghai \
  -e NODE_ENV=production \
  -v ~/data:/data \
  -v ~/uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:稳定版本号

# 3. 验证回滚成功
curl http://localhost:9099/
```
