// 配置文件说明：
// 1. 主配置文件: plugins/PureDeathMessages/config.json（控制功能开关、语言、表情输出等）
// 2. 资源文件: 
//    - assets/entity.json（实体名称多语言配置）
//    - assets/message.json（死亡消息多语言配置）
//    - assets/map.json（死亡原因映射配置）
//    - assets/emoji.json（表情符号配置）

// 加载配置文件
// const config = new JsonConfigFile('plugins/PureDeathMessages/config.json')
// const enabledEntity = config.get('enabledEntity')
// const enableMobCustomName = config.get('enableMobCustomName')
// const enableItemCustomName = config.get('enableItemCustomName')
// const outputEmoji = config.get('outputEmoji')
// const apiEmoji = config.get('apiEmoji')
// const emojiSeparator = config.get('emojiSeparator')
// const followGamerule = config.get('followGamerule')


// console.log(map)

// // 注册插件
// ll.registerPlugin('PureDeathMessages', 'Output death messages.', [1, 0, 0])
// logger.setConsole(config.get('logToConsole'))
// logger.setFile(config.get('logToFile') ? 'logs/PureDeathMessages.log' : null)

// // 监听函数注册器（供外部调用）
// let listenerFunctions = []
// let registerListener = function (namespace, name) {
//     listenerFunctions.push(ll.import(namespace, name))
// }
// ll.exports(registerListener, 'PureDeathMessages', 'registerListener')

let CFG = {
    "lang": 0,
    "enabledCat": true,
    "enabledDonkey": true,
    "enabledHorse": true,
    "enabledMule": true,
    "enabledPlayer": true,
    "enabledWolf": true,
    "enableMobCustomName": true,
    "enableItemCustomName": true,
    "emojiSeparator": "  ",
    "outputEmoji": false,
    "apiEmoji": false,
    "followGamerule": true,
    "logToConsole": true,
    "logToFile": true
}

const fileObj = spark.getFileHelper('PureDeathMessages');

fileObj.initFile("config.json", CFG);
const config = JSON.parse(fileObj.read('config.json'));
// console.log(config)

// // 加载多语言/映射/表情资源
// const entity = (new JsonConfigFile(`plugins/PureDeathMessages/assets/entity.json`)).get(config.get('lang'))
// const message = (new JsonConfigFile(`plugins/PureDeathMessages/assets/message.json`)).get(config.get('lang'))
// const map = (new JsonConfigFile('plugins/PureDeathMessages/assets/map.json')).get("map")
// const emoji = new JsonConfigFile('plugins/PureDeathMessages/assets/emoji.json')
// const defaultEntityEmoji = emoji.get("defaultEntity")
// const entityEmoji = emoji.get("entity")
// const deathMessageEmoji = emoji.get("deathMessage")
let lang = ["java","brerock","en_US"][config.lang]
const emoji = require('./assets/emoji.json')
const entity = require('./assets/entity.json')[lang]
const message = require('./assets/message.json')[lang]
const map = require('./assets/map.json').map;
// const outputEmoji = emoji.outputEmoji;
const defaultEntityEmoji = emoji.defaultEntity;
const entityEmoji = emoji.entity;
const deathMessageEmoji = emoji.deathMessage;


spark.web.createConfig("puredeathmessage")
    // 1. 语言选择（下拉框）
    .select("lang", ["java", "bedrock", "en_US"], config.lang, "插件语言配置")

    // 2. 实体启用开关（扁平化命名，无二层属性）
    .switch("enabledCat", config.enabledCat, "启用 猫 死亡消息")
    .switch("enabledDonkey", config.enabledDonkey, "启用 驴 死亡消息")
    .switch("enabledHorse", config.enabledHorse, "启用 马 死亡消息")
    .switch("enabledMule", config.enabledMule, "启用 骡子 死亡消息")
    .switch("enabledPlayer", config.enabledPlayer, "启用 玩家 死亡消息")
    .switch("enabledWolf", config.enabledWolf, "启用 狼 死亡消息")

    // 3. 自定义名称相关开关
    .switch("enableMobCustomName", config.enableMobCustomName, "启用生物自定义名称显示")
    .switch("enableItemCustomName", config.enableItemCustomName, "启用物品自定义名称显示")

    // 4. 表情相关配置
    .text("emojiSeparator", config.emojiSeparator, "表情符号分隔符（默认两个空格）")
    .switch("outputEmoji", config.outputEmoji, "输出消息时附带表情符号")
    .switch("apiEmoji", config.apiEmoji, "API返回消息时附带表情符号")

    // 5. 游戏规则与日志配置
    .switch("followGamerule", config.followGamerule, "遵循游戏死亡消息显示规则")
    .switch("logToConsole", config.logToConsole, "输出日志到控制台")
    .switch("logToFile", config.logToFile, "输出日志到文件")

    // 注册配置到Web界面
    .register();

spark.on("config.update.PureDeathMessages", (key, val) => {
    config[key] = val;
    fileObj.write('config.json', config); // 持久化保存
    // logger.info(`基础配置已更新并保存本地: ${key} -> ${val}`);
});

