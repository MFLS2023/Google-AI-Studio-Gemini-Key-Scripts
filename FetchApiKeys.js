/**
 * =================================================================================
 * Gemini API Key 自动创建脚本 (v17 - 最终专业配置版)
 * 
 * 新增功能:
 * 1. 【专业配置】您现在可以在顶部的 "CONFIG" 区域自由配置所有关键行为。
 * 2. 【自动重试】当脚本遇到严重错误时，会自动刷新页面并重试 (可配置次数)。
 *    进度会自动从上次中断的地方继续，无需人工干预。
 * 
 * 如何重置/清空缓存:
 * 如果您想完全重新开始，请在控制台运行这行命令:
 * localStorage.removeItem('geminiAutomationState');
 * 
 * 使用说明:
 * 1. 修改下面的 "CONFIG" 配置为您需要的值。
 * 2. 访问 https://aistudio.google.com/app/apikey 并确保您已登录。
 * 3. 打开浏览器开发者工具 (F12)，并切换到 "Console" (控制台) 标签。
 * 4. 复制并粘贴此完整脚本到控制台中，然后按 Enter 键。
 * =================================================================================
 */

// =================================================================================
// [控制面板] 请在这里修改您的配置
// =================================================================================
const CONFIG = {
    // 【每个项目要生成的 Key 数】
    // 例如：设置为 3，如果您有8个项目，最终会生成 24 个 Key。
    API_KEYS_PER_PROJECT: 1,

    // 【创建异常时最多自动刷新次数】
    // 当脚本遇到无法恢复的错误时，它会自动刷新页面并重试。
    // 设置为 0 表示不自动重试。
    MAX_RETRIES_ON_ERROR: 5,

    // 【连续生成 Key 的间隔 (ms)】
    // 在同一个项目中，连续生成多个 Key 之间的间隔时间 (单位: 毫秒)。
    // 仅在 API_KEYS_PER_PROJECT > 1 时生效。
    API_KEY_CREATION_DELAY_MS: 2500,

    // 【选择下拉框后额外等待 (ms)】
    // 用于等待UI动画播放完成的额外延迟。如果您的网络或电脑较慢，可以适当增加。
    SELECT_CHANGE_DELAY_MS: 1000,
    
    // 【高级】连续处理不同项目之间的间隔时间 (ms)
    DELAY_BETWEEN_PROJECTS_MS: 2000,
    
    // 【高级】触发自动刷新前的等待时间 (ms)
    RETRY_DELAY_MS: 5000
};


