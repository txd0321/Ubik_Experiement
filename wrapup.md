# 后端打通与 `psql` 查询总结

## 1. 今天“后端打通”到底做了什么

我们完成的是一条完整的数据链路：

前端页面 → 后端接口（Node/Express）→ PostgreSQL 数据库

前端会发 3 个关键请求：

- `POST /api/v1/session/init`：初始化一次实验会话
- `POST /api/v1/events/batch`：批量上报行为事件
- `POST /api/v1/experiment/submit`：提交最终问卷与答题结果

后端收到请求后，会把数据 `INSERT` 到数据库表里（如 `participant_session`、`survey_response` 等）。

---

## 2. 为什么之前“看起来成功”但数据库是空的

这次排查出的核心原因有 3 个：

1. 后端服务启动了，但数据库写入开关没开（`ENABLE_DB=false` 时不会真正写库）
2. 前端可能走本地 mock（没配置 `VITE_API_BASE_URL` 时会模拟成功）
3. 本机一开始没有 `psql` 客户端，导致无法查库

修复后：

- 前端请求已打到 `http://localhost:4000`
- 后端 health 正常
- `participant_session` 已查到真实入库数据

---

## 3. 一套可复用的排错逻辑（以后都能用）

遇到“没入库”时，按这个顺序排查：

1. 服务是否在线：
   - `curl http://localhost:4000/api/v1/health`
2. 请求是否真的发出：
   - 浏览器 DevTools → Network（看 `POST /api/...`）
3. 请求是否成功：
   - 看状态码（`200` / `4xx` / `5xx`）
4. 后端是否连接数据库：
   - 检查 `ENABLE_DB=true` 与 `DATABASE_URL`
5. 数据库里是否有记录：
   - 用 `psql` 执行 SQL 查询

---

## 4. `psql` 查询逻辑是什么

`psql` 是 PostgreSQL 的命令行客户端。

基础格式：

```bash
psql "数据库连接串" -c "SQL语句"
```

含义：

- 前半段：连接哪一个数据库
- `-c`：直接执行后面的 SQL 并返回结果

常见查询写法：

```sql
SELECT 列 FROM 表 ORDER BY id DESC LIMIT 5;
```

- `SELECT`：看哪些字段
- `FROM`：查哪张表
- `ORDER BY id DESC`：按最新到最旧排序
- `LIMIT 5`：只看最近 5 条

---

## 5. 如何查“问卷答案 + 用时”

问卷答案和时长在 `survey_response` 表，不在 `participant_session`。

可直接查：

```bash
psql "postgresql://experiment_user:experiment_pass@localhost:5432/experiment_db" -c "SELECT session_id,user_id,hardest_question,judgment_basis,read_ubik_before,feedback_text,total_duration_ms,q_hardest_question_duration_ms,q_judgment_basis_duration_ms,q_read_ubik_before_duration_ms,q_feedback_duration_ms,submitted_at FROM survey_response ORDER BY id DESC LIMIT 10;"
```

字段解释：

- 问卷答案：`hardest_question`, `judgment_basis`, `read_ubik_before`, `feedback_text`
- 总时长：`total_duration_ms`
- 分题时长：`q_hardest_question_duration_ms` 等
- 提交时间：`submitted_at`

---

## 6. 一句话记忆

先看服务活不活（health）→ 再看请求到没到（Network）→ 最后看库里有没有（psql）。

---

## 7. 专有名词与英文缩写解释（小白版）

### 基础架构相关

- 前端（Frontend）
  - 用户看到和操作的页面部分，比如浏览器里的按钮、表单、3D 场景。

- 后端（Backend）
  - 处理业务逻辑和数据存储的服务端程序。你的项目里是 Node.js + Express。

- 数据库（Database / DB）
  - 专门用于存储结构化数据的系统。你用的是 PostgreSQL。

### 协议与接口相关

- API（Application Programming Interface）
  - 应用程序之间“约定好的通信入口”。
  - 例如：`/api/v1/session/init` 就是一个后端 API 地址。

- HTTP（HyperText Transfer Protocol）
  - 浏览器和服务器之间传输数据的协议。

- URL（Uniform Resource Locator）
  - 网络地址，例如：`http://localhost:4000/api/v1/health`。

- POST
  - 一种 HTTP 请求方法，通常用于“提交数据”。

- JSON（JavaScript Object Notation）
  - 一种常用的数据格式，前后端传参常用它（键值对结构）。

- 状态码（Status Code）
  - 后端对请求处理结果的编号：
    - `200`：成功
    - `4xx`：客户端请求问题（参数错、路径错、权限等）
    - `5xx`：服务端错误

### 开发与调试工具相关

- DevTools（Developer Tools）
  - 浏览器开发者工具，用来查看请求、报错、性能等。

- Network 面板
  - DevTools 的一个标签页，用来查看所有网络请求（是否发出、是否成功、返回什么）。

- curl
  - 命令行发 HTTP 请求的工具。常用于快速验证后端接口是否可用。

- health / 健康检查接口
  - 用于确认服务是否在线的接口（例如 `/api/v1/health`）。

### 运行环境与配置相关

- localhost
  - 指当前电脑本机。`localhost:4000` 表示“你自己电脑上的 4000 端口”。

- 端口（Port）
  - 同一台机器上不同服务的“门牌号”。如前端常在 `5173`，后端在 `4000`。

- 环境变量（Environment Variable）
  - 程序运行时读取的配置项，比如：`ENABLE_DB`、`DATABASE_URL`。

- `.env` / `.env.local`
  - 存放环境变量的配置文件。
  - `frontend/.env.local` 里配置前端请求后端的地址（`VITE_API_BASE_URL`）。

- `ENABLE_DB`
  - 是否开启数据库写入。`true` 才会真正入库。

- `DATABASE_URL`
  - 数据库连接串，告诉后端“连哪台数据库、用哪个账号、哪个库名”。

- `VITE_API_BASE_URL`
  - 前端请求后端的基础地址。没配置时通常会走 mock。

### 数据库与 SQL 相关

- PostgreSQL（简称 Postgres）
  - 一个关系型数据库管理系统（RDBMS）。

- `psql`
  - PostgreSQL 官方命令行客户端，用于连库和执行 SQL。

- SQL（Structured Query Language）
  - 操作关系型数据库的标准语言。

- 表（Table）
  - 数据按行列存储的结构，类似 Excel 的一个工作表。

- 行（Row）
  - 一条记录。

- 列（Column）
  - 一个字段。

- `SELECT`
  - 查询数据。

- `INSERT`
  - 插入新数据。

- `ORDER BY ... DESC`
  - 按某列倒序排序（通常用于看最新数据）。

- `LIMIT`
  - 限制返回条数。

### 项目中常见术语

- session（会话）
  - 用户一次进入并进行实验流程的记录单元。

- `session_id`
  - 每次会话的唯一编号。

- `user_id`
  - 用户标识（通常同一设备可复用，便于区分不同会话）。

- event（事件）
  - 用户行为日志单位，如点击、进入页面、提交答案。

- batch（批量）
  - 一次发送多条事件，减少请求次数，提高效率。

- submit（提交）
  - 通常指流程末尾把完整数据一次性上传后端。

- mock
  - 模拟数据/模拟接口。用于开发调试，不会真实入库。