const enabledEntity = {
    "minecraft:cat": config.enabledCat,
    "minecraft:donkey": config.enabledDonkey,
    "minecraft:horse": config.enabledHorse,
    "minecraft:mule": config.enabledMule,
    "minecraft:player": config.enabledPlayer,
    "minecraft:wolf": config.enabledWolf
};


// 存储最后一次伤害原因（用于精准判定死亡诱因）
let lastDamageCause = {}

// 核心工具函数：字符串格式化（替换%s占位符）
function stringFormat(str, args) {
    const regex = /%s/
    const _r = (p, c) => p.replace(regex, c)
    return args.reduce(_r, str)
}

// 核心工具函数：判断生物是否被驯服
function isTamed(mob) {
    return mob.getNbt(mob.uniqueId)?.getTag('IsTamed').toString() === '1' ? true : false
}

// 核心事件：生物受伤（记录伤害原因，为死亡判定做铺垫）
mc.listen('onMobHurt', (mob, source, damage, cause) => {
    hurtEventHandler(mob, source, cause)
})

// 核心事件：生物死亡（生成死亡消息并输出）
mc.listen('onMobDie', (mob, source, cause) => {
    const msg = deathEventHandler(mob, source, cause)
    if (msg) {
        // 输出日志 + 触发外部监听函数
        // logger.info(config.outputEmoji ? msg.join('') : msg[2])
        // listenerFunctions.forEach(func => {
        //     func(config.apiEmoji ? msg.join('') : msg[2])
        // })
        spark.QClient.sendGroupMsg(spark.env.get("main_group"),(config.apiEmoji ? msg.join('') : msg[2]))
    }
})

// 受伤事件处理逻辑：记录关键伤害信息（物品/位置）
function hurtEventHandler(mob, source, cause) {
    // 过滤未启用的实体/非玩家+未驯服生物
    if (!enabledEntity[mob.type] || (!mob.isPlayer() && !isTamed(mob))) { return }
    delete lastDamageCause[mob.uniqueId]

    // 记录玩家手持物品（原因2：玩家攻击）
    if (source?.isPlayer() && cause === 2) {
        const item = mc.getPlayer(source.uniqueId).getHand()
        const itemNameNbt = item?.getNbt()?.getTag('tag')?.getTag('display')?.getTag('Name')
        if (itemNameNbt) {
            lastDamageCause[mob.uniqueId] = {
                'itemName': config.enableItemCustomName ? itemNameNbt.toString() : mc.newItem(item.type, 1).name
            }
        }
    }
    // 记录受伤位置（原因1：接触伤害，如仙人掌/甜浆果丛）
    else if (cause === 1) {
        let pos = mob.blockPos
        lastDamageCause[mob.uniqueId] = {
            'position': { x: pos.x, y: pos.y, z: pos.z, dimid: pos.dimid }
        }
    }
}

// 死亡事件处理逻辑：生成最终死亡消息
function deathEventHandler(mob, source, cause) {
    // 遵循游戏规则：如果关闭死亡消息则返回空
    if (config.followGamerule && mc.runcmdEx('gamerule showdeathmessages').output.match(/true|false/).toString() === 'false') { return null }

    // 获取生物自定义名称（兼容配置开关）
    function getCustomName(mob) {
        return config.enableMobCustomName ? mob.getNbt().getTag('CustomName')?.toString() : null
    }

    let msg = null       // 最终死亡消息
    let args = []        // 消息占位符参数
    let emoji = ['', '', ''] // 表情数组：[来源实体, 死亡原因, 死亡实体]

    // 过滤未启用的实体/非玩家+未驯服生物
    if (!enabledEntity[mob.type] || (!mob.isPlayer() && !isTamed(mob))) { return null }

    // 填充死亡实体名称 + 表情
    args.push(config.enableMobCustomName
        ? (getCustomName(mob) ?? entity?.[mob.type] ?? mob.name)
        : (entity?.[mob.type] ?? mob.type))
    emoji[2] = entityEmoji[mob.type] ?? defaultEntityEmoji

    // 填充伤害来源实体名称 + 表情（如果有来源）
    if (source) {
        args.push(config.enableMobCustomName
            ? (getCustomName(source) ?? entity?.[source.type] ?? source.name)
            : (entity?.[source.type] ?? (getCustomName(source) ? source.type : source.name)))
        emoji[0] = entityEmoji[source.type] ?? defaultEntityEmoji
        emoji[1] = deathMessageEmoji.exception?.[source.type]?.[cause]
    }

    // 精准判定死亡原因（优先级：接触伤害 > 玩家物品攻击 > 通用原因）
    // 1. 接触伤害（仙人掌/甜浆果丛）
    if (cause === 1 && lastDamageCause[mob.uniqueId]?.['position']) {
        let pos = lastDamageCause[mob.uniqueId]?.['position']
        delete lastDamageCause[mob.uniqueId]
        // 扫描死亡位置周边方块
        for (let y = -1; y <= 2; y++) {
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    const block = mc.getBlock(pos.x + x, pos.y + y, pos.z + z, pos.dimid)?.type
                    if (block === 'minecraft:cactus') {
                        msg = message[map[cause]]
                        emoji[1] = deathMessageEmoji[cause]
                        break
                    } else if (block === 'minecraft:sweet_berry_bush') {
                        msg = message.exception?.['minecraft:sweet_berry_bush']?.[cause] ?? message[map[cause]]
                        emoji[1] = deathMessageEmoji.exception?.['minecraft:sweet_berry_bush']?.[cause] ?? deathMessageEmoji[cause]
                        break
                    }
                }
            }
        }
    }
    // 2. 玩家手持物品攻击
    else if (cause === 2 && lastDamageCause[mob.uniqueId]?.['itemName']) {
        msg = message['death.attack.player.item']
        args.push(lastDamageCause[mob.uniqueId]?.['itemName'])
        delete lastDamageCause[mob.uniqueId]
    }
    // 3. 通用死亡原因（映射表匹配）
    else {
        msg = message?.[map.exception?.[source?.type]?.[cause]] ?? null
    }

    // console.log(msg, args, emoji)

    // 兜底：如果未匹配到消息，使用通用死亡消息
    if (!msg) {
        msg = message?.[map?.[cause]] ?? `${message['death.attack.generic']} %Plugin data need to update * source:${args[0]} cause:${cause}%`
    }
    // 兜底：如果未匹配到表情，使用默认表情
    if (!emoji[1]) {
        emoji[1] = deathMessageEmoji[cause] ?? deathMessageEmoji['0']
    }

    // 返回结果：[表情拼接部分, 分隔符, 纯文本消息]
    return [emoji.join(''), config.emojiSeparator, stringFormat(msg, args)]
}


