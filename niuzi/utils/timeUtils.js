/**
 * 计算距离未来某个时间点还有多少分钟
 * @param {number} futureTimestamp - 未来的时间戳 (毫秒)
 * @returns {string} - 格式化后的剩余分钟数，例如 "10.0"
 */
function getRemainingMinutes(futureTimestamp) {
    if (!futureTimestamp || futureTimestamp <= Date.now()) {
        return "0.0";
    }
    const remainingMs = futureTimestamp - Date.now();
    return (remainingMs / 60000).toFixed(1);
}

/**
 * 检查一个时间戳距离现在是否超过了指定的分钟数
 * @param {number} pastTimestamp - 过去的时间戳 (毫秒)
 * @param {number} durationInMinutes - 指定的分钟数
 * @returns {boolean}
 */
function isTimeDifferenceGreaterThan(pastTimestamp, durationInMinutes) {
    if (!pastTimestamp) return true; // 如果没有记录，则认为冷却已过
    const differenceInMinutes = (Date.now() - pastTimestamp) / 60000;
    return differenceInMinutes > durationInMinutes;
}

module.exports = {
    getRemainingMinutes,
    isTimeDifferenceGreaterThan
};