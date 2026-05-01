const { Jimp, loadFont } = require('jimp');
const { SANS_32_BLACK, SANS_16_BLACK } = require('jimp/fonts');
const { img } = require('../../handles/msgbuilder');
const fileObj = spark.getFileHelper('deerpipe');

const initconf = {
    custom_avatar: false,
    custom_avatar_name: '',
    sign_alert:'到点了兄弟们，发送🦌，进行打卡吧！',
    sign_already:' 你今天已经打卡过了哦~',
    sign_word_time: '20:00',
    sign_word:"🦌"
}

fileObj.initFile("config.json", initconf);
fileObj.initFile("data.json", {});

const config = JSON.parse(fileObj.read('config.json'));
const data = JSON.parse(fileObj.read('data.json'));

spark.web.createConfig("deerpipe")
    .switch("custom_avatar", config.custom_avatar, "是否开启自定义头像")
    .text("custom_avatar_name", config.custom_avatar_name, "自定义头像文件名称")
    .text("sign_alert", config.sign_alert, "签到提示")
    .text("sign_already", config.sign_already, "已经签到提示")
    .text("sign_word_time", config.sign_word_time, "签到时间")
    .text("sing_word", config.sign_word, "签到文字")
    .register();



spark.on("config.update.deerpipe", (key, val) => {
    config[key] = val;
    fileObj.write('config.json', config); // 持久化保存
    // logger.info(`基础配置已更新并保存本地: ${key} -> ${val}`);
});


function save(){
    fileObj.write('data.json',JSON.stringify(data));
}

/**
 * 处理用户签到并自动维护文件大小
 * @param {string|number} userId 用户唯一标识
 * @returns {{year: number, month: number, checkedDays: number[], isFirstTimeToday: boolean}}
 */
function recordCheckIn(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() 返回 0-11
    const day = now.getDate();

    // 当前月的唯一标识，例如 "2024-10"
    const currentMonthKey = `${year}-${month}`;

    // --- 核心逻辑 1：清理非本月的数据（保持文件极小） ---
    // 遍历所有用户的数据，只要发现月份标识不是当前的 currentMonthKey，直接删除该用户节点
    for (const uid in data) {
        if (data[uid].monthKey !== currentMonthKey) {
            delete data[uid];
        }
    }

    // --- 核心逻辑 2：记录当前用户的签到 ---
    // 如果这个用户这个月还没签到过，初始化他的数据结构
    if (!data[userId]) {
        data[userId] = {
            monthKey: currentMonthKey,
            days: [] // 存放本月已签到的日期，如 [1, 5, 8]
        };
    }

    let isFirstTimeToday = false;

    // 如果今天还没签到，就把今天加进去
    if (!data[userId].days.includes(day)) {
        data[userId].days.push(day);
        // 保证日期按从小到大排序，让画图逻辑更稳定
        data[userId].days.sort((a, b) => a - b);
        isFirstTimeToday = true;
    }

    // --- 核心逻辑 3：写回文件 ---
    save()

    // 返回刚才画图函数正好需要的所有参数
    return {
        year:year,
        month:month,
        checkedDays: data[userId].days,
        isFirstTimeToday // 可以用来判断是否需要提示“你今天已经签过到了”
    };
}
/**
 * 计算距离下一个指定时间点（HH:mm）的毫秒数
 * @param {string} targetTime - 目标时间，格式为 "HH:mm"，例如 "20:00"
 * @returns {number} 距离目标时间的毫秒数，可直接用于 setTimeout
 */
function getMsUntilNextTime(targetTime) {
    // 1. 解析输入的 小时 和 分钟
    const [targetHour, targetMinute] = targetTime.split(':').map(Number);

    // 2. 获取当前时间
    const now = new Date();

    // 3. 构造今天的目标时间
    const targetDate = new Date(now);
    targetDate.setHours(targetHour, targetMinute, 0, 0); // 设置时、分，秒和毫秒清零

    // 4. 计算时间差（毫秒）
    let delay = targetDate.getTime() - now.getTime();

    // 5. 如果 delay <= 0，说明今天的时间点已经过了（或者正好是现在），需要推到明天
    if (delay <= 0) {
        // 给目标时间加 1 天 (24小时)
        targetDate.setDate(targetDate.getDate() + 1);
        delay = targetDate.getTime() - now.getTime();
    }
    // console.log(`距离 ${targetTime} 还有 ${delay} 毫秒`);
    return delay;
}

/**
 * 智能生成签到日历图
 * @param {number} year 年份，如 2024
 * @param {number} month 月份，如 10
 * @param {number[]} checkedDays 已经签到的日期数组，如 [8, 15, 20]
 */
