// ==UserScript==
// @name         AI Studio 多功能脚本合集（最终整合版）
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  此脚本整合了三个主要功能：1. 自动创建谷歌云项目。 2. 使用新的v15.7高级脚本自动为项目创建API KEY（支持自定义、重试、断点续传）。 3. 自动提取页面上已有的API KEY。
// @author       YourName & Gemini
// @match        *://*.console.cloud.google.com/*
// @match        *://*.aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /*******************************
     * 新版API KEY脚本的用户自定义配置
     *******************************/
    const CONFIG = {
        // 每个项目要生成的 Key 数量
        API_KEYS_PER_PROJECT: 1,
        // 成功创建一个 Key 后，到下一个操作的间隔 (毫秒)
        API_KEY_CREATION_DELAY: 2500,
        // 在下拉框中选择一个项目后，额外等待的时间 (毫秒)
        SELECT_CHANGE_DELAY: 1000,
        // 创建过程中发生网络错误等异常时，脚本自动刷新页面并重试的最大次数
        MAX_RETRIES: 5,
    };
    const RETRY_STATE_KEY = 'geminiApiRetryState';

    /*******************************
     * 新版API KEY脚本的UI和诊断工具
     *******************************/
    let diagnosticBox = null;
    let diagnosticStatusEl = null;
    function createDiagnosticBox() {
        if (document.getElementById('gm-diagnostic-box')) return;
        diagnosticBox = document.createElement('div');
        diagnosticBox.id = 'gm-diagnostic-box';
        const t = document.createElement('strong');
        t.textContent = 'Gemini脚本(v15.7)';
        diagnosticStatusEl = document.createElement('span');
        diagnosticStatusEl.textContent = '状态: 初始化...';
        diagnosticBox.appendChild(t);
        diagnosticBox.appendChild(document.createElement('br'));
        diagnosticBox.appendChild(diagnosticStatusEl);
        document.body.appendChild(diagnosticBox);
    }
    function updateDiagnostic(t, e = "info") {
        if (!diagnosticBox) {
            if (document.body) {
                createDiagnosticBox();
            } else {
                document.addEventListener('DOMContentLoaded', createDiagnosticBox, { once: true });
                setTimeout(() => updateDiagnostic(t, e), 50);
                return;
            }
        }
        diagnosticStatusEl.textContent = `状态: ${t}`;
        diagnosticBox.style.backgroundColor = "error" === e ? "#ffdddd" : "#e6f4ff";
        diagnosticBox.style.color = "error" === e ? "#d8000c" : "#00529B";
    }
    GM_addStyle(`#gm-diagnostic-box{position:fixed;top:10px;left:10px;padding:8px;background-color:#e6f4ff;border:1px solid #b3d4ff;border-radius:5px;font-family:Arial,sans-serif;font-size:12px;color:#00529B;z-index:99999;box-shadow:0 2px 5px rgba(0,0,0,0.1);line-height:1.4}`);


    /*******************************
     * 公共工具函数
     *******************************/
    // 延时函数，返回一个延时 promise
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // 等待指定选择器的元素出现并符合可见性条件，支持检查禁用状态
    async function waitForElement(selector, timeout = 15000, root = document, checkDisabled = true) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            let element;
            try {
                element = root.querySelector(selector);
            } catch (e) {}
            if (element && element.offsetParent !== null) {
                const style = window.getComputedStyle(element);
                if (
                    style &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    parseFloat(style.opacity) > 0
                ) {
                    if (checkDisabled && element.disabled) {
                        // 如果元素处于禁用状态，则继续等待
                    } else {
                        return element;
                    }
                }
            }
            await delay(250);
        }
        throw new Error(`等待元素 "${selector}" 超时 (${timeout}ms)`);
    }

    // 等待返回满足数量要求的多个元素
    async function waitForElements(selector, minCount = 1, timeout = 20000, root = document) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const elements = root.querySelectorAll(selector);
            if (elements.length >= minCount) {
                const first = elements[0];
                if (first && first.offsetParent !== null) {
                    return elements;
                }
            }
            await delay(300);
        }
        throw new Error(`超时：等待至少 ${minCount} 个元素 "${selector}"`);
    }

    /*******************************
     * 1. 项目创建流程（原样保留）
     *******************************/
    async function runProjectCreation() {
        // ... (这部分代码与您提供的旧脚本完全相同，为了简洁在此处省略)
        // 若当前页面不在 console.cloud.google.com 域，则自动跳转过去
        if (!location.host.includes("console.cloud.google.com")) {
            // 自动跳转，无需提示用户点击确认
            window.location.href = "https://console.cloud.google.com";
            return;
        }
        // 用户可自定义参数：目标创建项目数（默认 5）、两次尝试间延时（默认5000ms）、最大自动刷新次数（默认5）
        const TARGET_PROJECT_CREATIONS = 5;
        const DELAY_BETWEEN_ATTEMPTS = 5000;
        const MAX_AUTO_REFRESH_ON_ERROR = 5;
        const REFRESH_COUNTER_KEY = 'aiStudioAutoRefreshCountSilentColorOpt';

        let successfulSubmissions = 0;
        let stoppedDueToLimit = false;
        let stoppedDueToErrorLimit = false;
        let refreshCount = parseInt(GM_getValue(REFRESH_COUNTER_KEY, '0'));

        // 以下仅为 log 样式提示
        const STYLE_BOLD_BLACK = 'color: black; font-weight: bold;';
        const STYLE_BOLD_RED = 'color: red; font-weight: bold;';
        const STYLE_GREEN = 'color: green;';
        const STYLE_ORANGE_BOLD = 'color: orange; font-weight: bold;';
        const STYLE_RED = 'color: red;';

        console.log(`%cAI Studio 项目创建脚本 (控制台静默版)`, STYLE_BOLD_BLACK);
        console.log(`本次会话已刷新次数: ${refreshCount}/${MAX_AUTO_REFRESH_ON_ERROR}`);
        if (refreshCount >= MAX_AUTO_REFRESH_ON_ERROR) {
            console.error(`%c已达到自动刷新次数上限 (${MAX_AUTO_REFRESH_ON_ERROR})。脚本停止运行。`, STYLE_BOLD_RED);
            return;
        }

        // 检查是否触发项目数量限制
        async function checkLimitError() {
            try {
                const increaseButton = document.querySelector('a#p6ntest-quota-submit-button');
                const limitTextElements = document.querySelectorAll('mat-dialog-content p, mat-dialog-content div, mat-dialog-container p, mat-dialog-container div');
                let foundLimitText = false;
                limitTextElements.forEach(el => {
                    const text = el.textContent.toLowerCase();
                    if (text.includes('project creation limit') || text.includes('quota has been reached') || text.includes('quota limit')) {
                        foundLimitText = true;
                    }
                });
                if (increaseButton || foundLimitText) {
                    console.warn('检测到项目数量限制！');
                    return true;
                }
                return false;
            } catch (error) {
                console.error(`%c检查限制状态时出错:`, STYLE_RED, error);
                return false;
            }
        }

        // 尝试关闭对话框，用户无需手动操作
        async function tryCloseDialog() {
            console.log("尝试关闭可能存在的对话框...");
            try {
                const closeButtonSelectors = [
                    'button[aria-label="Close dialog"]',
                    'button[aria-label="关闭"]',
                    'mat-dialog-actions button:nth-child(1)',
                    'button.cancel-button',
                    'button:contains("Cancel")',
                    'button:contains("取消")'
                ];
                let closed = false;
                for (const selector of closeButtonSelectors) {
                    let button = null;
                    if (selector.includes(':contains')) {
                        const textMatch = selector.match(/:contains\(['"]?([^'")]+)['"]?\)/i);
                        if (textMatch && textMatch[1]) {
                            const textToFind = textMatch[1].toLowerCase();
                            const baseSelector = selector.split(':')[0] || 'button';
                            const buttons = document.querySelectorAll(baseSelector);
                            button = Array.from(buttons).find(btn => btn.textContent.trim().toLowerCase() === textToFind);
                        }
                    } else {
                        button = document.querySelector(selector);
                    }
                    if (button && button.offsetParent !== null) {
                        console.log(`找到关闭按钮 (${selector}) 并点击。`);
                        button.click();
                        closed = true;
                        await delay(700);
                        break;
                    }
                }
                if (!closed) console.log("未找到明确的关闭/取消按钮。");
            } catch (e) {
                console.warn("尝试关闭对话框时发生错误:", e.message);
            }
        }

        // 自动点击项目创建流程中的各个步骤
        async function autoClickSequence() {
            let step = '开始';
            try {
                step = '检查初始限制';
                if (await checkLimitError()) {
                    console.warn('检测到项目数量限制（开始时），停止执行。');
                    return { limitReached: true };
                }
                step = '点击项目选择器';
                console.log('步骤 1/3: 点击项目选择器...');
                await delay(1500);
                const selectProjectButton = await waitForElement('button.mdc-button.mat-mdc-button span.cfc-switcher-button-label-text');
                selectProjectButton.click();
                console.log('已点击项目选择器');
                await delay(2000);
                step = '检查对话框限制';
                if (await checkLimitError()) {
                    console.warn('检测到项目数量限制（对话框后），停止执行。');
                    await tryCloseDialog();
                    return { limitReached: true };
                }
                step = '点击 New Project';
                console.log('步骤 2/3: 点击 "New project"...');
                const newProjectButton = await waitForElement('button.purview-picker-create-project-button');
                newProjectButton.click();
                console.log('已点击 "New project"');
                await delay(2500);
                step = '检查创建前限制';
                if (await checkLimitError()) {
                    console.warn('检测到项目数量限制（点击 Create 前），停止执行。');
                    await tryCloseDialog();
                    return { limitReached: true };
                }
                step = '点击 Create';
                console.log('步骤 3/3: 点击 "Create"...');
                const createButton = await waitForElement('button.projtest-create-form-submit', 20000);
                createButton.click();
                console.log('已点击 "Create"，项目创建请求已提交。');
                return { limitReached: false };
            } catch (error) {
                console.error(`项目创建序列在步骤 [${step}] 出错:`, error);
                await tryCloseDialog();
                if (refreshCount < MAX_AUTO_REFRESH_ON_ERROR) {
                    refreshCount++;
                    GM_setValue(REFRESH_COUNTER_KEY, refreshCount.toString());
                    console.warn(`错误发生！尝试自动刷新页面 (第 ${refreshCount}/${MAX_AUTO_REFRESH_ON_ERROR} 次)...`);
                    await delay(1500);
                    window.location.reload();
                    return { refreshed: true, error: error };
                } else {
                    console.error(`错误发生，已达到刷新次数上限 (${MAX_AUTO_REFRESH_ON_ERROR})。请手动解决问题。`);
                    GM_setValue(REFRESH_COUNTER_KEY, '0');
                    throw new Error(`自动刷新达到上限后的错误：${error.message}`);
                }
            }
        }

        console.log(`准备开始执行项目创建，目标 ${TARGET_PROJECT_CREATIONS} 次...`);
        for (let i = 1; i <= TARGET_PROJECT_CREATIONS; i++) {
            console.log(`\n===== 开始第 ${i} 次尝试 =====`);
            let result = null;
            try {
                result = await autoClickSequence();
                if (result?.limitReached) {
                    stoppedDueToLimit = true;
                    console.log("检测到项目限制，停止循环。");
                    break;
                }
                if (!result?.refreshed) {
                    successfulSubmissions++;
                    console.log(`第 ${i} 次尝试提交成功。`);
                    if (i < TARGET_PROJECT_CREATIONS) {
                        console.log(`等待 ${DELAY_BETWEEN_ATTEMPTS / 1000} 秒后开始下一次...`);
                        await delay(DELAY_BETWEEN_ATTEMPTS);
                    }
                } else {
                    console.log("页面已刷新，当前执行停止。");
                    return;
                }
            } catch (error) {
                stoppedDueToErrorLimit = true;
                console.error(`循环在第 ${i} 次尝试时因错误中止。`);
                break;
            }
        }
        console.log('\n===== 项目创建执行完成 =====');
        if (stoppedDueToLimit) {
            console.log(`因达到项目限制而停止。共成功提交 ${successfulSubmissions} 次请求。`);
            GM_setValue(REFRESH_COUNTER_KEY, '0');
        } else if (stoppedDueToErrorLimit) {
            console.log(`因错误或刷新上限而停止。共成功提交 ${successfulSubmissions} 次请求。`);
        } else {
            console.log(`完成计划的 ${TARGET_PROJECT_CREATIONS} 次尝试，共成功提交 ${successfulSubmissions} 次请求。`);
            GM_setValue(REFRESH_COUNTER_KEY, '0');
        }
        console.log("--- 项目创建流程结束 ---");
    }


    /*******************************
     * 2. API KEY 自动生成流程 (v15.7 - 高级自定义版)
     *******************************/
    async function runNewApiKeyCreation() {
        updateDiagnostic("脚本已注入, 等待页面加载...");

        async function createAllNewGeminiApiKeys(retryState = {}) {
            const {
                initialProjects = [],
                initialKeys = [],
                startIndex = 0,
                retryCount = 0
            } = retryState;

            // 新版脚本的内部辅助函数
            const delay = (ms) => new Promise(res => setTimeout(res, ms));
            const waitForElementInDom=(s,t=3e4)=>new Promise((r,e)=>{let i=100,n=0;const o=setInterval(()=>{const c=document.querySelector(s);if(c)return clearInterval(o),r(c);(n+=i)>=t&&(clearInterval(o),e(new Error(`等待元素 "${s}" 超时`)))},i)});
            const waitForElementToBeEnabled=(s,t=1e4)=>new Promise((r,e)=>{let i=100,n=0;const o=setInterval(()=>{const c=document.querySelector(s);if(c&&!c.disabled)return clearInterval(o),r(c);(n+=i)>=t&&(clearInterval(o),e(new Error(`等待元素 "${s}" 可用超时`)))},i)});
            const findButtonByText=t=>{for(const r of t){const e=`//button[contains(., '${r.trim()}')]`,i=document.evaluate(e,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(i)return i}return null};
            const createCopyUI=t=>{const r="gemini-keys-copier";document.getElementById(r)?.remove();const e=document.createElement("div");e.id=r,Object.assign(e.style,{position:"fixed",top:"20px",right:"20px",zIndex:"9999",backgroundColor:"#f0f4f9",border:"1px solid #dcdcdc",borderRadius:"8px",padding:"15px",boxShadow:"0 4px 12px rgba(0,0,0,0.15)",fontFamily:"Arial, sans-serif",color:"#333",width:"400px"});const i=document.createElement("h3");i.textContent=`成功创建 ${t.length} 个新的 API Key`,Object.assign(i.style,{margin:"0 0 10px 0",fontSize:"16px"});const n=document.createElement("textarea");n.value=t.join("\n"),Object.assign(n.style,{width:"100%",minHeight:"150px",marginBottom:"10px",border:"1px solid #ccc",borderRadius:"4px",padding:"5px"}),n.readOnly=!0;const o=document.createElement("button");o.textContent="一键复制全部",Object.assign(o.style,{padding:"8px 12px",border:"none",borderRadius:"4px",backgroundColor:"#1a73e8",color:"white",cursor:"pointer"}),o.onclick=()=>{navigator.clipboard.writeText(n.value).then(()=>{o.textContent="已复制!",setTimeout(()=>{o.textContent="一键复制全部"},2e3)})};const c=document.createElement("button");c.textContent="关闭",Object.assign(c.style,{marginLeft:"10px",padding:"8px 12px",border:"1px solid #ccc",borderRadius:"4px",backgroundColor:"#fff",color:"#333",cursor:"pointer"}),c.onclick=()=>e.remove(),e.appendChild(i),e.appendChild(n),e.appendChild(o),e.appendChild(c),document.body.appendChild(e)};

            let newResults = [...initialKeys];
            let projectsToProcess = [...initialProjects];
            let currentProjectIndex = startIndex;

            try {
                if (projectsToProcess.length === 0) {
                    console.log("🚀 脚本首次执行 (v15.7)...");
                    updateDiagnostic("阶段1: 获取项目列表...");
                    const createKeyButtonMain = findButtonByText(["Create API key", "创建 API 密钥"]);
                    if (!createKeyButtonMain) throw new Error("无法找到主'创建 API 密钥'按钮。");
                    createKeyButtonMain.click();
                    const projectSearchInput = await waitForElementInDom('input[aria-label="Search Google Cloud projects"], input[aria-label="搜索 Google Cloud 项目"]');
                    projectSearchInput.click();
                    await waitForElementInDom('mat-option .project-display-name, mat-option .v3-font-body');
                    await delay(500);
                    const projectListContainer = await waitForElementInDom('div[role="listbox"]');
                    projectListContainer.querySelectorAll('mat-option').forEach(opt => {
                        const nameEl = opt.querySelector('.project-display-name, .v3-font-body');
                        const idEl = opt.querySelector('.project-id-text');
                        if (nameEl && idEl) { projectsToProcess.push({ displayName: nameEl.textContent.trim(), projectID: idEl.textContent.trim() }); }
                    });
                    console.log(`ℹ️  侦察到 ${projectsToProcess.length} 个项目。`);
                    (await waitForElementInDom('button[iconname="close"]')).click();
                    await delay(1500);
                } else {
                    console.log(`🚀 脚本从断点恢复执行... (重试次数: ${retryCount}/${CONFIG.MAX_RETRIES})`);
                    updateDiagnostic(`恢复执行 (重试 ${retryCount}/${CONFIG.MAX_RETRIES})`);
                }

                updateDiagnostic("阶段2: 逐个创建密钥...");
                for (currentProjectIndex = startIndex; currentProjectIndex < projectsToProcess.length; currentProjectIndex++) {
                    const project = projectsToProcess[currentProjectIndex];
                    const projectDisplayName = project.displayName.substring(0, 20);

                    for (let k = 0; k < CONFIG.API_KEYS_PER_PROJECT; k++) {
                        console.log(`\n⏳ 为项目 "${project.displayName}" 创建 Key (${k + 1}/${CONFIG.API_KEYS_PER_PROJECT})...`);
                        updateDiagnostic(`项目 ${currentProjectIndex + 1}/${projectsToProcess.length}: ${projectDisplayName}... (Key ${k + 1}/${CONFIG.API_KEYS_PER_PROJECT})`);

                        findButtonByText(["Create API key", "创建 API 密钥"]).click();
                        const searchInput = await waitForElementInDom('input[aria-label="Search Google Cloud projects"], input[aria-label="搜索 Google Cloud 项目"]');
                        searchInput.click();
                        await waitForElementInDom('mat-option .project-display-name');
                        await delay(500);
                        const listContainer = await waitForElementInDom('div[role="listbox"]');
                        const options = Array.from(listContainer.querySelectorAll('mat-option'));
                        const targetOption = options.find(opt => {
                            const idEl = opt.querySelector('.project-id-text');
                            return idEl && idEl.textContent.trim() === project.projectID;
                        });

                        if (!targetOption) {
                            console.warn(`   -> ⚠️ 找不到项目 "${project.displayName}"，跳过。`);
                            (await waitForElementInDom('button[iconname="close"]')).click();
                            await delay(1000);
                            continue;
                        }

                        targetOption.click();
                        await delay(CONFIG.SELECT_CHANGE_DELAY);
                        const createInProjectButton = await waitForElementToBeEnabled('.create-api-key-button');
                        createInProjectButton.click();
                        const apiKeyElement = await waitForElementInDom('div.apikey-text', 25000);
                        const apiKey = apiKeyElement.textContent.trim();
                        if (apiKey && apiKey.startsWith("AIza")) {
                            newResults.push({ "项目名称": project.displayName, "项目 ID": project.projectID, "API Key": apiKey });
                            console.log(`   -> ✅ 成功: ...${apiKey.slice(-4)}`);
                        } else { throw new Error("读取API Key失败或格式不正确。") }
                        (await waitForElementInDom('button[iconname="close"]')).click();
                        await delay(CONFIG.API_KEY_CREATION_DELAY);
                    }
                }

                console.log("\n\n🎉🎉🎉 [阶段 3/3] 全部任务完成！🎉🎉🎉");
                updateDiagnostic("全部完成！");
                sessionStorage.removeItem(RETRY_STATE_KEY);
                if (newResults.length > 0) {
                    console.log(`总共创建了 ${newResults.length} 个新密钥:`);
                    console.table(newResults);
                    createCopyUI(newResults.map(item => item["API Key"]));
                } else { console.warn("未创建任何新密钥。") }

            } catch (error) {
                console.error("❌ 脚本执行出错:", error);
                if (retryCount < CONFIG.MAX_RETRIES) {
                    const newState = { initialProjects: projectsToProcess, initialKeys: newResults, startIndex: currentProjectIndex, retryCount: retryCount + 1 };
                    sessionStorage.setItem(RETRY_STATE_KEY, JSON.stringify(newState));
                    const msg = `错误，将在5秒后刷新重试 (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`;
                    console.warn(msg);
                    updateDiagnostic(msg, 'error');
                    setTimeout(() => location.reload(), 5000);
                } else {
                    const msg = `已达到最大重试次数 (${CONFIG.MAX_RETRIES})，脚本终止。`;
                    console.error(msg);
                    updateDiagnostic(msg, 'error');
                    sessionStorage.removeItem(RETRY_STATE_KEY);
                    if (newResults.length > 0) {
                        console.log("这是在最终失败前已获取的部分密钥:");
                        console.table(newResults);
                        createCopyUI(newResults.map(item => item["API Key"]));
                    }
                }
            }
        }

        // 检查是否存在需要恢复的重试任务
        const savedStateJSON = sessionStorage.getItem(RETRY_STATE_KEY);
        if (savedStateJSON) {
            console.log("检测到未完成的重试任务，脚本将自动启动...");
            updateDiagnostic("检测到重试任务, 自动启动...");
            try {
                const savedState = JSON.parse(savedStateJSON);
                await createAllNewGeminiApiKeys(savedState);
            } catch (e) {
                console.error("解析重试状态失败:", e);
                sessionStorage.removeItem(RETRY_STATE_KEY);
            }
        } else {
             await createAllNewGeminiApiKeys();
        }
    }


    /*******************************
     * 3. 提取现有 API KEY 流程（原样保留）
     *******************************/
    async function runExtractKeys() {
        // ... (这部分代码与您提供的旧脚本完全相同，为了简洁在此处省略)
        console.clear();
        console.log("--- 开始提取现有 API KEY ---");
        if (window.innerWidth < 1200) {
            console.warn("当前页面宽度较小（" + window.innerWidth + "px），可能导致 API KEY 提取失败，请将页面放大或调整缩放比例！");
        }
        const projectRowSelector = "project-table div[role='rowgroup'].table-body > div[role='row'].table-row";
        const projectNameSelector = "div[role='cell'].project-cell > div:first-child";
        const truncatedKeyLinkSelector = "div[role='cell'].project-cell + div[role='cell'].key-cell a.apikey-link";
        const fullApiKeyDisplaySelector = "div.apikey-text";
        const closeRevealButtonSelector = "button[aria-label='关闭']";
        const apiKeyWaitTimeout = 25000;
        const delayBetweenLinks = 1500;
        const closeDialogTimeout = 7000;
        const keysByProject = {};
        const allGeneratedKeys = [];
        let totalKeysFound = 0;
        let hasCriticalError = false;
        let projectRows = [];
        async function waitForElLocal(selector, timeout = 15000, root = document, checkDisabled = true) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                let el = null;
                try {
                    el = root.querySelector(selector);
                } catch (e) {}
                if (el && el.offsetParent !== null && (!checkDisabled || !el.disabled)) {
                    const st = window.getComputedStyle(el);
                    if (st && st.display !== "none" && st.visibility !== "hidden" && parseFloat(st.opacity) > 0)
                        return el;
                }
                await delay(300);
            }
            throw new Error(`元素 "${selector}" 等待超时 (${timeout}ms)`);
        }
        function findButtonWithTextLocal(text, root = document, baseSelector = 'button') {
            const buttons = root.querySelectorAll(baseSelector);
            const lowerText = text.toLowerCase();
            for (const btn of buttons) {
                const ariaLabel = btn.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.toLowerCase().includes(lowerText))
                    return btn;
                if (btn.textContent && btn.textContent.trim().toLowerCase() === lowerText)
                    return btn;
            }
            return null;
        }
        async function robustCloseReveal(closeButtonSel, elementToCheckSel) {
            console.log("尝试关闭显示密钥界面...");
            let closed = false;
            let elementToCheck;
            try {
                elementToCheck = document.querySelector(elementToCheckSel);
            } catch (e) {}
            if (!elementToCheck || elementToCheck.offsetParent === null || window.getComputedStyle(elementToCheck).display === 'none') {
                console.log("目标元素已关闭。");
                return true;
            }
            const closeSelectors = Array.isArray(closeButtonSel) ? closeButtonSel : [closeButtonSel];
            for (const selector of closeSelectors) {
                try {
                    let buttonToClick = await waitForElLocal(selector, closeDialogTimeout, document, true);
                    if (buttonToClick) {
                        console.log(`找到关闭按钮 (${selector})，点击中...`);
                        buttonToClick.click();
                        await delay(1800);
                        let elementAfterClose = document.querySelector(elementToCheckSel);
                        if (!elementAfterClose || elementAfterClose.offsetParent === null || window.getComputedStyle(elementAfterClose).display === 'none') {
                            console.log("界面成功关闭。");
                            closed = true;
                            break;
                        } else {
                            console.warn(`点击后目标元素仍可见 (${selector})。`);
                        }
                    }
                } catch (e) {}
            }
            if (!closed) {
                console.warn("未能通过按钮关闭，尝试点击页面 Body...");
                try {
                    document.body.click();
                } catch(e) { console.error("点击 Body 出错", e); }
                await delay(1200);
                let elementAfterBodyClick = document.querySelector(elementToCheckSel);
                if (!elementAfterBodyClick || elementAfterBodyClick.offsetParent === null || window.getComputedStyle(elementAfterBodyClick).display === 'none') {
                    console.log("通过点击 Body 关闭了界面。");
                    closed = true;
                } else {
                    console.error("强力关闭失败！");
                }
            }
            return closed;
        }
        try {
            console.log(`使用项目行选择器: "${projectRowSelector}"`);
            projectRows = document.querySelectorAll(projectRowSelector);
            console.log(`找到 ${projectRows.length} 个项目行。`);
            if (projectRows.length === 0) {
                console.warn("未找到项目行，请确保页面已完全加载并滚动加载所有项目。");
                return;
            }
            for (let i = 0; i < projectRows.length; i++) {
                if (hasCriticalError) {
                    console.log(`检测到严重错误，在项目 ${i} 处停止。`);
                    break;
                }
                const row = projectRows[i];
                let projectName = `项目 ${i + 1}`;
                try {
                    const nameElement = row.querySelector(projectNameSelector);
                    if (nameElement && nameElement.textContent) {
                        projectName = nameElement.textContent.trim();
                    }
                } catch (nameError) {
                    console.warn(`获取项目 ${i+1} 名称出错: ${nameError.message}`);
                }
                console.log(`\n===== 处理项目 ${i + 1}/${projectRows.length}: "${projectName}" =====`);
                keysByProject[projectName] = keysByProject[projectName] || [];
                const truncatedLinks = row.querySelectorAll(truncatedKeyLinkSelector);
                console.log(`找到 ${truncatedLinks.length} 个 API KEY 缩写链接。`);
                if (truncatedLinks.length === 0) {
                    console.log("跳过此项目（未找到密钥链接）。");
                    continue;
                }
                for (let j = 0; j < truncatedLinks.length; j++) {
                    if (hasCriticalError) {
                        console.log(`检测到严重错误，在项目 "${projectName}" 的链接 ${j+1} 处停止。`);
                        break;
                    }
                    const link = truncatedLinks[j];
                    console.log(`--- 处理密钥链接 ${j + 1}/${truncatedLinks.length} ---`);
                    try {
                        console.log("  [1/4] 点击缩写链接...");
                        link.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await delay(400);
                        link.click();
                        await delay(600);
                        console.log(`  [2/4] 等待完整密钥元素 (${fullApiKeyDisplaySelector}) 出现...`);
                        let fullKeyElement = await waitForElement(fullApiKeyDisplaySelector, apiKeyWaitTimeout, document, false);
                        console.log("    完整密钥元素已找到。");
                        console.log("  [3/4] 提取完整密钥...");
                        let apiKey = '';
                        if (fullKeyElement) {
                            if (fullKeyElement.tagName === 'INPUT')
                                apiKey = fullKeyElement.value;
                            else if (fullKeyElement.textContent)
                                apiKey = fullKeyElement.textContent;
                            else
                                apiKey = fullKeyElement.innerText;
                            apiKey = apiKey ? apiKey.trim() : '';
                            if (apiKey && apiKey.startsWith('AIza')) {
                                console.log(`    提取成功: ${apiKey.substring(0, 10)}...`);
                                if (!keysByProject[projectName].includes(apiKey)) {
                                    keysByProject[projectName].push(apiKey);
                                }
                                if (!allGeneratedKeys.includes(apiKey)) {
                                    allGeneratedKeys.push(apiKey);
                                    totalKeysFound = allGeneratedKeys.length;
                                } else {
                                    console.log("(密钥已存在)");
                                }
                            } else {
                                console.warn(`    提取内容 "${apiKey}" 看起来不像 API KEY，已忽略。`);
                            }
                        } else {
                            console.warn("    未能定位到完整密钥元素。");
                        }
                        console.log("  [4/4] 关闭密钥显示界面...");
                        const closeSuccess = await robustCloseReveal(closeRevealButtonSelector, fullApiKeyDisplaySelector);
                        if (!closeSuccess) {
                            console.error("    无法关闭显示密钥界面，停止脚本。");
                            hasCriticalError = true;
                            break;
                        }
                        await delay(delayBetweenLinks);
                    } catch (innerError) {
                        console.error(`处理密钥链接 ${j + 1} 出错: ${innerError.message}`);
                        try {
                            await robustCloseReveal(closeRevealButtonSelector, fullApiKeyDisplaySelector);
                        } catch (closeError) {
                            console.error("关闭界面时出错:", closeError);
                            hasCriticalError = true;
                            break;
                        }
                        await delay(500);
                        console.log("尝试继续处理下一个链接...");
                    }
                }
            }
        } catch (outerError) {
            console.error(`自动化过程中发生严重错误: ${outerError.message}`);
            hasCriticalError = true;
        } finally {
            console.log("\n=================== 提取总结 ===================");
            console.log(`共扫描处理了 ${projectRows.length} 个项目行。`);
            console.log(`成功提取 ${totalKeysFound} 个唯一 API KEY。`);
            if (hasCriticalError) {
                console.warn("脚本执行过程中遇到严重错误，可能未提取全部密钥。");
            } else {
                console.log("扫描完成。");
            }
            if (allGeneratedKeys.length > 0) {
                console.log("\n--- 所有提取到的 API KEY (复制下面内容) ---");
                const outputString = allGeneratedKeys.map(key => `${key},`).join('\n');
                console.log("```\n" + outputString + "\n```");
                console.log("--- API KEY 列表结束 ---");
            } else {
                console.log("未能提取到任何 API KEY。");
            }
            console.log("--- 提取流程结束 ---");
        }
    }


    /*******************************
     * 4. 整体控制与UI入口 (已更新)
     *******************************/
    async function createProjectsAndGetApiKeys() {
        if (location.host.includes("console.cloud.google.com")) {
            await runProjectCreation();
            // 设置标记，以便跳转后自动执行
            GM_setValue("projectsCreated", true);
            window.location.href = "https://aistudio.google.com/apikey";
        } else {
            // 如果已经在 aistudio 页面，直接执行创建KEY的流程
            await runNewApiKeyCreation();
        }
    }

    // 页面加载后，检查是否存在跳转标记，如果存在，则自动执行新的API KEY创建流程
    if (location.host.includes("aistudio.google.com") && GM_getValue("projectsCreated", false)) {
        // 清除标记，防止刷新后重复执行
        GM_setValue("projectsCreated", false);
        // 延迟执行，确保页面加载完成
        delay(2000).then(() => {
            console.log("检测到项目创建完成的跳转，将自动开始创建 API KEY...");
            runNewApiKeyCreation();
        });
    }

    function initFloatingButtons() {
        if (document.getElementById('ai-floating-buttons')) return;
        const container = document.createElement('div');
        container.id = 'ai-floating-buttons';
        Object.assign(container.style, {
            position: 'fixed', top: '10px', right: '10px', zIndex: '9999',
            display: 'flex', flexDirection: 'column', gap: '5px',
            background: 'rgba(255,255,255,0.9)', padding: '5px',
            borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        });

        const btnStyle = {
            padding: '5px 10px', fontSize: '14px', cursor: 'pointer',
            border: '1px solid #ccc', background: '#f0f0f0'
        };

        const btnCreateAndGet = document.createElement('button');
        btnCreateAndGet.textContent = '1. 创建项目并获取KEY';
        Object.assign(btnCreateAndGet.style, btnStyle);

        const btnCreateOnly = document.createElement('button');
        btnCreateOnly.textContent = '2. 仅创建API KEY (新)';
        Object.assign(btnCreateOnly.style, btnStyle);

        const btnExtract = document.createElement('button');
        btnExtract.textContent = '3. 提取现有API KEY';
        Object.assign(btnExtract.style, btnStyle);

        container.appendChild(btnCreateAndGet);
        container.appendChild(btnCreateOnly);
        container.appendChild(btnExtract);
        document.body.appendChild(container);

        // --- 按钮事件监听 ---
        btnCreateAndGet.addEventListener('click', async () => {
             if (!location.host.includes("console.cloud.google.com")) {
                GM_setValue("projectsCreated", true); //预设标志
                window.location.href = "https://console.cloud.google.com";
                return;
            }
            btnCreateAndGet.disabled = true; btnCreateAndGet.textContent = '运行中...';
            try {
                await createProjectsAndGetApiKeys();
                btnCreateAndGet.textContent = '跳转中...';
            } catch (e) {
                console.error('运行错误:', e);
                btnCreateAndGet.textContent = '运行错误，检查控制台';
                 setTimeout(() => {
                    btnCreateAndGet.disabled = false;
                    btnCreateAndGet.textContent = '1. 创建项目并获取KEY';
                }, 3000);
            }
        });

        btnCreateOnly.addEventListener('click', async () => {
            if (!location.host.includes("aistudio.google.com")) {
                window.location.href = "https://aistudio.google.com/apikey";
                return;
            }
            btnCreateOnly.disabled = true; btnCreateOnly.textContent = '运行中...';
            try {
                await runNewApiKeyCreation();
                btnCreateOnly.textContent = '创建KEY (完成)';
            } catch (e) {
                console.error('运行错误:', e);
                btnCreateOnly.textContent = '运行错误，检查控制台';
            }
            setTimeout(() => {
                btnCreateOnly.disabled = false;
                btnCreateOnly.textContent = '2. 仅创建API KEY (新)';
            }, 3000);
        });

        btnExtract.addEventListener('click', async () => {
            if (!location.host.includes("aistudio.google.com")) {
                window.location.href = "https://aistudio.google.com/apikey";
                return;
            }
            btnExtract.disabled = true; btnExtract.textContent = '运行中...';
            try {
                await runExtractKeys();
                btnExtract.textContent = '提取KEY (完成)';
            } catch (e) {
                console.error('运行错误:', e);
                btnExtract.textContent = '运行错误，检查控制台';
            }
            setTimeout(() => {
                btnExtract.disabled = false;
                btnExtract.textContent = '3. 提取现有API KEY';
            }, 3000);
        });
    }

    // --- 脚本初始化 ---
    // 使用多种方式确保按钮能够被成功注入到页面
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFloatingButtons);
    } else {
        initFloatingButtons();
    }
    const observer = new MutationObserver(() => {
        if (!document.getElementById('ai-floating-buttons')) {
            initFloatingButtons();
        }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

})();
