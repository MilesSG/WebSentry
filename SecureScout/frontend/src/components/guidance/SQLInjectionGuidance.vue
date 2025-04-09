<template>
  <div class="sql-injection-guidance">
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">SQL注入漏洞详解</h4>
      <p class="text-sm text-gray-700 mb-3">
        SQL注入是一种代码注入技术，攻击者可以通过在应用程序的输入中插入恶意SQL语句来影响数据库查询的执行。攻击成功可能导致未授权访问、数据泄露或数据库破坏。
      </p>
    </div>
    
    <el-collapse accordion class="mb-4">
      <el-collapse-item title="攻击示例">
        <div class="bg-gray-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="mb-1"># 常见的SQL注入攻击示例：</p>
          <p class="mb-1">1. 基本注入: <code>' OR '1'='1</code></p>
          <p class="mb-1">2. 联合查询: <code>' UNION SELECT username,password FROM users--</code></p>
          <p class="mb-1">3. 盲注: <code>' OR (SELECT SUBSTRING(username,1,1) FROM users WHERE id=1)='a</code></p>
          <p class="mb-1">4. 时间盲注: <code>' OR IF(SUBSTRING(username,1,1)='a',SLEEP(5),0)--</code></p>
          <p class="mb-1">5. 堆叠查询: <code>'; DROP TABLE users; --</code></p>
        </div>
      </el-collapse-item>
      
      <el-collapse-item title="漏洞代码示例">
        <div class="bg-gray-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-red-500 mb-2">❌ 不安全的代码:</p>
          <pre>
// PHP 示例
$username = $_POST['username'];
$query = "SELECT * FROM users WHERE username = '$username'";
$result = mysqli_query($connection, $query);

// Node.js 示例
const username = req.body.username;
const query = `SELECT * FROM users WHERE username = '${username}'`;
db.query(query, (err, result) => {
  // 处理结果
});
          </pre>
        </div>
      </el-collapse-item>
    </el-collapse>
    
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">修复方案</h4>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">1. 使用参数化查询（预编译语句）</div>
        <p class="text-sm text-gray-700 mb-2">
          参数化查询确保用户输入被严格视为数据而非代码，是防止SQL注入的最有效方法。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 安全的代码:</p>
          <pre>
// PHP 示例
$stmt = $connection->prepare("SELECT * FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

// Node.js 示例
const query = "SELECT * FROM users WHERE username = ?";
db.query(query, [username], (err, result) => {
  // 处理结果
});
          </pre>
        </div>
      </div>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">2. 使用ORM框架</div>
        <p class="text-sm text-gray-700 mb-2">
          ORM框架通常会内置参数化查询，可以有效防止SQL注入。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 安全的代码:</p>
          <pre>
// Sequelize (Node.js) 示例
User.findOne({
  where: { username: username }
}).then(user => {
  // 处理结果
});

// Django (Python) 示例
user = User.objects.get(username=username)
          </pre>
        </div>
      </div>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">3. 输入验证与净化</div>
        <p class="text-sm text-gray-700 mb-2">
          虽然不应该作为主要防御手段，但输入验证可以作为深度防御策略的一部分。
        </p>
        <div class="bg-green-50 p-3 rounded mb-2 font-mono text-sm overflow-auto">
          <p class="text-green-600 mb-2">✅ 验证示例:</p>
          <pre>
// JavaScript 验证示例
function isValidUsername(username) {
  // 只允许字母和数字
  return /^[A-Za-z0-9]+$/.test(username);
}

if (!isValidUsername(username)) {
  return res.status(400).json({ error: "无效的用户名" });
}
          </pre>
        </div>
      </div>
      
      <div class="security-solution mb-3">
        <div class="solution-title text-md font-medium text-green-700 mb-1">4. 最小权限原则</div>
        <p class="text-sm text-gray-700">
          限制数据库用户的权限，确保应用程序只拥有执行所需操作的最小权限，这样即使发生SQL注入，攻击者也无法执行危险操作。
        </p>
      </div>
    </div>
    
    <div class="mb-4">
      <h4 class="text-lg font-medium mb-2">防御深度策略</h4>
      <ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li>实施Web应用防火墙(WAF)以检测和阻止SQL注入尝试</li>
        <li>定期进行安全审计和漏洞扫描</li>
        <li>对错误消息进行适当处理，避免泄露数据库结构信息</li>
        <li>使用SQL注入检测工具如SQLMap进行定期检测</li>
        <li>对开发人员进行安全培训，提高安全编码意识</li>
      </ul>
    </div>
    
    <div class="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
      <div class="font-medium mb-1">实时检测建议:</div>
      <p>
        除了上述修复方案外，建议在应用程序中实施实时检测机制，监控可疑SQL查询并记录潜在的注入尝试，以便及时发现和响应安全事件。
      </p>
    </div>
  </div>
</template>

<script setup>
// 无需额外逻辑
</script>

<style scoped>
.sql-injection-guidance {
  width: 100%;
}
</style> 