/**
 * Gemini API Key 自动化脚本 (浏览器控制台) - 每项目5次尝试 + 详细注释 + 优化输出版
 *
 * 为【检测到的每个项目】分别尝试创建【最多 1 个】API 密钥。
 * 如果点击创建后，在指定时间内【未检测到新密钥出现】，则跳过该项目的剩余尝试。
 * 最后将所有成功获取的密钥输出到一个【干净的代码块】中，每行一个，逗号结尾。
 *
 * !!! 警告: 仍然可能触发速率限制，请谨慎使用 !!!
 *
 * 使用方法:
 * 1. 登录 https://aistudio.google.com/apikey。
 * 2. 打开 DevTools (F12) -> Console。
 * 3. (可选) 修改 `keysPerProjectTarget` (当前为 1), `apiKeyWaitTimeout` 和延迟时间。
 * 4. 复制【整个】代码。
 * 5. 粘贴到控制台并运行。
 * 6. 观察控制台输出，并在最后复制生成的密钥块。
 */
async function automateKeys5PerProjectWithComments() {
    console.clear();
    console.log("--- 开始为每个项目循环创建 API 密钥 (每项目5次尝试 + 注释版) ---");

    // --- 配置 ---
    /** @type {number} 每个项目【目标尝试】创建的密钥数量 */
    const keysPerProjectTarget = 1; // <--- 修改这里为你想要的数量
    /** @type {number} 等待新 API 密钥元素出现的最长时间 (毫秒) */
    const apiKeyWaitTimeout = 25000;
    /** @type {number} 同一个项目内，两次密钥创建尝试之间的延迟 (毫秒) */
    const delayBetweenAttempts = 2500;
    /** @type {number} 处理完一个项目后，切换到下一个项目前的延迟 (毫秒) */
    const delayBetweenProjects = 4000;
    /** @type {number} 查找关闭对话框按钮的超时时间 (毫秒) */
    const closeDialogTimeout = 5000;

    // --- 选择器 (用于定位页面元素) ---
    /** @type {string} 主页面上的“创建 API 密钥”按钮 */
    const mainCreateButtonSelector = "button.create-api-key-button";
    /** @type {string} 弹出对话框的主要内容区域 */
    const dialogSelector = "mat-dialog-content";
    /** @type {string} 对话框的顶层容器元素 (用于检查对话框是否关闭) */
    const dialogContainerSelector = "mat-dialog-container";
    /** @type {string} 对话框内用于搜索项目的输入框 */
    const projectSearchInputSelector = "input#project-name-input";
    /** @type {string} 项目下拉列表中的每个项目选项元素 */
    const projectOptionSelector = "mat-option.mat-mdc-option";
    /** @type {string} 项目选项元素内部显示项目名称的元素 */
    const projectNameInsideOptionSelector = ".gmat-body-medium";
    /** @type {string} 对话框内，选择了项目后才可点击的最终“创建”按钮 */
    const dialogCreateButtonSelector = "mat-dialog-content button.create-api-key-button";
    /** @type {string} 成功创建后显示 API 密钥的元素 */
    const apiKeyDisplaySelector = "div.apikey-text";
    /** @type {string[]} 多种可能的关闭对话框按钮的选择器列表，按查找优先级排列 */
    const closeButtonSelectors = [
        "button[aria-label='关闭']", // 优先使用准确的 aria-label
        "button.close-button",      // 备选通用类名
        "button:contains('Done')",    // 备选文本
        "button:contains('完成')",   // 备选文本
        "button:contains('Close')",   // 备选文本
        "mat-dialog-actions button:last-child" // 对话框底部按钮区的最后一个按钮
    ];

    // --- 结果存储 ---
    /** @type {Object<string, string[]>} 按项目名称存储成功生成的 API 密钥列表 */
    const generatedKeysSummary = {};
    /** @type {string[]} 存储本次运行所有成功生成的 API 密钥，用于最后统一输出 */
    const allGeneratedKeys = [];

    // --- 辅助函数 ---
    /**
     * 延迟指定毫秒数
     * @param {number} ms 延迟毫秒数
     * @returns {Promise<void>}
     */
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * 等待指定选择器的元素出现并变得可交互
     * @param {string} selector CSS 选择器
     * @param {number} timeout 超时时间 (毫秒)
     * @param {Document|Element} root 在哪个根元素下查找 (默认 document)
     * @param {boolean} checkDisabled 是否检查元素的 disabled 状态 (默认 true)
     * @returns {Promise<Element>} 找到的元素
     * @throws {Error} 如果超时或元素被禁用
     */
    const waitForElement = async (selector, timeout = 20000, root = document, checkDisabled = true) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            let element = null;
             // 特殊处理 :contains (非标准，需要辅助函数)
             if (selector.includes(':contains')) {
                 const textMatch = selector.match(/:contains\(['"]([^'"]+)['"]\)/i);
                 const baseSelector = selector.split(':')[0];
                 if (textMatch && textMatch[1]) {
                     element = findButtonWithText(textMatch[1], root, baseSelector); // 使用辅助函数查找
                 } else {
                      element = root.querySelector(baseSelector); // 如果contains格式不对，尝试基础选择器
                 }
             } else {
                 element = root.querySelector(selector);
             }

            let isDisabled = checkDisabled ? element?.disabled : false;
            // 检查元素是否存在，在布局中（大致可见），且不是禁用状态
            if (element && element.offsetParent !== null && !isDisabled) {
                 const style = window.getComputedStyle(element);
                 // 进一步检查CSS可见性
                 if (style && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
                    return element; // 找到可用元素
                 }
            }
            await delay(300); // 短暂等待后重试
        }
        // 超时后最后检查一次元素是否存在及其禁用状态
        const finalElement = root.querySelector(selector.split(':')[0]);
        if (finalElement) {
            let finalIsDisabled = checkDisabled ? finalElement.disabled : false;
            if (!finalIsDisabled) {
                 // console.warn(`元素 "${selector}" 超时前找到但可见性检查可能未通过。`); // 可选的警告
                 return finalElement; // 即使可见性检查失败，如果存在且非禁用，也尝试返回
            }
            else { throw new Error(`元素 "${selector}" 找到但仍处于禁用状态 (checkDisabled=${checkDisabled})。`); }
        }
        throw new Error(`元素 "${selector}" 等待超时 (${timeout}ms) 未找到或不可见/不可交互。`);
    };

    /**
     * 等待指定选择器的多个元素出现
     * @param {string} selector CSS 选择器
     * @param {number} minCount 期望的最小元素数量 (默认 1)
     * @param {number} timeout 超时时间 (毫秒)
     * @param {Document|Element} root 在哪个根元素下查找 (默认 document)
     * @returns {Promise<NodeListOf<Element>>} 找到的元素列表
     * @throws {Error} 如果超时
     */
     const waitForElements = async (selector, minCount = 1, timeout = 20000, root = document) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const elements = root.querySelectorAll(selector);
            if (elements.length >= minCount) {
                 const firstElement = elements[0];
                 // 检查第一个元素是否有效且可见作为列表有效的代表
                 if (firstElement && firstElement.offsetParent !== null) {
                     const style = window.getComputedStyle(firstElement);
                      if (style && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
                          return elements; // 返回 NodeList
                      }
                 }
            }
            await delay(300);
        }
         throw new Error(`超时 (${timeout}ms) 等待至少 ${minCount} 个可见的元素 "${selector}"。`);
    };

    /**
     * 查找包含特定文本的按钮元素
     * @param {string} text 要查找的文本 (大小写不敏感)
     * @param {Document|Element} root 查找范围
     * @param {string} baseSelector 基础元素选择器 (默认 'button')
     * @returns {Element|null} 找到的按钮元素或 null
     */
     const findButtonWithText = (text, root = document, baseSelector = 'button') => {
        const buttons = root.querySelectorAll(baseSelector);
        const lowerText = text.toLowerCase();
        for (const btn of buttons) {
             // 优先匹配 aria-label
             if (btn.ariaLabel && btn.ariaLabel.toLowerCase().includes(lowerText)) return btn;
             // 然后匹配按钮内的文本内容
             if (btn.textContent && btn.textContent.trim().toLowerCase() === lowerText) return btn;
        }
        return null; // 没找到
    };

    /**
     * 强力关闭对话框的函数，尝试多种方法
     * @returns {Promise<boolean>} 返回 true 表示成功关闭，false 表示失败
     */
    const robustCloseDialog = async () => {
        console.log("    尝试关闭对话框...");
        let closed = false;
        // 步骤 1: 先检查对话框是否还存在，如果不存在则直接返回成功
        if (!document.querySelector(dialogContainerSelector)) {
             console.log("    对话框似乎已经关闭或不存在。");
             return true;
        }

        // 步骤 2: 循环尝试多种关闭按钮选择器
        for (const selector of closeButtonSelectors) {
            try {
                let buttonToClick = null;
                // console.log(`      尝试选择器: ${selector}`); // 用于调试
                // 使用 waitForElement 查找并等待按钮可用 (检查禁用状态)
                buttonToClick = await waitForElement(selector, closeDialogTimeout, document); // 默认 checkDisabled=true

                if (buttonToClick) {
                    console.log(`      找到可用关闭按钮 (${selector})，尝试点击...`);
                    // 将按钮滚动到视图中心，增加点击成功率
                    buttonToClick.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(300); // 等待滚动动画
                    buttonToClick.click();
                    await delay(1500); // 等待关闭动画和页面稳定

                    // 关键: 再次检查对话框容器是否已从DOM中消失
                    if (!document.querySelector(dialogContainerSelector)) {
                        console.log("    ✅ 对话框已成功关闭 (通过按钮)。");
                        closed = true;
                        break; // 成功关闭，无需尝试其他选择器
                    } else {
                        console.warn(`      点击按钮 (${selector}) 后对话框似乎仍然存在。`);
                        // 继续尝试下一个选择器
                    }
                }
            } catch (error) {
                 // console.log(`      尝试选择器 ${selector} 失败: ${error.message}`); // 可选调试日志
            }
             if (closed) break; // 如果已关闭，跳出循环
        }

        // 步骤 3: 如果所有按钮尝试都失败，尝试点击页面 Body 作为最后的手段
        if (!closed) {
            console.warn("    ⚠️ 未能通过按钮关闭对话框，尝试点击页面 Body...");
            document.body.click();
            await delay(1000); // 等待看是否有效
            // 再次检查对话框容器
            if (!document.querySelector(dialogContainerSelector)) {
                 console.log("    ✅ 通过点击 Body 关闭了对话框。");
                 closed = true;
            } else {
                 console.error("    ❌ 强力关闭失败！对话框可能仍然存在，后续操作可能失败！");
            }
        }
        return closed; // 返回最终关闭结果
    };


     // --- 主要自动化逻辑 ---
    /** @type {number} 检测到的项目总数 */
    let numberOfProjects = 0;
    /** @type {Array<{name: string}>} 存储检测到的项目信息（主要是名称） */
    let projectOptionsInfo = [];

    try { // 将主要流程包裹在 try 中，以便 finally 能执行总结
        // 步骤 0: 获取初始项目列表信息
        console.log("[步骤 0] 获取项目列表信息...");
        try {
             // 点击主按钮 -> 等待对话框 -> 点击搜索框 -> 等待列表 -> 获取信息 -> 关闭
             const mainBtnInit = await waitForElement(mainCreateButtonSelector); mainBtnInit.click();
             const dialogInit = await waitForElement(dialogSelector);
             const searchInputInit = await waitForElement(projectSearchInputSelector, 15000, dialogInit); searchInputInit.click();
             await delay(2000); // 等待列表渲染
             const initialProjectOptions = await waitForElements(projectOptionSelector, 1, 20000, document);
             numberOfProjects = initialProjectOptions.length; console.log(`  检测到 ${numberOfProjects} 个项目。`);
             projectOptionsInfo = Array.from(initialProjectOptions).map((option, index) => {
                 let name = `项目 ${index + 1}`; // 默认名称
                 try { // 尝试提取真实名称
                     const nameElement = option.querySelector(projectNameInsideOptionSelector);
                     if(nameElement && nameElement.textContent) name = nameElement.textContent.trim();
                 } catch {}
                 return { name: name }; // 只存储名字用于日志
             });
             console.log("  项目名称列表:", projectOptionsInfo.map(p => p.name));
             await robustCloseDialog(); // 使用强力关闭函数关闭初始对话框
        } catch (initialError) {
            console.error("❌ 获取初始项目列表时出错:", initialError.message);
            throw initialError; // 抛出错误，中断执行，但会进入 finally
        }
        if (numberOfProjects === 0) {
            console.log("未检测到任何项目，脚本结束。");
            return; // 正常结束
        }

        // 外层循环: 遍历检测到的每个项目
        for (let projectIndex = 0; projectIndex < numberOfProjects; projectIndex++) {
            /** @type {string} 当前处理的项目名称 */
            const currentProjectName = projectOptionsInfo[projectIndex]?.name || `项目 ${projectIndex + 1}`;
            console.log(`\n===== 开始处理项目 ${projectIndex + 1}/${numberOfProjects}: "${currentProjectName}" (尝试创建 ${keysPerProjectTarget} 个 Key) =====`);
            generatedKeysSummary[currentProjectName] = []; // 初始化当前项目的密钥存储数组
            /** @type {boolean} 是否跳过当前项目的剩余创建尝试 */
            let skipRemainingAttempts = false;

            // 内层循环: 为当前项目尝试创建 keysPerProjectTarget (即 5) 个密钥
            for (let keyAttempt = 0; keyAttempt < keysPerProjectTarget; keyAttempt++) {
                // 如果标记为跳过 (例如因为之前的尝试失败了)，则退出内层循环
                if (skipRemainingAttempts) break;

                console.log(`--- [${currentProjectName}] 尝试创建密钥 ${keyAttempt + 1}/${keysPerProjectTarget} ---`);
                /** @type {Element|null} 当前对话框元素 */
                let dialogElement = null;
                /** @type {Element|null} 新生成的 API 密钥元素 */
                let apiKeyElement = null;
                /** @type {boolean} 本次尝试后对话框是否成功关闭 */
                let closeSuccess = false;
                try {
                    // 步骤 1: 点击主创建按钮
                    console.log("  [1/7] 点击主创建按钮...");
                    const mainCreateButton = await waitForElement(mainCreateButtonSelector);
                    mainCreateButton.click(); await delay(500);

                    // 步骤 2: 等待对话框出现 & 展开项目列表
                    console.log("  [2/7] 等待对话框 & 展开列表...");
                    dialogElement = await waitForElement(dialogSelector); // 获取对话框元素以便后续查找
                    const searchInput = await waitForElement(projectSearchInputSelector, 15000, dialogElement);
                    searchInput.click(); await delay(2000); // 等待列表动画

                    // 步骤 3: 选择当前项目 (使用 projectIndex)
                    console.log(`  [3/7] 选择项目 "${currentProjectName}" (列表索引 ${projectIndex})...`);
                    // 每次都需要重新获取最新的选项列表
                    const allProjectOptions = await waitForElements(projectOptionSelector, numberOfProjects, 20000, document);
                    // 健壮性检查：确保索引有效
                    if (projectIndex >= allProjectOptions.length) {
                        console.error(`    错误: 项目索引 ${projectIndex} 越界 (列表当前长度 ${allProjectOptions.length})。可能页面结构变化或列表未完全加载。`);
                        skipRemainingAttempts = true; // 标记跳过后续尝试
                        continue; // 跳过本次内层循环的剩余步骤
                    }
                    const targetProjectOption = allProjectOptions[projectIndex]; // 获取对应项目选项
                    targetProjectOption.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // 滚动使其可见
                    await delay(300); // 等待滚动
                    targetProjectOption.click(); // 点击选择
                    console.log("    等待项目选择生效...");
                    await delay(2500); // 等待足够时间让最终创建按钮启用

                    // 步骤 4: 点击对话框内最终的创建按钮
                    console.log("  [4/7] 点击最终创建按钮...");
                    // 注意：这里不检查禁用状态 (false)，因为之前的经验是即使项目满也可能让你点
                    const dialogCreateButton = await waitForElement(dialogCreateButtonSelector, 10000, dialogElement, false);
                    dialogCreateButton.click();

                    // 步骤 5: 等待 API 密钥显示，如果超时则认为失败并跳过该项目剩余尝试
                    console.log(`  [5/7] 等待 API 密钥显示 (最长 ${apiKeyWaitTimeout / 1000} 秒)...`);
                    try {
                        // 等待密钥元素，不检查禁用状态
                        apiKeyElement = await waitForElement(apiKeyDisplaySelector, apiKeyWaitTimeout, document, false);
                        console.log("    ✅ 新 API 密钥元素已出现。");
                    } catch (apiKeyWaitError) {
                        // 如果等待超时或失败
                        console.warn(`    ⚠️ 等待新 API 密钥超时或失败: ${apiKeyWaitError.message}`);
                        console.warn(`    => 可能项目 "${currentProjectName}" 已满或创建失败。将跳过此项目的剩余创建尝试。`);
                        skipRemainingAttempts = true; // 设置跳过标志
                        await robustCloseDialog(); // 超时后也要尝试关闭可能残留的对话框
                        continue; // 跳过本次内层循环的后续步骤 (提取key, 关闭)
                    }

                    // 步骤 6: 提取 API 密钥文本 (仅当步骤5成功时执行)
                    console.log("  [6/7] 提取 API 密钥...");
                    let apiKey = '';
                    if (apiKeyElement) { // 确保元素存在
                        if (apiKeyElement.tagName === 'INPUT') { apiKey = apiKeyElement.value; }
                        else if (apiKeyElement.textContent) { apiKey = apiKeyElement.textContent; }
                        else { apiKey = apiKeyElement.innerText; } // 备选
                        apiKey = apiKey.trim(); // 去除前后空格

                        if (apiKey) {
                            // 成功获取密钥
                            console.log(`    ✅ 成功! 项目 "${currentProjectName}" 的第 ${generatedKeysSummary[currentProjectName].length + 1} 个新密钥: ${apiKey}`);
                            generatedKeysSummary[currentProjectName].push(apiKey); // 存入项目对应的数组
                            allGeneratedKeys.push(apiKey); // 存入总列表
                            // 不再需要这行: console.log(`    ✨ 请手动复制上面的密钥。`);
                        } else {
                            console.error(`    ❌ 错误: 找到了密钥元素但文本为空 (尝试 ${keyAttempt + 1})。`);
                            // 即使提取失败，也可能创建成功了，但我们无法确认，保守起见继续尝试或让用户检查
                        }
                    } else {
                        // 理论上 apiKeyElement 在步骤 5 成功后应该存在
                         console.error(`    ❌ 内部逻辑错误：步骤 5 成功但 apiKeyElement 为空? (尝试 ${keyAttempt + 1})`);
                    }

                    // 步骤 7: 强力关闭对话框
                     console.log("  [7/7] 强力关闭对话框...");
                     closeSuccess = await robustCloseDialog(); // 调用新的关闭函数
                     if (!closeSuccess) {
                         // 如果强力关闭都失败了，页面状态可能已混乱
                         console.error("    ❌ 无法确认对话框已关闭，为防止错误累积，将跳过此项目的剩余尝试！");
                         skipRemainingAttempts = true; // 设置跳过标志
                     }

                    // 同项目内尝试间隔 (仅在未被标记跳过时执行)
                    if (!skipRemainingAttempts) {
                       console.log(`  --- 尝试 ${keyAttempt + 1} 完成。等待 ${delayBetweenAttempts / 1000} 秒... ---`);
                       await delay(delayBetweenAttempts);
                    }

                } catch (error) {
                    // 处理步骤 1-4 或 步骤 7 中的其他意外错误
                     if (!skipRemainingAttempts) { // 仅在未标记跳过时处理
                        console.error(`  ❌ 在为项目 "${currentProjectName}" 尝试创建第 ${keyAttempt + 1} 个密钥时发生意外错误: ${error.message}`);
                        console.error("     尝试恢复...");
                        await robustCloseDialog(); // 出错后也尝试关闭可能残留的对话框
                        await delay(delayBetweenAttempts); // 出错后也等待
                     } else {
                         // 如果是因为之前的步骤（如等待密钥超时）标记了跳过，这里忽略关联错误
                         console.log(`   (已标记跳过 "${currentProjectName}" 的剩余尝试，忽略此错误)`);
                     }
                }
            } // 结束内层循环 (keyAttempt)

            // 内层循环结束后，打印项目处理总结
            if (skipRemainingAttempts) {
                 console.log(`===== 项目 "${currentProjectName}" 已跳过剩余尝试（可能已满或遇到错误）。=====`);
            } else {
                console.log(`===== 完成项目 "${currentProjectName}" 的所有 ${keysPerProjectTarget} 次尝试。=====`);
            }
            // 在切换到下一个项目前等待
            console.log(`等待 ${delayBetweenProjects / 1000} 秒后开始下一个项目...`);
            await delay(delayBetweenProjects);

        } // 结束外层循环 (projectIndex)

    } catch (error) {
        // 捕获主要流程中的严重错误 (例如初始获取项目列表失败)
         console.error(`❌ 自动化过程中发生严重错误，任务可能未完成: ${error.message}`);
         console.error("   错误详情:", error);
    } finally {
        // --- 最终总结 ---
        console.log("\n=================== 最终任务总结 ===================");
        let totalKeysGenerated = 0;
        // 打印按项目分类的详细总结 (可选)
        for (const projectName in generatedKeysSummary) {
            const keys = generatedKeysSummary[projectName];
            console.log(`\n项目: "${projectName}" (本次运行成功生成 ${keys.length} 个密钥):`);
            if (keys.length > 0) {
                // 打印该项目下的所有密钥
                keys.forEach((key, index) => console.log(`  ${index + 1}: ${key}`));
                totalKeysGenerated += keys.length;
            } else {
                console.log("  (本次运行未生成密钥)"); // 可能因为超时跳过或从未成功
            }
        }
        console.log(`\n本次运行总共成功生成密钥数量: ${totalKeysGenerated}`);
        console.log(`每个项目的目标尝试次数是: ${keysPerProjectTarget}`);
        console.log("====================================================");

        // --- 输出所有密钥到一个干净的代码块 ---
        if (allGeneratedKeys.length > 0) {
            console.log("\n--- 所有生成的 API 密钥 (复制下方块内文本) ---");
            // 构建多行字符串
            const formattedKeysArray = allGeneratedKeys.map(key => `${key},`); // 每行末尾加逗号
            const outputString = formattedKeysArray.join('\n'); // 用换行符连接
            // 一次性打印
            console.log(outputString);
            console.log("--- 密钥列表结束 ---");
        } else {
             console.log("\n本次运行未能生成任何密钥，无列表输出。");
        }
        // --- 输出结束 ---

        console.log("\n--- 自动化任务结束 ---");
    }
}

// 立即执行脚本
automateKeys5PerProjectWithComments();
