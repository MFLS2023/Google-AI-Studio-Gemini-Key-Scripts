/**
 * Google Cloud 项目自动创建脚本 (控制台版 - 彩色输出)
 * ======================================================
 * 本脚本通过模拟用户点击，在 Google Cloud Console 网页上自动创建新项目。
 * 请在浏览器开发者控制台 (F12 -> Console) 中运行。
 *
 * 主要功能:
 * - 自动化项目创建流程，减少手动操作。
 * - 在关键步骤自动检查项目配额限制，达到限制时会停止。
 * - 遇到可恢复的错误时，会尝试自动刷新页面 (最多 5 次) 以继续。
 * - 所有执行反馈（成功、警告、错误）均直接输出到控制台，并使用颜色区分。
 * - 无任何页面 UI 交互或弹窗。
 *
 * ⚠️ 重要警告:
 * - [UI 依赖] Google Cloud 界面更新可能导致此脚本失效，届时需要更新代码中的 CSS 选择器。
 * - [自动刷新风险] 若页面持续出错，自动刷新功能可能导致循环刷新。请务必监控控制台输出！
 * - [速率限制] 过于频繁或大量创建项目可能触发 Google 的速率限制策略。
 * - [使用风险] 请自行承担使用此脚本可能带来的账户或操作风险。
 *
 * ⚙️ 如何使用:
 * 1. 登录到 `console.cloud.google.com`。
 * 2. 打开浏览器的开发者工具 (通常按 F12)，切换到 "Console" (控制台) 标签页。
 * 3. 【关键】确保完整复制下方提供的【全部】 JavaScript 代码。
 * 4. 将复制的代码粘贴到控制台中。
 * 5. 按 Enter (回车键) 执行脚本。
 * 6. 密切观察控制台输出，了解脚本执行进度、结果或任何错误信息。
 * ** 7. 如果想要修改创建的项目的数量，只需修改 `TARGET_PROJECT_CREATIONS` 变量即可，这里默认为5 ** 
 *
 * ======================================================
 */
