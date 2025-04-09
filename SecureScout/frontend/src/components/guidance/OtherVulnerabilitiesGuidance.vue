<template>
  <div class="other-vulnerabilities-guidance">
    <el-tabs>
      <el-tab-pane label="CSRF漏洞">
        <div class="mb-4">
          <h4 class="text-lg font-medium mb-2">CSRF跨站请求伪造漏洞</h4>
          <p class="text-sm text-gray-700 mb-3">
            跨站请求伪造(CSRF)攻击利用用户的已有身份凭证，让用户在不知情的情况下执行非预期的操作。攻击者通过诱导用户访问包含恶意请求的页面，让浏览器自动发送请求到目标网站，从而执行操作。
          </p>
          
          <div class="bg-amber-50 p-3 rounded-md mb-4">
            <h5 class="font-medium mb-2">CSRF攻击示例</h5>
            <p class="text-sm mb-2">假设一个银行网站通过GET请求执行转账操作：</p>
            <code class="text-red-500 text-sm">https://bank.com/transfer?to=attacker&amount=1000</code>
            <p class="text-sm mt-2">攻击者可以创建以下HTML页面并诱导受害者访问：</p>
            <pre class="bg-gray-100 p-2 text-sm mt-1">
&lt;html&gt;
  &lt;body&gt;
    &lt;img src="https://bank.com/transfer?to=attacker&amount=1000" width="0" height="0" /&gt;
    &lt;h1&gt;获奖通知&lt;/h1&gt;
    &lt;p&gt;恭喜您获得大奖！&lt;/p&gt;
  &lt;/body&gt;
&lt;/html&gt;
            </pre>
          </div>
          
          <h5 class="font-medium mb-2">修复方案</h5>
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">1. 使用CSRF令牌</div>
            <p class="text-sm text-gray-700 mb-2">
              在表单中嵌入一个随机生成的令牌，服务器验证该令牌以确保请求来自合法来源。
            </p>
            <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
              <p class="text-green-600 mb-2">✅ 实现示例:</p>
              <pre>
// 服务器端 (Node.js/Express)
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  // 传递CSRF令牌到视图
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/process', csrfProtection, (req, res) => {
  // 自动验证CSRF令牌
  // 处理表单提交...
});

// 前端模板
&lt;form action="/process" method="post"&gt;
  &lt;input type="hidden" name="_csrf" value="{{ csrfToken }}"&gt;
  &lt;!-- 其他表单字段 --&gt;
  &lt;button type="submit"&gt;提交&lt;/button&gt;
&lt;/form&gt;
              </pre>
            </div>
          </div>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">2. 使用SameSite Cookie属性</div>
            <p class="text-sm text-gray-700 mb-2">
              设置Cookie的SameSite属性可以限制跨站请求时Cookie的发送，有效防止CSRF攻击。
            </p>
            <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
              <p class="text-green-600 mb-2">✅ 实现示例:</p>
              <pre>
// Node.js/Express
res.cookie('sessionId', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' // 或 'lax'
});

// PHP
setcookie('sessionId', 'abc123', [
  'httponly' => true,
  'secure' => true,
  'samesite' => 'Strict'
]);
              </pre>
            </div>
          </div>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">3. 检查Referer头</div>
            <p class="text-sm text-gray-700 mb-2">
              验证请求的Referer头是否来自相同的站点，作为CSRF保护的辅助手段。
            </p>
            <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
              <pre>
