// 导入信息构建函数
const msgbuilder = require('../../handles/msgbuilder');
// 导入数据服务并加载数据
const { loadData } = require('./services/dataService');
// 导入消息处理器
const { handleMessage } = require('./handlers/messageHandler');
const logger = spark.getLogger()
// 监听机器人上线事件
spark.on('bot.online', () => {
    try {
        // 加载数据
        loadData();
        logger.info('---=牛子系统=---\n牛子系统已加载, 如有任何问题可以添加官方群反馈：519916681');
    } catch (error) {
        console.error('牛子系统加载失败:', error);
    }
});

// 监听群消息事件
spark.on('message.group.normal', (e, reply) => {
    try {
        handleMessage(e, reply);
    } catch (error) {
        console.error(`[牛子系统] 处理消息时发生错误:`, error);
        reply('呜，牛子系统好像出错了...');
    }
});

// 可以在这里处理其他全局事件，例如插件卸载时保存数据等