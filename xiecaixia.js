// ==UserScript==
// @name         优采云批量发布-谢彩霞
// @namespace    http://ucaiyun.com/
// @version      2026-01-22
// @description  将一篇文章批量发布到多个平台!
// @author       an
// @match        *://www.ucaiyun.com/caiji/articles_edit/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {

    //1.初始化变量
    let isProcessing = false; // 标记是否正在执行发布流程
    const DEBOUNCE_LOCK_TIME = 3000; // 防抖锁定时间（3秒）
    const souhu_one='a50v3i.mp';
    const souhu_two='aq469z.mp';
    const souhu_one_name='搜狐号(A)';
    const souhu_two_name='搜狐号(B)';
    const site=[
        {tip:'dev',name:'(A)百家号',domain:'v0iqn9.mp',siteid:201834,article_id:27461429,attach_access_key:'f300a34b8a477608f7e445e3fa26403f'},
        {tip:'dev',name:'(A)知乎号',domain:'vl8ysg.mp',siteid:201836,article_id:27461433,attach_access_key:'78f3e3fd5780012c3b25271e8ca97f89'},
        {tip:'dev',name:'(A)头条号',domain:'1t6j7l.mp',siteid:201835,article_id:27461434,attach_access_key:'e66ff150bff8ebe883d44b3a8506f2ac'},
    ];

    const site_kang=[
        {tip:'dev',name:'(B)百家号',domain:'fdbe72.mp',siteid:202129,article_id:27491289,attach_access_key:'9060e5f4a7c0587a38fcb527fa71014b'},
        {tip:'dev',name:'(B)知乎号',domain:'dw196g.mp',siteid:202131,article_id:27491323,attach_access_key:'4aad958aa3213f2f622213d95f22b29f'},
        {tip:'dev',name:'(B)头条号',domain:'k0hj9f.mp',siteid:202130,article_id:27491288,attach_access_key:'fd58f6d4484af97ce94e55a491d09467'},
    ];

    let dynamicSiteList = [];

    // 配置项（可根据需求调整）
    const CONFIG = {
        STATUS_CHECK_INTERVAL: 2000, // 状态查询间隔（毫秒）
        STATUS_MAX_RETRY: 30,        // 最大重试次数（避免无限循环）
        PUSH_DELAY: 1000,            // 推送后首次查状态的延迟
        SITE_DELAY: 1000,             // 站点间处理延迟
        SAVE_DELAY: 1000,
        // article_id获取接口配置
        ARTICLE_ID_API: {
            type: -1,
            status: -1,
            page: 1
        }
    };

    GM_addStyle(`
    /* 定义居中按钮的类 */
    .center {
        display: block;
        margin: 10px auto 0; /* 上10px，左右自动，下0 */
        width: 200px;        /* 可选：固定宽度 */
        text-align: center;  /* 可选：按钮内部文字居中 */
    }
`);

function createButLi() {
    // 2. 创建发布按钮
    const but = document.createElement('div');
    but.id = 'publish_other';
    //viewer.style.display = 'none';
    but.innerHTML = `
        <a class="btn btn-normal btn-warning publish-submit" style="width:180px">[${souhu_one_name}]同步其他平台</a>
    `;
    const fotter=document.getElementsByClassName('test')[0];
    fotter.classList.add('center');
    fotter.appendChild(but);
    document.getElementById('publish_other').addEventListener('click', async() => {
        // 1. 检查是否正在执行，防止重复触发
            if (isProcessing) {
                logRequest('⚠️ 发布流程正在执行中，请勿重复点击！', true);
                but.style.background = '#e74c3c';
                but.textContent = '执行中...';
                return;
            }

            // 2. 加锁 + 按钮状态更新
            isProcessing = true;
            but.disabled = true;
            but.style.background = '#95a5a6';
            but.textContent = '执行中...';

            // 3. 执行发布流程
            try {
                // 第一步：批量获取所有站点的article_id
                await fetchAllArticleIds(site);
                await loopRequestAllSites();
            } catch (error) {
                logRequest(`❌ 发布流程异常：${error}`, true);
            } finally {
                // 4. 解锁 + 按钮状态恢复（加防抖延迟，避免快速重复点击）
                setTimeout(() => {
                    isProcessing = false;
                    but.disabled = false;
                    but.style.background = '#42b983';
                    but.textContent = `[${souhu_one_name}]同步其他平台`;
                    logRequest(`✅ 防抖锁已释放（${DEBOUNCE_LOCK_TIME/1000}秒后可再次触发）`);
                }, DEBOUNCE_LOCK_TIME);
            }
    });
}

