---
title: Sing-box 模块化管理器开发文档
date: 2026-03-02
tags: [sing-box, proxy, vless, reality, 模块化]
---

# Sing-box 模块化管理器

> 基于 fscarmen/sing-box 重构的模块化管理器  
> 开发时间：2026-03-02 凌晨 | 开发时长：约 2 小时

## ✨ 核心特性

- 🎯 **模块化设计** - 清晰的代码组织，易于维护和扩展
- 🚀 **简单易用** - 一条命令完成节点部署
- 📦 **多节点管理** - 支持部署、列表、删除多个节点
- 🔧 **自动配置** - 自动生成 UUID、Reality 密钥对、配置文件
- ✅ **成熟可靠** - 直接使用 fscarmen 的成熟代码

## 📊 成果对比

| 指标 | fscarmen 原脚本 | 模块化版本 | 改进 |
|------|----------------|-----------|------|
| 文件数量 | 1 个 | 6 个 | 模块化 |
| 总大小 | 195KB | ~6KB | 减少 97% |
| 总行数 | 3600+ | ~600 | 减少 83% |
| 维护难度 | 高 | 低 | 易于理解 |
| 扩展性 | 困难 | 容易 | 模块独立 |

## 🚀 快速开始

### 部署节点

```bash
cd /opt/singbox-modular
./manager.sh deploy vless 19991
```

输出示例：
```
检测到公网 IP: 154.83.85.124
开始部署 VLESS-Reality 节点...
✅ VLESS-Reality 配置已生成
✅ sing-box 服务启动成功

=========================================
节点部署成功！
=========================================
端口: 19991
UUID: xxx
Public Key: xxx
Short ID: xxx
SNI: www.apple.com

分享链接:
vless://...
=========================================
```

### 列出所有节点

```bash
./manager.sh list
```

### 删除节点

```bash
./manager.sh delete 19991
```

## 📁 文件结构

```
/opt/singbox-modular/
├── manager.sh          # 主入口
├── lib/
│   ├── utils.sh       # 工具函数
│   ├── check.sh       # 检查验证
│   ├── service.sh     # 服务管理
│   └── node_mgr.sh    # 节点管理
└── protocols/
    └── vless-reality.sh  # VLESS-Reality 协议
```

## 📝 完整命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `deploy <protocol> <port>` | 部署节点 | `./manager.sh deploy vless 19991` |
| `list` | 列出所有节点 | `./manager.sh list` |
| `delete <port>` | 删除节点 | `./manager.sh delete 19991` |
| `show <port>` | 显示节点详情 | `./manager.sh show 19991` |
| `status` | 查看服务状态 | `./manager.sh status` |
| `restart` | 重启服务 | `./manager.sh restart` |
| `stop` | 停止服务 | `./manager.sh stop` |
| `logs` | 查看日志 | `./manager.sh logs` |
| `help` | 显示帮助 | `./manager.sh help` |

## 🎯 支持的协议

- ✅ VLESS-Reality
- 🔄 Hysteria2（计划中）
- 🔄 Trojan（计划中）

## 🆚 与 fscarmen 原脚本对比

| 特性 | fscarmen 原脚本 | 模块化版本 |
|------|----------------|-----------|
| 文件大小 | 195KB (3600+ 行) | ~6KB (6 个文件) |
| 代码组织 | 单文件 | 模块化 |
| 功能加载 | 全部加载 | 按需加载 |
| 维护难度 | 高 | 低 |
| 扩展性 | 困难 | 容易 |
| 学习曲线 | 陡峭 | 平缓 |
| 多节点管理 | 复杂 | 简单 |

## 🔍 技术细节

### Reality 密钥生成
```bash
sing-box generate reality-keypair
```

### UUID 生成
```bash
cat /proc/sys/kernel/random/uuid
```

### Short ID 生成
```bash
openssl rand -hex 8
```

### 配置文件格式
每个节点一个独立的 JSON 配置文件，sing-box 会自动加载 `/etc/sing-box/conf/` 目录下的所有配置。

## 💡 设计原则

1. **直接搬运成熟代码** - 不重新发明轮子，使用 fscarmen 验证过的实现
2. **模块化拆分** - 按功能而非节点拆分，每个模块职责单一
3. **保持简单** - 只做必要的重构，避免过度设计
4. **测试驱动** - 每个模块都能独立测试，确保质量

## 🧪 测试验证

所有功能已在 Debian 12 服务器上测试通过：

- ✅ 部署节点（19991, 19992, 19993）
- ✅ 列出节点
- ✅ 删除节点
- ✅ 多节点并存
- ✅ 服务管理

## 🎯 下一步计划

### 短期（本周）
- [ ] 添加 Hysteria2 协议支持
- [ ] 添加交互式菜单
- [ ] 优化错误处理

### 中期（下周）
- [ ] 添加 Trojan 协议支持
- [ ] 添加配置导入/导出
- [ ] 添加自动更新功能

### 长期（未来）
- [ ] 添加 Web UI
- [ ] 添加监控和告警
- [ ] 支持更多协议

## 🙏 致谢

本项目基于 [fscarmen/sing-box](https://github.com/fscarmen/sing-box) 重构。

感谢 fscarmen 的优秀工作！

## 📄 许可

与原项目保持一致。

---

**项目状态：** ✅ 完成并可用  
**部署位置：** `/opt/singbox-modular/`  
**服务器：** 154.83.85.124:18880 (Debian 12)  
**开发时间：** 2026-03-02 00:57 - 02:57
