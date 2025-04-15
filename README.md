
---

# Google AI Studio Gemini Key 脚本合集 🚀

**快速跳转英文版：** [README.en.md](README.en.md)

**默认语言：中文**

欢迎使用 **Google AI Studio Gemini Key 脚本合集**！  
本仓库包含 3 个核心脚本，旨在帮助你**批量创建 Google Cloud 项目**并**获取 Google AI Studio（Gemini）API Key**。即使你不懂编程，也可以按照下面的详细步骤轻松操作。

> ⚠️ **重要提示 / 免责声明**  
> - **本项目仅供学习与参考使用，任何由使用本脚本引起的风险请自行承担。**  
> - 由于 Google 的限制，每个项目的 API Key 实际上是共享同一项目的资源，所以脚本默认每个项目只创建 1 个 API Key，同时建议单个账号不要创建超过 5 个项目。  
> - 代码可直接复制粘贴运行（脚本中的注释已详细说明各参数的用途），如果你不希望修改代码，请按说明操作。  
> - Google 的界面或接口可能会发生变化，导致脚本失效或发生错误，如果遇到问题，请先仔细查看错误提示或提交 Issue 寻求帮助。  
> - **请严格遵守 Google Cloud 与 Google AI Studio 的服务条款，谨慎使用，避免因过量操作而导致账号受限。**  
> - **如果本项目对你有帮助，麻烦顺手点个 Star ⭐️ 支持一下！**

---

## 目录

