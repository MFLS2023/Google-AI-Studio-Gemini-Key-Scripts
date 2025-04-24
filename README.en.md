# Google AI Studio Gemini Key Scripts Collection 🚀

**中文版： [README.md](README.md)**

This repository includes **2 Tampermonkey/Greasemonkey user scripts** and **3 browser console scripts** to help you **bulk-create Google Cloud projects** and **obtain/manage Google AI Studio (Gemini) API keys**. Ideal for scenarios requiring large-scale key management or frequent project creation.

> ⚠️ **Disclaimer**
> - This project is for educational and reference purposes only. **Use at your own risk.**
> - Due to Google limitations, each project shares the same API key quota. By default, each project will create 1 key, and it is recommended not to exceed 5 projects per account.
> - Scripts can be copy-pasted and run directly. Configuration options are provided in comments—feel free to adjust as needed.
> - Google may update their UI or APIs at any time. If a script stops working, you may need to update selectors or submit an Issue.
> - **Please comply with Google Cloud and AI Studio terms of service.**
> - If you find this project useful, please give it a **Star ⭐️**!

---

## ✨ Scripts Overview

| Name                                              | File                                                        | Type         | Main Features                                                                       | Notes                                    |
|---------------------------------------------------|-------------------------------------------------------------|--------------|-------------------------------------------------------------------------------------|------------------------------------------|
| **AI Studio API Key Clipboard Automator**         | `AI_Studio_API_Key_Clipboard_Automator.user.js`             | Tampermonkey | 1. Bulk-create projects<br>2. Generate keys **and auto-copy to clipboard**<br>3. Extract existing keys and copy to clipboard | **Recommended for mobile users** (no console needed) |
| **Google AI Studio Gemini Automation Suite**      | `Google_AI_Studio_Gemini_Automation_Suite.user.js`          | Tampermonkey | 1. Bulk-create projects<br>2. Generate keys and **log to browser console**<br>3. Extract existing keys to console   | **Recommended for desktop users**       |
| **Create-Projects**                               | `CreateProjects.js`                                         | Console      | Bulk-create projects only                                                            | Copy-paste into Cloud Console           |
| **Fetch-Api-Keys**                                | `FetchApiKeys.js`                                           | Console      | Generate keys for existing projects                                                  | Copy-paste into AI Studio console       |
| **Fetch-All-Existing-Keys**                       | `FetchAllExistingKeys.js`                                   | Console      | Extract all existing keys under the account                                          | Copy-paste into AI Studio console       |

---

