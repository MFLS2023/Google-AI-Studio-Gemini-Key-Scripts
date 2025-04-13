
---

# Google AI Studio Gemini Key Scripts

本仓库包含了 **3 个核心脚本**，帮助你**批量创建 Google Cloud 项目**并**获取 Google AI Studio（Gemini）API Key**。适用于需要大量管理 Key 或频繁创建新项目的场景。

> **重要提示 / 免责声明**  
> - **本项目仅供学习参考使用，任何因使用本脚本产生的风险需自行承担。**
> - **因为Google大善人的限制，每个项目的 KEY 实际上是共享同一项目的资源的，所以这里兜售默认每个项目创建 1 个KEY**
> - 代码可以直接复制粘贴运行，注释不用管，如果你要自己修改的话，需要手动修改的也很少，注释得很清楚。
> - Google 可能随时更新界面或接口，导致脚本失效或出现异常情况。若有问题，请自行调试或提 Issue。  
> - **请遵守 Google Cloud 与 Google AI Studio 的服务条款，避免恶意或频繁操作导致账号受限。**
> - **如果有帮助到你的话，还请给我一个小小的star，谢谢了！**

---

## 目录

1. [功能概览](#功能概览)  
2. [环境准备](#环境准备)  
3. [流程总览](#流程总览)  
4. [可选操作：申请更多项目配额](#可选操作申请更多项目配额)  
5. [脚本使用步骤](#脚本使用步骤)  
   - [Step 1：批量创建项目（CreateProjects.js）](#step-1批量创建项目createprojectsjs)  
   - [Step 2：为新项目创建并获取 Key（FetchApiKeys.js）](#step-2为新项目创建并获取-keyfetchapikeysjs)  
   - [Step 3：可选，一次性获取已存在 Key（FetchAllExistingKeys.js）](#step-3可选一次性获取已存在-keyfetchallexistingkeysjs)  
6. [仓库结构](#仓库结构)  
7. [常见问题 (FAQ)](#常见问题-faq)  


---

## 功能概览

- **自动化项目创建**：一键批量在 Google Cloud Console 中创建多个项目，减少手动点击操作。  
- **自动化 Key 获取**：在 Google AI Studio 中自动为每个项目创建并获取 Gemini API Key，并在控制台输出集中管理。  
- **可选获取已存在 Key**：如果你是“老账号”已经有不少 Key，但没有记录，可用脚本一并扫描输出。

---

## 环境准备

1. **可访问 Google Cloud & AI Studio 的 Google 账号**  
   - 确保能登录 [Google Cloud Console](https://console.cloud.google.com/) 和 [Google AI Studio](https://aistudio.google.com/)。  
   - 如果启用了双因素验证（2FA）或使用企业/学校账号，请先手动完成登录解锁。

2. **浏览器与网络**  
   - 推荐使用最新版的 Chrome/Edge/Firefox 等；  
   - 网络需能正常访问 Google 服务，否则脚本可能报错或卡住。

3. **默认项目配额**  
   - 免费账号通常可建 **12 个项目**。如果 12 个不够，可先尝试[申请更多项目配额](#可选操作申请更多项目配额)。  
   - 如果需求不大，也可以直接使用默认额度。

---

## 流程总览

下图示意了一个常见的使用流程（从 0 开始想批量拿 Key 的场景）：

```
 ┌────────────────────────┐
 │ 1. 登录 Google Cloud   │
 │    (若需 2FA 先解锁)   │
 └──────────────┬─────────┘
                │
                ▼
 ┌────────────────────────┐
 │ 2. (可选) 申请配额     │
 └──────────────┬─────────┘
                │
                ▼
 ┌────────────────────────┐
 │ 3. 运行CreateProjects   │
 │    批量创建项目         │
 └──────────────┬─────────┘
                │
                ▼
 ┌────────────────────────┐
 │ 4. 登录 AI Studio      │
 │    打开 /apikey        │
 └──────────────┬─────────┘
                │
                ▼
 ┌────────────────────────┐
 │ 5. 运行FetchApiKeys    │
 │    批量为项目创建Key    │
 │    并自动输出列表       │
 └──────────────┬─────────┘
                │
                ▼
    (可选) 如果已有项目 & Key
 ┌────────────────────────┐
 │ 6. FetchAllExistingKeys│
 │   (获取所有已存在Key)   │
 └────────────────────────┘
```

---

## 可选操作：申请更多项目配额

如果你觉得默认的 12 个项目额度不够，可以在**开始创建项目前**先前往 [配额申请页面](https://support.google.com/code/contact/project_quota_increase) 来申请更多项目配额。以下是一种参考流程与示例理由，你也可以自行调整内容：

1. **打开链接**  
   [https://support.google.com/code/contact/project_quota_increase](https://support.google.com/code/contact/project_quota_increase)

2. **填写基本信息**  
   - `Company name or website`：可以写自己的域名、个人网站或干脆 `github.com` 等。  
   - 配额 `How many projects are being requested? (ex. 5, 10, 20, 50, etc.)`：例如填 `100`。  
   - **What kind of services will these projects use?**  
     - 若你是付费用户，可选择 `Both free and paid services`，相对减少被封可能。  
   
3. **编写理由**  
   - 你可以直接粘贴以下示例，或做适当修改：

   > **第一种：Iata Analysis**  
   >
   > ```
   > Our ongoing scientific research project requires substantial computational resources for analyzing increasingly complex datasets. We are experiencing limitations with our current quota when running advanced statistical analyses and computational modeling tasks essential to our research goals. An increased quota is necessary to ensure timely completion of our data analysis and to maintain progress in our research.
   > ```

   > **第二种：Expanding Simulation Capabilities for Scientific Modeling**  
   >
   > ```
   > Our research relies heavily on computational simulations to model complex scientific phenomena. We are currently expanding the scope and scale of our simulations, which demands a significant increase in computational resources. The current quota restricts our ability to run larger, more detailed simulations necessary for achieving higher fidelity and more accurate research outcomes. A quota increase is crucial to enable these advanced simulations.
   > ```

   > **第三种：Growing Data Storage Needs for Research Datasets**  
   >
   > ```
   > Our scientific research is generating increasingly large datasets that require secure and accessible storage. Our current storage quota is becoming insufficient to accommodate the growing volume of research data. An increased storage quota is essential to ensure we can continue to collect, store, and manage our research data effectively and maintain the integrity of our research outputs.
   > ```

   > **第四种：Increased API Usage for Data Acquisition and Integration**  
   >
   > ```
   > Our research project relies on programmatic access to external scientific databases and APIs to acquire and integrate data from various sources. As our research expands, our usage of these APIs has increased significantly. The current API request quota is limiting our ability to collect the necessary data for our research in a timely manner. A quota increase is needed to facilitate efficient data acquisition.
   > ```

   > **第五种：Supporting Collaborative Research and Data Sharing**  
   >
   > ```
   > Our research project involves collaboration with multiple research institutions and requires secure data sharing and collaborative analysis environments. The current quota limitations are hindering our ability to effectively support collaborative access to resources and data sharing among our research partners. An increased quota is needed to facilitate seamless collaboration and data sharing, which are critical for the success of our multi-institutional research project.
   > ```

4. **提交并等待**  
   - 提交表单后，通常需等待数小时或数天不等，Google 审核后会给你邮件通知。  
   - 审核通过后，你的项目上限就会增加。

如果想先不等待审核，也可以直接使用默认的 12 个项目额度开始脚本操作。

---

## 脚本使用步骤

### Step 1：批量创建项目（CreateProjects.js）

1. **登录** [Google Cloud Console](https://console.cloud.google.com/) 并完成 2FA（如有）。  
2. **打开浏览器控制台**：`F12` -> 切换到 `Console`，并**建议勾选 “Preserve log / 保留日志”**。 ![image](https://github.com/user-attachments/assets/212bb645-f8a3-40b1-9067-10f25447854b)

3. **复制脚本**  
   - 在本仓库找到 [`CreateProjects.js`](./CreateProjects.js) 脚本文件，打开源代码，**复制全部**。  
4. **粘贴并回车**  
   - 回到浏览器控制台，粘贴脚本后按 Enter。  
   - 脚本开始执行，会自动点击“New Project”、“Create”按钮，一次批量创建多个项目。  
5. **等待完成**  
   - 若脚本检测到项目配额用尽或发生异常，会自动停止并在控制台提示。  
   - 创建成功后可以刷新或在 Google Cloud Console 中查看。

> **提示**：如果需要创建特别多项目，可在脚本中修改相应常量（如 `TARGET_PROJECT_CREATIONS`）。但要注意操作频次，以免触发风控。

---

### Step 2：为新项目创建并获取 Key（FetchApiKeys.js）

1. **登录** [AI Studio API Key 页面](https://aistudio.google.com/apikey)。  
2. **打开控制台** (F12 -> Console)，并**建议勾选 “Preserve log / 保留日志”**。  
3. **复制脚本**  
   - 找到 [`FetchApiKeys.js`](./FetchApiKeys.js)，复制全部内容。  
4. **粘贴并回车**  
   - 脚本会弹出“创建 API Key”的对话框；  
   - 依次为每个项目尝试创建 Key 并在控制台输出成功创建的 Key；  
   - 若遇超时或配额限制，会跳过该项目并继续下一项。  
5. **复制 Key**  
   - 脚本结束后，Console 会打印所有成功获取的 Key（通常是一行一个带逗号，方便复制粘贴）。

---

### Step 3：可选，一次性获取已存在 Key（FetchAllExistingKeys.js）

- 如果你是**老账号**或脚本运行中断后想要**扫描已有 Key**，使用此脚本：  
  1. 登录 [AI Studio API Key 页面](https://aistudio.google.com/apikey)。  
  2. F12 -> Console，复制 [`FetchAllExistingKeys.js`](./FetchAllExistingKeys.js) 源代码并粘贴。  
  3. 执行后脚本会尽力列出所有已存在 Key 并在 Console 中输出。

---

## 仓库结构

```bash
google-ai-gemini-key-scripts/
├─ CreateProjects.js           # (Step 1) 自动创建项目脚本
├─ FetchApiKeys.js            # (Step 2) 为新项目批量创建&获取Key
├─ FetchAllExistingKeys.js     # (Step 3，可选) 获取所有已存在Key
├─ README.md                   # 项目使用说明 (你正在看的文件)
```
---

## 常见问题 (FAQ)

1. **脚本没反应 / 报错怎么办？**  
   - 先检查是否成功登录到对应页面 (Console 或 AI Studio)；  
   - 查看控制台报错信息，可能是 Google 改版导致脚本选择器失效，需手动更新；  
   - 若仍无法解决，考虑提交 Issue 或检查网络环境。

2. **Key 没有生成或只生成部分？**  
   - 可能项目或 Key 配额已满，或网络不稳定导致超时跳过；  
   - 可尝试减少一次性创建数量、增加脚本等待延迟。

3. **会不会被 Google 封号？**  
   - 存在一定风险；请**不要在短时间内大量创建**或删除项目/Key；  
   - 尽量合理使用，避免非必要的高频操作。

4. **如何申请更多项目配额？**  
   - 见 [可选操作：申请更多项目配额](#可选操作申请更多项目配额) 或 [docs/QuotaRequestGuide.md](./docs/QuotaRequestGuide.md)（如有）。  
   - 简而言之，访问 [项目配额申请页面](https://support.google.com/code/contact/project_quota_increase)，填写合理理由并等待审核。

5. **创建好的 Key 要如何使用？**  
   - 一般在请求头中携带：`Authorization: Bearer YOUR_KEY`，也可能需要配合其他 Google Cloud 设置；  
   - 具体以 Google AI Studio 官方文档为准。
6. **已经创建了项目，但无法创建或使用 API Key，该怎么办？**  
- 如果你想要使用 Gemini 相关的 API，需要先在 Google Cloud Console 启用 [Generative Language (Gemini) API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)。  
- 进入上述链接后，选择要启用的项目，点击“Enable”或“启用 API”按钮。  
- 若未启用该 API，即使已经成功创建了 Key，后续调用也可能无法正常工作。

---


> **欢迎提交 Issue 或 Pull Request**：如果有任何疑问或改进思路，欢迎讨论！  
> 祝你批量创建项目与获取 Key 一切顺利！