// Node.js/Express
app.post('/api/action', (req, res) => {
  const referer = req.headers.referer || req.headers.referrer;
  
  if (!referer || !referer.startsWith('https://yourdomain.com')) {
    return res.status(403).json({ error: '可能的CSRF攻击' });
  }
  
  // 处理请求...
});
              </pre>
            </div>
          </div>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">4. 对敏感操作要求重新认证</div>
            <p class="text-sm text-gray-700">
              对于敏感操作(如更改密码、转账)，要求用户提供当前密码或其他验证方式进行再次认证。
            </p>
          </div>
          
          <div class="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-4">
            <div class="font-medium mb-1">最佳实践:</div>
            <p>
              采用多层防御策略，同时使用CSRF令牌和SameSite Cookie属性。确保所有状态改变操作都使用POST请求而非GET请求，并为敏感操作增加额外的验证步骤。
            </p>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="文件上传漏洞">
        <div class="mb-4">
          <h4 class="text-lg font-medium mb-2">文件上传漏洞</h4>
          <p class="text-sm text-gray-700 mb-3">
            文件上传漏洞允许攻击者上传恶意文件到服务器，可能导致远程代码执行、权限提升或敏感信息泄露。当应用程序未能正确验证和处理上传的文件时，就会出现此类漏洞。
          </p>
          
          <div class="bg-amber-50 p-3 rounded-md mb-4">
            <h5 class="font-medium mb-2">常见攻击场景</h5>
            <ul class="list-disc pl-5 text-sm">
              <li>上传可执行脚本文件(PHP, JSP, ASP)来执行恶意代码</li>
              <li>上传包含恶意宏的Office文档</li>
              <li>上传畸形图片文件利用图像处理库中的漏洞</li>
              <li>通过文件名操作进行路径遍历攻击</li>
              <li>上传超大文件导致服务器资源耗尽</li>
            </ul>
          </div>
          
          <h5 class="font-medium mb-2">修复方案</h5>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">1. 文件类型验证</div>
            <p class="text-sm text-gray-700 mb-2">
              验证文件类型和内容，而不仅仅依赖于文件扩展名。
            </p>
            <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
              <p class="text-green-600 mb-2">✅ 实现示例:</p>
              <pre>
// Node.js 使用 file-type 和 multer
const multer = require('multer');
const fileType = require('file-type');
const fs = require('fs');

// 设置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB限制
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // 检查MIME类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // 删除不允许的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '不支持的文件类型' });
    }
    
    // 通过文件内容验证文件类型
    const buffer = fs.readFileSync(req.file.path);
    const fileInfo = await fileType.fromBuffer(buffer);
    
    if (!fileInfo || !allowedTypes.includes(fileInfo.mime)) {
      // 删除不匹配的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '文件内容不匹配声明的类型' });
    }
    
    // 处理有效文件...
    
  } catch (error) {
    return res.status(500).json({ error: '上传处理失败' });
  }
});
              </pre>
            </div>
          </div>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">2. 安全的文件存储</div>
            <p class="text-sm text-gray-700 mb-2">
              使用安全的存储位置和文件命名策略，防止路径遍历和文件覆盖攻击。
            </p>
            <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
              <pre>
// 安全的文件命名
const path = require('path');
const crypto = require('crypto');

function generateSafeFilename(originalName) {
  // 生成随机文件名
  const randomName = crypto.randomBytes(16).toString('hex');
  // 保留原始扩展名，但确保其安全
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext) ? ext : '.bin';
  
  return `${randomName}${safeExt}`;
}

// 存储在Web根目录之外
const uploadDir = path.join(__dirname, '../secure-uploads');
              </pre>
            </div>
          </div>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">3. 图像处理与内容验证</div>
            <p class="text-sm text-gray-700 mb-2">
              对上传的图像进行处理，确保它们是有效的图像文件。
            </p>
            <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
              <pre>
// Node.js 使用 Sharp 处理图像
const sharp = require('sharp');

