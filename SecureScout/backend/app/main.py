from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pathlib import Path

app = FastAPI(
    title="SecureScout API",
    description="Web安全检测工具API",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应设置为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据目录和文件
def init_data_files():
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    # 初始化配置文件
    config_file = data_dir / "config.json"
    if not config_file.exists():
        default_config = {
            "scan_timeout": 30,
            "concurrent_scans": 5,
            "user_agent": "SecureScout/1.0",
            "default_scan_modules": ["sql_injection", "xss", "csrf", "file_upload"]
        }
        with open(config_file, "w") as f:
            json.dump(default_config, f, indent=2)
    
    # 初始化扫描结果文件
    results_file = data_dir / "scan_results.json"
    if not results_file.exists():
        with open(results_file, "w") as f:
            json.dump([], f)
    
    # 初始化漏洞库文件
    vulns_file = data_dir / "vulnerabilities.json"
    if not vulns_file.exists():
        default_vulns = {
            "sql_injection": {
                "patterns": ["'", "OR 1=1", "' OR '1'='1", "--", "/*"],
                "description": "SQL注入漏洞允许攻击者执行恶意SQL查询",
                "severity": "高"
            },
            "xss": {
                "patterns": ["<script>", "javascript:", "onerror=", "onload="],
                "description": "跨站脚本漏洞允许攻击者注入客户端脚本",
                "severity": "高"
            },
            "csrf": {
                "description": "跨站请求伪造漏洞允许攻击者以受害者身份执行操作",
                "severity": "中"
            },
            "file_upload": {
                "patterns": [".php", ".jsp", ".asp", ".exe"],
                "description": "不安全的文件上传可能导致远程代码执行",
                "severity": "严重"
            }
        }
        with open(vulns_file, "w") as f:
            json.dump(default_vulns, f, indent=2)

@app.on_event("startup")
async def startup_event():
    init_data_files()

@app.get("/")
async def root():
    return {"message": "欢迎使用SecureScout Web安全检测工具"}

# 在这里导入和包含API路由
from app.api import scan, report, config

app.include_router(scan.router)
app.include_router(report.router)
app.include_router(config.router) 