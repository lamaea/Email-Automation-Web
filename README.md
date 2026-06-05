# Excel Automation Web（GitHub Pages 版）

纯前端版本：**上传 Excel → 按列筛选 → 草拟邮件 → 在 Gmail 一键打开发送**。

不修改原 `Email Automation` 本地文件夹。无需 Render、无需自建 API、无需在代码里放 Gmail 密码。

## 功能

- 浏览器本地读取 `.xlsx`（SheetJS，不上传服务器）
- Deadline「某日期之前」等筛选规则
- 常用收件人快捷选择
- 邮件草拟
- **在 Gmail 中打开并发送**（使用你已登录的 Gmail 网页版）
- 复制邮件 / 系统邮件客户端打开（备用）

## 发送邮件怎么用？

1. 筛选任务 → **草拟邮件**
2. 选择收件人
3. 点 **在 Gmail 中打开并发送**
4. 浏览器会打开 Gmail 撰写页（收件人、主题、正文已填好）
5. 你在 Gmail 里确认后点 **发送**

> 这是纯静态网页能做到的最安全方式：密码留在你的 Google 账号里，不会写进 GitHub。

## 本地预览

```powershell
cd "c:\Users\77253\Desktop\Email Automation Web"
python -m http.server 8080
```

访问 `http://127.0.0.1:8080`

## 部署到 GitHub Pages

1. 推送到 GitHub 仓库
2. **Settings → Pages → Branch: main / (root)**
3. 访问 `https://你的用户名.github.io/仓库名/`

## 与本地版的区别

| 项目 | 本地 `Email Automation` | 本版 Web |
|---|---|---|
| 读取 Excel | 读文件夹 | 网页上传 |
| 发信 | Gmail SMTP 自动发送 | Gmail 网页一键打开 |
| 部署 | 本地 Python | GitHub Pages |
| 需要 API/Render | 否 | **否** |

## 说明

- 若邮件正文特别长，Gmail 链接可能超限，请用「复制邮件内容」后在 Gmail 粘贴。
- 仓库里的 `api/` 目录为旧方案（Render），**可忽略**，当前网页不再使用。
