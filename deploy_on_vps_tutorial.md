# 在 VPS 上部署（Node.js）

本文档指导你如何将 cf-proxy-ex 部署到自己的 VPS 上，而非 Cloudflare Workers。
你只需一个 VPS、一个托管在 Cloudflare 的域名，以及 Node.js 20+。

---

## 原理

```
用户 → Cloudflare CDN (HTTPS) → 你的 VPS (HTTP:3000) → 目标网站
```

Cloudflare 负责 HTTPS 加密和 CDN 加速，VPS 只运行 HTTP 服务。这样你无需在 VPS 上配置 SSL 证书，且 Cloudflare 会隐藏你的真实 IP。

---

## 前置条件

| 项目 | 说明 |
|------|------|
| VPS | 任意 Linux 服务器（Ubuntu/Debian/CentOS），有公网 IP |
| Node.js | **≥ 20.0.0**（推荐 22 LTS） |
| 域名 | 托管在 Cloudflare 的域名 |
| Git | 用于克隆项目 |

---

## 第一步：在 VPS 上安装 Node.js

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node -v   # 应输出 v22.x.x
npm -v    # 应输出 10.x.x
```

---

## 第二步：克隆项目

```bash
git clone https://github.com/Andy-github999/cf-proxy-ex.git
cd cf-proxy-ex
```

---

## 第三步：配置环境变量

`server.js` 通过环境变量读取配置。你可以用以下几种方式设置：

### 方式 A：直接 export（临时，SSH 断开后失效）

```bash
export PROXY_DOMAIN=your-domain.com
export PROXY_PROTOCOL=https
export PORT=3000
```

### 方式 B：单行启动时传入

```bash
PROXY_DOMAIN=your-domain.com node server.js
```

### 方式 C：写入 shell profile（永久生效）

```bash
echo 'export PROXY_DOMAIN=your-domain.com' >> ~/.bashrc
echo 'export PROXY_PROTOCOL=https' >> ~/.bashrc
echo 'export PORT=3000' >> ~/.bashrc
source ~/.bashrc
```

> **环境变量说明**：
> | 变量 | 默认值 | 说明 |
> |------|--------|------|
> | `PROXY_DOMAIN` | `localhost` | **你的代理域名**（必填） |
> | `PROXY_PROTOCOL` | `https` | 协议（保持 `https`，因为 Cloudflare 处理 TLS） |
> | `PORT` | `3000` | 监听端口 |

> **关于密码**：如需设置访问密码，直接编辑 `_worker.js`，找到 `const password = "123";` 修改即可。

---

## 第四步：配置 Cloudflare DNS

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名
3. 进入 **DNS → Records**
4. 添加一条 **A 记录**：
   - **名称**：你想要的子域名，例如 `proxy`（最终域名 `proxy.your-domain.com`）
   - **IPv4 地址**：你的 VPS 公网 IP
   - **代理状态**：☁️ **开启橙色云**（Proxied）← **关键！**
5. 保存

> **橙色云（Proxied）** 让 Cloudflare 处理 HTTPS 并隐藏你的 VPS IP。如果关闭（灰色云），你需要在 VPS 上自己配置 HTTPS 证书。

---

## 第五步：启动服务器

### 方式一：直接启动（测试用）

```bash
node server.js
```

用浏览器访问 `https://proxy.your-domain.com` 即可测试。

### 方式二：nohup（简单后台运行）

```bash
# 启动（后台运行，输出日志到文件）
nohup node server.js > app.log 2>&1 &

# 查看日志
tail -f app.log

# 停止
kill $(pgrep -f "node server.js")
```

### 方式三：pm2（推荐，自带进程守护）

```bash
# 安装 pm2
npm install -g pm2

# 启动
PROXY_DOMAIN=your-domain.com pm2 start server.js --name cf-proxy

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs cf-proxy

# 重启 / 停止
pm2 restart cf-proxy
pm2 stop cf-proxy
```