async function generateSmartCalendar(year, month, checkedDays = []) {
    return new Promise(async (resolve, reject) => { 
        try {
            // console.log(`正在生成 ${year}年${month}月 的签到图...`);

            // 1. 加载素材 (确保使用了刚才新生成的 base_board_dynamic.jpg)
            const baseBoard = await Jimp.read('./plugins/sparkbridge3/plugins/deerpipe/base_board_dynamic.jpg');
            // ==========================================
            // 【第一部分：输入 (Input)】
            // ==========================================

            // 🟢 方式一：通过图片文件路径读取 (当前正在使用)
            const avatar = await Jimp.read('./plugins/sparkbridge3/plugins/deerpipe/avatar.jpg');

            // 🔴 方式二：通过 Buffer 读取 (已注释)
            // 使用场景：前端通过接口上传的文件，或者从数据库中读取的二进制数据
            /*
            const imageBuffer = fs.readFileSync('avatar.jpg'); // 模拟获取到一个 Buffer
            const image = await Jimp.read(imageBuffer);        // Jimp.read 可以自动识别 Buffer
            */
            const checkmark = await Jimp.read('./plugins/sparkbridge3/plugins/deerpipe/check.png'); //https://s41.ax1x.com/2026/05/01/peT3Bd0.png

            // 加载字体
            const fontTitle = await loadFont(SANS_32_BLACK); // 用于年月
            const fontDate = await loadFont(SANS_16_BLACK);  // 用于日期数字

            // 2. 网格参数
            const cellW = 60, cellH = 60;
            const paddingX = 10, paddingY = 15;
            const startX = 30, startY = 180;

            avatar.resize({ w: cellW, h: cellH });
            const checkSize = 50;
            checkmark.resize({ w: checkSize, h: checkSize });

            // --- 核心智能规划逻辑 ---

            // A. 动态绘制年月标题 (如: "2024-10")
            // JavaScript 的 padStart 保证单月格式为 01, 02 (例如: 2024-05)
            const titleStr = `${year}-${month.toString().padStart(2, '0')}`;
            baseBoard.print({ font: fontTitle, x: 30, y: 30, text: titleStr });

            // B. 计算当月天数
            // new Date(year, month, 0) 表示获取当前月的最后一天
            const daysInMonth = new Date(year, month, 0).getDate();

            // C. 计算 1 号是星期几 (0 = 周日, 1 = 周一 ... 6 = 周六)
            // JS Date 中月份是从 0 开始的，所以 month - 1
            const startDayOfWeek = new Date(year, month - 1, 1).getDay();

            // console.log(`智能推算: 该月有 ${daysInMonth} 天，1号是星期 ${startDayOfWeek === 0 ? '日' : startDayOfWeek}`);

            // --- 开始合成网格 ---
            for (let day = 1; day <= daysInMonth; day++) {
                // 计算偏移位置
                const pos = startDayOfWeek + day - 1;
                const col = pos % 7;
                const row = Math.floor(pos / 7);

                const x = startX + col * (cellW + paddingX);
                const y = startY + row * (cellH + paddingY);

                // 贴上底图
                baseBoard.composite(avatar, x, y);

                // 贴上日期 (对单位数和双位数微调一点位置，也可以不调)
                baseBoard.print({ font: fontDate, x: x + 5, y: y + cellH - 20, text: day.toString() });

                // 智能判断今天是否在已签到数组中
                if (checkedDays.includes(day)) {
                    const checkX = x + (cellW - checkSize) / 2 + 5;
                    const checkY = y + (cellH - checkSize) / 2 + 5;
                    baseBoard.composite(checkmark, checkX, checkY);
                }
            }

            // 3. 导出最终图片
            // const finalOutput = `calendar_${year}_${month}.jpg`;
            // await baseBoard.write(finalOutput);
            const buffer = await baseBoard.getBuffer('image/jpeg');

            // 2. 将 Buffer 转换为纯 Base64 字符串 (没有任何前缀)
            const rawBase64 = buffer.toString('base64');

            // 3. 拼接你需要的自定义前缀
            const customBase64Str = `base64://${rawBase64}`;
            resolve(customBase64Str);
            // console.log(`✅ Base64 输出成功！字符串长度: ${customBase64Str.length}`);
            // 打印前 50 个字符看看效果（完整的太长了会刷屏）
            // console.log(`查看 Base64 数据头: ${customBase64Str.substring(0, 50)}...`);
            // console.log(`🎉 签到图生成完毕！保存为 ${finalOutput}`);

        } catch (err) {
            // console.error('运行出错:', err);
            reject(err);
        }
    });
}

// === 测试用例 ===

// 测试1：生成 2024年10月，模拟第 8, 15, 22 天签到
// generateSmartCalendar(2026, 5, [8, 15, 22]);

// 测试2：你也可以试试别的月份，比如 2024年2月(闰年29天)，全选签到
spark.on("message.group.normal",(e,reply)=>{
    if (e.group_id !== spark.env.get("main_group"))return;
    if(e.raw_message==config.sign_word){
        let sd = recordCheckIn(e.sender.user_id.toString());
        // console.log(sd)
        if(sd.isFirstTimeToday == false){
            reply(config.sign_already,true)
        }else{
            generateSmartCalendar(sd.year, sd.month, sd.checkedDays).then(base64Str => {
                reply(img(base64Str), true);
            })
        }
    }
})

function start_alert(){
    setTimeout(() => {
        spark.QClient.sendGroupMsg(spark.env.get("main_group"), config.sign_alert);
        start_alert();
    }, getMsUntilNextTime(config.sign_word_time));
}

start_alert();