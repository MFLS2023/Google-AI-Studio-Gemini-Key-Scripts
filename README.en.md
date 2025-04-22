# Google AI Studio Gemini Key Script Collection 🚀

**🌍 [中文文档 (中文说明点这里)](README.md)**

**Default language: English**  

This repository contains **3 core scripts** that help you **create Google Cloud projects in bulk** and **obtain Google AI Studio (Gemini) API Keys**. Even if you have little programming experience, you can follow the steps below with ease.  
The scripts are intended for scenarios where you need to manage a large number of keys or frequently create new projects.

> ⚠️ **Important Notice / Disclaimer**  
> - **These scripts are provided for educational and reference purposes only. Any risk arising from their use is borne solely by the user.**  
> - **Because Google limits resources, all API Keys under the same project share the same quota. By default each project creates one key, and one Google account is advised not to create more than 5 projects.**  
> - The code can be copied and executed as‑is (each script contains comments indicating adjustable parameters). Modify them as needed.  
> - Google may update its UI or interfaces at any time. If a script stops working, please debug on your own or open an Issue.  
> - **Please comply with the Google Cloud and Google AI Studio terms of service and avoid malicious or high‑frequency operations that might lead to account restrictions.**  
> - **If you find this project helpful, please consider giving it a ⭐️!**

---

