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

## 3. Cloudflare Worker

安装 Wrangler 后执行：

```bash
cd worker
cp wrangler.toml.example wrangler.toml
wrangler kv namespace create SESSIONS
wrangler secret put GITHUB_OAUTH_CLIENT_ID
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
wrangler secret put GITHUB_APP_PRIVATE_KEY
wrangler deploy
```

将 KV ID、GitHub App ID、Installation ID、仓库和前端地址写入本地 `wrangler.toml`。建议给 Worker 和前端配置同一主域名下的子域名（例如 `api.example.com` 与 `example.com`），避免浏览器阻止跨站登录 Cookie。

最后把 Worker 地址填入 `web/config.js` 的 `apiBase` 并重新部署前端。

## 自动发布边界

- 单文件上限 10MB；
- 每个 GitHub 账号每天最多 3 份；
- GitHub 账号需注册满 7 天；
- 仅 PDF、JPG、PNG、WebP、Markdown、TXT；
- 文件与元数据一次提交到 `main`，触发网站重新构建；
- 自动发布无法替代内容审核，管理员仍应保留举报和紧急删除渠道。
