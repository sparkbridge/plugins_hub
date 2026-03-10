const axios = require('axios').default;

/**
 * 内部函数：根据 BVID 获取视频的详细信息
 * @param {string} bvid - Bilibili 视频的 BV 号
 * @returns {Promise<object>}
 */
async function getVideoInfo(bvid) {
    const apiUrl = `http://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const response = await axios.get(apiUrl);

    if (response.data.code !== 0 || !response.data.data) {
        throw new Error(`B站API返回错误: ${response.data.message}`);
    }
    return response.data.data;
}

/**
 * 主函数：解析任意B站链接（长链接或b23.tv短链接）
 * @param {string} url - 任意B站链接
 * @returns {Promise<object>} 返回包含视频信息的 data 对象
 */
async function parseBilibiliLink(url) {
    let bvid = '';

    // 检查是否为 b23.tv 短链接
    if (url.includes('b23.tv')) {
        try {
            // 发起请求，但不允许自动重定向，以便我们能读取302响应头
            const response = await axios.get(url, {
                maxRedirects: 0,
                // 使得302状态码不会被axios视为错误
                validateStatus: status => status >= 200 && status < 400 
            });

            // 从 Location 头中获取完整的长链接
            const longUrl = response.headers.location;
            if (!longUrl) {
                throw new Error('无法从短链接中解析出长链接。');
            }
            // 从长链接中提取 BV 号
            const match = longUrl.match(/(BV[1-9A-HJ-NP-Za-km-z]{10})/i);
            if (match) {
                bvid = match[1];
            }
        } catch (error) {
            // 捕获网络请求错误或上面抛出的业务错误
            console.error(`[BiliParser] 解包短链接(${url})时出错:`, error.message);
            throw new Error('解析B站短链接失败。');
        }
    } else {
        // 如果是普通长链接，直接从中提取 BV 号
        const match = url.match(/(BV[1-9A-HJ-NP-Za-km-z]{10})/i);
        if (match) {
            bvid = match[1];
        }
    }

    if (!bvid) {
        throw new Error('未能在链接中找到有效的BV号。');
    }

    // 最终调用内部函数获取视频信息
    return getVideoInfo(bvid);
}

module.exports = {
    // 对外只暴露这一个主函数
    parseBilibiliLink,
};