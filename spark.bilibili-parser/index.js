const bilibiliService = require('./bilibiliService');
const msgbuilder = require('../../handles/msgbuilder'); 
const logger = spark.getLogger()
logger.info('=B站自动解析插件(全能版)=插件已成功加载，支持长/短链接及小程序卡片！');


function reBuildRawMessage(message) {
    return message
        .filter(item => item.type === 'text')
        .map(item => item.data.text)
        .join('');
}

spark.on('message.group.normal', async (e, reply) => {
    // console.log(spark.env.get("main_group") == e.group_id)
    if (e.group_id !== spark.env.get("main_group")) return;
    // console.log(e.message)
    // console.log(e.message[0].data.text)
    // Bilibili在QQ小程序中的固定AppID，用于精确识别
    const BILI_APP_ID = '1109937557';
    let link = null;


    // --- 步骤1: 优先检查并解析JSON小程序卡片 ---
    for (const segment of e.message) {
        if (segment.type === 'json') {
            try {
                // 解析内嵌的JSON字符串
                const jsonContent = JSON.parse(segment.data.data);
                
                // 通过appid精确判断是否为B站分享卡片，避免误判其他小程序
                if (jsonContent?.meta?.detail_1?.appid === BILI_APP_ID) {
                    // 从深层结构中提取出包含b23.tv链接的字段
                    link = jsonContent.meta.detail_1.qqdocurl;
                    if (link) {
                        break; // 成功找到链接，跳出循环
                    }
                }
            } catch (jsonError) {
                // 如果JSON解析失败，说明不是我们目标格式的卡片，静默忽略即可
                // console.log('[BiliParser] 忽略了一个无法解析的JSON消息。');
            }
        }
    }

    // --- 步骤2: 如果未从卡片中找到链接，则后备检查纯文本消息 ---
    if (!link) {
        const rawText = reBuildRawMessage(e.message);
        
        // 正则表达式保持不变，用于匹配纯文本中的链接
        const regex = /(https?:\/\/(?:www\.bilibili\.com\/video|b23\.tv)\/[^\s]+)/i;
        const match = rawText.match(regex);
        if (match) {
            link = match[0];
        }
    }


    // --- 步骤3: 如果通过任何一种方式找到了链接，则进行处理 ---
    if (link) {
        try {
			logger.info("找到B站链接",link)
            const videoInfo = await bilibiliService.parseBilibiliLink(link);

           

            const description = videoInfo.desc.substring(0, 70) + (videoInfo.desc.length > 70 ? '...' : '');

            // bilibiliService.getBilibiliLowQualityUrl(videoInfo.bvid).then(res => { 
            //     console.log(res)
            //     reply(res.url)
            // });

            const message = [
                msgbuilder.img(videoInfo.pic),
                `\n标题: ${videoInfo.title}`,
                `\n-------------------`,
                `\n分类: ${videoInfo.tname}`,
                `\n简介: ${description}`,
                `\n原链接: https://www.bilibili.com/video/${videoInfo.bvid}`
            ];
            
            reply(message);

        } catch (error) {
            console.error(`[BiliParser] 自动解析链接(${link})失败:`, error.message);
        }
    }
});