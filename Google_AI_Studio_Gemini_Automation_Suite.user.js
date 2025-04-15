// ==UserScript==
// @name         AI Studio 多功能脚本合集（更新版）
// @namespace    http://tampermonkey.net/
// @version      1.4.3
// @description  此脚本整合了三个主要功能：
//               1. 项目创建流程：在 console.cloud.google.com 页面自动创建目标数（默认5个）的项目；
//               2. API KEY 自动生成流程：在项目创建完成后，自动跳转到 aistudio.google.com/apikey 页面生成 API KEY；
//               3. API KEY 提取流程：在 aistudio 页面上提取现有 API KEY。
//               脚本会自动监测当前页面所属域，如果用户点击创建功能而不在目标页面，则自动跳转到 console.cloud.google.com；
//               同理，点击提取功能时如果不在 aistudio.google.com 页面，则自动跳转到目标页面。
//               此外，脚本利用 MutationObserver、定时器、路由变化监听和 window 的 load/DOMContentLoaded 事件，确保悬浮按钮能自动插入，无需手动刷新。
//
// 【重要说明】
// 1. 本脚本仅为内部自动化操作脚本，部分错误提示（例如来自Google Tag Manager的）是由第三方脚本引起，与本脚本功能无关。
// 2. 请确保目标网站的页面结构未发生变化，否则部分 CSS 选择器可能需要调整。
// 3. 如果你的项目中存在敏感信息（例如 API KEY），请注意脚本输出的密钥内容可能会在控制台中显示，请妥善保管日志信息。
// 4. 以下部分参数用户可以根据需要自定义调整：
//    - TARGET_PROJECT_CREATIONS：项目创建的目标数量，默认值为 5。
//    - DELAY_BETWEEN_ATTEMPTS：每次项目创建之间的等待时间，默认 5000 毫秒（即 5 秒）。
//    - MAX_AUTO_REFRESH_ON_ERROR：自动刷新重试的最大次数，默认值为 5。
//    - 下拉框选项触发 change 事件后的等待时间，在 runApiKeyCreation 中由延时 1000 毫秒来确保选项生效。
//    - 各等待延时（例如等待 1500 毫秒、2000 毫秒等），可根据页面加载速度进行调整。
//
// 【敏感变量】
// 本脚本中敏感变量主要有：
//    - API KEY：由 Google Cloud 自动生成，脚本只是提取和输出，不建议在代码中硬编码修改。
//    - GM_setValue / GM_getValue 用于跨域存储标记，确保创建流程和 API KEY 生成流程能够串联操作。
//
// 【运行范围】
// 该脚本在所有 console.cloud.google.com 与 aistudio.google.com 的子域下均生效（@match 改为 *://*.console.cloud.google.com/* 与 *://*.aistudio.google.com/*）。
//
// @author       YourName
// @match        *://*.console.cloud.google.com/*
// @match        *://*.aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

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
     * 1. 项目创建流程（原 CreateProjects.js）
     *******************************/
    async function runProjectCreation() {
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
     * 2. API KEY 自动生成流程（原 FetchApiKeys.js）
     *******************************/
    async function runApiKeyCreation() {
        console.log("--- 开始为每个项目创建 API 密钥 ---");
        const keysPerProjectTarget = 1;
        const apiKeyWaitTimeout = 25000;
        const delayBetweenAttempts = 2500;
        const delayBetweenProjects = 4000;
        const closeDialogTimeout = 5000;
        const mainCreateButtonSelector = "button.create-api-key-button";
        const dialogSelector = "mat-dialog-content";
        const projectSearchInputSelector = "input#project-name-input";
        const projectOptionSelector = "mat-option.mat-mdc-option";
        const projectNameInsideOptionSelector = ".gmat-body-medium";
        const dialogCreateButtonSelector = "mat-dialog-content button.create-api-key-button";
        const apiKeyDisplaySelector = "div.apikey-text";
        const closeButtonSelectors = [
            "button[aria-label='关闭']",
            "button.close-button",
            "button:contains('Done')",
            "button:contains('完成')",
            "button:contains('Close')",
            "mat-dialog-actions button:last-child"
        ];
        const generatedKeysSummary = {};
        const allKeys = [];

        async function waitForEl(selector, timeout = 20000, root = document, checkDisabled = true) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                let element = null;
                if (selector.includes(':contains')) {
                    const textMatch = selector.match(/:contains\(['"]([^'"]+)['"]\)/i);
                    const baseSelector = selector.split(':')[0];
                    if (textMatch && textMatch[1]) {
                        element = findButtonWithText(textMatch[1], root, baseSelector);
                    } else {
                        element = root.querySelector(baseSelector);
                    }
                } else {
                    element = root.querySelector(selector);
                }
                let isDisabled = checkDisabled ? element?.disabled : false;
                if (element && element.offsetParent !== null && !isDisabled) {
                    const style = window.getComputedStyle(element);
                    if (style && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
                        return element;
                    }
                }
                await delay(300);
            }
            throw new Error(`元素 "${selector}" 等待超时 (${timeout}ms)`);
        }

        function findButtonWithText(text, root = document, baseSelector = 'button') {
            const buttons = root.querySelectorAll(baseSelector);
            const lowerText = text.toLowerCase();
            for (const btn of buttons) {
                if (btn.getAttribute('aria-label') && btn.getAttribute('aria-label').toLowerCase().includes(lowerText))
                    return btn;
                if (btn.textContent && btn.textContent.trim().toLowerCase() === lowerText)
                    return btn;
            }
            return null;
        }

        async function robustCloseDialog() {
            console.log("尝试关闭对话框...");
            let closed = false;
            if (!document.querySelector("mat-dialog-container")) {
                console.log("对话框已关闭或不存在。");
                return true;
            }
            for (const selector of closeButtonSelectors) {
                try {
                    let buttonToClick = await waitForEl(selector, closeDialogTimeout, document);
                    if (buttonToClick) {
                        console.log(`找到关闭按钮 (${selector})，点击中...`);
                        buttonToClick.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await delay(300);
                        buttonToClick.click();
                        await delay(1500);
                        if (!document.querySelector("mat-dialog-container")) {
                            console.log("对话框已成功关闭。");
                            closed = true;
                            break;
                        } else {
                            console.warn(`点击 (${selector}) 后对话框仍存在。`);
                        }
                    }
                } catch (error) {}
            }
            if (!closed) {
                console.warn("未能通过按钮关闭，尝试点击页面 Body...");
                document.body.click();
                await delay(1000);
                if (!document.querySelector("mat-dialog-container")) {
                    console.log("对话框通过点击 Body 关闭。");
                    closed = true;
                } else {
                    console.error("强力关闭失败，对话框仍存在！");
                }
            }
            return closed;
        }

        let numberOfProjects = 0;
        let projectOptionsInfo = [];
        try {
            console.log("[步骤 0] 获取项目列表信息...");
            const mainBtnInit = await waitForEl(mainCreateButtonSelector);
            mainBtnInit.click();
            const dialogInit = await waitForEl(dialogSelector);
            const searchInputInit = await waitForEl(projectSearchInputSelector, 15000, dialogInit);
            searchInputInit.click();
            await delay(2000);
            const initialProjectOptions = await waitForElements(projectOptionSelector, 1, 20000, document);
            numberOfProjects = initialProjectOptions.length;
            console.log(`检测到 ${numberOfProjects} 个项目。`);
            projectOptionsInfo = Array.from(initialProjectOptions).map((option, index) => {
                let name = `项目 ${index + 1}`;
                try {
                    const nameElement = option.querySelector(projectNameInsideOptionSelector);
                    if (nameElement && nameElement.textContent) {
                        name = nameElement.textContent.trim();
                    }
                } catch {}
                return { name: name };
            });
            console.log("项目名称列表:", projectOptionsInfo.map(p => p.name));
            await robustCloseDialog();
        } catch (initialError) {
            console.error("获取项目列表时出错:", initialError.message);
            throw initialError;
        }
        if (numberOfProjects === 0) {
            console.log("未检测到任何项目，流程结束。");
            return;
        }
        for (let projectIndex = 0; projectIndex < numberOfProjects; projectIndex++) {
            const currentProjectName = projectOptionsInfo[projectIndex]?.name || `项目 ${projectIndex + 1}`;
            console.log(`\n===== 开始处理项目 ${projectIndex + 1}/${numberOfProjects}: "${currentProjectName}" =====`);
            generatedKeysSummary[currentProjectName] = [];
            let skipRemainingAttempts = false;
            for (let keyAttempt = 0; keyAttempt < keysPerProjectTarget; keyAttempt++) {
                if (skipRemainingAttempts) break;
                console.log(`--- [${currentProjectName}] 尝试创建密钥 ${keyAttempt + 1}/${keysPerProjectTarget} ---`);
                let dialogElement = null;
                let apiKeyElement = null;
                let closeSuccess = false;
                try {
                    console.log("  [1/7] 点击主创建按钮...");
                    const mainCreateButton = await waitForEl(mainCreateButtonSelector);
                    mainCreateButton.click();
                    await delay(500);
                    console.log("  [2/7] 等待对话框并展开列表...");
                    dialogElement = await waitForEl(dialogSelector);
                    const searchInput = await waitForEl(projectSearchInputSelector, 15000, dialogElement);
                    searchInput.click();
                    await delay(2000);
                    console.log(`  [3/7] 选择项目 "${currentProjectName}" ...`);
                    const allProjectOptions = await waitForElements(projectOptionSelector, numberOfProjects, 20000, document);
                    if (projectIndex >= allProjectOptions.length) {
                        console.error(`错误: 项目索引 ${projectIndex} 越界 (当前项目数 ${allProjectOptions.length})。`);
                        skipRemainingAttempts = true;
                        continue;
                    }
                    const targetProjectOption = allProjectOptions[projectIndex];
                    targetProjectOption.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    await delay(300);
                    targetProjectOption.click();
                    // 额外派发 change 事件，并延长等待时间（1000ms），确保下拉框选中生效
                    targetProjectOption.dispatchEvent(new Event('change', { bubbles: true }));
                    await delay(1000);
                    console.log("等待项目选择生效...");
                    await delay(2500);
                    console.log("  [4/7] 点击对话框内最终创建按钮...");
                    const dialogCreateButton = await waitForEl(dialogCreateButtonSelector, 10000, dialogElement, false);
                    dialogCreateButton.click();
                    console.log(`  [5/7] 等待 API KEY 显示（最长${apiKeyWaitTimeout/1000}秒）...`);
                    try {
                        apiKeyElement = await waitForElement(apiKeyDisplaySelector, apiKeyWaitTimeout, document, false);
                        console.log("    新 API KEY 元素已出现。");
                    } catch (apiKeyWaitError) {
                        console.warn(`等待 API KEY 超时或失败: ${apiKeyWaitError.message}`);
                        skipRemainingAttempts = true;
                        await robustCloseDialog();
                        continue;
                    }
                    console.log("  [6/7] 提取 API KEY...");
                    let apiKey = '';
                    if (apiKeyElement) {
                        if (apiKeyElement.tagName === 'INPUT')
                            apiKey = apiKeyElement.value;
                        else if (apiKeyElement.textContent)
                            apiKey = apiKeyElement.textContent;
                        else
                            apiKey = apiKeyElement.innerText;
                        apiKey = apiKey.trim();
                        if (apiKey) {
                            console.log(`    成功! 项目 "${currentProjectName}" 生成的 API KEY: ${apiKey}`);
                            generatedKeysSummary[currentProjectName].push(apiKey);
                            allKeys.push(apiKey);
                        } else {
                            console.error(`    错误: 提取到空的 API KEY (尝试 ${keyAttempt + 1})。`);
                        }
                    } else {
                        console.error(`    内部错误：步骤成功但未找到 API KEY 元素 (尝试 ${keyAttempt + 1})`);
                    }
                    console.log("  [7/7] 强力关闭对话框...");
                    closeSuccess = await robustCloseDialog();
                    if (!closeSuccess) {
                        console.error("    无法关闭对话框，跳过此项目剩余尝试。");
                        skipRemainingAttempts = true;
                    }
                    if (!skipRemainingAttempts) {
                        console.log(`--- 尝试 ${keyAttempt + 1} 完成，等待 ${delayBetweenAttempts/1000} 秒 ---`);
                        await delay(delayBetweenAttempts);
                    }
                } catch (error) {
                    console.error(`在项目 "${currentProjectName}" 尝试创建 API KEY 时发生错误: ${error.message}`);
                    await robustCloseDialog();
                    await delay(delayBetweenAttempts);
                }
            }
            if (skipRemainingAttempts) {
                console.log(`===== 项目 "${currentProjectName}" 跳过后续尝试 =====`);
            } else {
                console.log(`===== 完成项目 "${currentProjectName}" 的所有 API KEY 尝试 =====`);
            }
            console.log(`等待 ${delayBetweenProjects/1000} 秒后处理下一个项目...`);
            await delay(delayBetweenProjects);
        }
        console.log("\n=================== API KEY 创建流程总结 ===================");
        for (const projectName in generatedKeysSummary) {
            const keys = generatedKeysSummary[projectName];
            console.log(`项目: "${projectName}" 成功生成 ${keys.length} 个 API KEY:`);
            keys.forEach((key, index) => console.log(`  ${index + 1}: ${key}`));
        }
        if (allKeys.length > 0) {
            console.log("\n--- 所有生成的 API KEY (复制下面的内容) ---");
            const outputString = allKeys.map(key => `${key},`).join('\n');
            console.log("```\n" + outputString + "\n```");
            console.log("--- API KEY 列表结束 ---");
        } else {
            console.log("本次运行未生成任何 API KEY。");
        }
        console.log("--- API KEY 自动生成流程结束 ---");
    }

    /*******************************
     * 3. 提取现有 API KEY 流程（原 FetchAllExistingKeys.js）
     *******************************/
    async function runExtractKeys() {
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
     * 4. 整体控制入口
     *
     * 当点击“创建项目并获取API KEY”按钮时：
     *   - 如果当前处于 console.cloud.google.com，则先执行项目创建，
     *     创建完成后使用 GM_setValue 设置标记，并自动跳转到 https://aistudio.google.com/apikey；
     *   - 如果当前已在 aistudio.google.com 下，则直接执行 API KEY 自动生成流程。
     *******************************/
    async function createProjectsAndGetApiKeys() {
        if (location.host.includes("console.cloud.google.com")) {
            await runProjectCreation();
            GM_setValue("projectsCreated", true);
            window.location.href = "https://aistudio.google.com/apikey";
        } else {
            await runApiKeyCreation();
        }
    }

    /*******************************
     * 如果当前在 aistudio 页面且存在“projectsCreated”标记，则自动执行 API KEY 生成流程
     *******************************/
    if (location.host.includes("aistudio.google.com") && GM_getValue("projectsCreated", false)) {
        GM_setValue("projectsCreated", false);
        delay(1000).then(() => runApiKeyCreation());
    }

    /*******************************
     * 悬浮按钮自动插入 —— 利用 MutationObserver、定时器及路由变化监听
     *******************************/
    function initFloatingButtons() {
        if (document.getElementById('ai-floating-buttons')) return;
        const container = document.createElement('div');
        container.id = 'ai-floating-buttons';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';
        container.style.background = 'rgba(255,255,255,0.9)';
        container.style.padding = '5px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

        const btnCreateAndGet = document.createElement('button');
        btnCreateAndGet.textContent = '创建项目并获取API KEY';
        btnCreateAndGet.style.padding = '5px 10px';
        btnCreateAndGet.style.fontSize = '14px';
        btnCreateAndGet.style.cursor = 'pointer';

        const btnExtract = document.createElement('button');
        btnExtract.textContent = '提取API KEY';
        btnExtract.style.padding = '5px 10px';
        btnExtract.style.fontSize = '14px';
        btnExtract.style.cursor = 'pointer';

        container.appendChild(btnCreateAndGet);
        container.appendChild(btnExtract);
        document.body.appendChild(container);

        btnCreateAndGet.addEventListener('click', async () => {
            // 自动跳转至 console 页面（无需提示）
            if (!location.host.includes("console.cloud.google.com")) {
                window.location.href = "https://console.cloud.google.com";
                return;
            }
            btnCreateAndGet.disabled = true;
            btnCreateAndGet.textContent = '运行中...';
            try {
                await createProjectsAndGetApiKeys();
                btnCreateAndGet.textContent = '创建项目并获取APIKEY (完成)';
            } catch (e) {
                console.error('运行错误:', e);
                btnCreateAndGet.textContent = '运行错误，检查控制台';
            }
            setTimeout(() => {
                btnCreateAndGet.disabled = false;
                btnCreateAndGet.textContent = '创建项目并获取APIKEY';
            }, 3000);
        });

        btnExtract.addEventListener('click', async () => {
            // 自动跳转至 aistudio 页面（无需提示）
            if (!location.host.includes("aistudio.google.com")) {
                window.location.href = "https://aistudio.google.com/apikey";
                return;
            }
            btnExtract.disabled = true;
            btnExtract.textContent = '运行中...';
            try {
                await runExtractKeys();
                btnExtract.textContent = '提取APIKEY (完成)';
            } catch (e) {
                console.error('运行错误:', e);
                btnExtract.textContent = '运行错误，检查控制台';
            }
            setTimeout(() => {
                btnExtract.disabled = false;
                btnExtract.textContent = '提取APIKEY';
            }, 3000);
        });
    }

    // MutationObserver 监控 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
            initFloatingButtons();
        }
    });
    observer.observe(document, { childList: true, subtree: true });
    // 定时检查（每 1000 毫秒执行一次）
    setInterval(() => {
        if (!document.getElementById('ai-floating-buttons')) {
            initFloatingButtons();
        }
    }, 1000);
    // 监听 window 的 DOMContentLoaded 与 load 事件
    window.addEventListener('DOMContentLoaded', initFloatingButtons);
    window.addEventListener('load', initFloatingButtons);
    // 路由变化监听（针对 SPA）——重写 history 方法，发出自定义事件 locationchange
    (function() {
        const _wr = function(type) {
            const orig = history[type];
            return function() {
                const rv = orig.apply(this, arguments);
                const e = new Event(type);
                window.dispatchEvent(e);
                window.dispatchEvent(new Event('locationchange'));
                return rv;
            };
        };
        history.pushState = _wr('pushState');
        history.replaceState = _wr('replaceState');
        window.addEventListener('popstate', function() {
            window.dispatchEvent(new Event('locationchange'));
        });
    })();
    window.addEventListener('locationchange', () => {
        initFloatingButtons();
    });
    delay(3000).then(initFloatingButtons);

})();