(async function runAiStudioProjectCreatorConsoleSilentColorOpt() {

    // --- 配置 ---
    const TARGET_PROJECT_CREATIONS = 5;
    const DELAY_BETWEEN_ATTEMPTS = 5000;
    const DELAY_AFTER_ERROR_REFRESH = 3000;
    const MAX_AUTO_REFRESH_ON_ERROR = 5;
    const REFRESH_COUNTER_STORAGE_KEY = 'aiStudioAutoRefreshCountSilentColorOpt'; // 新键名

    // --- 状态与安全锁 ---
    let successfulSubmissions = 0;
    let stoppedDueToLimit = false;
    let stoppedDueToErrorLimit = false;
    let refreshCount = parseInt(sessionStorage.getItem(REFRESH_COUNTER_STORAGE_KEY) || '0');

    // --- 颜色常量 ---
    const STYLE_BOLD_BLACK = 'color: black; font-weight: bold;';
    const STYLE_BOLD_RED = 'color: red; font-weight: bold;';
    const STYLE_GREEN = 'color: green;'; // 用于成功提交
    const STYLE_ORANGE_BOLD = 'color: orange; font-weight: bold;'; // 用于刷新警告
    const STYLE_RED = 'color: red;'; // 用于一般错误

    console.log(`%cAI Studio 项目创建脚本 (控制台静默版 v1.4 - 颜色优化)`, STYLE_BOLD_BLACK);
    console.log(`本次会话已刷新次数: ${refreshCount}/${MAX_AUTO_REFRESH_ON_ERROR}`);

    if (refreshCount >= MAX_AUTO_REFRESH_ON_ERROR) {
        console.error(`%c已达到自动刷新次数上限 (${MAX_AUTO_REFRESH_ON_ERROR})。脚本已停止，防止无限循环。`, STYLE_BOLD_RED);
        console.error("请手动检查页面或脚本中的错误，解决后可清除 sessionStorage ('sessionStorage.removeItem(\"" + REFRESH_COUNTER_STORAGE_KEY + "\")') 再试。");
        return;
    }

    // --- 辅助函数 ---
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function waitForElement(selector, timeout = 15000, root = document) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                const element = root.querySelector(selector);
                if (element && element.offsetParent !== null) {
                    const style = window.getComputedStyle(element);
                    if (style && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) return element;
                }
            } catch (e) { /* ignore */ }
            await delay(250);
        }
        throw new Error(`元素 "${selector}" 在 ${timeout}ms 内未找到或不可见`);
    }

    async function checkLimitError() {
        try {
            const increaseButton = document.querySelector('a#p6ntest-quota-submit-button');
            const limitTextElements = document.querySelectorAll('mat-dialog-content p, mat-dialog-content div, mat-dialog-container p, mat-dialog-container div');
            let foundLimitText = false;
            limitTextElements.forEach(el => {
                const text = el.textContent.toLowerCase();
                if (text.includes('project creation limit') || text.includes('quota has been reached') || text.includes('quota limit')) foundLimitText = true;
            });
            if (increaseButton || foundLimitText) { console.warn('检测到项目数量限制的迹象！'); return true; } // Warn 保持橙色
            return false;
        } catch (error) { console.error('%c检查限制状态时出错:', STYLE_RED, error); return false; }
    }

    async function tryCloseDialog() {
        console.log("  尝试关闭可能存在的对话框...");
        try {
            const closeButtonSelectors = ['button[aria-label="Close dialog"]','button[aria-label="关闭"]', 'mat-dialog-actions button:nth-child(1)', 'button.cancel-button', 'button:contains("Cancel")', 'button:contains("取消")'];
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
                 } else { button = document.querySelector(selector); }
                 if (button && button.offsetParent !== null) { console.log(`    找到关闭按钮 (${selector}) 并点击。`); button.click(); closed = true; await delay(700); break; }
             }
             if (!closed) console.log("    未找到明确的关闭/取消按钮。");
        } catch (e) { console.warn("    尝试关闭对话框时发生错误:", e.message); } // Warn 保持橙色
    }

    // --- 主要点击序列 ---
    async function autoClickSequence() {
        let step = '开始';
        try {
            step = '检查初始限制';
            if (await checkLimitError()) { console.warn('检测到项目数量限制 (开始时)，停止执行。'); return { limitReached: true }; } // Warn 保持橙色

            step = '点击项目选择器';
            console.log('步骤 1/3: 点击项目选择器...'); await delay(1500);
            const selectProjectButton = await waitForElement('button.mdc-button.mat-mdc-button span.cfc-switcher-button-label-text');
            selectProjectButton.click(); console.log('  已点击项目选择器'); await delay(2000);

            step = '检查对话框限制';
            if (await checkLimitError()) { console.warn('检测到项目数量限制 (对话框打开后)，停止执行。'); await tryCloseDialog(); return { limitReached: true }; } // Warn 保持橙色

            step = '点击 New Project';
            console.log('步骤 2/3: 点击 "New project"...');
            const newProjectButton = await waitForElement('button.purview-picker-create-project-button');
            newProjectButton.click(); console.log('  已点击 "New project"'); await delay(2500);

            step = '检查创建前限制';
            if (await checkLimitError()) { console.warn('检测到项目数量限制 (点击 Create 前)，停止执行。'); await tryCloseDialog(); return { limitReached: true }; } // Warn 保持橙色

            step = '点击 Create';
            console.log('步骤 3/3: 点击 "Create"...');
            const createButton = await waitForElement('button.projtest-create-form-submit', 20000);
            createButton.click(); console.log('  已点击 "Create"。项目创建请求已提交。');

            return { limitReached: false };

        } catch (error) {
             console.error(`%c项目创建序列在步骤 [${step}] 出错:`, STYLE_RED, error); // Error 用红色
             await tryCloseDialog();

             // --- 自动刷新逻辑 (无 alert) ---
             if (refreshCount < MAX_AUTO_REFRESH_ON_ERROR) {
                 refreshCount++;
                 sessionStorage.setItem(REFRESH_COUNTER_STORAGE_KEY, refreshCount.toString());
                 console.warn(`%c错误发生！尝试自动刷新页面 (第 ${refreshCount}/${MAX_AUTO_REFRESH_ON_ERROR} 次)...`, STYLE_ORANGE_BOLD); // Warn 用橙色
                 await delay(1500);
                 window.location.reload();
                 return { refreshed: true, error: error };
             } else {
                 console.error(`%c错误发生，且已达到刷新次数上限 (${MAX_AUTO_REFRESH_ON_ERROR})。脚本将停止。请手动解决问题。`, STYLE_BOLD_RED); // 最终停止用红色
                 sessionStorage.removeItem(REFRESH_COUNTER_STORAGE_KEY);
                 throw new Error(`自动刷新达到上限 (${MAX_AUTO_REFRESH_ON_ERROR}) 后停止。最后错误: ${error.message}`);
             }
        }
    }

    // --- 循环执行 ---
    console.log(`准备开始执行项目创建，目标 ${TARGET_PROJECT_CREATIONS} 次...`);
    for (let i = 1; i <= TARGET_PROJECT_CREATIONS; i++) {
        console.log(`\n===== 开始第 ${i} 次尝试 =====`);
        let result = null;
        try {
            result = await autoClickSequence();

            if (result?.limitReached) {
                stoppedDueToLimit = true;
                console.log("%c检测到项目限制，停止循环。", STYLE_BOLD_RED); // 停止原因用红色
                break;
            }

             if (!result?.refreshed) {
                 successfulSubmissions++;
                 console.log(`%c第 ${i} 次尝试提交成功。`, STYLE_GREEN); // 成功用绿色
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
            // 错误日志已在 autoClickSequence 中打印（红色），这里只记录停止
            console.error(`%c循环在第 ${i} 次尝试时因错误（达到刷新上限）而中止。`, STYLE_BOLD_RED); // 停止原因用红色
            break;
        }
    } // 结束 for 循环

    // --- 最终总结 ---
    console.log('\n===== 项目创建执行完成 =====');
    if (stoppedDueToLimit) {
        console.log(`%c因达到项目限制而停止。总共成功提交 ${successfulSubmissions} 次创建请求。`, STYLE_BOLD_RED);
         sessionStorage.removeItem(REFRESH_COUNTER_STORAGE_KEY);
    } else if (stoppedDueToErrorLimit) {
        console.log(`%c因达到刷新次数上限或不可恢复错误而停止。总共成功提交 ${successfulSubmissions} 次创建请求。`, STYLE_BOLD_RED);
    } else {
        console.log(`%c完成了计划的 ${TARGET_PROJECT_CREATIONS} 次尝试。总共成功提交 ${successfulSubmissions} 次创建请求。`, STYLE_BOLD_RED); // 完成也用红色
        sessionStorage.removeItem(REFRESH_COUNTER_STORAGE_KEY);
    }
    console.log("--- 脚本执行结束 ---");

})(); // 立即执行函数
