const logger = spark.getLogger();
const { execSync } = require('child_process');

function fetchWiki(keyword) {
    try {
        const url = `https://zh.minecraft.wiki/api.php?action=query&format=json&prop=extracts&exintro=true&redirects=true&titles=${encodeURIComponent(keyword)}`;
        
        // 通过系统curl命令获取数据
        const result = execSync(`curl -sS --connect-timeout 5 "${url}"`, {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore']
        });

        return JSON.parse(result);
    } catch (err) {
        logger.error(`请求失败: ${err.message}`);
        return null;
    }
}

spark.on('message.group.normal', (e, reply) => {
    if(e.group_id !== spark.env.get("main_group"))return;
    const msg = e.raw_message.trim();
    if (!msg.startsWith('wiki ')) return;

    const keyword = msg.slice(5).trim();
    if (!keyword) return reply("请输入查询内容，例如：wiki 红石");

    // 获取数据
    const data = fetchWiki(keyword);
    if (!data || !data.query) {
        return reply("暂时无法访问Minecraft Wiki");
    }

    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    if (pageId === "-1") {
        return reply(`未找到与【${keyword}】相关的条目`);
    }

    // 处理内容
    const content = pages[pageId].extract
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 250);

    reply([
        `📚 ${pages[pageId].title}`,
        `📃 ${content}...`,
        `🔗 完整内容: https://zh.minecraft.wiki/${encodeURIComponent(pages[pageId].title)}`
    ].join('\n'));
});