// function deathEventHandler(mob, source, cause) {
//     // 1. 前置校验（必加）
//     if (!mob?.uniqueId || !message) return null;
//     console.log(mob, source, cause  )
//     if (config.followGamerule && mc.runcmdEx('gamerule showdeathmessages').output.match(/false/)) return null;

//     // 2. 初始化参数（避免undefined）
//     let args = [];
//     let emoji = ['', '', ''];
//     const defaultEntityName = '未知实体';
//     const defaultItemName = '空手';

//     // 3. 填充死亡实体名称（必兜底）
//     const mobName = config.enableMobCustomName
//         ? (mob.getNbt()?.getTag('CustomName')?.toString() ?? entity?.[mob.type] ?? mob.name ?? defaultEntityName)
//         : (entity?.[mob.type] ?? mob.type ?? defaultEntityName);
//     args.push(mobName);
//     emoji[2] = entityEmoji[mob.type] ?? defaultEntityEmoji;

//     // 4. 填充伤害来源（有来源才加，无则不填）
//     if (source) {
//         const sourceName = config.enableMobCustomName
//             ? (source.getNbt()?.getTag('CustomName')?.toString() ?? entity?.[source.type] ?? source.name ?? defaultEntityName)
//             : (entity?.[source.type] ?? source.type ?? defaultEntityName);
//         args.push(sourceName);
//         emoji[0] = entityEmoji[source.type] ?? defaultEntityEmoji;
//         emoji[1] = deathMessageEmoji.exception?.[source.type]?.[cause] ?? deathMessageEmoji[cause] ?? deathMessageEmoji['0'];
//     }

//     // 5. 处理玩家攻击（cause=2）的物品名称（兜底空手）
//     let msg = null;
//     if (cause === 2 && source?.isPlayer()) {
//         const itemName = lastDamageCause[mob.uniqueId]?.['itemName'] ?? defaultItemName;
//         args.push(itemName); // 第三个参数：物品名称
//         msg = message['death.attack.player.item'] ?? message['death.attack.player'] ?? null;
//     }

//     // 6. 通用死亡原因匹配（精准兜底）
//     if (!msg) {
//         const exceptionKey = map.exception?.[source?.type]?.[cause];
//         msg = exceptionKey ? message[exceptionKey] : (map[cause] ? message[map[cause]] : null);
//     }

//     // 7. 最终兜底（杜绝undefined）
//     if (!msg) {
//         const fallbackMsg = message['death.attack.generic'] || '§c{0} 死于未知原因（原因码：{1}）';
//         // 格式化时自动补全缺失的参数
//         const fallbackArgs = [
//             args[0] || defaultEntityName,
//             cause || '未知'
//         ];
//         msg = stringFormat(fallbackMsg, fallbackArgs);
//     } else {
//         // 正常格式化：参数不足时补默认值
//         msg = stringFormat(msg, args.length ? args : [defaultEntityName]);
//     }

//     // 8. 清理伤害记录（防止内存泄漏）
//     delete lastDamageCause[mob.uniqueId];

//     // 9. 拼接表情（按需）
//     const finalMsg = config.outputEmoji
//         ? `${emoji.join(config.emojiSeparator)} ${msg}`
//         : msg;

//     // 10. 输出日志（无硬编码提示）
//     logger.info(finalMsg);
//     // listenerFunctions.forEach(func => func(apiEmoji ? finalMsg : msg));

//     return [emoji.join(''), config.emojiSeparator, msg];
// }