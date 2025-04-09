# SecureScout 安装指南

本文档提供了详细的 SecureScout 安装和部署说明。

## 系统要求

- 操作系统: Windows 10/11, macOS, 或 Linux
- Python 3.8+
- Node.js 16+
- npm 8+
- 至少 2GB 可用内存
- 至少 1GB 可用磁盘空间

## 安装步骤

### 1. 安装 Python 依赖

首先，确保你已安装 Python 3.8 或更高版本。你可以通过以下命令检查:

```bash
python --version
# 或 
python3 --version
```

然后，安装后端所需的依赖:

```bash
cd backend
pip install -r requirements.txt
```

### 2. 安装 Node.js 依赖

确保已安装 Node.js 16+ 和 npm 8+。你可以通过以下命令检查:

```bash
node --version
npm --version
```

然后，安装前端所需的依赖:

```bash
cd frontend
npm install
```

## 运行应用

### Windows 用户

对于 Windows 用户，最简单的方式是双击项目根目录中的 `start.bat` 文件，这将同时启动前端和后端服务。

### macOS/Linux 用户

对于 macOS 或 Linux 用户，需要在两个不同的终端中分别启动后端和前端服务。

1. 启动后端服务:

```bash
cd backend
python run.py
```

2. 启动前端服务:

```bash
cd frontend
npm run dev
```

### 访问应用

成功启动后，你可以通过浏览器访问以下地址:

- 前端界面: http://localhost:3000
- 后端API: http://localhost:8000

## 生产环境部署

对于生产环境，我们建议进行以下调整:

### 前端部署

构建前端生产版本:

```bash
cd frontend
npm run build
```

构建完成后，`dist` 目录中的文件可以托管在任何静态文件服务器上（如 Nginx, Apache 等）。

### 后端部署

对于后端，推荐使用 Gunicorn 配合 Uvicorn 作为生产环境的服务器:

1. 安装 Gunicorn:

```bash
pip install gunicorn
```

2. 启动服务:

```bash
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

### 安全配置

在生产环境中，请务必进行以下安全调整:

1. 在 `main.py` 中修改 CORS 设置，仅允许特定域名:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. 使用反向代理（如 Nginx）并配置 HTTPS

## 常见问题

### 端口占用问题

如果端口已被占用，你可以修改相应配置文件中的端口设置:

- 前端: 修改 `frontend/vite.config.js` 中的 `server.port`
- 后端: 修改 `backend/run.py` 中的 `port` 参数

### 依赖安装失败

如果依赖安装过程中出现问题:

1. 尝试使用国内镜像源:
   - pip: `pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`
   - npm: `npm install --registry=https://registry.npmmirror.com`

2. 确保你的 Python 和 Node.js 版本符合要求

### 数据存储路径

默认情况下，所有数据存储在 `backend/data` 目录中。如果需要更改存储位置，请修改 `backend/app/main.py` 文件中的相关配置。

## 支持与联系

如果你在安装或使用过程中遇到任何问题，请通过以下方式获取支持:

- 在 GitHub 仓库中提交 Issue
- 发送邮件至 support@securescout.example.com (示例邮箱，请替换为实际联系方式) 