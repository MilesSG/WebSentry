import aiohttp
import asyncio
import json
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from urllib.parse import urlparse, urljoin, urlunparse
from bs4 import BeautifulSoup

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def scan_url_for_vulnerabilities(
    url: str, 
    modules: Optional[List[str]] = None,
    depth: int = 1,
    headers: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    """
    对URL进行安全扫描，检测可能的漏洞
    """
    # 如果未指定模块，则加载默认模块
    if not modules:
        config_file = Path("data/config.json")
        if config_file.exists():
            with open(config_file, "r") as f:
                config = json.load(f)
                modules = config.get("default_scan_modules", ["sql_injection", "xss", "csrf", "file_upload"])
        else:
            modules = ["sql_injection", "xss", "csrf", "file_upload"]
    
    # 加载漏洞库
    vulns_file = Path("data/vulnerabilities.json")
    if vulns_file.exists():
        with open(vulns_file, "r") as f:
            vulnerability_library = json.load(f)
    else:
        vulnerability_library = {}
    
    # 创建请求头
    if not headers:
        headers = {
            "User-Agent": "SecureScout/1.0 Security Scanner"
        }
    
    # 存储扫描结果
    vulnerabilities = []
    
    try:
        # 使用aiohttp创建会话
        async with aiohttp.ClientSession(headers=headers) as session:
            # 获取初始响应
            response_data = await fetch_url(session, url)
            
            if not response_data:
                return [{"type": "error", "url": url, "description": "无法访问目标URL", "severity": "中"}]
            
            # 获取网站的所有链接（用于爬行）
            links = extract_links(url, response_data["text"])
            
            # 检测主页面的漏洞
            await detect_vulnerabilities(
                session=session,
                url=url,
                response_data=response_data,
                modules=modules,
                vulnerability_library=vulnerability_library,
                vulnerabilities=vulnerabilities
            )
            
            # 如果深度大于1，继续扫描链接页面
            if depth > 1 and links:
                visited = {url}
                for link in links[:min(10, len(links))]:  # 限制扫描链接数量
                    if link in visited:
                        continue
                    
                    visited.add(link)
                    
                    logger.info(f"扫描链接: {link}")
                    link_response = await fetch_url(session, link)
                    
                    if link_response:
                        await detect_vulnerabilities(
                            session=session,
                            url=link,
                            response_data=link_response,
                            modules=modules,
                            vulnerability_library=vulnerability_library,
                            vulnerabilities=vulnerabilities
                        )
    
    except Exception as e:
        logger.error(f"扫描过程中发生错误: {str(e)}")
        vulnerabilities.append({
            "type": "error",
            "url": url,
            "description": f"扫描过程中发生错误: {str(e)}",
            "severity": "中"
        })
    
    return vulnerabilities

async def fetch_url(session: aiohttp.ClientSession, url: str) -> Optional[Dict[str, Any]]:
    """获取URL的响应"""
    try:
        async with session.get(url, timeout=30) as response:
            status = response.status
            text = await response.text()
            headers = dict(response.headers)
            
            return {
                "status": status,
                "text": text,
                "headers": headers,
                "url": str(response.url)
            }
    except Exception as e:
        logger.error(f"获取URL时出错 {url}: {str(e)}")
        return None

def extract_links(base_url: str, html_content: str) -> List[str]:
    """从HTML内容中提取链接"""
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        parsed_base = urlparse(base_url)
        base_domain = parsed_base.netloc
        
        links = []
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            
            # 处理相对URL
            if href.startswith('/'):
                link = urlunparse((
                    parsed_base.scheme,
                    parsed_base.netloc,
                    href,
                    '',
                    '',
                    ''
                ))
            elif href.startswith('http'):
                # 只保留同域名链接
                parsed_href = urlparse(href)
                if parsed_href.netloc != base_domain:
                    continue
                link = href
            else:
                # 处理相对路径
                link = urljoin(base_url, href)
            
            if link not in links:
                links.append(link)
        
        return links
    except Exception as e:
        logger.error(f"提取链接时出错: {str(e)}")
        return []

async def detect_vulnerabilities(
    session: aiohttp.ClientSession,
    url: str,
    response_data: Dict[str, Any],
    modules: List[str],
    vulnerability_library: Dict[str, Any],
    vulnerabilities: List[Dict[str, Any]]
) -> None:
    """检测指定URL的漏洞"""
    html_content = response_data["text"]
    headers = response_data["headers"]
    
    # 根据模块列表执行不同的漏洞检测
    for module in modules:
        if module == "sql_injection":
            await check_sql_injection(session, url, vulnerability_library, vulnerabilities)
        
        elif module == "xss":
            check_xss(url, html_content, vulnerability_library, vulnerabilities)
        
        elif module == "csrf":
            check_csrf(url, html_content, headers, vulnerability_library, vulnerabilities)
        
        elif module == "file_upload":
            check_file_upload(url, html_content, vulnerability_library, vulnerabilities)
        
        # 可以根据需要添加更多漏洞检测模块

async def check_sql_injection(
    session: aiohttp.ClientSession,
    url: str, 
    vulnerability_library: Dict[str, Any],
    vulnerabilities: List[Dict[str, Any]]
) -> None:
    """检测SQL注入漏洞"""
    if "sql_injection" not in vulnerability_library:
        return
    
    patterns = vulnerability_library["sql_injection"].get("patterns", [])
    severity = vulnerability_library["sql_injection"].get("severity", "高")
    
    # 在URL参数中添加SQL注入测试点
    parsed_url = urlparse(url)
    path = parsed_url.path
    
    # 如果URL已经有参数，在参数后添加测试点
    if parsed_url.query:
        query_parts = parsed_url.query.split('&')
        for pattern in patterns:
            test_queries = []
            for part in query_parts:
                if '=' in part:
                    name, value = part.split('=', 1)
                    test_query = f"{name}={value}{pattern}"
                    test_queries.append(test_query)
            
            if test_queries:
                test_url = urlunparse((
                    parsed_url.scheme,
                    parsed_url.netloc,
                    path,
                    '',
                    '&'.join(test_queries),
                    parsed_url.fragment
                ))
                
                try:
                    response = await fetch_url(session, test_url)
                    if response and ('SQL' in response["text"] or 'syntax' in response["text"] 
                                    or 'mysql' in response["text"].lower() or 'error' in response["text"].lower()):
                        vulnerabilities.append({
                            "type": "sql_injection",
                            "url": url,
                            "test_url": test_url,
                            "description": "发现可能的SQL注入漏洞",
                            "severity": severity,
                            "details": f"测试参数: {pattern}"
                        })
                        break  # 找到一个注入点就停止
                except Exception as e:
                    logger.error(f"SQL注入测试时出错: {str(e)}")

def check_xss(
    url: str, 
    html_content: str, 
    vulnerability_library: Dict[str, Any],
    vulnerabilities: List[Dict[str, Any]]
) -> None:
    """检测XSS跨站脚本漏洞"""
    if "xss" not in vulnerability_library:
        return
    
    patterns = vulnerability_library["xss"].get("patterns", [])
    severity = vulnerability_library["xss"].get("severity", "高")
    
    # 检查HTML中是否有不安全的输入反射
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 检查表单
    forms = soup.find_all('form')
    if forms:
        for form in forms:
            inputs = form.find_all('input')
            if inputs:
                for input_field in inputs:
                    # 检查是否对输入进行了适当的过滤
                    if input_field.get('type') in ['text', 'search', 'url', 'tel', 'email', None]:
                        vulnerabilities.append({
                            "type": "xss",
                            "url": url,
                            "description": "表单可能存在XSS漏洞",
                            "severity": severity,
                            "details": f"表单ID: {form.get('id', '未知')}, 输入字段: {input_field.get('name', '未知')}"
                        })
                        break
    
    # 检查URL参数是否反射到页面
    parsed_url = urlparse(url)
    if parsed_url.query:
        query_parts = parsed_url.query.split('&')
        for part in query_parts:
            if '=' in part:
                name, value = part.split('=', 1)
                if value and value in html_content:
                    for pattern in patterns:
                        if pattern in value:
                            vulnerabilities.append({
                                "type": "xss",
                                "url": url,
                                "description": "URL参数被直接反射到页面",
                                "severity": severity,
                                "details": f"参数名: {name}, 值: {value}"
                            })
                            break

def check_csrf(
    url: str, 
    html_content: str, 
    headers: Dict[str, str],
    vulnerability_library: Dict[str, Any],
    vulnerabilities: List[Dict[str, Any]]
) -> None:
    """检测CSRF跨站请求伪造漏洞"""
    if "csrf" not in vulnerability_library:
        return
    
    severity = vulnerability_library["csrf"].get("severity", "中")
    
    # 检查是否使用了CSRF令牌
    soup = BeautifulSoup(html_content, 'html.parser')
    forms = soup.find_all('form', method=re.compile(r'post', re.I))
    
    for form in forms:
        has_csrf_token = False
        
        # 查找常见的CSRF令牌字段
        csrf_fields = form.find_all('input', attrs={
            'name': re.compile(r'csrf|token|nonce', re.I)
        })
        
        if csrf_fields:
            has_csrf_token = True
        
        if not has_csrf_token:
            vulnerabilities.append({
                "type": "csrf",
                "url": url,
                "description": "表单没有CSRF保护",
                "severity": severity,
                "details": f"表单操作: {form.get('action', '未知')}"
            })
    
    # 检查HTTP安全头
    has_csrf_headers = False
    for header in ['X-CSRF-Token', 'X-Frame-Options', 'Content-Security-Policy']:
        if header.lower() in [h.lower() for h in headers]:
            has_csrf_headers = True
            break
    
    if not has_csrf_headers and forms:
        vulnerabilities.append({
            "type": "csrf",
            "url": url,
            "description": "没有使用防CSRF的HTTP安全头",
            "severity": severity,
            "details": "缺少X-CSRF-Token、X-Frame-Options或Content-Security-Policy头"
        })

def check_file_upload(
    url: str, 
    html_content: str, 
    vulnerability_library: Dict[str, Any],
    vulnerabilities: List[Dict[str, Any]]
) -> None:
    """检测文件上传漏洞"""
    if "file_upload" not in vulnerability_library:
        return
    
    dangerous_extensions = vulnerability_library["file_upload"].get("patterns", [])
    severity = vulnerability_library["file_upload"].get("severity", "严重")
    
    # 检查是否存在文件上传表单
    soup = BeautifulSoup(html_content, 'html.parser')
    file_inputs = soup.find_all('input', attrs={'type': 'file'})
    
    if file_inputs:
        for file_input in file_inputs:
            # 检查是否有扩展名限制
            accept_attr = file_input.get('accept', '')
            
            # 如果没有accept属性或accept属性允许危险文件类型
            if not accept_attr or any(ext in accept_attr for ext in dangerous_extensions):
                form = file_input.find_parent('form')
                form_action = form.get('action', '未知') if form else '未知'
                
                vulnerabilities.append({
                    "type": "file_upload",
                    "url": url,
                    "description": "可能的不安全文件上传",
                    "severity": severity,
                    "details": f"表单操作: {form_action}, 上传字段: {file_input.get('name', '未知')}"
                }) 