(async function initializeAutomation() {

    // =================================================================================
    // 辅助函数 (无需修改)
    // =================================================================================
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    const waitForElementInDom = (selector, timeout = 30000) => new Promise((resolve, reject) => {
        let el, interval = setInterval(() => {
            if (el = document.querySelector(selector)) { clearInterval(interval); resolve(el); }
        }, 100);
        setTimeout(() => { clearInterval(interval); reject(new Error(`等待元素 "${selector}" 超时`)); }, timeout);
    });
    const waitForElementToBeEnabled = (selector, timeout = 10000) => new Promise((resolve, reject) => {
        let el, interval = setInterval(() => {
            if ((el = document.querySelector(selector)) && !el.disabled) { clearInterval(interval); resolve(el); }
        }, 100);
        setTimeout(() => { clearInterval(interval); reject(new Error(`等待元素 "${selector}" 可用超时`)); }, timeout);
    });
    const findButtonByText = (texts) => {
        for (const text of texts) {
            const result = document.evaluate(`//button[contains(., '${text.trim()}')]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (result) return result;
        }
        return null;
    };
    const createCopyUI = (keys, titleText) => {
        const id = 'gemini-keys-copier';
        document.getElementById(id)?.remove();
        const container = document.createElement('div'); container.id = id;
        Object.assign(container.style, { position: 'fixed', top: '20px', right: '20px', zIndex: '9999', backgroundColor: '#f0f4f9', border: '1px solid #dcdcdc', borderRadius: '8px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontFamily: 'Arial, sans-serif', color: '#333', width: '400px', maxWidth: '90%' });
        const title = document.createElement('h3'); title.textContent = titleText;
        Object.assign(title.style, { margin: '0 0 10px 0', fontSize: '16px' });
        const textArea = document.createElement('textarea'); textArea.value = keys.join('\n');
        Object.assign(textArea.style, { width: '100%', boxSizing: 'border-box', minHeight: '150px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px', padding: '5px' });
        textArea.readOnly = true;
        const copyButton = document.createElement('button'); copyButton.textContent = '一键复制全部';
        Object.assign(copyButton.style, { padding: '8px 12px', border: 'none', borderRadius: '4px', backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer' });
        copyButton.onclick = () => { navigator.clipboard.writeText(textArea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '一键复制全部'; }, 2000); }); };
        const closeButton = document.createElement('button'); closeButton.textContent = '关闭';
        Object.assign(closeButton.style, { marginLeft: '10px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', color: '#333', cursor: 'pointer' });
        closeButton.onclick = () => container.remove();
        container.append(title, textArea, copyButton, closeButton);
        document.body.appendChild(container);
    };

    // =================================================================================
    // 状态管理 & 主逻辑
    // =================================================================================
    const STATE_KEY = 'geminiAutomationState';
    const PROJECT_NAME_SELECTOR = '.project-display-name, .v3-font-body';
    const PROJECT_ID_SELECTOR = '.project-id-text';

    // 核心执行函数
    async function runAutomation(state) {
        let newResults = state.results;
        let projectsToProcess = [];

        try {
            console.log("🚀 脚本开始执行 (v17 - 专业可配置版)...");
            if (state.retryCount > 0) {
                console.warn(`⚠️ 这是第 ${state.retryCount} 次自动重试。`);
            }
            console.log("当前配置:", CONFIG);
            
            console.log("🔍 [阶段 1/3] 正在获取项目总列表...");
            findButtonByText(["Create API key", "创建 API 密钥"]).click();
            (await waitForElementInDom('input[aria-label*="Google Cloud project"]')).click();
            await waitForElementInDom(`mat-option ${PROJECT_NAME_SELECTOR}`);
            await delay(CONFIG.SELECT_CHANGE_DELAY_MS);
            
            const projectOptionElements = (await waitForElementInDom('div[role="listbox"]')).querySelectorAll('mat-option');
            projectOptionElements.forEach(opt => {
                const nameEl = opt.querySelector(PROJECT_NAME_SELECTOR);
                const idEl = opt.querySelector(PROJECT_ID_SELECTOR);
                if (nameEl && idEl) { projectsToProcess.push({ displayName: nameEl.textContent.trim(), projectID: idEl.textContent.trim() }); }
            });
            if (projectsToProcess.length === 0) throw new Error("读取项目列表失败。");
            console.log(`ℹ️  侦察到总共有 ${projectsToProcess.length} 个唯一项目待处理。`);

            (await waitForElementInDom('button[iconname="close"]')).click();
            await delay(1500);

            console.log("🔁 [阶段 2/3] 开始检查并创建密钥...");
            for (const project of projectsToProcess) {
                if (newResults.some(item => item["项目 ID"] === project.projectID)) {
                    console.log(`\n⏭️  项目 "${project.displayName}" (ID: ${project.projectID}) 在本次任务中已处理过，跳过。`);
                    continue;
                }

                console.log(`\n-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n⏳ 开始处理项目 "${project.displayName}" (ID: ${project.projectID})`);
                for (let i = 0; i < CONFIG.API_KEYS_PER_PROJECT; i++) {
                    console.log(`   -> 正在创建该项目的第 ${i + 1} / ${CONFIG.API_KEYS_PER_PROJECT} 个 Key...`);
                    
                    findButtonByText(["Create API key", "创建 API 密钥"]).click();
                    (await waitForElementInDom('input[aria-label*="Google Cloud project"]')).click();
                    await waitForElementInDom(`mat-option ${PROJECT_NAME_SELECTOR}`);
                    await delay(CONFIG.SELECT_CHANGE_DELAY_MS);
                    
                    const options = Array.from((await waitForElementInDom('div[role="listbox"]')).querySelectorAll('mat-option'));
                    const targetOption = options.find(opt => opt.querySelector(PROJECT_ID_SELECTOR)?.textContent.trim() === project.projectID);

                    if (!targetOption) {
                        console.warn(`      -> ️⚠️ 错误: 找不到项目，跳过此Key的创建。`);
                        (await waitForElementInDom('button[iconname="close"]')).click(); await delay(1000); continue;
                    }
                    
                    targetOption.click();
                    (await waitForElementToBeEnabled('.create-api-key-button')).click();
                    
                    const apiKeyElement = await waitForElementInDom('div.apikey-text', 25000); 
                    const apiKey = apiKeyElement.textContent.trim();
                    
                    if (apiKey && apiKey.startsWith("AIza")) {
                         const result = { "项目名称": project.displayName, "项目 ID": project.projectID, "API Key": apiKey };
                         newResults.push(result);
                         console.log(`      -> ✅ 成功获取到新 API Key: ...${apiKey.slice(-4)}`);
                         // 每次成功都保存，实现断点续传
                         localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, results: newResults }));
                    } else { throw new Error("读取API Key失败或格式不正确。") }
                   
                    (await waitForElementInDom('button[iconname="close"]')).click();
                    if (i < CONFIG.API_KEYS_PER_PROJECT - 1) { await delay(CONFIG.API_KEY_CREATION_DELAY_MS); }
                }
                await delay(CONFIG.DELAY_BETWEEN_PROJECTS_MS);
            }

            console.log("\n\n🎉🎉🎉 [阶段 3/3] 全部任务完成！🎉🎉🎉");
            if (newResults.length > 0) {
                console.log(`总共创建了 ${newResults.length} 个新的API密钥 (表格形式):`);
                console.table(newResults);
                createCopyUI(newResults.map(item => item["API Key"]), `成功创建 ${newResults.length} 个新的 API Key`);
            } else { console.warn("脚本运行完成，但没有创建任何新的API密钥。"); }
            
            // 任务成功，清除状态
            localStorage.removeItem(STATE_KEY);

        } catch (error) {
            console.error("❌ 脚本执行过程中发生严重错误:", error);
            const currentState = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
            if (currentState.retryCount < CONFIG.MAX_RETRIES_ON_ERROR) {
                console.warn(`将在 ${CONFIG.RETRY_DELAY_MS / 1000} 秒后自动刷新页面并重试...`);
                await delay(CONFIG.RETRY_DELAY_MS);
                location.reload();
            } else {
                console.error(`已达到最大重试次数 (${CONFIG.MAX_RETRIES_ON_ERROR})，脚本终止。`);
                if (newResults.length > 0) {
                    console.log("这是在最终失败前已成功获取的部分密钥：");
                    console.table(newResults);
                    createCopyUI(newResults.map(item => item["API Key"]), `失败前已获取 ${newResults.length} 个 Key`);
                }
                // 彻底失败，清除状态
                localStorage.removeItem(STATE_KEY);
            }
        } finally {
            const closeButtons = document.querySelectorAll('button[iconname="close"]');
            if (closeButtons.length > 0) {
                console.log("ℹ️  正在清理残留的弹窗...");
                closeButtons.forEach(btn => btn.click());
            }
        }
    }

    // --- 初始化与状态管理 ---
    let state = { isRunning: false, retryCount: 0, results: [] };
    try {
        const savedState = JSON.parse(localStorage.getItem(STATE_KEY));
        if (savedState && savedState.isRunning) {
            state = { ...savedState, retryCount: savedState.retryCount + 1 };
        }
    } catch (e) { /* ignore parsing errors */ }

    // 写入当前运行状态，为可能的失败重试做准备
    state.isRunning = true;
    localStorage.setItem(STATE_KEY, JSON.stringify(state));

    // 启动主逻辑
    runAutomation(state);

})();
