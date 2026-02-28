# Sing-box 模块化管理脚本 - 技术方案

> 项目启动日期：2026-03-01  
> 作者：22 & 11  
> 状态：设计完成，开始实施

---

## 📋 项目概述

一个轻量级、模块化的 sing-box 节点管理脚本，专为小内存 VPS（64M-512M）设计。

### 核心目标

- ✅ **轻量化** - 纯 YAML + JSON，无数据库
- ✅ **模块化** - 功能独立，按需加载
- ✅ **易维护** - 架构清晰，永不臃肿
- ✅ **资源自适应** - 不同配置机器运行不同模块

---

## 🏗️ 核心架构

### 设计哲学

```
问题：为什么现有脚本都会变臃肿？
答案：不是功能多，而是架构差

解决方案：
1. 数据分层 - 元数据、配置、状态分离
2. 配置分片 - 每个节点独立配置文件
3. 接口优先 - 模块通过接口通信
4. 原子操作 - 要么全成功，要么全回滚
```

### 数据分层

```
┌─────────────────────────────────────┐
│  元数据层（nodes.yaml）              │
│  - 用户可编辑                        │
│  - 唯一真相来源                      │
│  - 版本控制友好                      │
└─────────────────────────────────────┘
         ↓ 派生
┌─────────────────────────────────────┐
│  配置层（config/*.json）             │
│  - 程序生成                          │
│  - 可随时重新生成                    │
│  - 每个节点独立文件                  │
└─────────────────────────────────────┘
         ↓ 产生
┌─────────────────────────────────────┐
│  状态层（state/*.json）              │
│  - 运行时信息                        │
│  - 端口分配、服务状态                │
└─────────────────────────────────────┘
```

---

## 📁 目录结构

```
singbox-manager/
├── manager.sh              # 主入口（极简，只做路由）
├── config/
│   ├── nodes.yaml          # 节点元数据（核心）
│   ├── base/               # 基础配置（不变）
│   │   ├── 00_log.json
│   │   ├── 01_outbounds.json
│   │   ├── 02_dns.json
│   │   └── 03_route.json
│   └── inbounds/           # 入站配置（动态生成）
│       ├── vless-reality-node001.json
│       ├── hysteria2-node002.json
│       └── ...
├── state/                  # 运行时状态
│   ├── ports.json          # 端口分配记录
│   └── services.json       # 服务状态
├── core/                   # 核心接口
│   ├── node_api.sh         # 节点操作接口
│   ├── singbox_api.sh      # Sing-box 服务接口
│   ├── cert_api.sh         # 证书管理
│   ├── config_generator.sh # 配置生成器
│   ├── port_manager.sh     # 端口管理
│   └── validator.sh        # 配置验证
├── modules/                # 功能模块
│   ├── singbox/
│   │   └── deploy.sh       # 部署直连节点
│   ├── argo/
│   │   └── tunnel.sh       # Argo 隧道
│   └── relay/
│       └── setup.sh        # 中转配置
├── templates/              # 配置模板
│   ├── base/
│   └── inbounds/
│       ├── vless-reality.json
│       ├── hysteria2.json
│       └── ...
└── lib/                    # 公共库
    ├── common.sh
    ├── lock.sh
    └── recovery.sh
```

---

## 🔑 核心设计

### 1. 配置分片机制

**灵感来源：** fscarmen/sing-box 项目

**核心思想：** 每个节点一个配置文件

```bash
# sing-box 支持加载整个目录
sing-box run -C /etc/sing-box/config/

# 配置文件结构
config/
├── base/
│   ├── 00_log.json         # 日志配置
│   ├── 01_outbounds.json   # 出站配置
│   └── 03_route.json       # 路由规则
└── inbounds/
    ├── vless-reality-node001.json  ← 每个节点独立
    ├── hysteria2-node002.json
    └── ...
```

**优势：**
- 添加节点 = 新增一个文件
- 删除节点 = 删除一个文件
- 修改节点 = 修改单个文件
- 不影响其他节点

---

### 2. 节点元数据格式

```yaml
# config/nodes.yaml
version: "1.0"

# 全局配置
global:
  cert_dir: "/etc/sing-box/cert"
  config_dir: "/etc/sing-box/config"

# 节点列表
nodes:
  # 直连节点
  - id: "node-001"
    name: "香港-Reality"
    protocol: "vless-reality"
    type: "direct"
    module: "singbox"
    
    # 监听配置
    listen:
      port: 443
      
    # 协议配置
    config:
      uuid: "xxx-xxx-xxx"
      sni: "www.apple.com"
      private_key: "xxx"
      short_id: "xxx"
      
    # 元数据
    status: "active"
    created_at: "2026-03-01T00:00:00+08:00"
    
  # Argo 隧道节点
  - id: "node-002"
    name: "美国-Argo"
    protocol: "vless-reality"
    type: "argo"
    module: "argo"
    
    # Argo 配置
    argo:
      domain: "abc.trycloudflare.com"
      tunnel_id: "xxx"
      
    # 监听配置
    listen:
      port: 8443
      
    # 协议配置
    config:
      uuid: "yyy-yyy-yyy"
      sni: "www.apple.com"
      
    status: "active"
    
  # 中转节点
  - id: "node-003"
    name: "中转-日本"
    protocol: "vless-reality"
    type: "relay"
    module: "relay"
    
    # 监听配置
    listen:
      port: 10443
      
    # 上游节点
    upstream: "node-001"
    
    status: "active"
```

