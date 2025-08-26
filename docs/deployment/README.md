# 部署文档

本目录包含 STEREOWOOD Color System 的完整部署指南和相关文档。

## 📋 文档索引

### 🚀 部署指南
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 完整的部署指南
  - 本地开发部署
  - Docker 容器化部署  
  - 云服务器部署（Ubuntu/CentOS）
  - 群辉 NAS 部署
  - 故障排除指南

## 🎯 快速导航

### 适合不同用户的部署方案

| 用户类型 | 推荐方案 | 文档链接 |
|---------|---------|----------|
| 🧑‍💻 **开发者** | 本地开发部署 | [本地部署](DEPLOYMENT.md#本地开发) |
| 🏢 **企业用户** | Docker 生产环境 | [Docker部署](DEPLOYMENT.md#docker部署) |
| ☁️ **云服务器** | Ubuntu + Docker | [云服务器部署](DEPLOYMENT.md#云服务器部署) |
| 🏠 **个人用户** | 群辉NAS | [群辉部署](DEPLOYMENT.md#群辉nas部署) |

### 常见问题

- **端口占用问题**: 默认使用 9099 端口
- **数据持久化**: 需要挂载 `/data` 和 `/app/backend/uploads` 卷
- **环境变量配置**: 参考 [DEPLOYMENT.md](DEPLOYMENT.md) 中的环境变量说明

## 🔧 部署前准备

### 系统要求
- **Docker**: ≥ 20.0.0（推荐）
- **Node.js**: ≥ 18.0.0（本地开发）
- **内存**: ≥ 512MB
- **存储**: ≥ 1GB 可用空间

### 网络要求
- 确保 9099 端口未被占用
- 如需外网访问，配置防火墙规则

## 📝 贡献说明

如果您在部署过程中遇到问题或有改进建议：

1. 查阅 [故障排除](DEPLOYMENT.md#故障排除) 部分
2. 搜索已有的 [Issues](https://github.com/kzart888/stereowood-color-system/issues)
3. 提交新的 Issue 或 Pull Request

---

**返回**: [📚 主文档](../../README.md) | **下一步**: [🛠️ 开发文档](../development/)