# Excel Automation Web（GitHub Pages 版）

纯前端版本：**上传 Excel → 按列筛选 → 草拟邮件**。  
不修改原 `Email Automation` 文件夹，可单独部署到 GitHub Pages。

## 功能

- 浏览器本地读取 `.xlsx`（使用 SheetJS，不上传服务器）
- Deadline「某日期之前」等筛选规则
- 常用收件人快捷选择
- 邮件草拟 + **一键发送**（通过独立发信 API）
- 复制 + 用系统邮件客户端打开（备用）

> 说明：GitHub Pages 只托管网页；Gmail 密码放在 `api/` 后端的环境变量里，**不会**写进前端代码。

## 本地预览

直接用浏览器打开 `index.html`，或：

```powershell
cd "c:\Users\77253\Desktop\Email Automation Web"
python -m http.server 8080
```

访问 `http://127.0.0.1:8080`

## 一键发送（安全架构）

1. **GitHub Pages**：网页上传 Excel、筛选、草拟邮件  
2. **Render 发信 API**（`api/` 目录）：保存 Gmail SMTP 密码，代为发信  

你之前提供的 Gmail 配置**够用**：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=junleli0603@gmail.com
SMTP_PASSWORD=你的Gmail应用专用密码
SMTP_FROM=junleli0603@gmail.com
SMTP_USE_TLS=true
SEND_API_KEY=自己设一个长口令
ALLOWED_ORIGINS=https://lamaea.github.io,http://127.0.0.1:8080
```

### 部署发信 API 到 Render

1. 把本仓库连接到 Render  
2. 新建 **Web Service**，Root Directory 填 `api`  
3. Build：`pip install -r requirements.txt`  
4. Start：`gunicorn --bind 0.0.0.0:$PORT server:app`  
5. 在 Render **Environment** 填入上面那些变量（密码只放 Render，不要提交 Git）  
6. 部署完成后复制 Render 地址，例如 `https://email-automation-api.onrender.com`  
7. 在网页「发信 API 地址」填入该地址，「API 口令」填 `SEND_API_KEY`，点保存  
8. 即可使用「一键发送邮件」

### 本地联调

```powershell
cd api
python -m pip install -r requirements.txt
copy .env.example .env
# 编辑 .env 填入 Gmail 应用专用密码
python server.py
```

另开终端预览网页：

```powershell
cd ..
python -m http.server 8080
```

网页 API 地址填 `http://127.0.0.1:8001`。

## 部署到 GitHub Pages

### 1. 新建 GitHub 仓库

例如：`excel-task-filter`

### 2. 上传本文件夹所有文件到仓库根目录

确保根目录包含：

```text
index.html
styles.css
app.js
filter-logic.js
email-draft.js
.nojekyll
README.md
```

### 3. 开启 GitHub Pages

仓库 → **Settings** → **Pages**

- **Source**: Deploy from a branch
- **Branch**: `main` / `/ (root)`
- 保存

几分钟后访问：

```text
https://你的用户名.github.io/excel-task-filter/
```

### 4. 可选：用 GitHub Actions（无需手动选分支）

若你更想用 Actions，可在仓库加 `.github/workflows/pages.yml`（本版默认用根目录静态文件即可）。

## 与原版的区别

| 项目 | 本地版 `Email Automation` | 本版 `Email Automation Web` |
|---|---|---|
| 读取 Excel | 读文件夹内文件 | 网页上传 |
| 后端 | Python | 无 |
| 发信 | Gmail SMTP 自动发送 | 草拟 + API 一键发送 |
| 部署 | 本地 Python | GitHub Pages + Render API |
