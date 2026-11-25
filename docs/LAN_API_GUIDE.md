# 局域网 API 对接说明

本文说明如何让同一局域网内的其他程序调用豆包账号池。完整字段和返回结构见 [本地 API 文档](API.md)。

## 当前部署地址

- 局域网入口：`http://192.168.110.102:17889`
- 程序内部地址：`http://127.0.0.1:17888`
- 允许来源：`192.168.110.0/24`
- 接口版本：`0.1.78`
- 认证方式：`Authorization: Bearer <API_KEY>`

Windows 已将局域网入口转发到程序内部接口。除 `/health` 外，其他接口都必须携带 API Key。

> 不要在代码仓库、聊天记录或日志中写入真实 API Key。请在豆包账号池的“配置管理”中设置一串较长的随机值，并通过环境变量提供给调用程序。

## 使用前检查

1. 保持运行豆包账号池的 Windows 电脑开机，且 IP 为 `192.168.110.102`。
2. 启动豆包账号池，确认账号已经登录、额度可用。
3. 在“配置管理”中开启本地 API 和后台自动执行，内部端口保持 `17888`。
4. 设置非默认 API Key 并保存。
5. 从调用方电脑检查：

```bash
curl http://192.168.110.102:17889/health
```

成功时会返回 `"ok": true`。健康检查不需要 API Key。

## 调用流程

```text
提交任务 POST /api/generate
        ↓
保存返回的 requestId
        ↓
每 3～5 秒查询 GET /api/requests/{requestId}
        ↓
status 为 success 后读取 cleanVideoUrl 或 outputVideoPath
```

提交成功只表示任务已进入队列，不代表视频已经生成完成。调用方必须保存 `requestId`，并轮询状态或使用 `callbackUrl` 接收通知。

## 命令行示例

PowerShell：

```powershell
$baseUrl = "http://192.168.110.102:17889"
$apiKey = $env:DOUBAO_API_KEY

$body = @{
  model       = "seedance_2_0_mini"
  aspectRatio = "16:9"
  prompt      = "生成一段海边日落的视频"
  source      = "lan-powershell"
} | ConvertTo-Json

$task = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/api/generate" `
  -Headers @{ Authorization = "Bearer $apiKey" } `
  -ContentType "application/json" `
  -Body $body

$task
$requestId = $task.requestId

Invoke-RestMethod `
  -Uri "$baseUrl/api/requests/$requestId" `
  -Headers @{ Authorization = "Bearer $apiKey" }
```

Linux/macOS：

```bash
export DOUBAO_API_KEY='替换为配置管理中的密钥'

curl -X POST 'http://192.168.110.102:17889/api/generate' \
  -H "Authorization: Bearer $DOUBAO_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "seedance_2_0_mini",
    "aspectRatio": "16:9",
    "prompt": "生成一段海边日落的视频",
    "source": "lan-curl"
  }'
```

查询任务：

```bash
curl 'http://192.168.110.102:17889/api/requests/doubao-替换为任务ID' \
  -H "Authorization: Bearer $DOUBAO_API_KEY"
```

## Python 示例

需要 `requests`：

```python
import os
import time
import requests

BASE_URL = "http://192.168.110.102:17889"
API_KEY = os.environ["DOUBAO_API_KEY"]
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

response = requests.post(
    f"{BASE_URL}/api/generate",
    headers=HEADERS,
    json={
        "model": "seedance_2_0_mini",
        "aspectRatio": "16:9",
        "prompt": "生成一段海边日落的视频",
        "source": "lan-python",
    },
    timeout=30,
)
response.raise_for_status()
request_id = response.json()["requestId"]

while True:
    response = requests.get(
        f"{BASE_URL}/api/requests/{request_id}",
        headers=HEADERS,
        timeout=30,
    )
    response.raise_for_status()
    task = response.json()
    print(task.get("status"), task.get("message", ""))

    if task.get("status") in {"success", "failed", "stopped"}:
        print(task)
        break

    time.sleep(5)
