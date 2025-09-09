/**
 * =================================================================================
 * Gemini API Key 自动创建脚本 (v15 - 纯粹全新创建版)
 * 
 * 最终功能:
 * 1. 【全新创建】每次运行，都会为页面上侦察到的所有项目创建一套全新的API Key。
 * 2. 【唯一ID识别】使用唯一的 "Project ID" 来精确操作每个项目，避免重复或遗漏。
 * 3. 【便利复制】所有新创建的Key，会汇总到页面右上角一个带"一键复制"按钮的文本框中。
 * 4. 【高度稳定】融合了动画兼容、超时容错、UI自适应等所有稳定性优化。
 * 
 * 使用说明:
 * 1. 访问 https://aistudio.google.com/app/apikey 并确保您已登录。
 * 2. 打开浏览器开发者工具 (F12)，并切换到 "Console" (控制台) 标签。
 * 3. 复制并粘贴此完整脚本到控制台中，然后按 Enter 键。
 * =================================================================================
 */
(async function createAllNewGeminiApiKeys() {

    // =================================================================================
    // 辅助函数
    // =================================================================================

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const waitForElementInDom = (selector, timeout = 30000) => {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeElapsed = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                if (element) { clearInterval(interval); resolve(element); }
                timeElapsed += intervalTime;
                if (timeElapsed >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`等待元素 "${selector}" 出现在DOM中超时 (${timeout/1000}秒)`));
                }
            }, intervalTime);
        });
    };
    
    const waitForElementToBeEnabled = (selector, timeout = 10000) => {
         return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeElapsed = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                if (element && !element.disabled) { clearInterval(interval); resolve(element); }
                timeElapsed += intervalTime;
                if (timeElapsed >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`等待元素 "${selector}" 变为可用状态超时`));
                }
            }, intervalTime);
        });
    }

    const findButtonByText = (texts) => {
        for (const text of texts) {
            const xpath = `//button[contains(., '${text.trim()}')]`;
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (result) return result;
        }
        return null;
    };

    const createCopyUI = (keys) => {
        const containerId = 'gemini-keys-copier';
        const existingContainer = document.getElementById(containerId);
        if (existingContainer) { existingContainer.remove(); }

        const container = document.createElement('div');
        container.id = containerId;
        Object.assign(container.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
            backgroundColor: '#f0f4f9', border: '1px solid #dcdcdc', borderRadius: '8px',
            padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontFamily: 'Arial, sans-serif', color: '#333', width: '400px'
        });

        const title = document.createElement('h3');
        title.textContent = `成功创建 ${keys.length} 个新的 API Key`;
        Object.assign(title.style, { margin: '0 0 10px 0', fontSize: '16px' });

        const textArea = document.createElement('textarea');
        textArea.value = keys.join('\n');
        Object.assign(textArea.style, {
            width: '100%', minHeight: '150px', marginBottom: '10px',
            border: '1px solid #ccc', borderRadius: '4px', padding: '5px'
        });
        textArea.readOnly = true;

        const copyButton = document.createElement('button');
        copyButton.textContent = '一键复制全部';
        Object.assign(copyButton.style, {
            padding: '8px 12px', border: 'none', borderRadius: '4px',
            backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer'
        });
        
        copyButton.onclick = () => {
            navigator.clipboard.writeText(textArea.value).then(() => {
                copyButton.textContent = '已复制!';
                setTimeout(() => { copyButton.textContent = '一键复制全部'; }, 2000);
            });
        };
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        Object.assign(closeButton.style, {
            marginLeft: '10px', padding: '8px 12px', border: '1px solid #ccc',
            borderRadius: '4px', backgroundColor: '#fff', color: '#333', cursor: 'pointer'
        });

        closeButton.onclick = () => container.remove();

        container.appendChild(title);
        container.appendChild(textArea);
        container.appendChild(copyButton);
        container.appendChild(closeButton);
        document.body.appendChild(container);
    };

    // =================================================================================
    // 主逻辑
    // =================================================================================
    
    const PROJECT_NAME_SELECTOR = '.project-display-name, .v3-font-body';
    const PROJECT_ID_SELECTOR = '.project-id-text';
    
    let newResults = []; // 使用一个全新的数组来存储本次运行的结果
    let projectsToProcess = [];

    try {
        console.log("🚀 脚本开始执行 (v15 - 纯粹全新创建版)...");

        // --- 步骤 1: 侦察所有项目 ---
        console.log("🔍 [阶段 1/3] 正在获取项目总列表 (包含唯一ID)...");
        
        const createKeyButtonMain = findButtonByText(["Create API key", "创建 API 密钥"]);
        if (!createKeyButtonMain) throw new Error("无法找到主'创建 API 密钥'按钮。");
        
        createKeyButtonMain.click();
        const projectSearchInput = await waitForElementInDom('input[aria-label="Search Google Cloud projects"], input[aria-label="搜索 Google Cloud 项目"]');
        projectSearchInput.click();
        
        await waitForElementInDom(`mat-option ${PROJECT_NAME_SELECTOR}`);
        await delay(500);
        
        const projectListContainer = await waitForElementInDom('div[role="listbox"]');
        const projectOptionElements = projectListContainer.querySelectorAll('mat-option');
        
        projectOptionElements.forEach(opt => {
            const nameEl = opt.querySelector(PROJECT_NAME_SELECTOR);
            const idEl = opt.querySelector(PROJECT_ID_SELECTOR);
            if (nameEl && idEl) { projectsToProcess.push({ displayName: nameEl.textContent.trim(), projectID: idEl.textContent.trim() }); }
        });
        
        if (projectsToProcess.length === 0) throw new Error("读取项目列表失败。");
        console.log(`ℹ️  侦察到总共有 ${projectsToProcess.length} 个唯一项目，将为每一个创建新Key。`);

        (await waitForElementInDom('button[iconname="close"]')).click();
        await delay(1500);

        // --- 步骤 2: 为每一个项目创建新Key ---
        console.log("🔁 [阶段 2/3] 开始为所有项目创建新密钥...");
        for (const project of projectsToProcess) {
            console.log(`\n-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n⏳ 正在为项目 "${project.displayName}" (ID: ${project.projectID}) 创建密钥...`);

            findButtonByText(["Create API key", "创建 API 密钥"]).click();
            const searchInput = await waitForElementInDom('input[aria-label="Search Google Cloud projects"], input[aria-label="搜索 Google Cloud 项目"]');
            searchInput.click();
            
            await waitForElementInDom(`mat-option ${PROJECT_NAME_SELECTOR}`);
            await delay(500);

            const listContainer = await waitForElementInDom('div[role="listbox"]');
            const options = Array.from(listContainer.querySelectorAll('mat-option'));

            const targetOption = options.find(opt => {
                const nameEl = opt.querySelector(PROJECT_NAME_SELECTOR);
                const idEl = opt.querySelector(PROJECT_ID_SELECTOR);
                return nameEl && idEl && nameEl.textContent.trim() === project.displayName && idEl.textContent.trim() === project.projectID;
            });

            if (!targetOption) {
                console.warn(`   -> ️⚠️ 错误: 在下拉列表中找不到项目 "${project.displayName}" (ID: ${project.projectID})，跳过。`);
                (await waitForElementInDom('button[iconname="close"]')).click();
                await delay(1000);
                continue;
            }
            
            targetOption.click();
            const createInProjectButton = await waitForElementToBeEnabled('.create-api-key-button');
            createInProjectButton.click();
            console.log("   -> 正在生成密钥，请稍候...");
            
            const apiKeyElement = await waitForElementInDom('div.apikey-text', 25000); 
            const apiKey = apiKeyElement.textContent.trim();
            
            if (apiKey && apiKey.startsWith("AIza")) {
                 const newResult = { "项目名称": project.displayName, "项目 ID": project.projectID, "API Key": apiKey };
                 newResults.push(newResult);
                 console.log(`   -> ✅ 成功获取到新 API Key: ...${apiKey.slice(-4)}`);
            } else { throw new Error("直接读取API Key失败或格式不正确。") }
           
            (await waitForElementInDom('button[iconname="close"]')).click();
            await delay(2000);
        }

        // --- 步骤 3: 显示最终结果 ---
        console.log("\n\n🎉🎉🎉 [阶段 3/3] 全部任务完成！🎉🎉🎉");
        if (newResults.length > 0) {
            console.log(`总共创建了 ${newResults.length} 个新的API密钥 (表格形式):`);
            console.table(newResults);
            
            const allKeys = newResults.map(item => item["API Key"]);
            createCopyUI(allKeys);
            console.log("✅ 已在页面右上角生成可复制的文本框。");
        } else { console.warn("脚本运行完成，但没有创建任何新的API密钥。"); }

    } catch (error) {
        console.error("❌ 脚本执行过程中发生错误:", error);
        console.warn("脚本已终止。");
        if (newResults.length > 0) {
            console.log("这是在出错前已经成功获取的部分新密钥：");
            console.table(newResults);
            createCopyUI(newResults.map(item => item["API Key"]));
        }
    } finally {
        const closeButtons = document.querySelectorAll('button[iconname="close"]');
        if (closeButtons.length > 0) {
            console.log("ℹ️  正在清理残留的弹窗...");
            closeButtons.forEach(btn => btn.click());
        }
    }
})();