## 📑 Table of Contents

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Workflow Overview](#workflow-overview)
4. [Customization Options](#customization-options)
5. [Usage: User Scripts vs. Console Scripts](#usage-user-scripts-vs-console-scripts)
   - [Method 1: Tampermonkey/Greasemonkey](#method-1-tampermonkeygreasemonkey)
   - [Method 2: Browser Console Scripts](#method-2-browser-console-scripts)
6. [Repository Structure](#repository-structure)
7. [FAQ](#faq)
8. [Optional: Request More Project Quota](#optional-request-more-project-quota)
9. [Contributing & Feedback](#contributing--feedback)

---

## Features

- **Bulk Project Creation**: Automatically create multiple Google Cloud projects.
- **Automated API Key Generation**: Generate Gemini API keys for each project in AI Studio.
  - **Clipboard Automator**: Immediately copies all generated keys to the system clipboard; falls back to a `<textarea>` if blocked.
  - **Automation Suite**: Logs generated keys to the browser console for further processing.
- **Existing Key Extraction**: Scan and retrieve all existing API keys under your account.
- **Floating Action Panel**: Scripts inject buttons into the top-right corner of relevant pages for one-click operations.

---

## Prerequisites

1. **Google Account**: Logged into both [Google Cloud Console](https://console.cloud.google.com/) and [Google AI Studio](https://aistudio.google.com/).
2. **Browser**: Latest Chrome, Edge, or Firefox with Tampermonkey v5+ installed.
3. **Internet Access**: Must be able to reach Google domains.
4. **Project Quota**: Free tier allows up to 12 projects. To exceed, see [Optional: Request More Project Quota](#optional-request-more-project-quota).

---

## Workflow Overview

```text
1. Log into Google Cloud Console (complete any 2FA if enabled)
2. (Optional) Request more project quota
3. Run the "Create Projects" script/button to bulk-create new projects
4. Navigate to AI Studio /apikey page
5. Run the "Generate API Keys" script/button to bulk-generate keys
6. (Optional) Run the "Extract Existing Keys" script/button to retrieve all pre-existing keys
```

---

## Customization Options

Each Tampermonkey script defines a `CONFIG` object (or similarly named constants) at the top. You can modify:

| Parameter                   | Description                                          | Default  |
|-----------------------------|------------------------------------------------------|----------|
| `TARGET` / `PROJECT_CREATION_COUNT` | Number of projects to create in one run             | 5        |
| `API_KEYS_PER_PROJECT`      | Number of API keys to generate per project          | 1        |
| `BETWEEN` / `PROJECT_CREATION_DELAY` | Delay between creating projects (ms)                 | 5000     |
| `API_KEY_CREATION_DELAY`    | Delay between key generations (ms)                  | 2500     |
| `SELECT_CHANGE_DELAY`       | Extra wait after selecting dropdown options (ms)   | 1000     |
| `MAXR`                      | Maximum refresh attempts on failure                | 5        |

> We recommend starting with defaults; increase delays or decrease counts if you encounter timeouts or quota issues.

---

## Usage: User Scripts vs. Console Scripts

### Method 1: Tampermonkey/Greasemonkey

Use one of the two user scripts for end-to-end automation:

- **`AI_Studio_API_Key_Clipboard_Automator.user.js`** — Automatically copies generated keys to your clipboard. Ideal for **mobile** or when you prefer a clipboard-centric workflow.
- **`Google_AI_Studio_Gemini_Automation_Suite.user.js`** — Logs keys to the browser console. Ideal for **desktop** and debugging.

**Installation & Operation:**

1. Install Tampermonkey/Greasemonkey in your browser.
2. Create a new script in the dashboard and paste the contents of the chosen `.user.js` file.
3. Optionally adjust `CONFIG` in the script header.
4. Navigate to **Google Cloud Console** → click the **Create Projects & Get API Keys** button injected by the script.
5. After projects are created, it will redirect you to the AI Studio `/apikey` page and automatically generate keys.
6. To extract existing keys, click the **Extract API Keys** button on the same `/apikey` page.

---

### Method 2: Browser Console Scripts

If you prefer to manually paste code into the developer console, use the standalone scripts:

1. **Project Creation**
   - Open Cloud Console, press `F12`, paste `CreateProjects.js`, press `Enter`.
2. **API Key Generation**
   - Open AI Studio `/apikey`, paste `FetchApiKeys.js` into console, press `Enter`.
3. **Extract Existing Keys**
   - On AI Studio `/apikey`, paste `FetchAllExistingKeys.js`, press `Enter`.

---

## Repository Structure

```bash
google-ai-gemini-key-scripts/
├── AI_Studio_API_Key_Clipboard_Automator.user.js    # Tampermonkey: clipboard copy version
├── CreateProjects.js                               # Console: bulk-create projects
├── FetchApiKeys.js                                 # Console: generate API keys
├── FetchAllExistingKeys.js                         # Console: extract existing keys
├── Google_AI_Studio_Gemini_Automation_Suite.user.js # Tampermonkey: console output version
├── README.md                                       # Chinese documentation
└── README.en.md                                    # English documentation (this file)
```

---

## FAQ

1. **Script does nothing or throws an error?**
   - Ensure you are on the correct page (Cloud Console or AI Studio `/apikey`).
   - Check devtools console for error details. UI changes may require updating selectors.

2. **Only some keys generated?**
   - Could be due to project quota exhaustion, network latency, or insufficient delays. Lower counts or increase delays.

3. **Could this trigger account restrictions?**
   - Automated bulk operations carry risk. Use responsibly and obey service terms.

4. **Clipboard writes blocked?**
   - Browser security may block clipboard API. The Automator script will show a `<textarea>` fallback for manual copy.

5. **How to use the keys?**
   - Include in requests via header: `Authorization: Bearer YOUR_KEY`. See Google AI Studio docs for details.

6. **Tampermonkey vs. console scripts?**
   - Use user scripts for convenience and full automation; console scripts for selective execution or debugging.

---

## Optional: Request More Project Quota

If you need more than 12 projects:

1. Go to the Google support form: <https://support.google.com/code/contact/project_quota_increase>
2. Fill in your details, specify the number of projects required (e.g., 50 or 100), and select **Both free and paid services** if possible.
3. Provide a justification. Sample reasons:

   > **Increased Computational Research Needs**
   > 
   > We are conducting large-scale computational simulations for advanced scientific research. Our current project quota limits our ability to run parallel experiments, leading to delays. A higher project quota would enable timely completion of our research objectives.

   > **High-Volume API Integration**
   > 
   > Our application integrates data from multiple external APIs for real-time analytics. The existing project quota is restricting our ability to manage separate environments and keys for different stages (dev/staging/prod). We request an increase to maintain clean separation and security best practices.

---

## Contributing & Feedback

- Please file issues or pull requests at <https://github.com/your-repo/google-ai-gemini-key-scripts>.
- Include browser version and console logs for faster troubleshooting.
- If you find this project helpful, please give it a **Star ⭐️**. Thank you!