```

## Node.js 示例

适用于 Node.js 20 或 22：

```javascript
const baseUrl = "http://192.168.110.102:17889";
const apiKey = process.env.DOUBAO_API_KEY;

const createResponse = await fetch(`${baseUrl}/api/generate`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "seedance_2_0_mini",
    aspectRatio: "16:9",
    prompt: "生成一段海边日落的视频",
    source: "lan-node",
  }),
});

if (!createResponse.ok) {
  throw new Error(await createResponse.text());
}

const created = await createResponse.json();
console.log("requestId:", created.requestId);

while (true) {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const statusResponse = await fetch(
    `${baseUrl}/api/requests/${created.requestId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!statusResponse.ok) {
    throw new Error(await statusResponse.text());
  }

  const task = await statusResponse.json();
  console.log(task.status, task.message ?? "");

  if (["success", "failed", "stopped"].includes(task.status)) {
    console.log(task);
    break;
  }
}
```

## 常用接口

| 方法 | 路径 | 用途 | 是否认证 |
| --- | --- | --- | --- |
| `GET` | `/health` | 检查服务是否可访问 | 否 |
| `GET` | `/api/accounts` | 查询账号、额度和运行状态 | 是 |
| `POST` | `/api/generate` | 提交视频生成任务 | 是 |
| `GET` | `/api/requests/{requestId}` | 查询单个任务 | 是 |
| `POST` | `/api/requests/{requestId}/stop` | 停止任务 | 是 |
| `POST` | `/api/requests/{requestId}/retry-result` | 恢复已有生成结果 | 是 |

## 结果处理

- `accepted`：已进入队列。
- `running`：正在操作豆包或等待生成。
- `success`：成功；局域网程序读取 `videoDownloadUrl` 或 `cleanVideoUrl`，不要直接读取 Windows `outputVideoPath`。
- `failed`：失败；记录返回的 `stage`、`code`、`message` 或 `detail`。
- `stopped`：任务已停止。

不要把豆包对话地址或分享页地址当作最终视频。只有 `status: "success"` 且返回经过验证的 MP4 地址或本地 `.mp4` 路径时，才应把结果交给下游程序。

## 参考图片和回调

- 调用方可使用 `multipart/form-data` 上传 `referenceImage`。
- `referenceImagePath` 指的是运行豆包账号池的 Windows 电脑上的路径，不是调用方电脑上的路径。
- `referenceImageUrl` 必须能被运行豆包账号池的电脑访问。
- 使用 `callbackUrl` 时，该地址必须能从 `192.168.110.102` 访问。
- 无回调服务时，建议每 3～5 秒轮询一次，不要高频请求。

## 安全限制

- 当前 Windows 防火墙只允许 `192.168.110.0/24` 访问端口 `17889`。
- 不要在路由器中将 `17889` 映射到公网。
- 不要清空 API Key；空 Key 会关闭接口认证。
- 不要把 Cookie、数据库或真实 API Key 提供给调用方。
- 若 Windows 的局域网 IP 改变，现有转发地址将失效，需要重新配置。

## 故障排查

### `/health` 无法连接

依次检查：

1. 豆包账号池是否正在运行。
2. 软件配置中本地 API 是否已开启，内部端口是否为 `17888`。
3. Windows 地址是否仍为 `192.168.110.102`。
4. 调用方是否位于 `192.168.110.0/24`。
5. 本机是否能打开 `http://127.0.0.1:17888/health`。

### 返回 401

`Authorization` 必须完整写成：

```http
Authorization: Bearer <API_KEY>
```

API Key 必须与软件“配置管理”中保存的值完全一致。

### 任务一直排队或失败

检查软件界面中的账号登录状态、剩余额度、并发上限和接口日志。程序直接从豆包分享资源取回原始 MP4，不需要第三方解析 Token；若失败，请按原 `requestId` 恢复结果，避免重复生成和消耗额度。
