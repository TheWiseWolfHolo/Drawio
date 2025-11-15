# Drawio

> **Drawio  |  Powered by WolfHolo**  
> 用自然语言或参考图片，几秒钟生成可编辑的专业科研 Draw.io 图表。

## 在线体验

- 推荐自建 Vercel / 自托管实例并配置自己的 API Key；  
- 若需要参考原始 Demo，可访问 upstream 部署（若仍在线）：https://smart-drawio-next.vercel.app/

## 效果预览

![Transformer](./public/images/transformer.png)
![Swin-Transformer](./public/images/swin.png)
![CLIP](./public/images/clip.png)
![ProSST](./public/images/prosst.png)

## 项目简介

Drawio 是基于 [smart-drawio-next](https://github.com/yunshenwuchuxun/smart-drawio-next) 的二次开发版本，由 WolfHolo 团队重新打磨品牌与视觉：

- **AI 驱动的图表生成**：通过文本或图片提示，自动生成 Draw.io XML / JSON；
- **所见即所得**：Monaco 编辑器与 Draw.io iframe 联动，实时同步编辑与预览；
- **完整配套能力**：多模型配置、访问密码、历史记录、通知、智能优化面板一应俱全；
- **更统一的品牌体验**：暖色低饱和主题、定制英中字体和新的页脚/文案体系。

## 主题与设计

- **主色**：`#c96442`（primary）、`#b55839`（hover）、`#9c4b34`（active）；  
- **背景**：`#f8f4f2`，搭配 `#fcf8f6` 的卡片与 `#e0d2cc` 的边框，营造温暖且不刺眼的层次；  
- **辅色**：`#e6cfc5` muted / accent、`#6f5247` muted-foreground；  
- **字体**：  
  - 标题/英文：自托管 **Tiempos**；  
  - 中文正文：自托管 **PingFang SC**；  
  Tailwind `font-sans` / `font-heading` / `font-mono` 已统一指向上述字体栈。

## 功能亮点

- **LLM 原生绘图体验**：流式生成、继续生成、20+ 图表类型（`lib/constants.js`）。  
- **多模态输入**：拖拽 PNG/JPG/WebP/GIF（≤5 MB）或文件选择，结合 Vision 模型将截图转为可编辑连线（`components/ImageUpload`）。  
- **双画布联动**：Monaco 编辑器负责 JSON/XML，Draw.io iframe 负责渲染与微调（`components/CodeEditor` + `components/DrawioCanvas`）。  
- **智能优化链路**：可一键修复箭头、样式，也可通过高级面板勾选/自定义优化建议（`components/OptimizationPanel`）。  
- **配置管理器**：UI 中管理 OpenAI/Anthropic 兼容配置，支持导入导出、在线测试（`components/ConfigManager`）。  
- **历史记录 & 通知**：最近 20 条记录保存在 localStorage，并有统一的通知/确认弹窗。

## 界面与模块

1. **交互区（Chat + ImageUpload）**  
   - 输入需求、上传参考图、选择图表类型，支持停止与继续生成。  
2. **生成代码区（CodeEditor）**  
   - Monaco 展示 JSON / XML，提供清空、优化、高级优化、应用、复制等操作，并对解析错误即时提示。  
3. **画布区（DrawioCanvas / ExcalidrawCanvas）**  
   - 内嵌 draw.io，随时把代码同步到画布继续拖拽调整。  
4. **辅助弹窗**  
   - `ConfigManager`、`AccessPasswordModal`、`HistoryModal`、`OptimizationPanel`、`ContactModal` 等组成完备的使用流程。

## 技术栈

- **前端框架**：Next.js 16 (App Router) + React 19  
- **画布**：Draw.io embed（iframe）  
- **编辑器**：@monaco-editor/react  
- **样式**：Tailwind CSS v4 + 自定义设计系统 + 自托管字体  
- **LLM 接入**：OpenAI / Anthropic 兼容接口，Edge API 路由 + Server Actions  
- **状态**：localStorage（配置、历史、访问密码开关）

## 快速开始

### 环境要求

- Node.js ≥ 18.18  
- pnpm ≥ 8（推荐）  
- 拥有可用的 OpenAI / Anthropic 兼容 API Key，或启用访问密码的服务端配置

### 安装与启动

```bash
# 克隆你的 Drawio 仓库
git clone https://github.com/<your-org>/drawio.git
cd drawio

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 体验本地环境，并按需配置 `ACCESS_PASSWORD` / LLM Key。

### 常用脚本

| 命令        | 说明                                   |
|-------------|----------------------------------------|
| `pnpm dev`  | 启动开发环境（含 webpack overlay）      |
| `pnpm build`| 生产构建                               |
| `pnpm start`| 生产模式启动（需先 `pnpm build`）       |
| `pnpm lint` | 运行 ESLint                            |

## LLM 配置与访问密码

### 前端多配置管理（默认）

1. 点击右上角 **“管理配置”** 打开 `ConfigManager`。  
2. 选择提供商（OpenAI / Anthropic / 中转兼容），填写 `Base URL`、`API Key`、`Model`。  
3. 可一键复制、导入/导出配置，所有数据仅存于浏览器 localStorage。  
4. “历史记录”可快速复用最近 20 次生成结果。

### 服务端统一配置（访问密码，可选）

若希望所有用户复用同一套 Key，可在服务器配置 `.env`：

| 变量名                | 说明                                    |
|-----------------------|-----------------------------------------|
| `ACCESS_PASSWORD`     | 前端需要输入的访问密码                  |
| `SERVER_LLM_TYPE`     | `openai` 或 `anthropic`                 |
| `SERVER_LLM_BASE_URL` | 兼容接口地址（如 `https://api.openai.com/v1`） |
| `SERVER_LLM_API_KEY`  | 服务端保存的 Key，不会传到浏览器        |
| `SERVER_LLM_MODEL`    | 默认使用的模型名称                      |

启用后，前端“访问密码”弹窗会优先生效服务器配置；若未配置完整变量，接口会提示“服务器未配置访问密码”。

> ✅ 访问密码只在服务端校验，真实 API Key 不会暴露给客户端。

## 常见问题

- **API Key 会泄露吗？**  
  不会。Key 仅保存在浏览器 localStorage，发起请求时只会发送到你自己的后端，再由后端请求第三方 LLM。  
- **响应被截断怎么办？**  
  会自动提示“继续生成”按钮，并在 `handleContinueGeneration` 中携带上下文继续。  
- **图片解析失败？**  
  请确保使用 Vision 能力模型（GPT-4o、GPT-4.1、Claude 3.5 Sonnet 等），并保证图片 ≤5 MB。  
- **历史记录很多？**  
  “历史记录”弹窗可单条删除或一键清空，最多保留 20 条。  
- **仍想参考原项目？**  
  Drawio 基于 [smart-drawio-next](https://github.com/yunshenwuchuxun/smart-drawio-next) 与 [smart-excalidraw-next](https://github.com/liujuntao123/smart-excalidraw-next) 深度定制，欢迎查看 upstream。

## 贡献与致谢

- 感谢 upstream 项目及开源社区；WolfHolo 版本主要聚焦于品牌、视觉与自托管体验。  
- 欢迎提交 Issue / PR，共同让 Drawio 更好用。  
- 觉得有帮助？⭐ Star、分享给同事或科研伙伴就是最好的支持。

## 许可证

MIT License —— 在保留版权声明的前提下可自由使用、复制与分发。
