# 上传服务部署

该 Worker 完成 GitHub OAuth 登录、频率限制、文件校验，并把投稿文件保存到 Hugging Face Storage Bucket；资料元数据和限流记录仍提交到 GitHub `main` 分支，以触发网站重新构建。未配置 HF Bucket 时会兼容使用原来的 GitHub 文件存储。

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
- 生成并下载私钥；服务同时兼容GitHub提供的PKCS#1格式和PKCS#8格式。

记录 App ID、Installation ID 和完整私钥。不要使用个人 PAT，也不要把任何密钥放入 `web/config.js`。

## 3. Cloudflare与GitHub仓库配置

在Cloudflare创建一个自定义API Token，至少给予当前账户 Workers Scripts Edit 权限，并记录账户ID。然后进入GitHub仓库：

`Settings → Secrets and variables → Actions → Secrets`，添加：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `UPLOAD_APP_ID`
- `UPLOAD_INSTALLATION_ID`
- `UPLOAD_APP_PRIVATE_KEY`（GitHub下载的完整PEM私钥内容，服务会兼容PKCS#1/PKCS#8）
- `UPLOAD_SESSION_SECRET`（自行生成的至少32字符随机字符串）

Hugging Face Bucket 还需要在 Hugging Face Access Tokens 页面生成 S3 credentials，然后在 GitHub Actions Secrets 添加：

- `HF_S3_ACCESS_KEY_ID`
- `HF_S3_SECRET_ACCESS_KEY`

S3 credentials 只授予目标 Bucket 所需的写权限，不要把 Token 或密钥写入前端。Hugging Face Bucket 需要设为 Public，网站才能让访客直接预览和下载。将下面两个值写入 `worker/wrangler.toml` 的 `[vars]`：

- `HF_S3_NAMESPACE`：Hugging Face 用户名或组织名
- `HF_BUCKET`：Bucket 名称

`HF_PUBLIC_BASE_URL` 通常留空，Worker 会自动使用 `https://huggingface.co/buckets/<namespace>/<bucket>/resolve`。

运行仓库 Actions 中的 `Deploy Upload Worker`。成功后得到类似 `https://swjtu-math-api.<账户子域>.workers.dev` 的地址。

进入 `Settings → Secrets and variables → Actions → Variables`，添加：

- `UPLOAD_API_BASE`：上一步得到的Worker地址

最后重新运行 `Build and Deploy`。构建脚本会自动把接口地址写入发布产物，不会把任何密钥写入前端。

建议最终给Worker和前端配置同一主域名下的子域名，避免严格禁用第三方Cookie的浏览器阻止GitHub登录会话。

## 自动发布边界

- 单文件上限 10MB；
- 每个 GitHub 账号每天最多 3 份；
- GitHub 账号需注册满 7 天；
- 仅 PDF、JPG、PNG、WebP、Markdown、TXT、DOCX、XLSX；
- 文件与元数据一次提交到 `main`，触发网站重新构建；
- 自动发布无法替代内容审核，管理员仍应保留举报和紧急删除渠道。
- 配置 HF 后，文件对象不再写入 Git 历史；GitHub 只保存元数据和限流记录，前端仍使用 GitHub 登录。
