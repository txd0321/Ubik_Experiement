第 0 步：先定“最小可用目标”
你先把目标定成：
能记录并提交
答题数据（必需）
元数据（必需）
行为数据先上最关键三项
每秒相机轨迹
首次接近
每物品停留总时长
后续再补
首次发现（视野判定）
已答题物品复访时长精细化
第 1 步：定义统一数据结构（先做这个）
在前端先统一这三块对象（逻辑上，代码里你可放 types）：
AnswerRecord
BehaviorMetrics
SessionMeta
关键字段按你 PRD：
answer_opened_at, answer_submitted_at, duration_ms
camera_track_tick（1Hz）
first_discovered_at, first_approached_at
dwell_time_ms_total_per_item
answered_item_revisit
user_id, session_start_at, session_end_at, device_info, screen_resolution
第 2 步：先把 user_id 做好（元数据基础）
在前端启动时：
从 localStorage.getItem('user_id') 读
没有就 crypto.randomUUID() 生成并写回
每次 initSession 时把 user_id 带给后端
这样同一个设备多次实验能区分 user_id + session_id。
第 3 步：补齐答题数据（你已有 80%）
你现在已有 panel 打开时刻和提交时刻逻辑，下一步是保证字段名对齐 PRD：
打开题板时写：answer_opened_at
点击确认时写：answer_submitted_at
同时算：duration_ms
并确保练习题和正式题结构一致（正式题额外加 order_index）。
第 4 步：加 1Hz 相机轨迹上报
在 ThreeScene 里每秒采样一次 camera：
x,y,z
（可选）pitch,yaw,roll
step
ts
发事件名：camera_track_tick
建议放到你现有 track() 管道里，让 batchEvents 统一上报。
第 5 步：做“首次接近 + 停留时长”
你已经有距离计算（激活判定）逻辑，直接复用：
定义阈值（可沿用 INTERACT_DISTANCE）
对每个 item_id 维护状态：
first_approached_at（只记第一次）
is_near（当前是否近距）
last_near_enter_at
dwell_time_ms_total
每帧/每 tick 更新累积时长
首次接近时发 item_first_approached。
停留总时长可以：
低频发 item_dwell_tick，或
最终提交时发 item_dwell_summary（更省流量，推荐）。
第 6 步：做“首次发现（进入视野）”
这个比“首次接近”复杂一点，但可以分两档：
先做简化版（推荐先落地）
判定“在相机前方 + 距离小于某阈值（比如 8m）”即视为 discovered。
再做精确版（后续）
用 Raycaster 或 frustum 可见性做遮挡/视锥判定。
首次满足条件时记录 first_discovered_at 并发 item_first_discovered。
第 7 步：做“已完成物品复访”
当 item.answered === true 后：
如果用户再次进入近距区间，记一次 answered_item_revisit
可累计 revisit_count
可选统计 revisit_duration_ms
建议至少先记：
item_id
revisit_at
revisit_count
第 8 步：最终提交接口补齐聚合数据
在 submitExperiment(payload) 里加两块：
session_meta
user_id
session_start_at
session_end_at
device_info
screen_resolution
behavior_summary
每物品：first_discovered_at, first_approached_at, dwell_time_ms_total, revisit_count
（可选）轨迹采样总数、有效采样率
这样即使中间有事件丢包，最终也能拿到核心结果。
第 9 步：后端最小落库设计（先 3 张表）
建议：
sessions：会话与元数据
event_logs：原始埋点（含 event_id 幂等）
answers：结构化答题结果（便于统计）
（可选）item_behavior_summary：每题/每物品聚合
第 10 步：联调验收清单（必须跑）
你自己按这 10 条过一遍：
开始实验能生成 user_id 与 session_id
进入场景后每秒有 camera_track_tick
打开题板产生 answer_opened_at
提交题目产生 answer_submitted_at 与 duration_ms
首次接近某物品只记录一次 item_first_approached
停留后 dwell_time_ms_total 增长
已答题后再靠近有 answered_item_revisit
提交问卷时 session_end_at 存在
断网后恢复可补发（你已有 batch/retry 基础）
数据库里同 event_id 不重复
如果你愿意，我下一步可以直接帮你出“按你当前代码改动的具体实现清单（改哪个文件、加哪些状态和字段）”，我会精确到 App.tsx 和 ThreeScene.tsx。
你可以帮我做什么，我必须自己做的是什么

可以，给你直接分清楚：
我可以帮你做的（我来动手最快）
把前端埋点代码补全
user_id 生成与持久化
题目打开/提交时间戳与 duration_ms
每秒 camera_track_tick
first_approached、dwell_time_ms_total、answered_item_revisit
最终 submitExperiment payload 结构对齐 PRD
帮你改后端接口与数据结构
定义请求 DTO / schema 校验
设计并补齐入库逻辑（session / events / answers / summary）
幂等去重（event_id unique）
给你 SQL 建表和索引
直接可执行的 PostgreSQL 脚本
联调与排错
按流程跑一遍，找字段缺失、时间计算错误、重复上报、丢包等问题
把 prd.md 再完善成“实施版本”
事件字典、字段定义、验收清单一一对齐代码
你必须自己做的（需要你决策/操作）
研究口径决策（你拍板）
首次发现的判定标准（简化版 or 严格可见性）
接近阈值是多少（2.4m / 2.5m 等）
停留时长统计口径（近距即可 or 近距+注视）
实验运营相关
招募被试、发放链接、告知同意书
伦理/隐私合规（学校或机构要求）
部署与环境资源
你是否用本机、内网服务器、还是公网
数据库账号、服务器账号、域名（若公网）
最终验收签字
数据够不够你后续统计分析（这个只能你确认）
最佳分工（推荐）
我负责：实现 + 改代码 + 给你可运行版本
你负责：确认口径 + 提供运行环境 + 最终验收
如果你同意，我下一步就直接开始改你当前项目，先完成一版“本地可跑的数据闭环”。你只要回复一句：
“按最小可用方案直接改代码”。
