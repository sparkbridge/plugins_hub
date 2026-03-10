// 引入必要的模块
const axios = require('axios');

// 监听群聊普通消息事件
spark.on("message.group.normal", async (e, reply) => {
    // 仅处理指定主群的消息
    if (e.group_id === spark.env.get("main_group")) {
        let msg = e.raw_message?.trim() || '';

        // 检测消息是否以「查ip」开头（兼容大小写/空格）
        if (msg.toLowerCase().startsWith("查ip")) {
            try {
                // 1. 提取用户输入的IP地址（支持「查ip 58.30.0.0」或「查ip:58.30.0.0」格式）
                const ip = msg.replace(/^查ip\s*[:：]?\s*/, '').trim(); // 无输入则用默认IP

                // 2. 校验IP格式（简单正则）
                const ipReg = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
                if (!ipReg.test(ip)) {
                    reply('❌ IP格式错误！请输入正确的IPv4地址，例如：查ip 58.30.0.0');
                    return;
                }

                // 3. 调用IP查询接口
                const response = await axios({
                    url: `https://ip9.com.cn/get?ip=${ip}`,
                    method: 'GET',
                    timeout: 5000, // 5秒超时
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                // 4. 处理接口返回数据
                const res = response.data;
                if (res.ret !== 200) {
                    reply(`❌ IP查询失败！接口返回状态：${res.ret}`);
                    return;
                }

                // 5. 格式化回复消息（分行展示所有信息）
                const replyMsg = `

🔍 IP归属地查询结果

📍 地理信息：${res.data.country}(${res.data.country_code})
📡 IP信息：${res.data.ip} (long_ip：${res.data.long_ip})
📶 网络信息：运营商${res.data.isp}
🌍 经纬度：${res.data.lng}, ${res.data.lat}
⏱️ 查询耗时：${res.qt}秒 | 接口状态：${res.ret}

                `.trim(); // 去除首尾空白

                // 6. 发送格式化后的回复
                reply(replyMsg);

            } catch (error) {
                // 异常处理（网络错误、接口错误等）
                console.error('IP查询异常：', error);
                let errorMsg = '❌ IP查询出错！';
                if (error.code === 'ECONNABORTED') {
                    errorMsg = '❌ 接口请求超时，请稍后重试！';
                } else if (error.response) {
                    errorMsg = `❌ 接口返回错误：${error.response.status}`;
                }
                reply(errorMsg);
            }
        }
    }
});