---

### 3. 配置生成流程

```bash
# 核心流程
添加节点 → 写入 nodes.yaml → 生成配置文件 → 重载服务

# 详细步骤
1. 用户调用模块（如 singbox/deploy.sh）
2. 模块调用 node_api.sh 添加节点
3. node_api.sh 写入 nodes.yaml
4. 调用 config_generator.sh 生成配置
5. 生成 config/inbounds/xxx-node001.json
6. 调用 singbox_api.sh 重载服务
7. 返回分享链接
```

**配置生成器核心代码：**

```bash
# core/config_generator.sh

generate_inbound_config() {
    local node_id="$1"
    
    # 1. 从 nodes.yaml 读取节点信息
    local node=$(yq eval ".nodes[] | select(.id == \"$node_id\")" config/nodes.yaml)
    
    # 2. 获取协议类型
    local protocol=$(echo "$node" | yq eval '.protocol' -)
    
    # 3. 选择模板
    local template="templates/inbounds/${protocol}.json"
    
    # 4. 渲染模板
    local config=$(render_template "$template" "$node")
    
    # 5. 验证配置
    validate_config "$config" || return 1
    
    # 6. 写入配置文件
    echo "$config" > "config/inbounds/${protocol}-${node_id}.json"
}
```

---

### 4. 核心接口设计

#### node_api.sh - 节点操作接口

```bash
# 添加节点
node_add() {
    local node_data="$1"
    
    # 1. 验证数据
    validate_node_data "$node_data" || return 1
    
    # 2. 获取锁
    acquire_lock "nodes.yaml" || return 1
    
    # 3. 生成 ID
    local node_id="node-$(date +%s)-$(uuidgen | cut -d- -f1)"
    
    # 4. 添加 ID 到数据
    node_data=$(echo "$node_data" | yq eval ".id = \"$node_id\"" -)
    
    # 5. 写入 YAML
    yq eval -i ".nodes += [$node_data]" config/nodes.yaml
    
    # 6. 释放锁
    release_lock "nodes.yaml"
    
    echo "$node_id"
}

# 获取节点
node_get() {
    local node_id="$1"
    yq eval ".nodes[] | select(.id == \"$node_id\")" config/nodes.yaml
}

# 更新节点
node_update() {
    local node_id="$1"
    local field="$2"
    local value="$3"
    
    acquire_lock "nodes.yaml" || return 1
    yq eval -i ".nodes[] |= (select(.id == \"$node_id\") | .$field = \"$value\")" \
        config/nodes.yaml
    release_lock "nodes.yaml"
}

# 删除节点
node_delete() {
    local node_id="$1"
    
    acquire_lock "nodes.yaml" || return 1
    yq eval -i "del(.nodes[] | select(.id == \"$node_id\"))" config/nodes.yaml
    release_lock "nodes.yaml"
}

# 生成分享链接
node_get_link() {
    local node_id="$1"
    local node=$(node_get "$node_id")
    
    local protocol=$(echo "$node" | yq eval '.protocol' -)
    
    case "$protocol" in
        vless-reality)
            generate_vless_reality_link "$node"
            ;;
        hysteria2)
            generate_hysteria2_link "$node"
            ;;
        *)
            echo "Unsupported protocol: $protocol" >&2
            return 1
            ;;
    esac
}
```

#### singbox_api.sh - Sing-box 服务接口

```bash
# 启动服务
singbox_start() {
    systemctl start sing-box
}

# 停止服务
singbox_stop() {
    systemctl stop sing-box
}

# 重载配置（不中断连接）
singbox_reload() {
    # 检查配置
    sing-box check -C config/ || return 1
    
    # 重载
    systemctl reload sing-box
}

# 添加节点（完整流程）
singbox_add_node() {
    local node_data="$1"
    
    # 1. 添加到 nodes.yaml
    local node_id=$(node_add "$node_data")
    
    # 2. 生成 inbound 配置
    generate_inbound_config "$node_id"
    
    # 3. 重载服务
    singbox_reload
    
    # 4. 生成分享链接
    local link=$(node_get_link "$node_id")
    
    echo "$link"
}
```

---

## 🔧 技术栈

### 必需工具

| 工具 | 用途 | 安装 |
|------|------|------|
| bash | 脚本语言 | 系统自带 |
| yq | YAML 处理 | 下载二进制 |
| jq | JSON 处理 | apk add jq |
| curl | 网络请求 | 系统自带 |
| sing-box | 代理服务 | 官方安装脚本 |

