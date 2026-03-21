const petService = require('../services/petService');
const dataService = require('../services/dataService');
const config = require('../config');
const { getAt, reBuildRawMessage, convertLength } = require('../utils/helpers');
const { getRemainingMinutes, isTimeDifferenceGreaterThan } = require('../utils/timeUtils');
const msgbuilder = require('../../../handles/msgbuilder'); // 确保路径正确

// 导入绘图模块，并处理BDS环境兼容性
let drawPHB;
if (!spark.onBDS) {
    try {
        // 假设您的绘图文件位于 drawing/draw.js
        drawPHB = require('../drawing/draw'); 
    } catch (e) {
        console.error("[牛子系统] 绘图模块加载失败，排行榜将使用文字模式。 ", e);
        drawPHB = null;
    }
}

// 使用 Map 结构注册所有指令，提高代码可读性和可扩展性
const commands = new Map();

// --- 指令注册 ---
commands.set('领养牛子', handleAdoptPet);
commands.set('改牛子名', handleChangeName);
commands.set('比划比划', handleBattle);
commands.set('🔒', handleBattle); // 指令别名
commands.set('我的牛子', handleShowMyPet);
commands.set('丢弃牛子', handleRemovePet);
commands.set('看看你的', handleInspectPet);
commands.set('牛子菜单', handleShowMenu);
commands.set('牛子榜', handleShowRanking);
commands.set('牛子变性', handleTransgender);
commands.set('搞对象', handleProposeMarriage);
commands.set('处理请求', handleProcessProposal);
commands.set('我要分手', handleInitiateBreakup);
commands.set('我的对象', handleShowSpouse);
commands.set('贴贴', handleCuddle);
commands.set('贴贴！', handleCuddle); // 指令别名

/**
 * 主消息处理函数
 * @param {object} e - 事件对象
 * @param {function} reply - 回复函数
 */
function handleMessage(e, reply) {
    // 过滤非指定群组的消息
   if (e.group_id !== spark.env.get("main_group"))  return;

    const rawText = reBuildRawMessage(e.message);
    const [command, ...args] = rawText.split(" ").filter(Boolean);

    if (commands.has(command)) {
        const handler = commands.get(command);
        // 将所有需要的参数封装成一个对象传递，方便扩展
        handler({ e, reply, command, args });
    }
}

// --- 指令处理函数定义 ---

function handleAdoptPet({e, reply}) {
     const sender_id = String(e.sender.user_id);
    if (petService.hasPet(sender_id)) {
        return reply("你已经有一只牛子了!");
    }

    const cooldownEnd = dataService.runtimeData.regetCooldowns.get(sender_id);

    if (cooldownEnd && Date.now() < cooldownEnd) {
        const remaining = getRemainingMinutes(cooldownEnd);
        return reply(`正在冷却，请在 ${remaining} 分钟后再来`);
    }

    const pet = petService.createPet(sender_id);
    reply(`---=牛子系统=---\n您获取到了一只牛子\n长度：${pet.health}cm\n性别：${pet.gender === 0 ? "女" : "男"}`);
}

function handleChangeName({ e, reply, args }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const result = petService.changeName(sender_id, args[0]);
    reply(result.message);
}