app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    // 尝试读取和处理图像 - 这会验证它是否为有效图像
    const image = await sharp(req.file.path)
      .metadata();
    
    // 重新处理图像，丢弃任何非图像数据
    await sharp(req.file.path)
      .resize(800, 600, { fit: 'inside' })
      .jpeg({ quality: 85 })
      .toFile(path.join(uploadDir, `processed-${req.file.filename}.jpg`));
    
    // 删除原始上传
    fs.unlinkSync(req.file.path);
    
    // 返回成功
    return res.json({ success: true });
  } catch (error) {
    // 处理图像失败，说明不是有效图像
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: '无效的图像文件' });
  }
});
              </pre>
            </div>
          </div>
          
          <div class="security-solution mb-3">
            <div class="solution-title text-md font-medium text-green-700 mb-1">4. 使用单独域名提供用户上传内容</div>
            <p class="text-sm text-gray-700">
              将用户上传的内容放在单独的域名或子域上，减少XSS和其他攻击的风险。
            </p>
          </div>
          
          <div class="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-4">
            <div class="font-medium mb-1">安全建议:</div>
            <p>
              实施文件上传限制(类型、大小、频率)，使用杀毒软件扫描上传文件，禁止执行上传的文件，并定期审计上传目录。考虑使用第三方存储服务(如AWS S3)处理文件上传，利用其内置的安全功能。
            </p>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="其他常见漏洞">
        <div class="mb-4">
          <h4 class="text-lg font-medium mb-2">其他常见Web应用漏洞</h4>
          
          <el-collapse accordion>
            <el-collapse-item title="1. 敏感数据泄露">
              <div class="p-3">
                <p class="mb-2">敏感数据泄露发生在应用程序未能正确保护敏感信息（如密码、信用卡号、个人身份信息）时。</p>
                <h5 class="font-medium mt-3 mb-1">修复方案:</h5>
                <ul class="list-disc pl-5 text-sm text-gray-700">
                  <li>使用HTTPS加密传输中的数据</li>
                  <li>对敏感数据使用强加密算法</li>
                  <li>实施良好的密钥管理</li>
                  <li>禁用浏览器缓存敏感数据</li>
                  <li>不在日志中存储敏感信息</li>
                </ul>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="2. 安全错误配置">
              <div class="p-3">
                <p class="mb-2">安全错误配置包括使用默认配置、不必要的服务启用、信息泄露的错误处理等问题。</p>
                <h5 class="font-medium mt-3 mb-1">修复方案:</h5>
                <ul class="list-disc pl-5 text-sm text-gray-700">
                  <li>制定并遵循安全配置标准</li>
                  <li>删除或禁用不必要的功能和服务</li>
                  <li>定期更新和修补系统</li>
                  <li>实施安全标头和防护措施</li>
                  <li>进行定期安全扫描和渗透测试</li>
                </ul>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="3. 不安全的反序列化">
              <div class="p-3">
                <p class="mb-2">不安全的反序列化可能导致远程代码执行，当应用程序反序列化不可信的数据时发生。</p>
                <h5 class="font-medium mt-3 mb-1">修复方案:</h5>
                <ul class="list-disc pl-5 text-sm text-gray-700">
                  <li>不接受来自不可信来源的序列化对象</li>
                  <li>使用完整性检查确保数据未被篡改</li>
                  <li>监控反序列化并记录异常</li>
                  <li>使用JSON等简单数据格式代替复杂对象序列化</li>
                </ul>
                <div class="bg-green-50 p-3 rounded mt-2 font-mono text-sm overflow-auto">
                  <p class="text-green-600 mb-2">✅ 安全实践:</p>
                  <pre>
// 使用JSON而不是序列化对象
// 不安全
const data = deserialize(userInput);

// 更安全
try {
  const data = JSON.parse(userInput);
  // 验证数据格式
  validateDataSchema(data);
} catch (error) {
  // 处理异常
}
                  </pre>
                </div>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="4. XML外部实体(XXE)攻击">
              <div class="p-3">
                <p class="mb-2">当应用程序解析XML输入且配置不当时，攻击者可以利用XML外部实体引用获取服务器文件或执行服务器端请求伪造。</p>
                <h5 class="font-medium mt-3 mb-1">修复方案:</h5>
                <ul class="list-disc pl-5 text-sm text-gray-700">
                  <li>禁用XML解析器中的外部实体和DTD处理</li>
                  <li>升级XML解析库至最新版本</li>
                  <li>使用更简单的数据格式如JSON</li>
                  <li>输入验证和过滤</li>
                </ul>
                <div class="bg-green-50 p-3 rounded mt-2 font-mono text-sm overflow-auto">
                  <p class="text-green-600 mb-2">✅ 安全配置:</p>
                  <pre>
// Node.js 使用 libxmljs 安全配置
const libxmljs = require('libxmljs');

// 安全配置
const xmlParseOptions = {
  noent: false,      // 禁用外部实体
  dtdload: false,    // 不加载外部DTD
  dtdvalid: false    // 不验证DTD
};

try {
  const xmlDoc = libxmljs.parseXml(xmlString, xmlParseOptions);
  // 处理XML...
} catch (error) {
  // 处理异常
}
                  </pre>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
          
          <div class="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-4">
            <div class="font-medium mb-1">综合安全建议:</div>
            <p>
              建立安全开发生命周期(SDL)，进行定期安全培训，实施多层防御策略，设置适当的安全监控和日志记录，并保持系统和库的更新。记住安全是一个持续过程，而不是一次性的任务。
            </p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
// 无需额外逻辑
</script>

<style scoped>
.other-vulnerabilities-guidance {
  width: 100%;
}
</style> 