### 方式四：systemd 服务（推荐，开机自启）

创建 systemd 服务文件：

```bash
sudo tee /etc/systemd/system/cf-proxy.service > /dev/null << 'EOF'
[Unit]
Description=cf-proxy-ex Node.js Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/cf-proxy-ex
Environment="PROXY_DOMAIN=your-domain.com"
Environment="PROXY_PROTOCOL=https"
Environment="PORT=3000"
ExecStart=/usr/bin/node /root/cf-proxy-ex/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

> **注意**：将 `your-domain.com` 替换为你的实际域名，`/root/cf-proxy-ex` 替换为实际项目路径。

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable cf-proxy
sudo systemctl start cf-proxy

# 查看状态
sudo systemctl status cf-proxy

# 查看日志
sudo journalctl -u cf-proxy -f

# 停止 / 重启
sudo systemctl stop cf-proxy
sudo systemctl restart cf-proxy
```

---

## 第六步：配置防火墙

确保 VPS 防火墙允许 `PORT`（默认 3000）端口的入站流量。

```bash
# Ubuntu / Debian (ufw)
sudo ufw allow 3000/tcp
sudo ufw reload

# CentOS / Rocky (firewalld)
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

如果使用云服务商（AWS、阿里云、腾讯云等）的安全组/防火墙规则，也需要放开 3000 端口。

> 如果你只通过 Cloudflare 代理访问（橙色云），理论上只需允许 Cloudflare IP 段访问 3000 端口。为简单起见，可以先开放给所有 IP。

---

## 可选：Cloudflare Tunnel（无需开放端口）

如果你不想在 VPS 上开放任何端口，可以使用 Cloudflare Tunnel：

```bash
# 1. 安装 cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# 2. 登录
cloudflared tunnel login

# 3. 创建隧道
cloudflared tunnel create cf-proxy

# 4. 创建配置文件 ~/.cloudflared/config.yml
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: YOUR-TUNNEL-ID
credentials-file: /root/.cloudflared/YOUR-TUNNEL-ID.json

ingress:
  - hostname: proxy.your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# 5. 配置 DNS
cloudflared tunnel route dns cf-proxy proxy.your-domain.com

# 6. 启动隧道
cloudflared tunnel run cf-proxy
```

然后可以用 systemd 让 Tunnel 开机自启：

```bash
sudo cloudflared service install
```

---

## 日志管理

### nohup 方式

```bash
# 日志文件自动轮转（建议安装 logrotate）
sudo tee /etc/logrotate.d/cf-proxy << 'EOF'
/root/cf-proxy-ex/app.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF
```

### journalctl（systemd 方式）

```bash
# 查看最近 1 小时日志
sudo journalctl -u cf-proxy --since "1 hour ago" -f

# 限制日志大小
sudo journalctl --vacuum-size=100M
```

---

## 更新项目

```bash
cd /root/cf-proxy-ex
git pull origin main

# 如果使用 systemd
sudo systemctl restart cf-proxy

# 如果使用 pm2
pm2 restart cf-proxy

# 如果使用 nohup
kill $(pgrep -f "node server.js")
nohup node server.js > app.log 2>&1 &
```

---

## 故障排查

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 502 Bad Gateway | 端口未开放 | 检查防火墙和安全组 |
| Cloudflare 报错 521 | VPS 未运行服务 | 检查 `systemctl status cf-proxy` |
| 页面加载不全 | Node.js < 20 | `node -v` 检查版本 |
| 无限重定向 | Cloudflare SSL 设置 | Cloudflare Dashboard → SSL/TLS → 设为 **Full** |
| `ERR_CONNECTION_REFUSED` | 服务未启动 | 检查日志：`journalctl -u cf-proxy -n 20` |

---

## 参考

- [原项目 README](../README.md)
- [Cloudflare Workers 部署教程](deploy_on_cf_tutorial.md)
- [Deno 部署教程](deploy_on_deno_tutorial.md)
