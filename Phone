// ==UserScript==
// @name         AI Studio 多功能脚本合集（更新版）
// @namespace    http://tampermonkey.net/
// @version      1.4.5
// @description  此脚本整合了三个主要功能：项目创建、API KEY 自动生成、API KEY 提取。生成/提取完 API KEY 后自动复制到剪贴板；若失败则弹出 textarea 兜底，手机浏览器也可一键长按复制。
// @author       YourName
// @match        *://*.console.cloud.google.com/*
// @match        *://*.aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    /********** 公共工具 **********/
    const delay = ms => new Promise(r => setTimeout(r, ms));
    async function waitForElement(sel, timeout = 15000, root = document, checkDisabled = true) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            let el;
            try { el = root.querySelector(sel); } catch {}
            if (el && el.offsetParent !== null) {
                const st = getComputedStyle(el);
                if (st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0 && (!checkDisabled || !el.disabled)) {
                    return el;
                }
            }
            await delay(250);
        }
        throw new Error(`等待元素 "${sel}" 超时 (${timeout}ms)`);
    }
    async function waitForElements(sel, min = 1, timeout = 20000, root = document) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const list = root.querySelectorAll(sel);
            if (list.length >= min && list[0].offsetParent !== null) return list;
            await delay(300);
        }
        throw new Error(`超时：等待至少 ${min} 个元素 "${sel}"`);
    }

    /********** 1. 项目创建流程 **********/
    async function runProjectCreation() {
        if (!/console\.cloud\.google\.com/.test(location.host)) {
            location.href = "https://console.cloud.google.com";
            return;
        }
        const TARGET = 5, BETWEEN = 5000, MAXR = 5, RK = 'aiStudioAutoRefreshCountSilentColorOpt';
        let success = 0, refreshCount = +GM_getValue(RK, '0');

        async function checkLimit() {
            try {
                if (document.querySelector('a#p6ntest-quota-submit-button')) return true;
                const texts = [...document.querySelectorAll('mat-dialog-content p, mat-dialog-content div, mat-dialog-container p, mat-dialog-container div')];
                if (texts.some(el => /quota (limit|has been reached|creation limit)/i.test(el.textContent))) return true;
            } catch {}
            return false;
        }
        async function tryCloseDialog() {
            const sels = ['button[aria-label="Close dialog"]','button[aria-label="关闭"]','mat-dialog-actions button:nth-child(1)','button.cancel-button','button:contains("Cancel")','button:contains("取消")'];
            for (let sel of sels) {
                let btn = null;
                if (sel.includes(':contains')) {
                    const txt = sel.match(/:contains\(["']?([^"']+)/)?.[1]?.toLowerCase();
                    if (txt) btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === txt);
                } else {
                    btn = document.querySelector(sel);
                }
                if (btn && btn.offsetParent !== null) { btn.click(); await delay(700); return; }
            }
        }
        async function createOnce() {
            try {
                if (await checkLimit()) return { limitReached: true };
                (await waitForElement('button.mdc-button.mat-mdc-button span.cfc-switcher-button-label-text')).click();
                await delay(2000);
                if (await checkLimit()) { await tryCloseDialog(); return { limitReached: true }; }
                (await waitForElement('button.purview-picker-create-project-button')).click();
                await delay(2500);
                if (await checkLimit()) { await tryCloseDialog(); return { limitReached: true }; }
                (await waitForElement('button.projtest-create-form-submit',20000)).click();
                return { limitReached: false };
            } catch (e) {
                await tryCloseDialog();
                if (refreshCount < MAXR) {
                    GM_setValue(RK, ++refreshCount + '');
                    location.reload();
                    return { refreshed: true };
                }
                throw e;
            }
        }

        for (let i = 1; i <= TARGET; i++) {
            const res = await createOnce();
            if (res.limitReached) break;
            if (res.refreshed) return;
            success++;
            if (i < TARGET) await delay(BETWEEN);
        }
        GM_setValue(RK, '0');
    }

    /********** 2. API KEY 自动生成 **********/
    async function runApiKeyCreation() {
        const mainBtnSel = "button.create-api-key-button",
              dialogSel  = "mat-dialog-content",
              projInput  = "input#project-name-input",
              optionSel  = "mat-option.mat-mdc-option",
              nameInOpt  = ".gmat-body-medium",
              dialogCreateSel = "mat-dialog-content button.create-api-key-button",
              keyDisplaySel   = "div.apikey-text";
        const summary = {}, allKeys = [];

        async function waitEl(sel,t=20000,root=document,chk=true) {
            const start = Date.now();
            while (Date.now()-start < t) {
                let el=null;
                try { el = root.querySelector(sel); } catch {}
                if (el && el.offsetParent!==null && (!chk||!el.disabled)) {
                    const st = getComputedStyle(el);
                    if (st.display!=='none'&&st.visibility!=='hidden'&&+st.opacity>0) return el;
                }
                await delay(300);
            }
            throw new Error(`元素 "${sel}" 等待超时`);
        }
        async function closeDialog() {
            const sels = ["button[aria-label='关闭']","button.close-button","button:contains('Done')","button:contains('完成')","button:contains('Close')","mat-dialog-actions button:last-child"];
            for (let sel of sels) {
                try {
                    let btn = await waitEl(sel,3000,document,false);
                    btn.click(); await delay(1000);
                    if (!document.querySelector("mat-dialog-container")) return;
                } catch {}
            }
            document.body.click();
            await delay(1000);
        }

        // 取项目列表
        let projectCount = 0, projectInfo = [];
        try {
            const btn0 = await waitEl(mainBtnSel);
            btn0.click();
            const d0 = await waitEl(dialogSel);
            const inp0 = await waitEl(projInput,15000,d0);
            inp0.click(); await delay(2000);
            const opts0 = await waitForElements(optionSel,1,20000,document);
            projectCount = opts0.length;
            projectInfo = Array.from(opts0).map((o,i) => {
                let name = `项目 ${i+1}`;
                const el = o.querySelector(nameInOpt);
                if (el?.textContent) name = el.textContent.trim();
                return { name };
            });
            await closeDialog();
        } catch (e) {
            console.error("获取项目列表失败", e);
            return;
        }
        if (!projectCount) return;

        // 每个项目生成 key
        for (let pi = 0; pi < projectCount; pi++) {
            const projName = projectInfo[pi].name;
            summary[projName] = [];
            for (let ki = 0; ki < 1; ki++) {
                try {
                    (await waitEl(mainBtnSel)).click();
                    await delay(500);
                    const dlg1 = await waitEl(dialogSel);
                    (await waitEl(projInput,15000,dlg1)).click();
                    await delay(2000);
                    const opts1 = await waitForElements(optionSel, projectCount, 20000, document);
                    opts1[pi].click();
                    opts1[pi].dispatchEvent(new Event('change',{bubbles:true}));
                    await delay(1500);
                    (await waitEl(dialogCreateSel,10000,dlg1,false)).click();
                    const keyEl = await waitForElement(keyDisplaySel,25000,document,false);
                    let key = keyEl.textContent?.trim()||keyEl.value||'';
                    summary[projName].push(key);
                    allKeys.push(key);
                    await closeDialog();
                    await delay(2500);
                } catch (e) {
                    console.error(`项目"${projName}"第${ki+1}次生成失败`, e);
                    await closeDialog();
                }
            }
            await delay(4000);
        }

        // 复制或弹出
        if (allKeys.length) {
            const text = allKeys.join(',\n');
            try {
                GM_setClipboard(text, 'text');
                alert(`已复制 ${allKeys.length} 个 API KEY 到剪贴板`);
            } catch {
                const ta = document.createElement('textarea');
                Object.assign(ta.style, {position:'fixed',top:'10%',left:'5%',width:'90%',height:'80%',zIndex:10000,fontSize:'14px'});
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                alert('剪贴板写入被拦截，已在页面弹出所有 KEY，请手动复制');
            }
        }
    }

    /********** 3. 提取现有 API KEY **********/
    async function runExtractKeys() {
        console.clear();
        const rowSel       = "project-table div[role='rowgroup'].table-body > div[role='row'].table-row",
              nameCell     = "div[role='cell'].project-cell > div:first-child",
              linkSel      = "div[role='cell'].project-cell + div[role='cell'].key-cell a.apikey-link",
              fullKeySel   = "div.apikey-text";
        const allKeys = [], byProj = {};

        async function waitLocal(sel,t=15000) {
            const start = Date.now();
            while (Date.now()-start < t) {
                const el = document.querySelector(sel);
                if (el?.offsetParent!==null && getComputedStyle(el).display!=='none') return el;
                await delay(300);
            }
            throw new Error(`等待 "${sel}" 超时`);
        }
        async function closeReveal() {
            const sels = ["button[aria-label='关闭']"];
            for (let sel of sels) {
                try {
                    let b = await waitLocal(sel,5000);
                    b.click(); await delay(1200);
                    if (!document.querySelector(fullKeySel)) return;
                } catch {}
            }
            document.body.click(); await delay(1200);
        }

        const rows = document.querySelectorAll(rowSel);
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let pname = `项目 ${i+1}`;
            const nmEl = row.querySelector(nameCell);
            if (nmEl?.textContent) pname = nmEl.textContent.trim();
            byProj[pname] = [];
            const links = row.querySelectorAll(linkSel);
            for (let j = 0; j < links.length; j++) {
                try {
                    links[j].click(); await delay(600);
                    const full = await waitLocal(fullKeySel,25000);
                    let key = full.textContent?.trim()||full.value||'';
                    if (key && !allKeys.includes(key)) {
                        allKeys.push(key);
                        byProj[pname].push(key);
                    }
                    await closeReveal(); await delay(1500);
                } catch (e) {
                    console.error(`提取 ${pname} 的第${j+1}个 key 失败`, e);
                    try { await closeReveal(); } catch {}
                }
            }
        }

        if (allKeys.length) {
            const text = allKeys.join(',\n');
            try {
                GM_setClipboard(text,'text');
                alert(`已复制 ${allKeys.length} 个 API KEY 到剪贴板`);
            } catch {
                const ta = document.createElement('textarea');
                Object.assign(ta.style, {position:'fixed',top:'10%',left:'5%',width:'90%',height:'80%',zIndex:10000,fontSize:'14px'});
                ta.value = text; document.body.appendChild(ta); ta.select();
                alert('剪贴板写入被拦截，已在页面弹出所有 KEY，请手动复制');
            }
        }
    }

    /********** 入口 & 按钮 **********/
    async function createAndFetch() {
        if (/console\.cloud\.google\.com/.test(location.host)) {
            await runProjectCreation();
            GM_setValue("projectsCreated", true);
            location.href = "https://aistudio.google.com/apikey";
        } else {
            await runApiKeyCreation();
        }
    }
    if (/aistudio\.google\.com/.test(location.host) && GM_getValue("projectsCreated",false)) {
        GM_setValue("projectsCreated", false);
        delay(1000).then(runApiKeyCreation);
    }

    function initButtons() {
        if (document.getElementById('ai-floating-buttons')) return;
        const c = document.createElement('div');
        c.id = 'ai-floating-buttons';
        Object.assign(c.style, {position:'fixed',top:'10px',right:'10px',zIndex:9999,display:'flex',flexDirection:'column',gap:'5px',background:'rgba(255,255,255,0.9)',padding:'5px',borderRadius:'4px',boxShadow:'0 2px 4px rgba(0,0,0,0.2)'});
        const btn1 = document.createElement('button'), btn2 = document.createElement('button');
        btn1.textContent='创建项目并获取API KEY'; btn2.textContent='提取API KEY';
        [btn1,btn2].forEach(b=>{
            Object.assign(b.style,{padding:'5px 10px',fontSize:'14px',cursor:'pointer'});
            c.appendChild(b);
        });
        document.body.appendChild(c);

        btn1.onclick = async ()=>{
            if (!/console\.cloud\.google\.com/.test(location.host)) { location.href="https://console.cloud.google.com"; return; }
            btn1.disabled=true; btn1.textContent='运行中...';
            try { await createAndFetch(); btn1.textContent='完成'; }
            catch(e){ console.error(e); btn1.textContent='错误'; }
            setTimeout(()=>{btn1.disabled=false;btn1.textContent='创建项目并获取API KEY';},3000);
        };
        btn2.onclick = async ()=>{
            if (!/aistudio\.google\.com/.test(location.host)) { location.href="https://aistudio.google.com/apikey"; return; }
            btn2.disabled=true; btn2.textContent='运行中...';
            try { await runExtractKeys(); btn2.textContent='完成'; }
            catch(e){ console.error(e); btn2.textContent='错误'; }
            setTimeout(()=>{btn2.disabled=false;btn2.textContent='提取API KEY';},3000);
        };
    }

    new MutationObserver(initButtons).observe(document,{childList:true,subtree:true});
    window.addEventListener('DOMContentLoaded',initButtons);
    window.addEventListener('load',initButtons);
    setInterval(initButtons,1000);

    // SPA 路由监听
    (()=>{
        const wrap=(t)=>{
            const orig=history[t];
            history[t]=function(){
                const rv=orig.apply(this,arguments);
                window.dispatchEvent(new Event(t));
                window.dispatchEvent(new Event('locationchange'));
                return rv;
            };
        };
        wrap('pushState'); wrap('replaceState');
        window.addEventListener('popstate',()=>window.dispatchEvent(new Event('locationchange')));
    })();
    window.addEventListener('locationchange',initButtons);

    // 初始挂载
    delay(3000).then(initButtons);

})();
