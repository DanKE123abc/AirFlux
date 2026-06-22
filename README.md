# AirFlux

部署在 [Cloudflare Workers](https://workers.cloudflare.com/) 上的 Web 的文件传输工具。

## 功能特性

- **P2P 模式** — 通过 PeerJS 实现 WebRTC 点对点传输。发送方关闭标签页时通过 `navigator.sendBeacon` 自动过期取件码。
- **定时模式** — 文件上传至云端存储，在选定时长后自动过期。
- **笔记模式** — 将Markdown文本内容存储在 D1 中，1 小时后自动过期。
- 所有模式均使用 6 位数字取件码。

## 云存储

基于我修改的分支[OneManager-php](https://github.com/DanKE123abc/OneManager-php)

## 技术栈

| 层级     | 技术                               |
| ------ | -------------------------------- |
| 前端     | React 19, Vite 6, Tailwind CSS 4 |
| 后端     | Hono.js on Cloudflare Workers    |
| 数据库    | Cloudflare D1                    |
| 存储     | OneManager API                   |
| P2P 信令 | PeerJS (WebRTC)                  |
| 语言     | TypeScript 5.7                   |

## 项目结构

```
AirFlux/
├── frontend/          # React 单页应用
│   ├── src/
│   │   ├── pages/     # HomePage, SendView, ReceiveView
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── App.tsx
│   └── package.json
└── worker/            # Cloudflare Worker
    ├── src/
    │   ├── index.ts   # 入口文件
    │   └── db/
    └── wrangler.toml
```

## 开发

```bash
# 前端开发服务器（将 /api 代理到 localhost:8787）
cd frontend && npm install && npm run dev

# Worker 开发服务器
cd worker && npm install && npm run dev
```

## 部署

```bash
# 1. 构建前端
cd frontend && npm run build

# 2. 部署 Worker（将 frontend/dist 作为静态资源）
cd worker && npm run deploy
```

## 数据库迁移

```bash
cd worker && npm run db:migrate
```

## 许可证

MIT