function handleBattle({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const target = getAt(e.message);
    if (!target.find) {
        return reply("请选择要比划的目标");
    }
    if (sender_id == target.qq) {
        return reply("不能对自己🦌棍子!");
    }
    if (!petService.hasPet(target.qq)) {
        return reply("对方还没有一只牛子!");
    }

    const result = petService.battle(sender_id, target.qq);
    reply(result.message);
}

function handleShowMyPet({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    const pet = petService.getPet(sender_id);
    if (!pet) {
        return reply("你还没有一只牛子!");
    }
    
    const isReady = isTimeDifferenceGreaterThan(pet.battleTimestamp, config.pkCD);
    const battleCooldownEnd = pet.battleTimestamp ? pet.battleTimestamp + config.pkCD * 60000 : 0;
    const status = isReady 
        ? "积极向上" 
        : `红肿(剩余${getRemainingMinutes(battleCooldownEnd)}分钟)`;
        
    reply(`---=牛子系统=---\n您的牛子：${pet.petName}\n性别：${pet.gender === 0 ? "女" : "男"}\n长度：${convertLength(pet.health)}\n状态：${status}`);
}

function handleRemovePet({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const result = petService.removePet(sender_id);
    reply(result.message);
}

function handleInspectPet({ e, reply, args }) {
    const targetInfo = getAt(e.message);
    const targetId = targetInfo.find ? String(targetInfo.qq) : String(args[0]);

    if (!targetId) {
        return reply("请指定要查看的目标。");
    }
    
    const pet = petService.getPet(targetId);
    if (!pet) {
        return reply("对方还没有一只牛子!");
    }

    const isReady = isTimeDifferenceGreaterThan(pet.battleTimestamp, config.pkCD);
    const battleCooldownEnd = pet.battleTimestamp ? pet.battleTimestamp + config.pkCD * 60000 : 0;
    const status = isReady 
        ? "积极向上" 
        : `红肿(剩余${getRemainingMinutes(battleCooldownEnd)}分钟)`;

    reply(`---=牛子系统=---\n牛子：${pet.petName}\n性别：${pet.gender === 0 ? "女" : "男"}\n长度：${convertLength(pet.health)}\n状态：${status}`);
}

function handleShowMenu({ reply }) {
    // 建议将图片URL放入配置文件中
    const menuImageUrl = 'https://s21.ax1x.com/2025/02/03/pEZIGM8.png';
    reply(msgbuilder.img(menuImageUrl));
}

function handleShowRanking({ reply }) {
    reply("正在全群牛子普查......");
    const rankingData = petService.getRanking();

    if (spark.onBDS) {
        // BDS 环境使用转发消息
        const bd = msgbuilder.ForwardMsgBuilder();
        rankingData.forEach((v, index) => {
            const rankMsg = `Top ${index + 1}: ${v.petName} (主人 ${v.ownerId}) - ${convertLength(v.health)}`;
            bd.addCustomsMsg("牛子榜", 123, rankMsg);
        });
        spark.QClient.sendGroupForwardMsg(spark.mc.config.group, bd.getMsg());
    } else if (drawPHB) {
        // 非BDS环境且绘图模块可用，使用图片
        const textLines = rankingData.map((v, index) => `Top ${index + 1}: ${v.petName} (主人 ${v.ownerId}) ${convertLength(v.health)}`);
        const base64Image = drawPHB(textLines, "牛子光荣榜"); // 可以传递标题
        reply(msgbuilder.img(`base64://${base64Image}`));
    } else {
        // 降级方案：使用普通文本
        let rankMsg = "--- 牛子光荣榜 ---\n";
        rankingData.slice(0, 20).forEach((v, index) => { // 最多显示前20避免刷屏
            rankMsg += `Top ${index + 1}: ${v.petName} - ${convertLength(v.health)}\n`;
        });
        reply(rankMsg.trim());
    }
}

function handleTransgender({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const result = petService.transgender(sender_id);
    reply(result.message);
}

function handleProposeMarriage({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const target = getAt(e.message);
    if (!target.find) {
        return reply("请选择要搞对象的目标");
    }
    if (sender_id == target.qq) {
        return reply("不能和自己搞!");
    }
    if (!petService.hasPet(target.qq)) {
        return reply("对方还没有一只牛子!");
    }
    
    const result = petService.proposeMarriage(sender_id, target.qq);
    reply(result.message);
}

function handleProcessProposal({ e, reply, args }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const [type, decision] = args;
    if (!type || !decision || !['搞对象', '分手'].includes(type) || !['同意', '拒绝'].includes(decision)) {
        return reply("参数不足或有误，正确格式：处理请求 [搞对象/分手] [同意/拒绝]");
    }
    
    const result = petService.handleProposal(sender_id, type, decision);
    reply(result.message);
}

function handleInitiateBreakup({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    if (!petService.hasPet(sender_id)) {
        return reply("你还没有一只牛子!");
    }
    const result = petService.initiateBreakup(sender_id);
    reply(result.message);
}

function handleShowSpouse({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    const pet = petService.getPet(sender_id);
    if (!pet) {
        return reply("你还没有一只牛子!");
    }
    if (!pet.spouseId) {
        return reply("你还没有对象!");
    }
    const spousePet = petService.getPetById(pet.spouseId);
    if (!spousePet) {
        // 冗余处理
        pet.spouseId = null;
        dataService.saveData();
        return reply("你的对象神秘失踪了，已自动恢复单身。");
    }
    
    reply(`---=我的对象=---\n牛子：${spousePet.petName}\n性别：${spousePet.gender === 0 ? "女" : "男"}\n长度：${convertLength(spousePet.health)}\n主人：${spousePet.ownerId}`);
}

function handleCuddle({ e, reply }) {
     const sender_id = String(e.sender.user_id);
    const pet = petService.getPet(sender_id);
    if (!pet) {
        return reply("你还没有一只牛子!");
    }
    if (!pet.spouseId) {
        return reply("你还没有对象，不能贴贴！");
    }

    const result = petService.cuddle(sender_id);
    reply(result.message);
}


module.exports = { handleMessage };