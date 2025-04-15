

---

# Google AI Studio Gemini Key Scripts 🚀

**English Version:** [README.en.md](README.en.md)

**默认文档语言：中文**

本仓库包含了 **3 个核心脚本**，帮助你**批量创建 Google Cloud 项目**并**获取 Google AI Studio（Gemini）API Key**，适用于大量管理 API Key 或频繁创建新项目的场景。

> ⚠️ **重要提示 / 免责声明**  
> - **本项目仅供学习参考使用，任何因使用本脚本产生的风险需自行承担。**  
> - **由于 Google 的限制，每个项目的 API Key 实际上是共享同一项目的资源，所以默认每个项目仅创建 1 个 Key，建议单个账号不要创建超过 5 个项目！**  
> - 代码可直接复制粘贴运行（注释仅供参考）；如需修改，可参照文档中详细说明需要调整的参数。  
> - Google 可能随时更新界面或接口，导致脚本失效或出现异常，请自行调试或提 Issue。  
> - **请遵守 Google Cloud 与 Google AI Studio 的服务条款，避免恶意或频繁操作导致账号受限。**  
> - **如果本项目对你有所帮助，请给个 Star ⭐️ 谢谢！**

---

## 目录

- [功能概览](#功能概览)
- [环境准备](#环境准备)
- [流程总览](#流程总览)
- [油猴脚本 & 控制台脚本使用方式](#油猴脚本--控制台脚本使用方式)
  - [方式一：油猴脚本 —— Google AI Studio Gemini Automation Suite](#方式一油猴脚本--google-ai-studio-gemini-automation-suite)
  - [方式二：控制台脚本](#方式二控制台脚本)
- [仓库结构](#仓库结构)
- [常见问题 (FAQ)](#常见问题-faq)

---

## 功能概览 ✨

- **自动化项目创建**  
  批量在 Google Cloud Console 中自动创建多个项目，免去繁琐的手动操作。

- **自动化 API Key 生成**  
  在 Google AI Studio 中为每个新项目自动生成 Gemini API Key，并在 Console 中统一输出以便管理。

- **自动提取已存在 API Key**  
  针对已有项目，该脚本可扫描并输出所有现有 API Key，适合需要管理旧账号中 Key 的场景。

---

## 环境准备 🔧

1. **Google 账号**  
   - 请确保你能成功登录 [Google Cloud Console](https://console.cloud.google.com/) 和 [Google AI Studio](https://aistudio.google.com/)。  
   - 如启用双因素认证（2FA）或使用企业/学校账号，请先完成登录与解锁操作。

2. **浏览器与网络**  
   - 建议使用最新版的 Chrome、Edge 或 Firefox 等现代浏览器；  
   - 网络需保证畅通，能够正常访问 Google 服务，否则脚本可能报错或卡顿。

3. **项目配额**  
   - 免费账号通常允许创建 **12 个项目**。若 12 个不够，请参照下文 [可选操作：申请更多项目配额](#可选操作申请更多项目配额) 部分说明。

---

## 流程总览 🗺️

整个自动化流程如下：

```
 ┌────────────────────────────┐
 │ 1. 登录 Google Cloud     │
 │    (完成 2FA 登录)         │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 2. (可选) 申请项目配额     │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 3. 运行项目创建脚本        │
 │    (批量创建项目)          │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 4. 登录 AI Studio          │
 │    打开 /apikey 页面       │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 5. 运行 API Key 脚本       │
 │    (批量生成 API Key)      │
 └──────────────┬─────────────┘
                │
                ▼
   (可选) 如果已有 API Key：
 ┌────────────────────────────┐
 │ 6. 运行提取 API Key 脚本   │
 │    (扫描所有已存在的 Key)  │
 └────────────────────────────┘
```

---

## 油猴脚本 & 控制台脚本使用方式

### 方式一：油猴脚本 —— **Google AI Studio Gemini Automation Suite** 🛠️

该油猴脚本整合了项目创建、API Key 自动生成与提取等功能，并在脚本顶部提供了一个配置块供用户自定义参数。

#### 使用步骤：

1. **安装 Tampermonkey**  
   请确保已经安装了 Tampermonkey 或其他用户脚本管理器。

2. **添加油猴脚本**  
   - 将下方完整代码保存为文件（建议命名为 `Google_AI_Studio_Gemini_Automation_Suite.user.js`），然后添加到 Tampermonkey 中。  
   - 在脚本开头的 `CONFIG` 对象中，用户可以自定义如下参数：  
     - `PROJECT_CREATION_COUNT`：自动创建项目的总数（默认 5）。  
     - `API_KEYS_PER_PROJECT`：每个项目生成的 API Key 数量（默认 1）。  
     - `PROJECT_CREATION_DELAY`：项目创建尝试间的等待时间（默认 5000 毫秒）。  
     - `API_KEY_CREATION_DELAY`：API Key 生成尝试间的等待时间（默认 2500 毫秒）。  
     - `SELECT_CHANGE_DELAY`：点击下拉框选项后额外等待的时间以确保触发 change 事件（默认 1000 毫秒）。

3. **操作说明**  
   - **在 Google Cloud Console**：  
     打开 [Google Cloud Console](https://console.cloud.google.com/)，页面右上角将自动插入悬浮按钮【创建项目并获取APIKEY】。  
     - 如果当前页面不在 console.cloud.google.com，脚本将自动跳转至该页面。  
     - 点击按钮后，脚本会根据配置批量创建项目，创建完成后自动设置标记并跳转至 [Google AI Studio 的 /apikey 页面](https://aistudio.google.com/apikey)。
   - **在 Google AI Studio**：  
     当页面加载后，如果检测到标记，脚本会自动启动 API Key 生成流程，为每个项目生成 API Key。  
     - 脚本会在下拉框选项点击后额外派发 change 事件，并等待配置的 `SELECT_CHANGE_DELAY` 时间（默认 1000 毫秒）确保选中生效。
   - **提取已有 API Key**：  
     点击悬浮按钮【提取APIKEY】时，脚本会扫描当前页面上所有 API Key 链接，并在 Console 中以便于复制的格式输出所有 API Key。

---

### 方式二：控制台脚本 💻

如果你更喜欢手动复制代码或只使用部分功能，也可以分别运行各个控制台脚本。

#### 使用步骤：

1. **项目创建**：  
   - 登录到 [Google Cloud Console](https://console.cloud.google.com/)。  
   - 打开 Developer Tools (F12) → Console，复制 [`CreateProjects.js`](./CreateProjects.js) 中的代码并执行。

2. **API Key 自动生成**：  
   - 登录到 [Google AI Studio /apikey](https://aistudio.google.com/apikey) 页面。  
   - 打开 Console，复制 [`FetchApiKeys.js`](./FetchApiKeys.js) 中的代码并执行。

3. **提取已有 API Key（可选）**：  
   - 同样在 [Google AI Studio /apikey](https://aistudio.google.com/apikey) 页面，通过 Console 复制 [`FetchAllExistingKeys.js`](./FetchAllExistingKeys.js) 代码并执行，即可扫描并输出所有现有 API Key。

---

## 仓库结构 📂

```bash
google-ai-gemini-key-scripts/
├─ CreateProjects.js           # (Step 1) 控制台脚本版：自动创建项目脚本
├─ FetchApiKeys.js             # (Step 2) 控制台脚本版：自动为项目创建并获取 API Key
├─ FetchAllExistingKeys.js     # (Step 3, 可选) 控制台脚本版：提取所有已有的 API Key
├─ Google_AI_Studio_Gemini_Automation_Suite.user.js  # 油猴脚本版本（集成所有功能）
├─ README.md                   # 本文档（中文版）
```

---

## 常见问题 (FAQ) ❓

1. **脚本无反应或报错？**  
   - 请确保你已登录对应页面（Google Cloud Console 或 AI Studio）。  
   - 查看 Developer Tools 的 Console 中的错误信息，部分错误可能由于页面结构变动导致脚本选择器失效，需要更新代码。  
   - 确保网络连接稳定，否则脚本可能会超时或卡住。

2. **API Key 生成失败或只生成部分？**  
   - 可能由于项目或 API Key 配额不足、网络问题或等待延时不足。  
   - 可适当调整 CONFIG 中相关等待时间（例如 `SELECT_CHANGE_DELAY`）或减少一次性批量创建数量。

3. **是否存在封号风险？**  
   - 由于脚本涉及批量自动化操作，存在一定风险；请避免在短时间内大量创建项目或 API Key，合理使用。

4. **如何申请更多项目配额？**  
   - 请参考 [可选操作：申请更多项目配额](#可选操作申请更多项目配额) 部分说明或相关文档。

5. **如何使用生成的 API Key？**  
   - 通常需要在 HTTP 请求头中设置 `Authorization: Bearer YOUR_KEY`，具体使用请参考 Google AI Studio 官方文档。

6. **首次生成 API Key 失败怎么办？**  
   - 脚本在下拉框选项点击后额外派发了 change 事件，并等待配置的延时（默认 1000 毫秒），若仍失败，请尝试调整该延时参数。

7. **为什么提供两种使用方式？**  
   - 油猴脚本方式实现一键自动化，适合追求全自动体验的用户；  
   - 控制台脚本方式适用于希望手动复制粘贴代码、进行调试或只使用部分功能的用户。

---

## 可选操作：申请更多项目配额 📈

如果默认的 12 个项目额度不足，你可以在创建项目之前前往 [配额申请页面](https://support.google.com/code/contact/project_quota_increase) 申请更多额度。请按照页面提示填写相关信息，并提交申请，等待 Google 审核通过。

---

> **贡献与反馈**  
> 如果你有任何疑问或改进建议，请通过 GitHub 的 Issue 或 Pull Request 与我联系！  
> 希望本项目能帮助你高效管理项目和 API Key，祝你开发顺利！ 🚀

---