1. [功能概览](#功能概览)
2. [环境准备](#环境准备)
3. [流程总览](#流程总览)
4. [用户自定义配置](#用户自定义配置)
5. [油猴脚本与控制台脚本使用方式](#油猴脚本与控制台脚本使用方式)
   - [方式一：油猴脚本 —— Google AI Studio Gemini Automation Suite](#方式一油猴脚本---google-ai-studio-gemini-automation-suite)
   - [方式二：控制台脚本](#方式二控制台脚本)
6. [仓库结构](#仓库结构)
7. [常见问题 (FAQ)](#常见问题-faq)
8. [可选操作：申请更多项目配额](#可选操作申请更多项目配额)
9. [贡献与反馈](#贡献与反馈)

---

## 功能概览 ✨

- **自动化项目创建**  
  用一个按钮，批量在 Google Cloud Console 中自动创建多个项目，省去每次点按钮的繁琐操作。

- **自动化 API Key 生成**  
  当项目创建完成后，自动在 Google AI Studio 中生成 Gemini API Key，并将所有生成的 Key 在浏览器控制台统一显示，方便集中管理。

- **自动提取已有 API Key**  
  如果你之前已经有过一些 API Key，但没有记录，脚本可以自动扫描页面，把所有已存在的 Key 输出，便于查找。

---

## 环境准备 🔧

请确保你做好以下准备工作：

1. **Google 账号**  
   - 登录 [Google Cloud Console](https://console.cloud.google.com/) 和 [Google AI Studio](https://aistudio.google.com/) 两个平台。  
   - 如果你设置了双因素认证（2FA）或使用的是企业/学校账号，请提前完成手动登录和解锁操作。

2. **浏览器与网络**  
   - 建议使用最新版本的 Chrome、Edge 或 Firefox。  
   - 确保网络环境稳定，能够顺畅访问 Google 服务，否则脚本可能因加载不全或超时而出错。

3. **项目配额**  
   - 免费账号通常允许创建 **12 个项目**。若你的需求超过这个数量，请参考下文【可选操作：申请更多项目配额】部分说明进行申请。

---

## 流程总览 🗺️

以下流程图展示了整个自动化操作的步骤，从登录开始，到最终获取 API Key 的全过程：

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
 │    （批量创建项目）        │
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
 │    （批量生成 API Key）    │
 └──────────────┬─────────────┘
                │
                ▼
   (可选) 如果已有 API Key：
 ┌────────────────────────────┐
 │ 6. 运行提取 API Key 脚本   │
 │    （扫描所有已存在的 Key）│
 └────────────────────────────┘
```

---

## 用户自定义配置

在油猴脚本版中，脚本开头有一个 **`CONFIG` 对象**，你可以在这里修改以下关键参数，以适应不同环境与需求：

- **PROJECT_CREATION_COUNT**：自动创建的项目总数（默认 5）。  
- **API_KEYS_PER_PROJECT**：每个项目生成的 API Key 数量（默认 1）。  
- **PROJECT_CREATION_DELAY**：项目创建尝试之间的等待时间，单位毫秒（默认 5000 毫秒，即 5 秒）。  
- **API_KEY_CREATION_DELAY**：API Key 生成尝试之间的等待时间（默认 2500 毫秒，即 2.5 秒）。  
- **SELECT_CHANGE_DELAY**：点击下拉框选项后额外的等待时间，以确保 change 事件触发（默认 1000 毫秒）。

你可以根据实际情况（例如网络速度或页面加载速度）修改这些参数，以获得更佳的执行效果。

---

## 油猴脚本与控制台脚本使用方式

本项目支持两种使用方式，用户可以根据自己的习惯选择。

### 方式一：油猴脚本 —— **Google AI Studio Gemini Automation Suite** 🛠️

该油猴脚本将所有功能集成于一体，并自动在目标页面中插入悬浮按钮，操作简单直观。

#### 使用步骤：

1. **安装 Tampermonkey**  
   - 如果你还没有安装，请在你的浏览器应用商店搜索并安装 Tampermonkey 或其他用户脚本管理器。

2. **添加油猴脚本**  
   - 将完整的油猴脚本代码（请参考仓库中提供的文件 `Google_AI_Studio_Gemini_Automation_Suite.user.js`）添加到 Tampermonkey。  
   - 在脚本文件的最前端，你会看到一个名为 **`CONFIG`** 的配置对象，你可以在此修改如下参数：
     - `PROJECT_CREATION_COUNT`：项目总数（默认 5）。
     - `API_KEYS_PER_PROJECT`：每个项目生成 API Key 数量（默认 1）。
     - `PROJECT_CREATION_DELAY`：项目创建间隔（默认 5000 毫秒）。
     - `API_KEY_CREATION_DELAY`：API Key 生成间隔（默认 2500 毫秒）。
     - `SELECT_CHANGE_DELAY`：下拉框选项选中后等待时间（默认 1000 毫秒）。
     
3. **操作步骤**  
   - **在 Google Cloud Console**：  
     打开 [Google Cloud Console](https://console.cloud.google.com/)，页面右上角会出现一个浮动按钮，按钮文字为 **“创建项目并获取APIKEY”**。  
     - 如果当前页面不在 `console.cloud.google.com` 域下，脚本会自动跳转到该页面（自动跳转，无需用户确认）。  
     - 点击按钮后，脚本会按照配置参数批量创建项目（默认创建 5 个项目），完成后会自动在后台设置标记，并自动跳转到 [Google AI Studio 的 /apikey 页面](https://aistudio.google.com/apikey)。
   - **在 Google AI Studio**：  
     当你打开 `/apikey` 页面后，脚本会检测到标记，并自动开始 API Key 的生成流程，为每个项目生成 API Key。  
     - 为了确保第一次操作成功，脚本在点击下拉框选项后会额外派发一个 `change` 事件并等待预设时间（默认 1000 毫秒）。  
   - **提取现有 API Key**：  
     如果你想扫描并找出已存在的 API Key，可点击浮动按钮 **“提取APIKEY”**，脚本会自动遍历页面上所有 API Key 链接，并在 Console 中以易于复制的代码块格式显示所有 API Key。

---

### 方式二：控制台脚本 💻

如果你希望手动操作或只使用某一部分功能，也可以直接在浏览器控制台中运行各脚本文件。

#### 使用步骤：

1. **项目创建**：  
   - 登录 [Google Cloud Console](https://console.cloud.google.com/)。  
   - 按 `F12` 打开开发者工具，切换到 Console 选项卡，复制 [`CreateProjects.js`](./CreateProjects.js) 文件中的全部代码，然后按 Enter 执行。
   
2. **API Key 自动生成**：  
   - 登录 [Google AI Studio /apikey](https://aistudio.google.com/apikey) 页面。  
   - 打开 Console，复制 [`FetchApiKeys.js`](./FetchApiKeys.js) 文件中的代码，并执行。
   
3. **提取已有 API Key（可选）**：  
   - 同样在 [Google AI Studio /apikey](https://aistudio.google.com/apikey) 页面，通过 Console 复制 [`FetchAllExistingKeys.js`](./FetchAllExistingKeys.js) 文件中的代码并执行，脚本会扫描并输出所有现有的 API Key。

---

## 仓库结构 📂

```bash
google-ai-gemini-key-scripts/
├─ CreateProjects.js           # (Step 1) 控制台脚本版：自动创建项目脚本
├─ FetchApiKeys.js             # (Step 2) 控制台脚本版：自动为项目创建并获取 API Key
├─ FetchAllExistingKeys.js     # (Step 3, 可选) 控制台脚本版：提取所有已存在 API Key
├─ Google_AI_Studio_Gemini_Automation_Suite.user.js  # 油猴脚本版（集成所有功能）
├─ README.md                   # 本文档（中文版）
```

---

## 常见问题 (FAQ) ❓

1. **脚本无反应或报错怎么办？**  
   - 请确认你已成功登录所需页面（Google Cloud Console 或 Google AI Studio）。  
   - 查看开发者工具 Console 中的错误信息，部分错误可能由于 Google 界面改版导致脚本中选择器失效，此时需要更新相关代码。  
   - 检查你的网络连接是否正常，网络不稳定也可能导致脚本超时或无法运行。

2. **为什么 API Key 生成不完整或失败？**  
   - 可能是由于项目或 API Key 的配额不足、网络不稳定或等待时间不够。  
   - 你可以尝试在配置中调整相关的等待延时（例如增大 `SELECT_CHANGE_DELAY`）或减少一次性批量创建的数量。

3. **是否存在账号被封的风险？**  
   - 由于脚本批量自动操作，存在一定风险。请不要在短时间内大量创建项目或 API Key，建议合理使用。

4. **如何申请更多项目配额？**  
   - 请参考下文【可选操作：申请更多项目配额】部分说明，或查阅相关文档进行申请。

5. **生成的 API Key 怎么用？**  
   - 一般情况下，你需要在请求头中加入 `Authorization: Bearer YOUR_KEY`，具体配置请参考 Google AI Studio 官方文档。

6. **首次生成 API Key 失败怎么办？**  
   - 脚本在下拉框选项点击后会额外派发 change 事件，并等待预设时间（默认 1000 毫秒），以确保选中生效。如果仍遇问题，请适当调整该延时参数。

7. **为何提供两种使用方式？**  
   - 油猴脚本方式能实现一键全自动化，适合想要省事的用户；  
   - 控制台脚本方式则适合喜欢手动操作、调试或只使用部分脚本功能的用户。

---

## 可选操作：申请更多项目配额 📈

如果默认的 12 个项目额度不满足需求，你可以在**开始创建项目之前**前往 [项目配额申请页面](https://support.google.com/code/contact/project_quota_increase) 申请更多额度。请依据页面提示填写相关信息和申请理由，然后提交申请，Google 审核通过后，你的额度会相应提高。

---

## 贡献与反馈

如果你在使用过程中有任何疑问或改进建议，欢迎通过 GitHub 的 Issue 或 Pull Request 与我联系！  
希望本项目能帮助你高效批量创建项目和管理 API Key，祝你开发顺利，Happy Coding！ 🚀

---
