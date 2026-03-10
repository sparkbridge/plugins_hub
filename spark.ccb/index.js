const { pinyin } = require('pinyin-pro');

function containsPinyinSequence(text, sequence) {
    // 将文本转换为拼音
    const pinyinArray = pinyin(text, { toneType: 'none', type: 'array' });
    let vr = pinyinArray.map((str) => { return str[0]; });
    // 检查是否包含特定的拼音序列
    return vr.join("").includes(sequence);
}

const sequence = "ccb";

spark.on('message.group.normal', (e, reply) => {
    const { raw_message, group_id } = e;
    if (group_id == spark.env.get("main_group")) {  //此处对正在发送消息的群聊判断，查看是否和配置文件一致
        let is_ccb = containsPinyinSequence(raw_message, sequence);
        if (is_ccb) {
            reply("ccb领域大神", true);
        }
    }
})