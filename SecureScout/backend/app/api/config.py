from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
from pathlib import Path

router = APIRouter(
    prefix="/config",
    tags=["config"],
    responses={404: {"description": "Not found"}},
)

class ConfigUpdate(BaseModel):
    """配置更新请求模型"""
    scan_timeout: Optional[int] = None
    concurrent_scans: Optional[int] = None
    user_agent: Optional[str] = None
    default_scan_modules: Optional[List[str]] = None
    custom_settings: Optional[Dict[str, Any]] = None

@router.get("/")
async def get_config():
    """
    获取当前配置
    """
    config_file = Path("data/config.json")
    if not config_file.exists():
        raise HTTPException(status_code=404, detail="配置文件不存在")
    
    with open(config_file, "r") as f:
        config = json.load(f)
    
    return config

@router.patch("/")
async def update_config(config_update: ConfigUpdate):
    """
    更新配置
    """
    config_file = Path("data/config.json")
    if not config_file.exists():
        raise HTTPException(status_code=404, detail="配置文件不存在")
    
    with open(config_file, "r") as f:
        current_config = json.load(f)
    
    # 更新配置
    update_dict = config_update.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            current_config[key] = value
    
    with open(config_file, "w") as f:
        json.dump(current_config, f, indent=2)
    
    return current_config

@router.get("/vulnerabilities")
async def get_vulnerability_library():
    """
    获取漏洞库
    """
    vulns_file = Path("data/vulnerabilities.json")
    if not vulns_file.exists():
        raise HTTPException(status_code=404, detail="漏洞库文件不存在")
    
    with open(vulns_file, "r") as f:
        vulnerabilities = json.load(f)
    
    return vulnerabilities

@router.patch("/vulnerabilities/{vuln_type}")
async def update_vulnerability_rule(vuln_type: str, update_data: Dict[str, Any]):
    """
    更新特定漏洞类型的规则
    """
    vulns_file = Path("data/vulnerabilities.json")
    if not vulns_file.exists():
        raise HTTPException(status_code=404, detail="漏洞库文件不存在")
    
    with open(vulns_file, "r") as f:
        vulnerabilities = json.load(f)
    
    if vuln_type not in vulnerabilities:
        raise HTTPException(status_code=404, detail=f"漏洞类型 '{vuln_type}' 不存在")
    
    # 更新漏洞规则
    for key, value in update_data.items():
        vulnerabilities[vuln_type][key] = value
    
    with open(vulns_file, "w") as f:
        json.dump(vulnerabilities, f, indent=2)
    
    return vulnerabilities[vuln_type]

@router.post("/reset")
async def reset_config():
    """
    重置配置到默认值
    """
    default_config = {
        "scan_timeout": 30,
        "concurrent_scans": 5,
        "user_agent": "SecureScout/1.0",
        "default_scan_modules": ["sql_injection", "xss", "csrf", "file_upload"]
    }
    
    config_file = Path("data/config.json")
    with open(config_file, "w") as f:
        json.dump(default_config, f, indent=2)
    
    return default_config 