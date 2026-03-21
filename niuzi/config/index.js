// 初始化配置文件助手
const configFile = spark.getFileHelper('niuzi');

// 默认配置
const defaultConfig = {
    pkCD: 2,      // 功能「比划比划」的冷却时长 (分)
    init_cm: 10,  // 「领养牛子」的初始成长最大值
    reget_cd: 10, // 丢弃牛子后的冷却CD (分)
    win_p: 0.4,   // 比划赢的概率
    los_p: 0.4,   // 比划输的概率
    dorp_p: 0.2,  // 比划双输的概率
    tt_cd: 40,    // 功能「贴贴」的冷却时长 (分)
    tt_grow: 120  // 功能「贴贴」的成长值
};

// 初始化并加载配置
configFile.initFile("config.json", defaultConfig);
const local_config = JSON.parse(configFile.getFile("config.json"));

// 设置 WebConfig
spark.web.createConfig("niuzi")
	.number("pkCD", local_config.pkCD, "功能「比划比划」的冷却时长，单位为分。")
	.number("init_cm", local_config.init_cm, "功能「领养牛子」的初始成长最大值。")
	.number("reget_cd", local_config.reget_cd, "丢弃牛子后的冷却CD，单位分钟")
	.number("tt_cd", local_config.tt_cd, "功能「贴贴」的冷却时长，单位为分。")
	.number("tt_grow", local_config.tt_grow, "功能「贴贴」的成长值")
	.number("win_p", local_config.win_p, "赢的概率")
	.number("los_p", local_config.los_p, "输的概率")
	.number("dorp_p", local_config.dorp_p, "双输的概率")
	.register();


// 监听配置更新
spark.on("config.update.niuzi", (plname, key, newValue) => {
    local_config[key] = newValue;
    configFile.updateFile("config.json", local_config);
    //console.log(`[牛子系统] 配置文件更新: ${key} = ${newValue}`);
});

module.exports = local_config;