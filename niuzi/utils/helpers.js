/**
 * 从消息对象中提取纯文本内容
 * @param {Array} message - 消息数组
 * @returns {string}
 */
function reBuildRawMessage(message) {
    return message
        .filter(item => item.type === 'text')
        .map(item => item.data.text)
        .join('');
}

/**
 * 生成指定长度的随机字符串ID
 * @param {number} length - 长度
 * @returns {string}
 */
function generateRandomID(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

/**
 * 在指定范围内生成随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {boolean} isInteger - 是否为整数
 * @returns {number}
 */
function getRandomNumber(min, max, isInteger = false) {
    if (min > max) [min, max] = [max, min];
    const random = Math.random() * (max - min) + min;
    return isInteger ? Math.floor(random) : random;
}

/**
 * 根据配置的概率返回结果 (1: 赢, 2: 输, 3: 双输)
 * @param {object} config - 包含 win_p, los_p, dorp_p 的配置对象
 * @returns {number | null}
 */
function getBattleResult(config) {
    const { win_p, los_p, dorp_p } = config;
    if (Math.abs(win_p + los_p + dorp_p - 1.0) > 1e-9) { // 浮点数比较
        console.error("战斗概率总和不为1");
        return null;
    }
    const random = Math.random();
    if (random < win_p) return 1;
    if (random < win_p + los_p) return 2;
    return 3;
}

/**
 * 从消息中获取第一个被@的用户QQ号
 * @param {Array} message - 消息数组
 * @returns {{find: boolean, qq: string|null}}
 */
function getAt(message) {
    const atSegment = message.find(item => item.type === 'at');
    return atSegment ? { find: true, qq: atSegment.data.qq } : { find: false, qq: null };
}

/**
 * 将厘米转换为更易读的单位
 * @param {number} cm - 厘米数
 * @returns {string}
 */
function convertLength(cm) {
    const units = [
        { name: "光年", factor: 946052840500000000 },
        { name: "地月距离", factor: 38440000000 },
        { name: "千米", factor: 100000 },
        { name: "米", factor: 100 },
        { name: "厘米", factor: 1 }
    ];

    const isNegative = cm < 0;
    const absCm = Math.abs(cm);

    for (const unit of units) {
        if (absCm >= unit.factor) {
            const value = Math.floor(absCm / unit.factor);
            return `${isNegative ? '-' : ''}${value} ${unit.name}`;
        }
    }
    // 默认返回厘米，处理小于1米的情况
    return `${cm.toFixed(2)} 厘米`;
}


module.exports = {
    reBuildRawMessage,
    generateRandomID,
    getRandomNumber,
    getBattleResult,
    getAt,
    convertLength
};