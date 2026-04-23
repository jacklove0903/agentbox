# AgentBox 服务器部署指南

> 目标：CentOS + Docker，公网 IP 118.31.71.208

## 架构

```
Browser → :80 Nginx → Frontend (Next.js :3000)
                    → Backend  (Spring Boot :8080) → PostgreSQL :5432
```

## 部署步骤

### 1. 服务器安装 Docker Compose

```bash
# 如果还没有 docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 2. 克隆代码到服务器

```bash
cd /opt
git clone https://github.com/jacklove0903/agentbox.git
cd agentbox
```

### 3. 创建环境变量文件

```bash
cat > .env.production << 'EOF'
DB_NAME=agentbox
DB_USERNAME=postgres
DB_PASSWORD=你的数据库密码

SILICONFLOW_API_KEY=你的硅基流动API_KEY

JWT_SECRET=随机生成的至少32位字符串
EOF
```

> 生成随机 JWT_SECRET：`openssl rand -base64 48`

### 4. 一键启动

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

首次构建需要 5~10 分钟（下载依赖、编译后端、构建前端）。

### 5. 初始化数据库

等 PostgreSQL 启动后执行迁移脚本：

```bash
# 逐个执行
docker exec -i agentbox-db psql -U postgres -d agentbox < schema.sql
docker exec -i agentbox-db psql -U postgres -d agentbox < migration_v2_models.sql
docker exec -i agentbox-db psql -U postgres -d agentbox < migration_v3_users.sql
docker exec -i agentbox-db psql -U postgres -d agentbox < migration_v4_siliconflow.sql
docker exec -i agentbox-db psql -U postgres -d agentbox < migration_v5_image_generations.sql
docker exec -i agentbox-db psql -U postgres -d agentbox < migration_v6_conversations.sql
docker exec -i agentbox-db psql -U postgres -d agentbox < migration_v7_model_votes.sql
```

### 6. 访问

浏览器打开 http://118.31.71.208 ，注册账号即可使用。

---

## 常用命令

```bash
# 查看运行状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# 重启某个服务
docker-compose -f docker-compose.prod.yml restart backend

# 停止所有
docker-compose -f docker-compose.prod.yml down

# 重新构建并启动（代码更新后）
git pull
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 防火墙

确保服务器 80 端口对外开放：

```bash
# CentOS firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# 或阿里云安全组放行 80 端口
```

## 备份数据库

```bash
docker exec agentbox-db pg_dump -U postgres agentbox > backup_$(date +%Y%m%d).sql
```
