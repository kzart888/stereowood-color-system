# 🚀 Quick Deployment Reference Card

## Setup Checklist (One-time)

### GitHub Secrets
```
DOCKER_HUB_USERNAME: your-username
DOCKER_HUB_TOKEN: your-token
```

### Docker Hub
- Repository: `yourusername/stereowood-color-system`

## 🔄 Update Workflow (Every Update)

### 1. Developer Side (Your Computer)
```bash
# Make changes
git add .
git commit -m "Update: description"
git push origin main
```

### 2. Wait 5-10 minutes
- GitHub Actions builds automatically
- Check: https://github.com/yourusername/repo/actions

### 3. Synology Side (Factory)
1. Open **Container Manager**
2. **Registry** → Search your image → **Download**
3. **Container** → Stop → Clear
4. **Image** → Run (with same settings)

## 📁 Synology Folder Structure
```
/docker/stereowood/
├── data/         # Database
├── uploads/      # Images
└── backups/      # Backups
```

## ⚙️ Container Settings

### Volumes
| Container | Synology |
|-----------|----------|
| /data | /docker/stereowood/data |
| /app/uploads | /docker/stereowood/uploads |
| /app/backups | /docker/stereowood/backups |

### Environment
```
TZ=Asia/Shanghai
PORT=9099
NODE_ENV=production
```

### Port
- Local: 9099
- Container: 9099

## 🌐 Access URLs

### Direct Access
```
http://synology-ip:9099
```

### Via DDNS + Reverse Proxy
```
https://your-ddns.synology.me/stereowood
```

## 🔍 Troubleshooting

### Container won't start?
```bash
# Check logs in Container Manager
Container → Details → Log
```

### Can't access?
1. Check container is running
2. Check port 9099 
3. Check Reverse Proxy settings

### Database issues?
1. Stop container
2. Copy backup from /docker/stereowood/backups
3. Restart container

## 📞 Emergency Contacts

- GitHub Actions: Check build status
- Docker Hub: Verify image updated
- Synology: Container Manager logs

## 🎯 Golden Rules

1. **Always backup before update**
2. **Test locally first**
3. **Keep Docker Hub credentials safe**
4. **Document any custom changes**

---
*Print this page and keep near the Synology server*