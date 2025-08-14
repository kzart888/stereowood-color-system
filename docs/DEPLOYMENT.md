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

1. **拉取最新代码**
   ```bash
   cd ~/stereowood
   git pull origin main
   ```

2. **重建并部署**
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
1. 备份当前数据
2. 拉取最新代码
3. 构建新镜像
4. 停止旧容器
5. 启动新容器
6. 验证功能
7. 删除旧镜像（可选）
