/**
 * 提取现有 Gemini API 密钥脚本 (浏览器控制台) - 最终修复 V4
 *
 * 功能：遍历页面上每个项目的【API密钥列】的缩写链接，点击展开，提取完整密钥，然后关闭。
 *       最后将所有成功获取的密钥输出到一个【干净的代码块】中，每行一个，逗号结尾。
 * 修复：
 *   - 修正了 finally 块中报告项目数量的 ReferenceError (使用 projectRows.length)。
 *   - 确保 projectRows 在 finally 块中可用。
 *   - 为最终输出添加 Markdown 代码块标记。
 *
 * !!! 警告：此脚本涉及多次点击和等待，请注意可能存在的速率限制 !!!
 *
 * 使用方法:
 * 1. 手动登录到 https://aistudio.google.com/apikey 页面。
 * 2. 确保页面已完全加载（可能需要向下滚动以加载所有项目）。
 * 3. 按 F12 打开开发者工具 -> Console。
 * 4. 【请确认】下面的 fullApiKeyDisplaySelector 和 closeRevealButtonSelector 是否正确。
 * 5. 复制【整个】代码。
 * 6. 粘贴到控制台并运行。
 * 7. 观察输出，最后复制密钥代码块。
 */
async function extractKeysFinalFixedV4() {
    console.clear();
    console.log("--- 开始提取现有 API 密钥 (最终修复 V4) ---");

    // --- 选择器 ---
    const projectRowSelector = "project-table div[role='rowgroup'].table-body > div[role='row'].table-row";
    const projectNameSelector = "div[role='cell'].project-cell > div:first-child";
    const truncatedKeyLinkSelector = "div[role='cell'].project-cell + div[role='cell'].key-cell a.apikey-link";
    const fullApiKeyDisplaySelector = "div.apikey-text"; // <--- !! 请再次确认 !!
    const closeRevealButtonSelector = "button[aria-label='关闭']"; // <--- !! 请再次确认 !!
    const elementToCheckAfterClose = fullApiKeyDisplaySelector;

    // --- 配置 ---
    const apiKeyWaitTimeout = 25000;
    const delayBetweenLinks = 1500; // 增加延迟以防速率限制或界面响应慢
    const closeDialogTimeout = 7000;

    // --- 结果存储 ---
    const keysByProject = {};
    const allGeneratedKeys = [];
    let totalKeysFound = 0;
    let hasCriticalError = false;
    let projectRows = []; // Declare here for access in finally block

    // --- 辅助函数 ---
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitForElement = async (selector, timeout = 15000, root = document, checkDisabled = true) => { const start = Date.now(); while (Date.now() - start < timeout) { let el=null; try { if(selector.includes(':contains')){ const m=selector.match(/:contains\(['"]([^'"]+)['"]\)/i); const b=selector.split(':')[0]; if(m&&m[1]){el=findButtonWithText(m[1],root,b);}else{el=root.querySelector(b);}}else{el=root.querySelector(selector);} } catch(e) { /* Ignore querySelector errors temporarily */ } let dis=checkDisabled?el?.disabled:false; if(el && el.offsetParent!==null && !dis){ const st=window.getComputedStyle(el); if(st&&st.display!=="none"&&st.visibility!=="hidden"&&parseFloat(st.opacity)>0) return el; } await delay(300); } const finalEl=root.querySelector(selector.split(':')[0]); if(finalEl){ let dis=checkDisabled?finalEl.disabled:false; if(!dis) return finalEl; else throw new Error(`元素 "${selector}" 找到但仍处于禁用状态 (checkDisabled=${checkDisabled})。`); } throw new Error(`元素 "${selector}" 等待超时 (${timeout}ms) 未找到或不可见/不可交互。`); };
    const findButtonWithText = (text, root = document, baseSelector = 'button') => { const buttons = root.querySelectorAll(baseSelector); const lowerText = text.toLowerCase(); for (const btn of buttons) { const ariaLabel = btn.getAttribute('aria-label'); if (ariaLabel && ariaLabel.toLowerCase().includes(lowerText)) return btn; if (btn.textContent && btn.textContent.trim().toLowerCase() === lowerText) return btn; } return null; };
    const robustCloseReveal = async (closeButtonSel, elementToCheckSel) => { console.log("    尝试关闭显示密钥的界面..."); let closed = false; let elementToCheck = null; try { elementToCheck = document.querySelector(elementToCheckSel); } catch(e){} if (!elementToCheck || elementToCheck.offsetParent === null || window.getComputedStyle(elementToCheck).display === 'none') { console.log("    目标元素似乎已关闭或不存在。"); return true; } const closeSelectors = Array.isArray(closeButtonSel) ? closeButtonSel : [closeButtonSel]; for (const selector of closeSelectors) { try { let buttonToClick = await waitForElement(selector, closeDialogTimeout, document, true); /* checkDisabled=true for button */ if (buttonToClick) { console.log(`      找到可用关闭按钮 (${selector})，尝试点击...`); buttonToClick.click(); await delay(1800); /* Slightly longer delay after close click */ let elementAfterClose = null; try{ elementAfterClose = document.querySelector(elementToCheckSel); }catch(e){} if (!elementAfterClose || elementAfterClose.offsetParent === null || window.getComputedStyle(elementAfterClose).display === 'none') { console.log("    ✅ 界面已成功关闭 (通过按钮)。"); closed = true; break; } else { console.warn(`      点击按钮 (${selector}) 后目标元素似乎仍然可见。`); } } } catch (error) { /* console.log(`      查找或点击关闭按钮 (${selector}) 失败: ${error.message}`); */ } if (closed) break; } if (!closed) { console.warn("    ⚠️ 未能通过按钮关闭，尝试点击页面 Body..."); try { document.body.click(); } catch(e) { console.error("Error clicking body:", e); } await delay(1200); let elementAfterBodyClick = null; try { elementAfterBodyClick = document.querySelector(elementToCheckSel); } catch(e){} if (!elementAfterBodyClick || elementAfterBodyClick.offsetParent === null || window.getComputedStyle(elementAfterBodyClick).display === 'none') { console.log("    ✅ 通过点击 Body 关闭了界面。"); closed = true; } else { console.error("    ❌ 强力关闭失败！显示密钥的元素可能仍然可见！"); } } return closed; };


     // --- 主要自动化逻辑 ---
    try {
        console.log(`使用项目行选择器: "${projectRowSelector}"`);
        projectRows = document.querySelectorAll(projectRowSelector); // Assign to the outer scope variable
        console.log(`找到 ${projectRows.length} 个项目行。`);

        if (projectRows.length === 0) {
            console.warn("未找到项目行，请确保页面已完全加载（尝试向下滚动页面）并再次检查 'projectRowSelector'。");
            return;
        }

        // 外层循环：遍历每个项目行
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
                 console.warn(`  获取项目 ${i+1} 名称时出错: ${nameError.message}`);
            }

            console.log(`\n===== 处理项目 ${i + 1}/${projectRows.length}: "${projectName}" =====`);
            keysByProject[projectName] = keysByProject[projectName] || []; // Initialize if project name repeats

            const truncatedLinks = row.querySelectorAll(truncatedKeyLinkSelector);
            console.log(`  找到 ${truncatedLinks.length} 个 API 密钥缩写链接。`);
            if (truncatedLinks.length === 0) {
                console.log("  跳过此项目 (未找到密钥链接)。");
                continue;
            }

            // 内层循环：遍历链接
            for (let j = 0; j < truncatedLinks.length; j++) {
                 if (hasCriticalError) {
                     console.log(`检测到严重错误，在项目 "${projectName}" 的链接 ${j+1} 处停止内部循环。`);
                     break;
                 }
                const link = truncatedLinks[j];
                console.log(`--- 处理密钥链接 ${j + 1}/${truncatedLinks.length} ---`);

                try {
                    // 1. 点击链接
                    console.log("  [1/4] 点击缩写链接...");
                    link.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(400); // Delay before click
                    link.click();
                    await delay(600); // Delay after click

                    // 2. 等待完整密钥元素
                    console.log(`  [2/4] 等待完整密钥元素出现 (${fullApiKeyDisplaySelector})...`);
                    let fullKeyElement;
                     try {
                        fullKeyElement = await waitForElement(fullApiKeyDisplaySelector, apiKeyWaitTimeout, document, false); // checkDisabled=false
                        console.log("    ✅ 完整密钥元素已找到。");
                     } catch(e) {
                         console.error(`    ❌ 等待完整密钥元素 (${fullApiKeyDisplaySelector}) 失败: ${e.message}`);
                         await robustCloseReveal(closeRevealButtonSelector, elementToCheckAfterClose);
                         continue; // Skip to next link
                     }

                    // 3. 提取密钥
                    console.log("  [3/4] 提取完整密钥...");
                    let apiKey = '';
                    if (fullKeyElement) {
                        if (fullKeyElement.tagName === 'INPUT') apiKey = fullKeyElement.value;
                        else if (fullKeyElement.textContent) apiKey = fullKeyElement.textContent;
                        else apiKey = fullKeyElement.innerText; // Fallback
                        apiKey = apiKey ? apiKey.trim() : '';

                        if (apiKey && apiKey.startsWith('AIza')) {
                            console.log(`    ✅ 提取成功: ${apiKey.substring(0, 10)}...`);
                            if (!keysByProject[projectName].includes(apiKey)) { // Avoid duplicates per project
                                keysByProject[projectName].push(apiKey);
                            }
                            if (!allGeneratedKeys.includes(apiKey)) { // Avoid global duplicates
                                allGeneratedKeys.push(apiKey);
                                totalKeysFound = allGeneratedKeys.length; // Update count based on unique keys added
                            } else {
                                console.log("      (密钥已存在于全局列表中)");
                            }
                        } else {
                            console.warn(`    ⚠️ 提取到的内容 "${apiKey}" 不像 API Key，已忽略。`);
                        }
                    } else {
                         console.warn("    ⚠️ 未能成功定位到 fullKeyElement 用于提取。");
                    }

                    // 4. 关闭界面
                     console.log("  [4/4] 关闭密钥显示界面...");
                     const closeSuccess = await robustCloseReveal(closeRevealButtonSelector, elementToCheckAfterClose);
                     if (!closeSuccess) {
                         console.error("    ❌ 无法可靠关闭显示密钥的界面！停止脚本。");
                         hasCriticalError = true;
                         break; // Stop inner loop
                     }
                     await delay(delayBetweenLinks); // Wait before processing next link

                } catch (innerError) {
                    console.error(`  ❌ 处理密钥链接 ${j + 1} 时发生意外错误: ${innerError.message}`);
                    console.error("     错误详情:", innerError);
                    console.error("     尝试恢复并关闭界面...");
                     try {
                         await robustCloseReveal(closeRevealButtonSelector, elementToCheckAfterClose);
                     } catch (closeError) {
                         console.error("      关闭界面时也发生错误:", closeError);
                         console.error("      !!! 严重错误，可能需要手动刷新页面，停止脚本 !!!");
                         hasCriticalError = true;
                         break; // Stop inner loop
                     }
                     await delay(500);
                     // Decide whether to continue to next link or stop entirely
                     // For now, let's continue to the next link in the same project
                     console.log("     尝试继续处理下一个链接...");
                }
            } // 结束内层循环 (链接)
        } // 结束外层循环 (项目行)

    } catch (outerError) {
         console.error(`❌ 自动化过程中发生严重外部错误: ${outerError.message}`);
         console.error("   错误详情:", outerError);
         hasCriticalError = true; // Ensure summary knows about failure
    } finally {
        // --- 最终总结 ---
        console.log("\n=================== 提取总结 ===================");
        console.log(`总共扫描处理了 ${projectRows.length} 个项目行。`); // Use the length of the NodeList stored earlier
        console.log(`总共成功提取了 ${totalKeysFound} 个唯一的 API 密钥。`);
        if (hasCriticalError) {
            console.warn("⚠️ 脚本在执行过程中遇到严重错误并提前停止，可能并非所有密钥都被提取。");
        } else {
            console.log("✅ 脚本已成功完成所有项目的扫描。");
        }
        console.log("=================================================");

        // --- 输出所有密钥到一个代码块 ---
        if (allGeneratedKeys.length > 0) {
            console.log("\n--- 所有提取到的唯一 API 密钥 (复制下方块内文本) ---");
            const outputString = allGeneratedKeys.map(key => `${key},`).join('\n');
            // Wrap in Markdown code block for easy copying
            console.log("```\n" + outputString + "\n```");
            console.log("--- 密钥列表结束 ---");
        } else {
             console.log("\n未能提取到任何 API 密钥。");
        }
        console.log("\n--- 提取任务结束 ---");
    }
}

// --- 立即执行 ---
extractKeysFinalFixedV4();
