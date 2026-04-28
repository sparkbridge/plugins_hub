const { text } = require('../../handles/msgbuilder');
const emojimap = require("./qq_to_mc_map.json")
const TARGET_GROUP = spark.env.get("main_group")

const fileObj = spark.getFileHelper("sb3_mc");
const conf = JSON.parse(fileObj.read("config.json"));

/**
 * 替换字符串中的 %s 占位符
 * @param {string} template 包含占位符的模板字符串（如 "[玩家] %s: %s"）
 * @param  {...any} args 要替换的参数（支持多个参数、数组参数）
 * @returns {string} 替换后的最终字符串
 */
function replacePlaceholders(template, ...args) {
    // 容错：如果模板不是字符串，直接返回空字符串
    if (typeof template !== 'string') {
        return '';
    }

    // 处理参数：如果第一个参数是数组，则展开数组；否则合并所有参数
    let params = [];
    if (args.length === 1 && Array.isArray(args[0])) {
        params = args[0];
    } else {
        params = args;
    }

    // 复制模板避免修改原字符串，逐个替换 %s 占位符
    let result = template;
    let placeholderIndex = 0;

    // 用正则全局匹配 %s，逐个替换
    result = result.replace(/%s/g, () => {
        // 如果参数不足，返回空字符串或保留 %s
        return placeholderIndex < params.length
            ? String(params[placeholderIndex++])  // 转为字符串避免类型问题
            : ''; // 也可以改为保留占位符：return '%s'
    });

    return result.toString();
}

function faceid2ucode(id){
    // console.log(id)
    if (emojimap[id])
        return (emojimap[id].unicode)
    else 
        return conf.face_format
}

function formatMsg(msg) {
    const formattedMessages = msg.map((t) => {
        // console.log(t)
        switch (t.type) {
            case 'at':
                if (spark.env.get('get_xbox_by_qid')(t.data.qq) == undefined) {
                    return '@' + t.data.qq;
                } else {
                    return '@' + spark.env.get('get_xbox_by_qid')(t.data.qq).xbox;
                }
            case 'text':
                return replacePlaceholders(conf.text_format, t.data.text);
            case 'image':
                return conf.image_format;
            case 'face':
                return faceid2ucode(t.data.id);
        }
    });
    return formattedMessages.join('');
}



// 1. QQ -> MC 游戏内
if (conf.chat_to_server_enable == false) {
    spark.on('message.group.normal', (pack) => {
        // console.log(`[QQ -> MC] 收到消息: ${pack.raw_message}`);
        if (pack.group_id === TARGET_GROUP) {
            // 将 QQ 消息广播到游戏内
            const senderName = pack.sender.card || pack.sender.nickname;
            const content = formatMsg(pack.message);
            // 调用 BDS 原生接口 (通过沙盒暴露的 mc 对象)
            if (content != "")
                mc.broadcast(replacePlaceholders(conf.chat_to_server_format, senderName, content));
        }
    });
}

