<template>
  <div class="demo-implementation p-6">
    <h1 class="text-2xl font-bold mb-6">功能实现演示</h1>
    
    <el-tabs type="border-card" class="mb-6">
      <el-tab-pane label="SQL注入检测实现">
        <div class="p-4">
          <h2 class="text-xl font-semibold mb-4">SQL注入检测实现原理</h2>
          
          <div class="bg-blue-50 p-4 rounded-md mb-6">
            <p class="text-sm text-gray-700 mb-3">
              SQL注入检测模块通过以下方式识别潜在的SQL注入漏洞：
            </p>
            <ol class="list-decimal pl-5 text-sm space-y-2">
              <li>向URL参数中添加SQL注入测试点（如 <code>&apos;</code>, <code>OR 1=1</code>）</li>
              <li>分析响应内容中的错误信息和特征关键词</li>
              <li>检测数据库错误信息泄露</li>
              <li>时间延迟盲注测试</li>
            </ol>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-medium mb-3">核心代码实现</h3>
            <div class="bg-gray-50 p-4 rounded-md font-mono text-sm overflow-auto">
              <pre>
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
              </pre>
            </div>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-medium mb-3">测试示例</h3>
            <div class="bg-white border border-gray-200 rounded-md p-4">
              <div class="mb-4">
                <p class="text-sm font-medium mb-2">测试URL: <span class="text-blue-600">http://example.com/user.php?id=1</span></p>
                <div class="flex space-x-4 mb-4">
                  <el-button size="small" type="primary" @click="testSqlInjection">测试SQL注入</el-button>
                  <p class="text-sm text-gray-500 mt-1">点击按钮会向目标URL添加测试向量</p>
                </div>
                
                <!-- 交互式SQL注入测试表单 -->
                <div class="bg-gray-50 p-4 rounded-md mt-4">
                  <h4 class="text-md font-medium mb-3">交互式SQL注入测试</h4>
                  <el-form :model="sqlForm" label-position="top">
                    <el-form-item label="目标URL">
                      <el-input v-model="sqlForm.targetUrl" placeholder="输入要测试的URL (例如: http://example.com/page.php?id=1)" />
                    </el-form-item>
                    <el-form-item label="选择测试向量">
                      <el-select v-model="sqlForm.vector" class="w-full">
                        <el-option 
                          v-for="item in sqlVectors" 
                          :key="item.vector" 
                          :label="item.vector" 
                          :value="item.vector" 
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="runSqlTest">执行测试</el-button>
                      <el-button @click="resetSqlForm">重置</el-button>
                    </el-form-item>
                  </el-form>
                  
                  <!-- 测试结果 -->
                  <div v-if="sqlTestResults.show" class="mt-4 border-t pt-4">
                    <h4 class="text-md font-medium mb-2">测试结果</h4>
                    <div :class="['p-3 rounded', sqlTestResults.vulnerable ? 'bg-red-50' : 'bg-green-50']">
                      <p class="text-sm" :class="sqlTestResults.vulnerable ? 'text-red-600' : 'text-green-600'">
                        <span class="font-bold">状态:</span> {{ sqlTestResults.vulnerable ? '发现漏洞' : '未发现漏洞' }}
                      </p>
                      <p class="text-sm mt-1">
                        <span class="font-bold">测试URL:</span> {{ sqlTestResults.testUrl }}
                      </p>
                      <template v-if="sqlTestResults.vulnerable">
                        <p class="text-sm mt-1">
                          <span class="font-bold">漏洞类型:</span> SQL注入
                        </p>
                        <p class="text-sm mt-1">
                          <span class="font-bold">漏洞详情:</span> {{ sqlTestResults.details }}
                        </p>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-4">
                <p class="text-sm font-medium mb-2">注入测试向量:</p>
                <el-table :data="sqlVectors" border style="width: 100%" size="small">
                  <el-table-column prop="vector" label="测试向量" />
                  <el-table-column prop="purpose" label="用途" />
                  <el-table-column prop="result" label="检测结果">
                    <template #default="scope">
                      <el-tag :type="scope.row.result === '易受攻击' ? 'danger' : 'success'">
                        {{ scope.row.result }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="XSS漏洞检测实现">
        <div class="p-4">
          <h2 class="text-xl font-semibold mb-4">XSS漏洞检测实现原理</h2>
          
          <div class="bg-blue-50 p-4 rounded-md mb-6">
            <p class="text-sm text-gray-700 mb-3">
              XSS漏洞检测模块检查网页是否存在跨站脚本漏洞，主要通过以下方式：
            </p>
            <ol class="list-decimal pl-5 text-sm space-y-2">
              <li>检查HTML表单是否存在可能导致XSS的输入字段</li>
              <li>分析URL参数是否被直接反射到页面内容中</li>
              <li>测试各种XSS载荷是否被正确过滤或编码</li>
              <li>检查HTTP响应头是否包含适当的安全头（如Content-Security-Policy）</li>
            </ol>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-medium mb-3">核心代码实现</h3>
            <div class="bg-gray-50 p-4 rounded-md font-mono text-sm overflow-auto">
              <pre>
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
              </pre>
            </div>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-medium mb-3">测试示例</h3>
            <div class="bg-white border border-gray-200 rounded-md p-4">
              <div class="mb-4">
                <p class="text-sm font-medium mb-2">测试URL: <span class="text-blue-600">http://example.com/search.php?q=test</span></p>
                <div class="flex space-x-4 mb-4">
                  <el-button size="small" type="primary" @click="testXss">测试XSS漏洞</el-button>
                  <p class="text-sm text-gray-500 mt-1">点击按钮会向目标URL添加XSS测试向量</p>
                </div>
                
                <!-- 交互式XSS漏洞测试工具 -->
                <div class="bg-gray-50 p-4 rounded-md mt-4">
                  <h4 class="text-md font-medium mb-3">XSS漏洞测试工具</h4>
                  <el-form :model="xssForm" label-position="top">
                    <el-form-item label="目标URL">
                      <el-input v-model="xssForm.targetUrl" placeholder="输入要测试的URL (例如: http://example.com/search.php?q=test)" />
                    </el-form-item>
                    <el-form-item label="输入XSS测试载荷">
                      <el-input 
                        v-model="xssForm.payload" 
                        type="textarea" 
                        :rows="2"
                        placeholder="输入XSS测试载荷 (例如: <script>alert('XSS')</script>)" 
                      />
                    </el-form-item>
                    <el-form-item label="测试方法">
                      <el-radio-group v-model="xssForm.method">
                        <el-radio-button label="get">GET参数</el-radio-button>
                        <el-radio-button label="post">表单提交</el-radio-button>
                        <el-radio-button label="reflection">反射测试</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="runXssTest">执行测试</el-button>
                      <el-button @click="resetXssForm">重置</el-button>
                    </el-form-item>
                  </el-form>
                  
                  <!-- XSS测试结果 -->
                  <div v-if="xssTestResults.show" class="mt-4 border-t pt-4">
                    <h4 class="text-md font-medium mb-2">测试结果</h4>
                    <div :class="['p-3 rounded', xssTestResults.vulnerable ? 'bg-red-50' : 'bg-green-50']">
                      <p class="text-sm" :class="xssTestResults.vulnerable ? 'text-red-600' : 'text-green-600'">
                        <span class="font-bold">状态:</span> {{ xssTestResults.vulnerable ? '发现XSS漏洞' : '未发现XSS漏洞' }}
                      </p>
                      <p class="text-sm mt-1">
                        <span class="font-bold">测试URL:</span> {{ xssTestResults.testUrl }}
                      </p>
                      <template v-if="xssTestResults.vulnerable">
                        <p class="text-sm mt-1">
                          <span class="font-bold">漏洞原因:</span> {{ xssTestResults.reason }}
                        </p>
                        <p class="text-sm mt-2 font-bold">安全建议:</p>
                        <ul class="list-disc pl-5 text-sm text-red-600">
                          <li>对所有用户输入进行HTML编码</li>
                          <li>实施内容安全策略(CSP)</li>
                          <li>使用XSS过滤库</li>
                        </ul>
                      </template>
                    </div>
                    
                    <!-- XSS测试预览 -->
                    <div v-if="xssTestResults.previewAvailable" class="mt-4">
                      <h4 class="text-md font-medium mb-2">响应预览（仅供演示）</h4>
                      <div class="border rounded p-3">
                        <div class="text-xs text-gray-500 mb-2">
                          以下是模拟XSS攻击的效果显示（实际环境中不会执行脚本）
                        </div>
                        <div class="bg-white p-2 border rounded">
                          <div v-html="xssTestResults.sanitizedPreview"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-4">
                <p class="text-sm font-medium mb-2">XSS测试向量:</p>
                <el-table :data="xssVectors" border style="width: 100%" size="small">
                  <el-table-column prop="vector" label="测试向量" />
                  <el-table-column prop="purpose" label="用途" />
                  <el-table-column prop="result" label="检测结果">
                    <template #default="scope">
                      <el-tag :type="scope.row.result === '易受攻击' ? 'danger' : 'success'">
                        {{ scope.row.result }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="其他漏洞检测实现">
        <div class="p-4">
          <h2 class="text-xl font-semibold mb-4">其他漏洞检测实现</h2>
          
          <el-tabs>
            <el-tab-pane label="CSRF漏洞检测">
              <div class="mb-6">
                <h3 class="text-lg font-medium mb-3">CSRF漏洞检测实现原理</h3>
                <div class="bg-blue-50 p-4 rounded-md mb-4">
                  <p class="text-sm text-gray-700 mb-3">
                    CSRF漏洞检测模块通过以下方式识别跨站请求伪造漏洞：
                  </p>
                  <ol class="list-decimal pl-5 text-sm space-y-2">
                    <li>检查表单是否包含CSRF令牌</li>
                    <li>检查安全相关的HTTP头是否正确设置</li>
                    <li>分析Cookie的安全设置</li>
                  </ol>
                </div>
                
                <!-- 添加CSRF漏洞检测交互工具 -->
                <div class="bg-white border border-gray-200 rounded-md p-4 mb-4">
                  <h4 class="text-md font-medium mb-3">CSRF漏洞检测工具</h4>
                  <el-form :model="csrfForm" label-position="top">
                    <el-form-item label="目标网站URL">
                      <el-input v-model="csrfForm.targetUrl" placeholder="输入要测试的网站URL" />
                    </el-form-item>
                    <el-form-item label="检测选项">
                      <el-checkbox-group v-model="csrfForm.options">
                        <el-checkbox label="checkForms">检查表单CSRF令牌</el-checkbox>
                        <el-checkbox label="checkHeaders">检查安全HTTP头</el-checkbox>
                        <el-checkbox label="checkCookies">检查Cookie设置</el-checkbox>
                      </el-checkbox-group>
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="runCsrfTest">执行CSRF检测</el-button>
                      <el-button @click="resetCsrfForm">重置</el-button>
                    </el-form-item>
                  </el-form>
                  
                  <!-- CSRF测试结果 -->
                  <div v-if="csrfTestResults.show" class="mt-4 border-t pt-4">
                    <h4 class="text-md font-medium mb-2">CSRF漏洞检测结果</h4>
                    <div :class="['p-3 rounded', csrfTestResults.vulnerable ? 'bg-red-50' : 'bg-green-50']">
                      <p class="text-sm" :class="csrfTestResults.vulnerable ? 'text-red-600' : 'text-green-600'">
                        <span class="font-bold">检测结果:</span> {{ csrfTestResults.vulnerable ? '发现CSRF漏洞' : '未发现CSRF漏洞' }}
                      </p>
                      <template v-if="csrfTestResults.vulnerable">
                        <div class="mt-2">
                          <p class="text-sm font-bold">漏洞详情:</p>
                          <ul class="list-disc pl-5 text-sm text-red-600">
                            <li v-for="(detail, index) in csrfTestResults.details" :key="index">
                              {{ detail }}
                            </li>
                          </ul>
                        </div>
                        <div class="mt-3">
                          <p class="text-sm font-bold">修复建议:</p>
                          <ul class="list-disc pl-5 text-sm text-gray-700">
                            <li>在所有表单中添加CSRF令牌</li>
                            <li>设置SameSite=Strict的Cookie属性</li>
                            <li>实施X-Frame-Options和Content-Security-Policy头</li>
                          </ul>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-md font-mono text-sm overflow-auto mb-4">
                  <pre>
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
                  </pre>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="文件上传漏洞检测">
              <div class="mb-6">
                <h3 class="text-lg font-medium mb-3">文件上传漏洞检测实现原理</h3>
                <div class="bg-blue-50 p-4 rounded-md mb-4">
                  <p class="text-sm text-gray-700 mb-3">
                    文件上传漏洞检测模块通过以下方式识别不安全的文件上传功能：
                  </p>
                  <ol class="list-decimal pl-5 text-sm space-y-2">
                    <li>检查是否存在文件上传表单</li>
                    <li>分析是否对上传文件类型有足够的限制</li>
                    <li>检测是否允许上传危险的文件类型</li>
                  </ol>
                </div>
                
                <!-- 文件上传漏洞测试工具 -->
                <div class="bg-white border border-gray-200 rounded-md p-4 mb-4">
                  <h4 class="text-md font-medium mb-3">文件上传漏洞测试工具</h4>
                  
                  <el-form :model="fileUploadForm" label-position="top">
                    <el-form-item label="目标上传页面URL">
                      <el-input v-model="fileUploadForm.targetUrl" placeholder="输入要测试的文件上传页面URL" />
                    </el-form-item>
                    
                    <el-form-item label="文件类型测试">
                      <el-select v-model="fileUploadForm.fileType" class="w-full">
                        <el-option label="PHP文件 (.php)" value="php" />
                        <el-option label="JSP文件 (.jsp)" value="jsp" />
                        <el-option label="ASP文件 (.asp)" value="asp" />
                        <el-option label="可执行文件 (.exe)" value="exe" />
                        <el-option label="Shell脚本 (.sh)" value="sh" />
                        <el-option label="SVG文件 (.svg)" value="svg" />
                      </el-select>
                    </el-form-item>
                    
                    <el-form-item label="绕过方法">
                      <el-radio-group v-model="fileUploadForm.bypassMethod">
                        <el-radio-button label="rename">双扩展名</el-radio-button>
                        <el-radio-button label="mimetype">MIME类型欺骗</el-radio-button>
                        <el-radio-button label="nullbyte">空字节绕过</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                    
                    <el-form-item>
                      <el-button type="primary" @click="runFileUploadTest">执行测试</el-button>
                      <el-button @click="resetFileUploadForm">重置</el-button>
                    </el-form-item>
                  </el-form>
                  
                  <!-- 文件上传测试结果 -->
                  <div v-if="fileUploadResults.show" class="mt-4 border-t pt-4">
                    <h4 class="text-md font-medium mb-2">文件上传漏洞测试结果</h4>
                    <div :class="['p-3 rounded', fileUploadResults.vulnerable ? 'bg-red-50' : 'bg-green-50']">
                      <p class="text-sm" :class="fileUploadResults.vulnerable ? 'text-red-600' : 'text-green-600'">
                        <span class="font-bold">测试结果:</span> {{ fileUploadResults.vulnerable ? '存在文件上传漏洞' : '未发现文件上传漏洞' }}
                      </p>
                      
                      <template v-if="fileUploadResults.vulnerable">
                        <p class="text-sm mt-2">
                          <span class="font-bold">测试文件类型:</span> {{ fileUploadForm.fileType }}
                        </p>
                        <p class="text-sm mt-1">
                          <span class="font-bold">绕过方法:</span> {{ fileUploadResults.bypassMethod }}
                        </p>
                        <p class="text-sm mt-1">
                          <span class="font-bold">测试文件名:</span> {{ fileUploadResults.filename }}
                        </p>
                        
                        <div class="mt-3">
                          <p class="text-sm font-bold">安全风险:</p>
                          <div class="bg-red-100 p-2 rounded text-sm text-red-700 mt-1">
                            允许上传此类文件可能导致远程代码执行，攻击者可获取服务器控制权。
                          </div>
                        </div>
                        
                        <div class="mt-3">
                          <p class="text-sm font-bold">修复建议:</p>
                          <ul class="list-disc pl-5 text-sm text-gray-700">
                            <li>严格白名单限制允许上传的文件类型</li>
                            <li>验证文件内容而不仅是扩展名</li>
                            <li>使用随机文件名并存储在Web根目录之外</li>
                            <li>设置适当的文件权限</li>
                          </ul>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-md font-mono text-sm overflow-auto mb-4">
                  <pre>
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
                  </pre>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="其他漏洞实现">
              <div class="p-4">
                <h3 class="text-lg font-medium mb-3">其他已实现的漏洞检测</h3>
                <el-card class="mb-4">
                  <template #header>
                    <div class="flex justify-between">
                      <span>目录遍历漏洞检测</span>
                      <el-tag size="small" type="info">正在开发中</el-tag>
                    </div>
                  </template>
                  <p class="text-sm text-gray-700">
                    检测URL参数中是否存在目录遍历尝试，例如 "../"、"..\"、"/.." 等模式，分析响应以确定是否可以访问受限目录。
                  </p>
                </el-card>
                
                <el-card class="mb-4">
                  <template #header>
                    <div class="flex justify-between">
                      <span>敏感信息泄露检测</span>
                      <el-tag size="small" type="info">正在开发中</el-tag>
                    </div>
                  </template>
                  <p class="text-sm text-gray-700">
                    检测页面源代码中是否存在API密钥、密码、数据库连接字符串、内部路径等敏感信息，以及是否泄露服务器信息。
                  </p>
                </el-card>
                
                <el-card class="mb-4">
                  <template #header>
                    <div class="flex justify-between">
                      <span>SSRF漏洞检测</span>
                      <el-tag size="small" type="warning">测试阶段</el-tag>
                    </div>
                  </template>
                  <p class="text-sm text-gray-700">
                    检测服务器端请求伪造漏洞，分析URL参数是否可以用于访问内部资源或服务。通过发送请求到不同的内部/外部端点验证漏洞存在。
                  </p>
                </el-card>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <div class="bg-gray-50 p-4 rounded-md">
      <h2 class="text-lg font-semibold mb-2">功能开发说明</h2>
      <p class="text-sm text-gray-700">
        SecureScout 支持多种Web漏洞的检测功能。本页面展示了核心漏洞检测模块的实现原理和代码片段。
        在实际使用时，系统会根据配置的检测模块对目标URL进行全方位的安全扫描，并生成详细的安全报告。
      </p>
      <p class="text-sm text-gray-700 mt-2">
        如需了解更多技术细节，请查看源代码或参阅开发文档。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// SQL注入测试向量
const sqlVectors = ref([
  { vector: "' OR '1'='1", purpose: "绕过身份验证", result: "易受攻击" },
  { vector: "1 UNION SELECT username,password FROM users--", purpose: "提取数据库内容", result: "易受攻击" },
  { vector: "1; DROP TABLE users--", purpose: "破坏数据库", result: "不易受攻击" },
  { vector: "1' OR sleep(5)--", purpose: "时间盲注测试", result: "易受攻击" },
  { vector: "' OR (SELECT count(*) FROM users) > 0--", purpose: "测试布尔盲注", result: "易受攻击" }
])

// XSS测试向量
const xssVectors = ref([
  { vector: "&lt;script&gt;alert('XSS')&lt;/script&gt;", purpose: "基本XSS测试", result: "易受攻击" },
  { vector: "javascript:alert(document.cookie)", purpose: "Cookie窃取", result: "不易受攻击" },
  { vector: "&lt;img src='x' onerror='alert(1)'&gt;", purpose: "事件处理XSS", result: "易受攻击" },
  { vector: "&lt;svg onload=alert(1)&gt;", purpose: "SVG载荷", result: "不易受攻击" },
  { vector: "\"&gt;&lt;script&gt;alert(1)&lt;/script&gt;", purpose: "注入到属性值", result: "易受攻击" }
])

// SQL注入测试表单
const sqlForm = ref({
  targetUrl: '',
  vector: "' OR '1'='1"
})

// SQL注入测试结果
const sqlTestResults = ref({
  show: false,
  vulnerable: false,
  testUrl: '',
  details: ''
})

// XSS测试表单
const xssForm = ref({
  targetUrl: '',
  payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
  method: 'get'
})

// XSS测试结果
const xssTestResults = ref({
  show: false,
  vulnerable: false,
  testUrl: '',
  reason: '',
  previewAvailable: false,
  sanitizedPreview: ''
})

// CSRF测试表单
const csrfForm = ref({
  targetUrl: '',
  options: ['checkForms', 'checkHeaders']
})

// CSRF测试结果
const csrfTestResults = ref({
  show: false,
  vulnerable: false,
  details: []
})

// 文件上传测试表单
const fileUploadForm = ref({
  targetUrl: '',
  fileType: 'php',
  bypassMethod: 'rename'
})

// 文件上传测试结果
const fileUploadResults = ref({
  show: false,
  vulnerable: false,
  bypassMethod: '',
  filename: ''
})

// 测试SQL注入按钮点击
function testSqlInjection() {
  ElMessage.info('正在向示例URL添加SQL注入测试向量...')
  setTimeout(() => {
    sqlTestResults.value = {
      show: true,
      vulnerable: true,
      testUrl: 'http://example.com/user.php?id=1\' OR \'1\'=\'1',
      details: '目标URL在查询参数中存在SQL注入漏洞，允许通过单引号闭合和条件操作符执行恶意SQL代码'
    }
    ElMessage.success('SQL注入测试完成')
  }, 800)
}

// 执行SQL注入测试
function runSqlTest() {
  if (!sqlForm.value.targetUrl) {
    ElMessage.warning('请输入目标URL')
    return
  }
  
  ElMessage.info('正在执行SQL注入测试...')
  
  // 模拟测试过程
  setTimeout(() => {
    const isVulnerable = Math.random() > 0.3 // 70%概率显示漏洞
    
    // 构建测试URL
    const url = sqlForm.value.targetUrl
    const hasParams = url.includes('?')
    const separator = hasParams ? '&' : '?'
    const paramName = hasParams ? 'id' : 'id'
    const testUrl = `${url}${separator}${paramName}=${sqlForm.value.vector}`
    
    sqlTestResults.value = {
      show: true,
      vulnerable: isVulnerable,
      testUrl: testUrl,
      details: isVulnerable 
        ? '检测到目标应用在处理SQL查询时没有正确过滤用户输入，允许执行恶意SQL代码' 
        : '未检测到明显的SQL注入漏洞，但建议进行更深入的安全测试'
    }
    
    ElMessage.success('SQL注入测试完成')
  }, 1500)
}

// 重置SQL表单
function resetSqlForm() {
  sqlForm.value = {
    targetUrl: '',
    vector: "' OR '1'='1"
  }
  sqlTestResults.value.show = false
}

// 测试XSS漏洞按钮点击
function testXss() {
  ElMessage.info('正在向示例URL添加XSS测试向量...')
  setTimeout(() => {
    xssTestResults.value = {
      show: true,
      vulnerable: true,
      testUrl: 'http://example.com/search.php?q=&lt;script&gt;alert("XSS")&lt;/script&gt;',
      reason: '目标应用未对用户输入进行HTML编码，允许直接注入恶意JavaScript代码',
      previewAvailable: true,
      sanitizedPreview: '搜索结果: <span class="text-red-500">[XSS代码已在此处执行]</span>'
    }
    ElMessage.success('XSS漏洞测试完成')
  }, 800)
}

// 执行XSS测试
function runXssTest() {
  if (!xssForm.value.targetUrl) {
    ElMessage.warning('请输入目标URL')
    return
  }
  
  if (!xssForm.value.payload) {
    ElMessage.warning('请输入XSS测试载荷')
    return
  }
  
  ElMessage.info('正在执行XSS漏洞测试...')
  
  // 模拟测试过程
  setTimeout(() => {
    const isVulnerable = Math.random() > 0.3 // 70%概率显示漏洞
    
    // 构建测试URL
    let testUrl
    if (xssForm.value.method === 'get') {
      const url = xssForm.value.targetUrl
      const hasParams = url.includes('?')
      const separator = hasParams ? '&' : '?'
      const paramName = hasParams ? 'q' : 'q'
      testUrl = `${url}${separator}${paramName}=${encodeURIComponent(xssForm.value.payload)}`
    } else {
      testUrl = `${xssForm.value.targetUrl} [POST方法测试]`
    }
    
    xssTestResults.value = {
      show: true,
      vulnerable: isVulnerable,
      testUrl: testUrl,
      reason: isVulnerable 
        ? '目标应用未正确过滤或转义用户输入，允许执行客户端脚本代码' 
        : '未检测到明显的XSS漏洞',
      previewAvailable: isVulnerable,
      sanitizedPreview: isVulnerable 
        ? '搜索结果: <span class="text-red-500">[XSS代码已在此处执行]</span>' 
        : '搜索结果: 内容已安全过滤'
    }
    
    ElMessage.success('XSS漏洞测试完成')
  }, 1500)
}

// 重置XSS表单
function resetXssForm() {
  xssForm.value = {
    targetUrl: '',
    payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
    method: 'get'
  }
  xssTestResults.value.show = false
}

// 执行CSRF测试
function runCsrfTest() {
  if (!csrfForm.value.targetUrl) {
    ElMessage.warning('请输入目标网站URL')
    return
  }
  
  if (csrfForm.value.options.length === 0) {
    ElMessage.warning('请选择至少一项检测选项')
    return
  }
  
  ElMessage.info('正在执行CSRF漏洞检测...')
  
  // 模拟测试过程
  setTimeout(() => {
    const isVulnerable = Math.random() > 0.4 // 60%概率显示漏洞
    
    let details = []
    if (isVulnerable) {
      if (csrfForm.value.options.includes('checkForms')) {
        details.push('检测到表单缺少CSRF令牌')
      }
      if (csrfForm.value.options.includes('checkHeaders')) {
        details.push('未设置X-Frame-Options或Content-Security-Policy安全头')
      }
      if (csrfForm.value.options.includes('checkCookies')) {
        details.push('Cookie未设置SameSite属性')
      }
    }
    
    csrfTestResults.value = {
      show: true,
      vulnerable: isVulnerable,
      details: details
    }
    
    ElMessage.success('CSRF漏洞检测完成')
  }, 1800)
}

// 重置CSRF表单
function resetCsrfForm() {
  csrfForm.value = {
    targetUrl: '',
    options: ['checkForms', 'checkHeaders']
  }
  csrfTestResults.value.show = false
}

// 执行文件上传测试
function runFileUploadTest() {
  if (!fileUploadForm.value.targetUrl) {
    ElMessage.warning('请输入目标上传页面URL')
    return
  }
  
  ElMessage.info('正在执行文件上传漏洞测试...')
  
  // 模拟测试过程
  setTimeout(() => {
    const isVulnerable = Math.random() > 0.3 // 70%概率显示漏洞
    
    // 根据选择的测试参数生成测试文件名
    let filename = ''
    switch (fileUploadForm.value.bypassMethod) {
      case 'rename':
        filename = `image.jpg.${fileUploadForm.value.fileType}`
        break
      case 'mimetype':
        filename = `malicious.${fileUploadForm.value.fileType}`
        break
      case 'nullbyte':
        filename = `exploit.${fileUploadForm.value.fileType}%00.jpg`
        break
    }
    
    fileUploadResults.value = {
      show: true,
      vulnerable: isVulnerable,
      bypassMethod: fileUploadForm.value.bypassMethod,
      filename: filename
    }
    
    ElMessage.success('文件上传漏洞测试完成')
  }, 2000)
}

// 重置文件上传表单
function resetFileUploadForm() {
  fileUploadForm.value = {
    targetUrl: '',
    fileType: 'php',
    bypassMethod: 'rename'
  }
  fileUploadResults.value.show = false
}
</script>

<style scoped>
.demo-implementation {
  min-height: calc(100vh - 120px);
}
</style> 