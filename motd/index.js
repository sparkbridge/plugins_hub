const logger = spark.getLogger('motd');
const msgbuilder = require('../../handles/msgbuilder'); // 导入信息构建函数

logger.info("插件已加载，使用 motd <ip:端口> [je|be|srv] 来查询服务器");

// 使用 Set 存储所有有效指令，提高匹配效率
const validCommands = new Set(['/motd', '/motdpe', 'motd', 'motdpe']);

spark.on('message.group.normal', (e, reply) => {
    if (e.group_id !== spark.env.get("main_group"))return;
    const splits = e.raw_message.split(' ').filter(Boolean); // 分割并移除空部分
    if (splits.length === 0) return;

    const command = splits[0].toLowerCase(); // 获取指令并转为小写

    if (validCommands.has(command)) {

        // --- 1. 如果没有提供参数，则发送帮助信息 ---
        if (splits.length < 2) {
            const helpMessage = `查询 Minecraft 服务器状态\n` +
                                `格式: motd <ip[:端口]> [类型]\n\n` +
                                `说明:\n` +
                                `▫️ <ip[:端口]>: 服务器地址，端口可选。\n` +
                                `▫️ [类型]: 可选参数，可以是 je, be, srv。\n` +
                                `  - je: Java版 (默认端口 25565)\n` +
                                `  - be: 基岩版 (默认端口 19132)\n` +
                                `  - srv: Java版并使用SRV记录查询\n` +
                                `  - 留空: 自动检测类型 (端口可选)\n\n`;
            return reply(helpMessage);
        }

        // --- 2. 初始化查询参数 ---
        let stype = 'auto';
        let port = null; // 端口初始为 null
        let useSrv = false; // 使用布尔值标记是否启用 SRV

        // --- 3. 解析可选的服务器类型参数 ---
        const userType = splits[2] ? splits[2].toLowerCase() : null;
        if (userType === 'je') {
            stype = 'je';
            port = 25565;
        } else if (userType === 'be') {
            stype = 'be';
            port = 19132;
        } else if (userType === 'srv') {
            stype = 'je';
            port = 25565;
            useSrv = true;
        }

        // --- 4. 解析地址和用户指定的端口 ---
        const addressPart = splits[1];
        let [address, portStr] = addressPart.split(':');

        if (portStr) {
            const customPort = Number(portStr);
            if (!Number.isInteger(customPort) || customPort < 1 || customPort > 65535) {
                return reply('错误：端口号不合法，必须是 1-65535 之间的整数。');
            }
            port = customPort; // 用户指定的端口优先级最高
        }

        // --- 5. 构建API请求URL ---
        // 基础URL
        let imgUrl = `http://motd.minebbs.com/api/status_img?ip=${address}&stype=${stype}`;

        // 如果端口不为null，则添加到URL中
        if (port !== null) {
            imgUrl += `&port=${port}`;
        }
        
        // 如果启用了SRV，则添加到URL中
        if (useSrv) {
            imgUrl += `&srv=true`;
        }
        
        // 最后添加主题参数
        imgUrl += `&theme=dark_tech`;

        logger.info(`正在查询: ${imgUrl}`);
        reply(msgbuilder.img(imgUrl));
    }
});