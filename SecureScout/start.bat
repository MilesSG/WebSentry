@echo off
title SecureScout Web安全扫描器
color 0A

echo ==========================================================
echo             SecureScout Web安全扫描器启动工具
echo ==========================================================
echo.

:: 切换到脚本所在目录
cd %~dp0

:: 检查Python是否已安装
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [错误] Python未安装或未添加到PATH环境变量中。
    echo 请安装Python 3.8或更高版本，然后重试。
    echo.
    goto :end
)

:: 检查Node.js是否已安装
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [错误] Node.js未安装或未添加到PATH环境变量中。
    echo 请安装Node.js 16或更高版本，然后重试。
    echo.
    goto :end
)

:: 检查后端目录是否存在
if not exist "backend" (
    color 0C
    echo [错误] 找不到backend目录。
    echo 请确保您是在正确的SecureScout项目目录中运行此脚本。
    echo.
    goto :end
)

:: 检查前端目录是否存在
if not exist "frontend" (
    color 0C
    echo [错误] 找不到frontend目录。
    echo 请确保您是在正确的SecureScout项目目录中运行此脚本。
    echo.
    goto :end
)

:: 启动后端服务器
echo [信息] 正在启动后端服务器...
start cmd /k "title SecureScout - 后端服务器 && color 0B && cd backend && python run.py"

:: 等待一下，让后端先启动
timeout /t 3 > nul

:: 启动前端服务器
echo [信息] 正在启动前端服务器...
start cmd /k "title SecureScout - 前端服务器 && color 09 && cd frontend && npm run dev"

:: 显示成功信息
color 0A
echo.
echo ==========================================================
echo [成功] SecureScout已成功启动！
echo.
echo 后端服务地址: http://localhost:8000
echo 前端应用地址: http://localhost:3000
echo.
echo 请在浏览器中访问 http://localhost:3000 使用SecureScout
echo ==========================================================
echo.
echo [提示] 关闭此窗口不会停止服务。如需停止服务，请关闭已打开的命令行窗口。
echo.

:end
pause 