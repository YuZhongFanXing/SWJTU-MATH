# 上传服务部署

该 Worker 完成 GitHub OAuth 登录、频率限制、文件校验，以及通过 GitHub App 向 `main` 分支原子提交文件和元数据。

## 1. GitHub OAuth App

在 GitHub Settings → Developer settings → OAuth Apps 新建应用：

- Homepage URL：前端正式地址
- Authorization callback URL：`https://你的-api-域名/auth/callback`

记录 Client ID 和 Client secret。

## 2. GitHub App

新建仅供本项目使用的 GitHub App：

- Repository permissions → Contents：Read and write
- 关闭不需要的 Webhook
- 将 App 只安装到 `SWJTU-MATH` 仓库
- 生成并下载私钥。GitHub 下载的私钥通常是 PKCS#1，Worker 使用前需转换成 PKCS#8：

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in github-app-private-key.pem -out github-app-private-key.pkcs8.pem
```

记录 App ID、Installation ID 和转换后的 PKCS#8 私钥。不要使用个人 PAT，也不要把任何密钥放入 `web/config.js`。

## 3. Cloudflare与GitHub仓库配置

在Cloudflare创建一个自定义API Token，至少给予当前账户 Workers Scripts Edit 权限，并记录账户ID。然后进入GitHub仓库：

`Settings → Secrets and variables → Actions → Secrets`，添加：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`
- `GITHUB_APP_ID`
- `GITHUB_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`（转换后的完整PKCS#8内容）
- `SESSION_SECRET`（自行生成的至少32字符随机字符串）

运行仓库 Actions 中的 `Deploy Upload Worker`。成功后得到类似 `https://swjtu-math-api.<账户子域>.workers.dev` 的地址。

进入 `Settings → Secrets and variables → Actions → Variables`，添加：

- `UPLOAD_API_BASE`：上一步得到的Worker地址

最后重新运行 `Build and Deploy`。构建脚本会自动把接口地址写入发布产物，不会把任何密钥写入前端。

建议最终给Worker和前端配置同一主域名下的子域名，避免严格禁用第三方Cookie的浏览器阻止GitHub登录会话。

## 自动发布边界

- 单文件上限 10MB；
- 每个 GitHub 账号每天最多 3 份；
- GitHub 账号需注册满 7 天；
- 仅 PDF、JPG、PNG、WebP、Markdown、TXT；
- 文件与元数据一次提交到 `main`，触发网站重新构建；
- 自动发布无法替代内容审核，管理员仍应保留举报和紧急删除渠道。
