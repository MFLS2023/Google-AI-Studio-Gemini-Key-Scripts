// ==UserScript==
// @name         Gemini API Key 自动创建脚本 (v15.7 - 高级自定义版)
// @namespace    https://github.com/google/generative-ai-docs
// @version      15.7
// @description  【终极稳定版】在 aistudio.google.com 的 API Key 页面添加按钮。支持自定义生成数量、延时、失败自动重试（断点续传）等高级功能。
// @author       (Original Author) & Gemini (Userscript Adaptation)
// @match        https://aistudio.google.com/apikey*
// @match        https://aistudio.google.com/app/apikey*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=aistudio.google.com
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- ⚙️ 用户自定义配置 ---
    const CONFIG = {
        // 每个项目要生成的 Key 数量
        API_KEYS_PER_PROJECT: 1,

        // 成功创建一个 Key 后，到下一个操作的间隔 (毫秒)
        // 建议不要低于 2000，否则可能因操作过快导致页面反应不过来
        API_KEY_CREATION_DELAY: 2500,

        // 在下拉框中选择一个项目后，额外等待的时间 (毫秒)
        // 用于等待 "Generate API Key" 按钮变为可点击状态
        SELECT_CHANGE_DELAY: 1000,

        // 创建过程中发生网络错误等异常时，脚本自动刷新页面并重试的最大次数
        MAX_RETRIES: 5,
    };
    // --- 配置结束 ---


    const RETRY_STATE_KEY = 'geminiApiRetryState';

    // =================================================================================
    // 实时诊断模块 (完全禁用 innerHTML)
    // =================================================================================
    let diagnosticBox = null; let diagnosticStatusEl = null;
    function createDiagnosticBox(){if(document.getElementById('gm-diagnostic-box'))return;diagnosticBox=document.createElement('div');diagnosticBox.id='gm-diagnostic-box';const t=document.createElement('strong');t.textContent='Gemini脚本(v15.7)';diagnosticStatusEl=document.createElement('span');diagnosticStatusEl.textContent='状态: 初始化...';diagnosticBox.appendChild(t);diagnosticBox.appendChild(document.createElement('br'));diagnosticBox.appendChild(diagnosticStatusEl);document.body.appendChild(diagnosticBox)}
    function updateDiagnostic(t,e="info"){diagnosticBox||(document.body?createDiagnosticBox():(document.addEventListener('DOMContentLoaded',createDiagnosticBox,{once:!0}),setTimeout(()=>updateDiagnostic(t,e),50)));diagnosticStatusEl.textContent=`状态: ${t}`;diagnosticBox.style.backgroundColor="error"===e?"#ffdddd":"#e6f4ff";diagnosticBox.style.color="error"===e?"#d8000c":"#00529B"}
    GM_addStyle(`#gm-diagnostic-box{position:fixed;top:10px;left:10px;padding:8px;background-color:#e6f4ff;border:1px solid #b3d4ff;border-radius:5px;font-family:Arial,sans-serif;font-size:12px;color:#00529B;z-index:99999;box-shadow:0 2px 5px rgba(0,0,0,0.1);line-height:1.4}`);
    updateDiagnostic("脚本已注入, 等待页面加载...");

    // =================================================================================
    // 核心业务逻辑 (重构以支持新功能)
    // =================================================================================
    async function createAllNewGeminiApiKeys(retryState = {}) {
        const {
            initialProjects = [],
            initialKeys = [],
            startIndex = 0,
            retryCount = 0
        } = retryState;

        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        const waitForElementInDom=(s,t=3e4)=>new Promise((r,e)=>{let i=100,n=0;const o=setInterval(()=>{const c=document.querySelector(s);if(c)return clearInterval(o),r(c);(n+=i)>=t&&(clearInterval(o),e(new Error(`等待元素 "${s}" 超时`)))},i)});
        const waitForElementToBeEnabled=(s,t=1e4)=>new Promise((r,e)=>{let i=100,n=0;const o=setInterval(()=>{const c=document.querySelector(s);if(c&&!c.disabled)return clearInterval(o),r(c);(n+=i)>=t&&(clearInterval(o),e(new Error(`等待元素 "${s}" 可用超时`)))},i)});
        const findButtonByText=t=>{for(const r of t){const e=`//button[contains(., '${r.trim()}')]`,i=document.evaluate(e,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(i)return i}return null};
        const createCopyUI=t=>{const r="gemini-keys-copier";document.getElementById(r)?.remove();const e=document.createElement("div");e.id=r,Object.assign(e.style,{position:"fixed",top:"20px",right:"20px",zIndex:"9999",backgroundColor:"#f0f4f9",border:"1px solid #dcdcdc",borderRadius:"8px",padding:"15px",boxShadow:"0 4px 12px rgba(0,0,0,0.15)",fontFamily:"Arial, sans-serif",color:"#333",width:"400px"});const i=document.createElement("h3");i.textContent=`成功创建 ${t.length} 个新的 API Key`,Object.assign(i.style,{margin:"0 0 10px 0",fontSize:"16px"});const n=document.createElement("textarea");n.value=t.join("\n"),Object.assign(n.style,{width:"100%",minHeight:"150px",marginBottom:"10px",border:"1px solid #ccc",borderRadius:"4px",padding:"5px"}),n.readOnly=!0;const o=document.createElement("button");o.textContent="一键复制全部",Object.assign(o.style,{padding:"8px 12px",border:"none",borderRadius:"4px",backgroundColor:"#1a73e8",color:"white",cursor:"pointer"}),o.onclick=()=>{navigator.clipboard.writeText(n.value).then(()=>{o.textContent="已复制!",setTimeout(()=>{o.textContent="一键复制全部"},2e3)})};const c=document.createElement("button");c.textContent="关闭",Object.assign(c.style,{marginLeft:"10px",padding:"8px 12px",border:"1px solid #ccc",borderRadius:"4px",backgroundColor:"#fff",color:"#333",cursor:"pointer"}),c.onclick=()=>e.remove(),e.appendChild(i),e.appendChild(n),e.appendChild(o),e.appendChild(c),document.body.appendChild(e)};

        let newResults = [...initialKeys];
        let projectsToProcess = [...initialProjects];
        let currentProjectIndex = startIndex; // 用于错误恢复

        try {
            // --- 步骤 1: 侦察所有项目 (仅在首次运行时执行) ---
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

            // --- 步骤 2: 为每一个项目创建新Key ---
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
                        continue; // 跳过此项目
                    }

                    targetOption.click();
                    await delay(CONFIG.SELECT_CHANGE_DELAY); // 等待UI响应
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

            // --- 步骤 3: 显示最终结果 ---
            console.log("\n\n🎉🎉🎉 [阶段 3/3] 全部任务完成！🎉🎉🎉");
            updateDiagnostic("全部完成！");
            sessionStorage.removeItem(RETRY_STATE_KEY); // 成功完成，清除重试状态
            if (newResults.length > 0) {
                console.log(`总共创建了 ${newResults.length} 个新密钥:`);
                console.table(newResults);
                createCopyUI(newResults.map(item => item["API Key"]));
            } else { console.warn("未创建任何新密钥。") }

        } catch (error) {
            console.error("❌ 脚本执行出错:", error);
            if (retryCount < CONFIG.MAX_RETRIES) {
                const newState = {
                    initialProjects: projectsToProcess,
                    initialKeys: newResults,
                    startIndex: currentProjectIndex, // 从当前失败的项目开始重试
                    retryCount: retryCount + 1
                };
                sessionStorage.setItem(RETRY_STATE_KEY, JSON.stringify(newState));
                const msg = `错误，将在5秒后刷新重试 (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`;
                console.warn(msg);
                updateDiagnostic(msg, 'error');
                setTimeout(() => location.reload(), 5000);
            } else {
                const msg = `已达到最大重试次数 (${CONFIG.MAX_RETRIES})，脚本终止。`;
                console.error(msg);
                updateDiagnostic(msg, 'error');
                sessionStorage.removeItem(RETRY_STATE_KEY); // 停止重试，清除状态
                if (newResults.length > 0) { // 显示部分成功的结果
                    console.log("这是在最终失败前已获取的部分密钥:");
                    console.table(newResults);
                    createCopyUI(newResults.map(item => item["API Key"]));
                }
            }
        }
    }

    // =================================================================================
    // 触发器与初始化
    // =================================================================================
    function addTriggerButton() {
        const buttonId = 'gemini-auto-creator-trigger-button'; if (document.getElementById(buttonId)) return;
        updateDiagnostic("正在添加触发按钮...");
        const button = document.createElement('button'); button.id = buttonId;
        button.textContent = `🚀 一键创建密钥 (v15.7)`; Object.assign(button.style, { position: 'fixed', bottom: '30px', right: '30px', zIndex: '9999', padding: '12px 20px', fontSize: '16px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: 'transform 0.2s ease-in-out' });
        button.addEventListener('mouseenter', () => button.style.transform = 'scale(1.05)'); button.addEventListener('mouseleave', () => button.style.transform = 'scale(1)');
        button.addEventListener('click', (e) => { if (e.target.disabled) return; e.target.disabled = true; e.target.textContent = '🏃‍♂️ 正在执行中...'; updateDiagnostic("用户已点击，核心脚本执行中..."); createAllNewGeminiApiKeys().finally(() => { e.target.disabled = false; e.target.textContent = `🚀 一键创建密钥 (v15.7)`; updateDiagnostic("任务完成！可再次点击。"); }); });
        document.body.appendChild(button); updateDiagnostic("按钮已就绪！"); console.log("✅ [油猴脚本] 触发按钮已成功添加！");
    }

    function isPageReady() {
        const createButton = document.querySelector('button[aria-label="Create API key in project"]'); if(createButton) return true;
        const pageTitle = Array.from(document.querySelectorAll('h1, h2, span')).find(el => el.textContent.includes('API keys') || el.textContent.includes('API 密钥')); if (pageTitle) return true;
        const listContainer = document.querySelector('.api-key-list-container, api-key-list'); if (listContainer) return true;
        return false;
    }

    function initializeScript() {
        // 检查是否存在需要恢复的重试任务
        const savedStateJSON = sessionStorage.getItem(RETRY_STATE_KEY);
        if (savedStateJSON) {
            console.log("检测到未完成的重试任务，脚本将自动启动...");
            updateDiagnostic("检测到重试任务, 自动启动...");
            try {
                const savedState = JSON.parse(savedStateJSON);
                createAllNewGeminiApiKeys(savedState);
            } catch (e) {
                console.error("解析重试状态失败:", e);
                sessionStorage.removeItem(RETRY_STATE_KEY);
            }
        } else {
            // 如果没有重试任务，则正常监视页面，等待用户手动点击
            console.log("🚀 [油猴脚本 v15.7] 开始运行，监视页面DOM变化...");
            updateDiagnostic("正在监视页面...");
            const observer = new MutationObserver(() => { if (isPageReady()) { console.log("✅ [油猴脚本] 侦测到关键元素，页面已加载。"); updateDiagnostic("页面已加载，准备添加按钮..."); observer.disconnect(); addTriggerButton(); } });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { if (!document.getElementById('gemini-auto-creator-trigger-button')) { observer.disconnect(); const msg = "监视超时(20秒)，脚本无法启动。请刷新页面。"; console.error(`❌ [油猴脚本] ${msg}`); updateDiagnostic(msg, 'error'); } }, 20000);
        }
    }

    if (document.body) { initializeScript(); } else { document.addEventListener('DOMContentLoaded', initializeScript, { once: true }); }

})();
