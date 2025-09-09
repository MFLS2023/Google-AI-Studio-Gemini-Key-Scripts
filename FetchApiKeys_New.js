(async function createAllGeminiApiKeys() {

    // =================================================================================
    // 辅助函数
    // =================================================================================

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const waitForElement = (selector, timeout = 15000) => {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let timeElapsed = 0;
            const interval = setInterval(() => {
                const elements = document.querySelectorAll(selector);
                const visibleElement = Array.from(elements).find(el => el.offsetParent !== null);
                if (visibleElement) {
                    clearInterval(interval);
                    resolve(visibleElement);
                }
                timeElapsed += intervalTime;
                if (timeElapsed >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`等待可见元素 "${selector}" 超时 (${timeout/1000}秒)`));
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
                if (element && !element.disabled) {
                    clearInterval(interval);
                    resolve(element);
                }
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


    // =================================================================================
    // 主逻辑
    // =================================================================================
    
    const STORAGE_KEY = 'geminiApiKeyCreatorResults';
    let results = [];
    let projectNames = [];

    try {
        // ---【新增功能】--- 启动时加载已保存的进度
        const savedResults = localStorage.getItem(STORAGE_KEY);
        if (savedResults) {
            try {
                results = JSON.parse(savedResults);
                console.log(`? 恢复进度: 已从本地存储加载 ${results.length} 个已获取的API Key。`);
            } catch (e) {
                console.warn("?? 解析本地存储数据失败，将从头开始。");
                results = [];
            }
        }

        console.log("?? 脚本开始执行 (v9 - 断点续传版)...");

        // --- 步骤 1: 获取所有可用项目列表 ---
        console.log("?? [阶段 1/3] 正在获取项目总列表...");
        
        const createKeyButtonMain = findButtonByText(["Create API key", "创建 API 密钥"]);
        if (!createKeyButtonMain) throw new Error("无法找到主'创建 API 密钥'按钮。");
        
        createKeyButtonMain.click();
        const projectSearchInput = await waitForElement('input[aria-label="Search Google Cloud projects"], input[aria-label="搜索 Google Cloud 项目"]');
        projectSearchInput.click();
        await waitForElement('mat-option .v3-font-body');
        
        const projectListContainer = await waitForElement('div[role="listbox"]');
        await delay(500);
        const projectOptions = projectListContainer.querySelectorAll('mat-option .v3-font-body');
        projectOptions.forEach(option => projectNames.push(option.textContent.trim()));
        
        if (projectNames.length === 0) throw new Error("读取项目列表失败。");
        
        console.log(`??  侦察到总共有 ${projectNames.length} 个项目。`);

        (await waitForElement('button[iconname="close"]')).click();
        await delay(1500);

        // --- 步骤 2: 循环为每个项目创建密钥 ---
        console.log("?? [阶段 2/3] 开始检查并创建密钥...");
        for (const projectName of projectNames) {
            // ---【新增功能】--- 检查此项目是否已经处理过
            if (results.some(item => item["项目 (Project)"] === projectName)) {
                console.log(`\\\\n??  项目 "${projectName}" 已处理过，自动跳过。`);
                continue;
            }

            console.log(`\\\\n-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\\\n? 正在为新项目 "${projectName}" 创建密钥...`);

            findButtonByText(["Create API key", "创建 API 密钥"]).click();
            const searchInput = await waitForElement('input[aria-label="Search Google Cloud projects"], input[aria-label="搜索 Google Cloud 项目"]');
            searchInput.click();
            await waitForElement('mat-option .v3-font-body');

            const listContainer = await waitForElement('div[role="listbox"]');
            const options = Array.from(listContainer.querySelectorAll('mat-option'));
            const targetOption = options.find(opt => opt.querySelector('.v3-font-body').textContent.trim() === projectName);

            if (!targetOption) {
                console.warn(`   -> ??? 错误: 在下拉列表中找不到项目 "${projectName}"，跳过。`);
                (await waitForElement('button[iconname="close"]')).click();
                await delay(1000);
                continue;
            }
            
            targetOption.click();
            const createInProjectButton = await waitForElementToBeEnabled('.create-api-key-button');
            createInProjectButton.click();
            console.log("   -> 正在生成密钥，请稍候...");
            
            const apiKeyElement = await waitForElement('div.apikey-text', 25000); 
            const apiKey = apiKeyElement.textContent.trim();
            
            if (apiKey && apiKey.startsWith("AIza")) {
                 results.push({ "项目 (Project)": projectName, "API Key": apiKey });
                 console.log(`   -> ? 成功获取到 API Key: ...${apiKey.slice(-4)}`);

                 // ---【新增功能】--- 立刻保存进度！
                 localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
                 console.log("   -> ?? 进度已自动保存。");
            } else {
                throw new Error("直接读取API Key失败或格式不正确。")
            }
           
            (await waitForElement('button[iconname="close"]')).click();
            await delay(2000);
        }

        // --- 步骤 3: 显示最终结果 ---
        console.log("\\\\n\\\\n?????? [阶段 3/3] 全部任务完成！??????");
        if (results.length > 0) {
            console.log(`总共获取了 ${results.length} 个API密钥 (表格形式):`);
            console.table(results);

            console.log("\\\\n\\\\n?? 所有API Key汇总 (可直接复制):");
            console.log("```");
            console.log(results.map(item => item["API Key"]).join('\\\\n'));
            console.log("```");
        } else {
            console.warn("脚本运行完成，但没有创建任何新的API密钥。");
        }

    } catch (error) {
        console.error("? 脚本执行过程中发生错误:", error);
        console.warn("脚本已终止。刷新页面后重新运行脚本即可从断点处继续。");
        if (results.length > 0) {
            console.log("这是在出错前已经成功获取并保存的部分密钥：");
            console.table(results);
        }
    }
})();