### 可选工具

| 模块 | 工具 | 用途 |
|------|------|------|
| argo | cloudflared | Cloudflare 隧道 |
| relay | socat | 端口转发 |

---

## 🚀 使用流程

### 场景 1：部署第一个节点

```bash
# 1. 安装脚本
bash <(curl -sSL https://raw.../install.sh)

# 2. 部署 Reality 节点
./modules/singbox/deploy.sh deploy "香港-Reality" "www.apple.com" 443

# 输出：
# ✓ 节点已添加: node-001
# ✓ 配置已生成: config/inbounds/vless-reality-node001.json
# ✓ 服务已重载
# 
# 分享链接: vless://xxx@server-ip:443?...
```

### 场景 2：添加 Argo 隧道

```bash
# 创建 Argo 隧道
./modules/argo/tunnel.sh create "美国-Argo"

# 输出：
# ✓ Argo 隧道已创建
# ✓ 隧道域名: abc.trycloudflare.com
# ✓ 节点已添加: node-002
# ✓ 配置已生成
# ✓ 服务已重载
# 
# 分享链接: vless://yyy@abc.trycloudflare.com:443?...
```

### 场景 3：配置中转

```bash
# 配置中转节点
./modules/relay/setup.sh create "中转-日本" "node-001" 10443

# 输出：
# ✓ 中转节点已创建
# ✓ 上游节点: node-001 (香港-Reality)
# ✓ 本地端口: 10443
# ✓ 配置已生成
# ✓ 服务已重载
# 
# 分享链接: vless://zzz@server-ip:10443?...
```

---

## 📊 资源占用

### 64M 小鸡（minimal）

```
内存占用：
- sing-box 服务: 20-30MB
- bash 脚本: 5-10MB
- 系统开销: 20-30MB
总计: ~50-70MB（剩余空间充足）
```

### 256M 机器（standard）

```
内存占用：
- 基础: 50-70MB
- argo 模块: 15-20MB
- cloudflared: 20-30MB
总计: ~85-120MB（剩余空间充足）
```

---

## 🎯 开发计划

### MVP 阶段（1 周）

**目标：** 验证架构可行性

- [ ] 实现数据分层
- [ ] 实现配置生成器
- [ ] 实现 node_api 和 singbox_api
- [ ] 实现 VLESS-Reality 模板
- [ ] 实现证书自动生成
- [ ] 在 64M 小鸡上测试

### V1.0 阶段（2 周）

**目标：** 基本功能完整

- [ ] 支持多种协议（Hysteria2, TUIC, Shadowsocks）
- [ ] 实现 Argo 模块
- [ ] 实现中转模块
- [ ] 实现端口管理
- [ ] 实现错误恢复
- [ ] 完整测试

### V1.1+ 阶段（按需）

**目标：** 功能增强

- [ ] 订阅系统（可选）
- [ ] Web UI（可选）
- [ ] 性能监控
- [ ] 更多协议支持

---

## 🔍 测试计划

### 测试环境

- **服务器：** 新加坡小鸡（194.156.162.243:18880）
- **系统：** Alpine Linux
- **内存：** 183MB
- **测试端口：** 19991-19994（NAT 映射）

### 测试用例

#### 1. 基础功能测试
- [ ] 安装脚本
- [ ] 部署 VLESS-Reality 节点（端口 19991）
- [ ] 生成分享链接
- [ ] 客户端连接测试

#### 2. 多节点测试
- [ ] 添加第二个节点（端口 19992）
- [ ] 验证两个节点独立运行
- [ ] 删除第一个节点
- [ ] 验证第二个节点不受影响

#### 3. 配置重载测试
- [ ] 修改节点配置
- [ ] 重载服务
- [ ] 验证不中断现有连接

#### 4. 错误恢复测试
- [ ] 故意写入错误配置
- [ ] 验证自动回滚
- [ ] 验证服务正常

---

## 📝 开发日志

### 2026-03-01

**设计阶段完成**
- ✅ 完成架构设计
- ✅ 完成技术方案
- ✅ 完成目录结构设计
- ✅ 完成核心接口设计

**下一步：**
- 开始 MVP 开发
- 每半小时自动测试
- 使用新加坡小鸡进行实验

---

## 🔗 参考资料

### 项目参考
- [fscarmen/sing-box](https://github.com/fscarmen/sing-box) - 配置分片设计
- [0xdabiaoge/singbox-lite](https://github.com/0xdabiaoge/singbox-lite) - 功能参考

### 官方文档
- [sing-box 官方文档](https://sing-box.sagernet.org/)
- [sing-box 配置示例](https://github.com/chika0801/sing-box-examples)

---

## 📧 联系方式

- **项目仓库：** https://github.com/lemmomay/22-claw/tree/master/singbox-manager
- **问题反馈：** GitHub Issues
- **开发者：** 22 & 11

---

**最后更新：** 2026-03-01 00:58  
**状态：** 设计完成，开始实施