## Table of Contents  
1. [Feature Overview](#feature-overview)  
2. [Prerequisites](#prerequisites)  
3. [Workflow Overview](#workflow-overview)  
4. [User‑Configurable Parameters](#user‑configurable-parameters)  
5. [Tampermonkey & Console Script Usage](#tampermonkey--console-script-usage)  
   - [Method 1: Tampermonkey Script — Google AI Studio Gemini Automation Suite](#method-1-tampermonkey-script--google-ai-studio-gemini-automation-suite)  
   - [Method 2: Console Scripts](#method-2-console-scripts)  
6. [Repository Structure](#repository-structure)  
7. [FAQ](#faq)  
8. [Optional: Requesting Additional Project Quota](#optional-requesting-additional-project-quota)  
9. [Contributing & Feedback](#contributing--feedback)

---

## Feature Overview

This repository’s scripts offer the following benefits:

- **Automated Project Creation**  
  Create multiple projects in Google Cloud Console with zero repetitive clicking.

- **Automated API Key Generation**  
  Automatically create Gemini API Keys for each new project in Google AI Studio and print the results in the browser console for easy management and copy‑paste.

- **Automatic Extraction of Existing Keys**  
  Scan the current account for existing API Keys and list them, so you never lose track of what you already have.

---

## Prerequisites

1. **Google Account**  
   - Sign in to the [Google Cloud Console](https://console.cloud.google.com/) and [Google AI Studio](https://aistudio.google.com/).  
   - If you have 2‑Step Verification or use a school/workspace account, unlock it first.

2. **Browser & Network**  
   - Latest versions of Chrome, Edge, or Firefox are recommended.  
   - Ensure a stable network that can reach Google services, otherwise scripts may error or hang.

3. **Project Quota**  
   - A free account can create **12 projects** by default. If that is not enough, see [Optional: Requesting Additional Project Quota](#optional-requesting-additional-project-quota).

---

## Workflow Overview

The diagram below outlines the full sequence from signing in to creating projects and generating keys:

```
 ┌────────────────────────────┐
 │ 1. Sign in to Google Cloud │
 │    (unlock 2FA if needed)  │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 2. (Optional) Request more │
 │    project quota           │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 3. Run the project‑creation│
 │    script (bulk projects)  │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 4. Sign in to AI Studio    │
 │    and open /apikey page   │
 └──────────────┬─────────────┘
                │
                ▼
 ┌────────────────────────────┐
 │ 5. Run the key‑generation  │
 │    script (bulk keys)      │
 └──────────────┬─────────────┘
                │
                ▼
  (Optional) if you already
      have API Keys
 ┌────────────────────────────┐
 │ 6. Run the extraction      │
 │    script (list all keys)  │
 └────────────────────────────┘
```

---

## User‑Configurable Parameters

When using the **Tampermonkey script**, you will find a `CONFIG` object at the top of the file. You can modify:

- **PROJECT_CREATION_COUNT** — number of projects to create (e.g., `5`)  
- **API_KEYS_PER_PROJECT** — number of keys per project (e.g., `1`)  
- **PROJECT_CREATION_DELAY** — delay between creating two projects (ms)  
- **API_KEY_CREATION_DELAY** — delay between creating two keys (ms)  
- **SELECT_CHANGE_DELAY** — extra wait time after a dropdown change event to ensure it is applied (ms)

If you understand the script basics, feel free to tweak these values according to your network speed and requirements.

---

## Tampermonkey & Console Script Usage

### Method 1: Tampermonkey Script — Google AI Studio Gemini Automation Suite

This Tampermonkey script integrates project creation, API key generation, and key extraction into a single package and injects a floating button on the page for intuitive operation.

#### Steps

1. **Install Tampermonkey**  
   - Search for and install “Tampermonkey” (or any user‑script manager) from your browser’s extension store.  
   - Too lazy to search? Click [here](https://www.tampermonkey.net/).

2. **Import the Script**  
   - Save `Google_AI_Studio_Gemini_Automation_Suite.user.js` from this repo and add it to Tampermonkey.  
   - Adjust configuration in the `CONFIG` object if necessary.

3. **How to Use**  
   - **In Google Cloud Console:**  
     Go to [Google Cloud Console](https://console.cloud.google.com/). A button labeled **“Create Projects & Get API KEY”** appears at the top‑right:  
     1. If you are not on the `console.cloud.google.com` domain, the script auto‑redirects.  
     2. Clicking the button will create projects in bulk per your config, then automatically record a flag and navigate to the [Google AI Studio /apikey](https://aistudio.google.com/apikey) page.  
   - **In Google AI Studio:**  
     On the `/apikey` page, the script detects the flag and starts creating API Keys in bulk.  
     - For the first dropdown click, it dispatches a `change` event and waits a bit (default `1000` ms) to ensure it takes effect.  
   - **Extract Existing Keys:**  
     Click the floating **“Extract API KEY”** button to scan and print all existing keys to the browser console.

---

### Method 2: Console Scripts

If you prefer manual control in the browser DevTools Console or only need part of the functionality, use the console scripts.

#### Steps

1. **Project Creation**  
   - Sign in to [Google Cloud Console](https://console.cloud.google.com/).  
   - Press `F12` → Console → copy all code from [`CreateProjects.js`](./CreateProjects.js) and press Enter.

2. **API Key Generation**  
   - Sign in to [Google AI Studio /apikey](https://aistudio.google.com/apikey).  
   - In Console, copy all code from [`FetchApiKeys.js`](./FetchApiKeys.js) and run.

3. **Extract Existing Keys (Optional)**  
   - Still on the `/apikey` page, copy all code from [`FetchAllExistingKeys.js`](./FetchAllExistingKeys.js) and run.  
     The script lists all existing API Keys for the current account.

---

## Repository Structure

```bash
google-ai-gemini-key-scripts/
├─ CreateProjects.js           # (Step 1) Console script: auto‑create projects
├─ FetchApiKeys.js             # (Step 2) Console script: auto‑generate API Keys
├─ FetchAllExistingKeys.js     # (Step 3, optional) Console script: extract all existing API Keys
├─ Google_AI_Studio_Gemini_Automation_Suite.user.js  # Tampermonkey script (all‑in‑one)
├─ README.md                   # Chinese version
└─ README.en.md                # English version (this file)
```

---

## FAQ

1. **The script does nothing or throws errors.**  
   - Make sure you are on the correct page (Google Cloud Console or AI Studio) and check the browser console for errors.  
   - A selector might have broken because Google changed the UI — update the script accordingly.  
   - An unstable network can also cause hanging or timeouts.

2. **Keys are missing or only partially created.**  
   - Quota exhaustion, network lag, or insufficient delays may be the cause.  
   - Try lowering the batch size or increasing wait times (e.g., `SELECT_CHANGE_DELAY`).

3. **Will my Google account be suspended?**  
   - Bulk automation always carries some risk. Use responsibly and avoid rapid creation/deletion of projects and keys.

4. **How can I request a higher project quota?**  
   - See [Optional: Requesting Additional Project Quota](#optional-requesting-additional-project-quota) below or consult Google’s official docs.

5. **How do I use the generated keys?**  
   - Usually via HTTP header `Authorization: Bearer YOUR_KEY`.  
   - Refer to the official Google AI Studio documentation.

6. **The first API Key generation failed.**  
   - After the first dropdown click the script waits `1000` ms by default. If it still fails, adjust this value or retry.

7. **Tampermonkey script vs. console scripts?**  
   - **Tampermonkey** is one‑click automation for convenience.  
   - **Console scripts** allow selective use and easier debugging.

---

## Optional: Requesting Additional Project Quota

If the default 12 projects are insufficient, you can request more **before** creating projects via the [quota request page](https://support.google.com/code/contact/project_quota_increase).  
Below is a reference workflow and sample justifications; feel free to tailor them:

1. **Open the page**  
   <https://support.google.com/code/contact/project_quota_increase>

2. **Fill in basic info**  
   - `Company name or website`: your own domain, personal site, or simply `github.com`.  
   - `How many projects are being requested?`: e.g., `100`.  
   - **What kind of services will these projects use?**  
     - If you are a paying customer, choose **Both free and paid services** to reduce the chance of rejection.

3. **Write a justification**  
   You can copy one of the examples below or craft your own:

   > **Example 1: Data Analysis**  
   > ```
   > Our ongoing research requires substantial computational resources for analyzing complex datasets. The current quota limits timely completion of statistical analyses and modeling tasks. Increasing the quota is essential to maintain research progress.
   > ```
   >
   > **Example 2: Expanding Simulation Capabilities**  
   > ```
   > We rely on simulations to model scientific phenomena. As we scale up our simulations, we need more resources. The current quota prevents higher‑fidelity results. A quota increase is crucial for advanced simulations.
   > ```
   >
   > **Example 3: Growing Data Storage Needs**  
   > ```
   > Our research generates large datasets that require secure storage. Current quotas are insufficient. More storage is essential for data integrity and ongoing collection.
   > ```
   >
   > **Example 4: Increased API Usage**  
   > ```
   > Our project integrates data from multiple APIs. As we expand, our API usage grows. The current request quota hampers timely data acquisition. We need a higher quota for efficiency.
   > ```
   >
   > **Example 5: Supporting Collaborative Research**  
   > ```
   > We collaborate with multiple institutions, requiring shared resources. Current limits hinder collaboration. An increased quota will enable seamless data sharing and analysis.
   > ```

---

## Contributing & Feedback

- Found an issue or have a suggestion? Open an Issue or Pull Request on GitHub.  
- If this project saves you time, a STAR is greatly appreciated!  
- Happy coding and good luck! 🚀

---