function createButKang() {
    // 2. 创建发布按钮
    const but = document.createElement('div');
    but.id = 'kpublish_other';
    //viewer.style.display = 'none';
    but.innerHTML = `
        <a class="btn btn-normal btn-danger publish-submit" style="width:180px;margin-top:10px;">[${souhu_two_name}]同步其他平台</a>
    `;
    const fotter=document.getElementsByClassName('test')[0];
    fotter.classList.add('center');
    fotter.appendChild(but);
    document.getElementById('kpublish_other').addEventListener('click', async() => {
        // 1. 检查是否正在执行，防止重复触发
            if (isProcessing) {
                logRequest('⚠️ 发布流程正在执行中，请勿重复点击！', true);
                but.style.background = '#e74c3c';
                but.textContent = '执行中...';
                return;
            }

            // 2. 加锁 + 按钮状态更新
            isProcessing = true;
            but.disabled = true;
            but.style.background = '#95a5a6';
            but.textContent = '执行中...';

            // 3. 执行发布流程
            try {
                // 第一步：批量获取所有站点的article_id
                await fetchAllArticleIds(site_kang);
                await loopRequestAllSites();
            } catch (error) {
                logRequest(`❌ 发布流程异常：${error}`, true);
            } finally {
                // 4. 解锁 + 按钮状态恢复（加防抖延迟，避免快速重复点击）
                setTimeout(() => {
                    isProcessing = false;
                    but.disabled = false;
                    but.style.background = '#42b983';
                    but.textContent = `[${souhu_two_name}]同步其他平台`;
                    logRequest(`✅ 防抖锁已释放（${DEBOUNCE_LOCK_TIME/1000}秒后可再次触发）`);
                }, DEBOUNCE_LOCK_TIME);
            }
    });
}


 // 3. 创建请求日志展示面板（方便查看请求结果）
     function createLogPanel() {
        // 面板容器（可拖动）
        const panelContainer = document.createElement('div');
        panelContainer.id = 'logPanelContainer';
        panelContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 650px;
            max-height: 80vh;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.2);
            z-index: 999999;
            overflow: hidden;
            resize: both; /* 支持手动调整大小 */
            min-width: 300px;
            min-height: 100px;
        `;

        // 面板头部（可拖动的标题栏）
        const panelHeader = document.createElement('div');
        panelHeader.style.cssText = `
            padding: 8px 15px;
            background: #2c3e50;
            color: #fff;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        panelHeader.innerHTML = `
            <span>接口请求日志（保存→推送→查状态）</span>
            <button id="collapseBtn" style="background: transparent; border: none; color: #fff; cursor: pointer; font-size: 16px;">−</button>
        `;

        // 面板内容区（日志展示，可折叠）
        const panelContent = document.createElement('div');
        panelContent.id = 'logPanelContent';
        panelContent.style.cssText = `
            padding: 15px;
            max-height: calc(80vh - 40px);
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            transition: max-height 0.3s ease;
        `;
        panelContent.innerHTML = '<div id="logContent"></div>';

        // 组装面板
        panelContainer.appendChild(panelHeader);
        panelContainer.appendChild(panelContent);
        document.body.appendChild(panelContainer);

        // ------------------------------ 折叠功能实现 ------------------------------
        const collapseBtn = document.getElementById('collapseBtn');
        let isCollapsed = false;
        collapseBtn.addEventListener('click', () => {
            if (isCollapsed) {
                // 展开
                panelContent.style.maxHeight = 'calc(80vh - 40px)';
                panelContent.style.padding = '15px';
                collapseBtn.textContent = '−';
                panelContainer.style.minHeight = '100px';
            } else {
                // 折叠
                panelContent.style.maxHeight = '0';
                panelContent.style.padding = '0 15px';
                collapseBtn.textContent = '+';
                panelContainer.style.minHeight = '40px';
            }
            isCollapsed = !isCollapsed;
        });

        // ------------------------------ 拖动功能实现 ------------------------------
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        // 鼠标按下时记录初始位置
        panelHeader.addEventListener('mousedown', (e) => {
            isDragging = true;
            // 获取面板当前位置
            const rect = panelContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            // 获取鼠标初始位置
            startX = e.clientX;
            startY = e.clientY;
            // 防止拖动时选中文字
            e.preventDefault();
            // 添加拖动状态样式
            panelHeader.style.background = '#34495e';
        });

        // 鼠标移动时更新面板位置
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            // 计算偏移量
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            // 更新面板位置
            panelContainer.style.left = `${startLeft + dx}px`;
            panelContainer.style.top = `${startTop + dy}px`;
        });

        // 鼠标松开时结束拖动
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panelHeader.style.background = '#2c3e50';
            }
        });

        // ------------------------------ 日志输出函数 ------------------------------
        window.logRequest = function(message, isError = false) {
            const logContent = document.getElementById('logContent');
            const logItem = document.createElement('div');
            logItem.style.cssText = `
                margin: 4px 0;
                padding: 4px;
                border-bottom: 1px dashed #eee;
                color: ${isError ? '#e74c3c' : isError === null ? '#f39c12' : '#2c3e50'};
                word-break: break-all; /* 自动换行，避免超长日志溢出 */
            `;
            logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logContent.appendChild(logItem);
            // 始终滚动到最新日志（折叠时不执行）
            if (!isCollapsed) {
                logContent.scrollTop = logContent.scrollHeight;
            }
        };
    }

    // 4. 通用请求函数（支持GET/POST）
    function sendRequest(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: options.url,
                headers: options.headers || {},
                data: options.data || '',
                timeout: 15000,
                // POST表单数据需设置contentType
                contentType: options.contentType || (options.method === 'POST' ? 'multipart/form-data' : 'application/x-www-form-urlencoded'),
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve({
                            success: true,
                            data: response.responseText,
                            statusCode: response.status
                        });
                    } else {
                        reject(`状态码${response.status}，响应：${response.responseText.substring(0, 100)}`);
                    }
                },
                onerror: function(error) {
                    reject(`网络错误：${error.message || '未知错误'}`);
                },
                ontimeout: function() {
                    reject('请求超时（15秒）');
                }
            });
        });
    }

    // 6. 新增：获取单个站点的article_id
    async function fetchArticleId(siteItem) {
        // 构建article_id获取接口URL
        const url = `https://www.ucaiyun.com/caiji/ajax/articles/?domain=${siteItem.domain}&type=${CONFIG.ARTICLE_ID_API.type}&status=${CONFIG.ARTICLE_ID_API.status}&page=${CONFIG.ARTICLE_ID_API.page}`;
        logRequest(`【${siteItem.name}】获取article_id：${url}`);

        try {
            const result = await sendRequest({
                method: 'GET',
                url: url
            });

            // 解析响应JSON
            const respJson = JSON.parse(result.data);
            if (respJson.errno !== 0) {
                logRequest(`接口返回错误：${respJson.err || '未知错误'}`);
                return null;
            }

            // 提取articles列表中的第一个id（可根据业务调整筛选逻辑）
            const articles = respJson.rsm?.articles || [];
            if (articles.length === 0) {
                logRequest(`【${siteItem.name}】未获取到article_id：无文章数据`, true);
                return null;
            }

            // 取第一个文章的id作为当前站点的article_id
            const articleId = articles[0].id;
            logRequest(`【${siteItem.name}】成功获取article_id：${articleId}`);

            // 合并基础配置和动态获取的article_id
            return {
                ...siteItem,
                article_id: articleId
            };
        } catch (error) {
            logRequest(`【${siteItem.name}】获取article_id失败：${error}`, true);
            return null;
        }
    }

    // 7. 新增：批量获取所有站点的article_id
    async function fetchAllArticleIds(_site) {
        logRequest('========== 开始批量获取所有站点的article_id ==========');
        dynamicSiteList = []; // 清空旧数据

        for (const siteItem of _site) {
            if (!isProcessing) {
                logRequest('⚠️ 获取article_id流程被终止', true);
                break;
            }

            // 获取当前站点的article_id
            const dynamicSite = await fetchArticleId(siteItem);
            if (dynamicSite) {
                dynamicSiteList.push(dynamicSite);
            }

            // 站点间延迟，避免接口限流
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (dynamicSiteList.length === 0) {
            throw new Error('所有站点均未获取到有效的article_id，终止流程');
        }

        logRequest(`========== 批量获取完成，有效站点数：${dynamicSiteList.length} ==========`);
    }

     // 5. 文章保存接口（新增核心功能）
    async function requestSaveApi(siteItem,save_data) {
        // 校验保存所需参数
        const requiredFields = ['arc_title', 'arc_body'];
        const missingFields = requiredFields.filter(field => !save_data[field]);
        if (missingFields.length > 0) {
            const msg = `【${siteItem.name}】跳过保存：缺少参数${missingFields.join(', ')}`;
            logRequest(msg);
            return false;
        }

        const url = 'https://www.ucaiyun.com/caiji/ajax/articles_save/';
        logRequest(`【${siteItem.name}】发起保存请求：${url}`);

        // 构建Form表单数据（模拟curl的--form参数）
        const formData = new FormData();
        formData.append('attach_access_key', siteItem.attach_access_key);
        formData.append('article_id', siteItem.article_id);
        formData.append('siteid', siteItem.siteid);
        formData.append('arc_title', save_data.arc_title);
        formData.append('arc_keywords', save_data.arc_keywords || '');
        formData.append('arc_description', save_data.arc_description || '');
        formData.append('arc_tags', '');
        formData.append('typeid', '1');
        formData.append('arc_body', save_data.arc_body);
        formData.append('arcrank', '1');
        formData.append('_post_type', 'ajax');

        try {
            const result = await sendRequest({
                method: 'POST',
                url: url,
                data: formData,
                contentType: 'multipart/form-data' // 表单提交格式
            });
            logRequest(`【${siteItem.name}】保存请求成功，响应：${result.data}`);
            const respData = result.data;
            const jsonData = JSON.parse(respData);
            return jsonData.errno>=0;
        } catch (error) {
            logRequest(`【${siteItem.name}】保存请求失败：${error}`, true);
            return false;
        }
    }

    // 5. 推送接口请求
    async function requestPushApi(siteItem) {
        const url = `https://www.ucaiyun.com/caiji/ajax/articles_push/?siteid=${siteItem.siteid}&article_id=${siteItem.article_id}`;
        logRequest(`【${siteItem.name}】发起推送请求：${url}`);

        try {
            const result = await sendRequest({
                method: 'GET',
                url: url
            });
            logRequest(`【${siteItem.name}】推送请求成功`);
            const respData = result.data;
            try {
                const jsonData = JSON.parse(respData);
                siteItem.article_id=jsonData.rsm.push_task_id;
                return true;
            } catch (e)
            {
                 // 解析JSON失败，使用原始文本
                 logRequest(`【${siteItem.name}】状态响应非JSON格式:${e}`, null);
                 return false;
            }
        } catch (error) {
            logRequest(`【${siteItem.name}】推送请求失败：${error}`, true);
            return false;
        }
    }

    // 6. 循环查询发布状态（核心逻辑:精准解析JSON）
    async function waitForPublishStatus(siteItem) {
        let retryCount = 0;
        const url = `https://www.ucaiyun.com/caiji/ajax/check_task_push_status/?siteid=${siteItem.siteid}&push_task_id=${siteItem.article_id}`;

        // 循环查询直到得到明确结果或达到最大重试次数
        while (retryCount < CONFIG.STATUS_MAX_RETRY) {
            retryCount++;
            logRequest(`【${siteItem.name}】查询发布状态（第${retryCount}次）`, null); // 黄色日志标记查询中

            try {
                //const result = await sendGetRequest(url, siteItem.name, '状态查询');
                 const result = await sendRequest({
                    method: 'GET',
                    url: url
                });
                const respData = result.data;

                // 核心修正：解析JSON并提取err字段
                let errMsg = '';
                try {
                    const jsonData = JSON.parse(respData);
                    errMsg = jsonData.err || ''; // 提取err字段内容
                    logRequest(`【${siteItem.name}】解析到err字段：${errMsg.replace(/<[^>]+>/g, '').replace('hightlight()','')}`); // 去除HTML标签后展示
                } catch (e) {
                    // 解析JSON失败，使用原始文本
                    errMsg = respData;
                    logRequest(`【${siteItem.name}】状态响应非JSON格式`, null);
                }

                // 精准判断发布状态（匹配核心关键词，忽略HTML标签）
                if (errMsg.includes('发布成功')) {
                    logRequest(`【${siteItem.name}】发布状态确认：✅ 发布成功`);
                    return 'success';
                } else if (errMsg.includes('发布失败')) {
                    logRequest(`【${siteItem.name}】发布状态确认：❌ 发布失败`, true);
                    return 'failed';
                } else if (errMsg.includes('发布中')) {
                    // 明确识别"发布中"，继续重试
                    logRequest(`【${siteItem.name}】发布状态：🔄 发布中，${CONFIG.STATUS_CHECK_INTERVAL/1000}秒后重试`, null);
                    await new Promise(resolve => setTimeout(resolve, CONFIG.STATUS_CHECK_INTERVAL));
                } else {
                    // 其他未明确状态，继续重试
                    logRequest(`【${siteItem.name}】发布状态未明确（err字段：${errMsg.replace(/<[^>]+>/g, '')}），${CONFIG.STATUS_CHECK_INTERVAL/1000}秒后重试`, null);
                    await new Promise(resolve => setTimeout(resolve, CONFIG.STATUS_CHECK_INTERVAL));
                }
            } catch (error) {
                logRequest(`【${siteItem.name}】状态查询失败：${error}，${CONFIG.STATUS_CHECK_INTERVAL/1000}秒后重试`, true);
                await new Promise(resolve => setTimeout(resolve, CONFIG.STATUS_CHECK_INTERVAL));
            }
        }

        // 达到最大重试次数
        logRequest(`【${siteItem.name}】发布状态查询超时（已重试${CONFIG.STATUS_MAX_RETRY}次）`, true);
        return 'timeout';
    }

    // 7. 单个站点完整处理流程
    async function processSingleSite(siteItem,save_data) {
        // 跳过缺少必要参数的站点
        if (!siteItem.article_id) {
            logRequest(`跳过【${siteItem.name}】：缺少article_id参数`);
            return;
        }

        logRequest(`------------------------------ 开始处理【${siteItem.name}】 ------------------------------`);

        // 第一步：执行保存请求
        const saveSuccess = await requestSaveApi(siteItem,save_data);
        if (!saveSuccess) {
            logRequest(`【${siteItem.name}】保存失败，跳过后续流程`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.SITE_DELAY));
            return;
        }

        // 保存成功后延迟，再执行推送
        await new Promise(resolve => setTimeout(resolve, CONFIG.SAVE_DELAY));

        // 第二步：发起推送请求
        const pushSuccess = await requestPushApi(siteItem);
        if (!pushSuccess) {
            logRequest(`【${siteItem.name}】推送失败，跳过状态查询`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.SITE_DELAY));
            return;
        }

        // 推送成功后，延迟再查状态
        await new Promise(resolve => setTimeout(resolve, CONFIG.PUSH_DELAY));

        // 第三步：循环查询状态直到得到明确结果
        await waitForPublishStatus(siteItem);

        // 第四步：处理完成后延迟，再处理下一个站点
        await new Promise(resolve => setTimeout(resolve, CONFIG.SITE_DELAY));

        logRequest(`------------------------------ 结束处理【${siteItem.name}】 ------------------------------`);
    }

     // 8. 主函数：循环处理所有站点
    async function loopRequestAllSites() {
        logRequest('========== 开始处理所有站点 （保存→推送→查状态）==========');

        let title=document.getElementsByName('arc_title')[0].value;
        let content=document.getElementsByClassName('ck-restricted-editing_mode_standard')[0].innerHTML;
        let keyword=document.getElementsByName('arc_keywords')[0].value;
        let description=document.getElementsByName('arc_description')[0].value;
        let save_data={arc_title:title,arc_body:content,arc_keywords:keyword,arc_description:description};


        for (const siteItem of dynamicSiteList) {
             if (!isProcessing) {
                logRequest('⚠️ 发布流程已被终止', true);
                break;
            }
            await processSingleSite(siteItem,save_data);
        }

        logRequest('========== 所有站点处理完成 ==========');
    }

    // 9. 初始化执行
  if(document.getElementsByClassName('aw-caiji-setting')[0].innerHTML.indexOf(souhu_one)>0)
   {
       createButLi();
       createLogPanel();
    }
    if(document.getElementsByClassName('aw-caiji-setting')[0].innerHTML.indexOf(souhu_two)>0)
    {
        createButKang();
        createLogPanel();
    }


})();
