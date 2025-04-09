from fastapi import APIRouter, HTTPException
from typing import List, Optional
import json
from pathlib import Path
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/report",
    tags=["report"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
async def get_all_reports():
    """
    获取所有扫描报告
    """
    results_file = Path("data/scan_results.json")
    if not results_file.exists():
        return []
    
    with open(results_file, "r") as f:
        scan_results = json.load(f)
    
    return scan_results

@router.get("/{scan_id}")
async def get_report(scan_id: str):
    """
    获取特定ID的扫描报告
    """
    results_file = Path("data/scan_results.json")
    if not results_file.exists():
        raise HTTPException(status_code=404, detail="扫描记录不存在")
    
    with open(results_file, "r") as f:
        scan_results = json.load(f)
    
    for result in scan_results:
        if result.get("id") == scan_id:
            return result
    
    raise HTTPException(status_code=404, detail="扫描ID不存在")

@router.get("/summary/recent")
async def get_recent_summary(days: Optional[int] = 7):
    """
    获取最近一段时间的扫描摘要统计
    """
    results_file = Path("data/scan_results.json")
    if not results_file.exists():
        return {
            "total_scans": 0,
            "completed": 0,
            "failed": 0,
            "vulnerability_summary": {},
            "severity_counts": {
                "低": 0,
                "中": 0,
                "高": 0,
                "严重": 0
            }
        }
    
    with open(results_file, "r") as f:
        scan_results = json.load(f)
    
    # 设置时间范围
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # 过滤最近的扫描
    recent_scans = [
        scan for scan in scan_results 
        if scan.get("start_time", "0") > cutoff_date
    ]
    
    # 初始化统计
    summary = {
        "total_scans": len(recent_scans),
        "completed": len([s for s in recent_scans if s.get("status") == "completed"]),
        "failed": len([s for s in recent_scans if s.get("status") == "failed"]),
        "vulnerability_summary": {},
        "severity_counts": {
            "低": 0,
            "中": 0,
            "高": 0,
            "严重": 0
        }
    }
    
    # 统计漏洞类型和严重程度
    for scan in recent_scans:
        if scan.get("status") != "completed":
            continue
            
        vulnerabilities = scan.get("vulnerabilities", [])
        for vuln in vulnerabilities:
            vuln_type = vuln.get("type", "其他")
            severity = vuln.get("severity", "中")
            
            # 更新漏洞类型统计
            if vuln_type in summary["vulnerability_summary"]:
                summary["vulnerability_summary"][vuln_type] += 1
            else:
                summary["vulnerability_summary"][vuln_type] = 1
            
            # 更新严重程度统计
            if severity in summary["severity_counts"]:
                summary["severity_counts"][severity] += 1
    
    return summary

@router.delete("/{scan_id}")
async def delete_report(scan_id: str):
    """
    删除特定ID的扫描报告
    """
    results_file = Path("data/scan_results.json")
    if not results_file.exists():
        raise HTTPException(status_code=404, detail="扫描记录不存在")
    
    with open(results_file, "r") as f:
        scan_results = json.load(f)
    
    filtered_results = [result for result in scan_results if result.get("id") != scan_id]
    
    if len(filtered_results) == len(scan_results):
        raise HTTPException(status_code=404, detail="扫描ID不存在")
    
    with open(results_file, "w") as f:
        json.dump(filtered_results, f, indent=2)
    
    return {"message": "扫描报告已删除"}

@router.get("/stats/vulnerability_types")
async def get_vulnerability_types_stats():
    """
    获取漏洞类型统计
    """
    results_file = Path("data/scan_results.json")
    if not results_file.exists():
        return {}
    
    with open(results_file, "r") as f:
        scan_results = json.load(f)
    
    vulnerability_counts = {}
    
    for scan in scan_results:
        if scan.get("status") != "completed":
            continue
            
        vulnerabilities = scan.get("vulnerabilities", [])
        for vuln in vulnerabilities:
            vuln_type = vuln.get("type", "其他")
            
            if vuln_type in vulnerability_counts:
                vulnerability_counts[vuln_type] += 1
            else:
                vulnerability_counts[vuln_type] = 1
    
    return vulnerability_counts 