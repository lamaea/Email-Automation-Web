# Excel Automation Web（GitHub Pages 版）

纯前端版本：**上传 Excel → 按列筛选 → 草拟邮件**。  
不修改原 `Email Automation` 文件夹，可单独部署到 GitHub Pages。

## 功能

- 浏览器本地读取 `.xlsx`（使用 SheetJS，不上传服务器）
- Deadline「某日期之前」等筛选规则
- 常用收件人快捷选择
- 邮件草拟 + 复制 + 用系统邮件客户端打开（`mailto:`）

> 说明：GitHub Pages 不能跑 Python，因此**不能像本地版那样用 SMTP 自动发信**。

## 本地预览

直接用浏览器打开 `index.html`，或：

```powershell
cd "c:\Users\77253\Desktop\Email Automation Web"
python -m http.server 8080
```

访问 `http://127.0.0.1:8080`

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
| 发信 | Gmail SMTP 自动发送 | 草拟 + 邮件客户端打开 |
| 部署 | 本地 / Render | GitHub Pages |
