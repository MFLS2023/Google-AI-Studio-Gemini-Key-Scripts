
---

# 🔑 Google AI Studio Gemini Key Scripts

**🌍 [中文文档 (中文说明点这里)](README.md)**

Welcome! This repository provides a collection of scripts that allow you to **bulk-create Google Cloud projects** and **automatically generate or retrieve API keys** for [Google AI Studio (Gemini)](https://aistudio.google.com/). Whether you're a developer, researcher, or just looking to automate your workflow — you're in the right place.

> ⚠️ **Disclaimer**  
> - This project is for educational and research purposes only. Use at your own risk.  
> - Each Google project shares the same quota across its keys. So by default, only 1 API key is created per project.  
> - For safety and sustainability, it’s recommended not to exceed 5 projects per account.  
> - The script may become outdated if Google changes their UI or APIs — feel free to open an issue.  
> - Please **respect Google's Terms of Service** and avoid excessive automation or abuse.  
> - If you find this repo helpful, a ⭐️ would mean a lot. Thanks!

---

## 📑 Table of Contents

1. [Features](#features)  
2. [Requirements](#requirements)  
3. [Workflow Overview](#workflow-overview)  
4. [User Configuration](#user-configuration)  
5. [Two Ways to Use the Scripts](#two-ways-to-use-the-scripts)  
   - [Option 1: Tampermonkey Script (Recommended)](#option-1-tampermonkey-script---google-ai-studio-gemini-automation-suite)  
   - [Option 2: Console Scripts](#option-2-console-scripts)  
6. [Repository Structure](#repository-structure)  
7. [FAQ](#faq)  
8. [How to Request More Quota (Optional)](#how-to-request-more-quota-optional)  
9. [Contributing](#contributing)

---

## ✨ Features

- **Automated Project Creation**  
  Easily create multiple Google Cloud projects with just one click.

- **Auto API Key Generation**  
  Automatically create API keys for Gemini under each new project, and output them neatly in the console for copy-paste convenience.

- **Optional Key Extraction**  
  Scan your existing API keys (if you're a longtime user) and list them all in one go.

---

## 🧰 Requirements

1. **Google Account**  
   - You must be able to log into [Google Cloud Console](https://console.cloud.google.com/) and [Google AI Studio](https://aistudio.google.com/).  
   - If 2FA is enabled, make sure to unlock first.

2. **Browser + Network Access**  
   - Chrome, Edge, or Firefox is highly recommended.  
   - Ensure your network can access Google services. VPN may be required in some regions.

3. **Quota & Limits**  
   - Free accounts can usually create up to **12 projects**.  
   - You can request more [via this form](https://support.google.com/code/contact/project_quota_increase) if needed.

---

## 🔁 Workflow Overview

```
 ┌────────────────────────────┐
 │ 1. Login to Google Console │
 │    (2FA if needed)         │
 └──────────────┬─────────────┘
                ▼
 ┌────────────────────────────┐
 │ 2. (Optional) Request Quota│
 └──────────────┬─────────────┘
                ▼
 ┌────────────────────────────┐
 │ 3. Run CreateProjects Script│
 │    (Create Projects in Bulk)│
 └──────────────┬─────────────┘
                ▼
 ┌────────────────────────────┐
 │ 4. Open AI Studio          │
 │    Go to /apikey page      │
 └──────────────┬─────────────┘
                ▼
 ┌────────────────────────────┐
 │ 5. Run FetchApiKeys Script │
 │    (Generate Keys per Project)│
 └──────────────┬─────────────┘
                ▼
 ┌────────────────────────────┐
 │ 6. (Optional) Extract Keys │
 │    (From existing projects)│
 └────────────────────────────┘
```

---

## ⚙️ User Configuration

Inside the Tampermonkey script, you'll find a configuration section like this:

```js
const CONFIG = {
  PROJECT_CREATION_COUNT: 5,
  API_KEYS_PER_PROJECT: 1,
  PROJECT_CREATION_DELAY: 5000,
  API_KEY_CREATION_DELAY: 2500,
  SELECT_CHANGE_DELAY: 1000
};
```

You can adjust:
- How many projects to create
- How many keys per project
- Delay between actions (important to avoid failures)
- Additional delay for dropdown selection (for slower connections)

---

## 🧭 Two Ways to Use the Scripts

### ✅ Option 1: Tampermonkey Script — Google AI Studio Gemini Automation Suite

We recommend this method for beginners and those who want an all-in-one experience.

#### Steps:

1. **Install Tampermonkey Extension**  
   Get it from your browser’s extension store (Chrome/Edge/Firefox supported).

2. **Import the Script**  
   Add `Google_AI_Studio_Gemini_Automation_Suite.user.js` from this repo to [Tampermonkey](https://www.tampermonkey.net/).  
   (Click “+” > Paste the code > Save)

3. **How It Works**  
   - Visit [console.cloud.google.com](https://console.cloud.google.com/)  
     A floating button will appear → Click “Create Projects + Get API Keys”  
     → Script will create projects and redirect to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)  
   - Once on the API key page, the script auto-generates keys and displays them in the console.  
   - You can also click “Extract Keys” to scan all existing API keys.

---

### 🖥️ Option 2: Console Scripts

Prefer hands-on control? These scripts can be run manually via browser console.

#### Step-by-step:

1. **Open Google Cloud Console** → Press `F12` → Console  
   Paste [`CreateProjects.js`](./CreateProjects.js) and press Enter.

2. **Visit AI Studio /apikey** → Press `F12` again  
   Paste [`FetchApiKeys.js`](./FetchApiKeys.js) and execute.

3. **(Optional)** Extract existing keys:  
   Same `/apikey` page → Paste [`FetchAllExistingKeys.js`](./FetchAllExistingKeys.js)

---

## 📁 Repository Structure

```bash
google-ai-gemini-key-scripts/
├─ CreateProjects.js                    # Manual script for project creation
├─ FetchApiKeys.js                     # Manual script for API key generation
├─ FetchAllExistingKeys.js             # Optional script to extract existing keys
├─ Google_AI_Studio_Gemini_Automation_Suite.user.js  # All-in-one Tampermonkey script
├─ README.md                           # Main documentation (中文)
├─ README.en.md                        # English version (this file)
```

---

## ❓ FAQ

1. **Script doesn't run / no response?**  
   Make sure you’re logged in and on the correct page (Cloud Console or AI Studio).  
   Open Console (F12) → Check for errors.

2. **Some keys not generated?**  
   This could be due to API quota limits, timeouts, or connection issues.  
   Try increasing delay values in config.

3. **Will I get banned?**  
   Possibly, if you spam the service. Please use responsibly and avoid creating/deleting too many projects in short time.

4. **How to request more project quota?**  
   See [How to Request More Quota (Optional)](#how-to-request-more-quota-optional)

5. **How to use the generated keys?**  
   Typically in your request headers:  
   `Authorization: Bearer YOUR_API_KEY`

6. **Failed first-time API key creation?**  
   The dropdown may require a short delay. You can increase `SELECT_CHANGE_DELAY` to 1000~2000ms if needed.

---

## 📈 How to Request More Quota (Optional)

If your account is limited to 12 projects, you can request more here:  
👉 [https://support.google.com/code/contact/project_quota_increase](https://support.google.com/code/contact/project_quota_increase)

You’ll need to:
- Fill in your details
- Justify your use (research, experimentation, integration, etc.)
- Wait for email approval (can take hours to a few days)

Sample reasons are provided in the Chinese README file.

---

## 🤝 Contributing

- Found a bug or have suggestions? Open an issue or PR.
- Translators welcome!
- Feel free to fork and remix.

---

Enjoy building with Gemini ✨  
If this helped you, please ⭐️ the repo!

---

