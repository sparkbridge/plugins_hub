const fs = require('fs')
const read = fs.readFileSync;
const os = require('os');
const osutils = require('os-utils');
var currCPU = 0;
var cpuUsage = 0;
var RamFree, RamUsed, RamPercent;
const Ram = os.totalmem();
const RamTotal = dealMem(Ram);
const JSON5 = require('json5');
let GMLIB_exist = ll.getAllPluginInfo().some(pluginInfo => pluginInfo.name === "GMLIB-LegacyRemoteCallApi");
let PAPI, Minecraft;

if (GMLIB_exist) {
    PAPI = require('../../../GMLIB-LegacyRemoteCallApi/lib/BEPlaceholderAPI-JS').PAPI;
    Minecraft = require("../../../GMLIB-LegacyRemoteCallApi/lib/GMLIB_API-JS").Minecraft;
}

function dealMem(mem) {
    var G = 0,
        M = 0,
        KB = 0;
    (mem > (1 << 30)) && (G = (mem / (1 << 30)).toFixed(2));
    (mem > (1 << 20)) && (mem < (1 << 30)) && (M = (mem / (1 << 20)).toFixed(2));
    (mem > (1 << 10)) && (mem > (1 << 20)) && (KB = (mem / (1 << 10)).toFixed(2));
    return G > 0 ? G + 'G' : M > 0 ? M + 'M' : KB > 0 ? KB + 'KB' : mem + 'B';
};


function weather() {
    const weather = mc.getWeather()
    if (weather == 0) {
        return '晴天☀️';
    }
    else if (weather == 1) {
        return '雨天☔';
    }
    else if (weather == 2) {
        return '雷暴天⚡';
    }
}

function getAverageTps() {
    if (!GMLIB_exist) {
        return "<需要GMLIB>"
    }
    let param = { "<fixed>": 2 };
    let tps = Minecraft.getServerAverageTps();
    let fix = param["<fixed>"];
    return tps.toFixed(fix);
};

/*
function p_num() {
    var re = mc.runcmdEx('list');
    re = (re.output).toString().substr(10);
    n = re.search('/');
    re = re.substr(0, n);
    return re;
}
到底是在怎么样的精神状态下才会写出这样的东西
这是我的黑历史吗，不，这是我的来时路（）
*/
function p_num() {
    var p_num_re = mc.getOnlinePlayers()

    return p_num_re.length;
}
function runtime() {
    o_bdstime = parseInt(osutils.processUptime());
    return (o_bdstime / 60 / 60).toFixed(2);
}
function systime() {
    o_systime = parseInt(osutils.sysUptime());
    return (o_systime / 60 / 60).toFixed(2);
}
function startCPUUpdate() {
    setInterval(function () {
        osutils.cpuUsage(function (value) {
            currCPU = value;
        });
    }, 1000);  // 设置延迟时间为1000毫秒
}

// 程序启动时调用一次startCPUUpdate函数
startCPUUpdate();

// 1. 初始化配置文件
const configFile = spark.getFileHelper('os'); // 申请os目录权限
const defaultConfig = {
    show_ver: true,
    show_protocol: true,
    show_weather: true,
    show_cpu: true,
    show_cpu_count: true,
    show_ram: true,
    show_sys_runtime: true,
    show_bds_runtime: true,
    show_tps: true,
    show_online: true,
    show_gmlib_warn: true // 是否显示 GMLIB 警告
};

// 初始化并自动补全缺失项
configFile.initFile("config.json", defaultConfig);
let local_config = JSON.parse(configFile.getFile("config.json"));

// 注册网页配置面板 (SparkBridge 3.0)
spark.web.createConfig("os")
    .switch("show_ver", local_config.show_ver, "显示游戏版本")
    .switch("show_protocol", local_config.show_protocol, "显示协议版本")
    .switch("show_weather", local_config.show_weather, "显示服务器天气")
    .switch("show_cpu", local_config.show_cpu, "显示CPU占用")
    .switch("show_cpu_count", local_config.show_cpu_count, "显示CPU核数")
    .switch("show_ram", local_config.show_ram, "显示内存占用")
    .switch("show_sys_runtime", local_config.show_sys_runtime, "显示系统运行时间")
    .switch("show_bds_runtime", local_config.show_bds_runtime, "显示BDS运行时间")
    .switch("show_tps", local_config.show_tps, "显示平均TPS")
    .switch("show_online", local_config.show_online, "显示在线人数")
    .switch("show_gmlib_warn", local_config.show_gmlib_warn, "显示GMLIB缺失警告")
    .register();

// 3. 监听网页配置更新
spark.on("config.update.os", (K, newV) => {
    local_config[K] = newV;
    // 同步保存到本地文件
    configFile.saveFile("config.json", JSON.stringify(local_config, null, 4));
});

// 4. 消息处理逻辑
spark.on('message.group.normal', (e, reply) => {
    const { raw_message, group_id } = e;
    if (group_id !== spark.env.get("main_group")) return;

    if (raw_message === '服务器状态') {

        let cpuUsage = (currCPU * 100.0).toFixed(2) + "%";
        let RamUsed = dealMem(os.totalmem() - os.freemem());
        let RamPercent = (100 * (osutils.totalmem() - osutils.freemem()) / osutils.totalmem()).toFixed(2);
        
        // 动态构建显示数组
        let displayText = [];
        
        // 使用配置项判断是否添加行
        if (local_config.show_ver)         displayText.push(`✨游戏版本：${mc.getBDSVersion()}`);
        if (local_config.show_protocol)    displayText.push(`✨服务器协议：${mc.getServerProtocolVersion()}`);
        if (local_config.show_weather)     displayText.push(`✨服务器天气：${weather()}`);
        if (local_config.show_cpu)         displayText.push(`✨CPU占用: ${cpuUsage}`);
        if (local_config.show_cpu_count)   displayText.push(`✨CPU核数：${osutils.cpuCount()}`);
        if (local_config.show_ram)         displayText.push(`✨内存占用: ${RamUsed}/${RamTotal} ${RamPercent}%`);
        if (local_config.show_sys_runtime) displayText.push(`✨系统已运行：${systime()}小时`);
        if (local_config.show_bds_runtime) displayText.push(`✨BDS已运行：${runtime()}小时`);
        if (local_config.show_tps)         displayText.push(`✨平均TPS: ${getAverageTps()}`);
        if (local_config.show_online)      displayText.push(`✨在线${p_num()}人`);

        // GMLIB 警告判断
        if (!GMLIB_exist && local_config.show_gmlib_warn) {
            displayText.push('\n❗当前无法获取TPS\n请安装GMLIB-LegacyRemoteCallApi依赖\n同时，不要忘记Web中将以下项目设置为依赖集：\nGMLIB\nGMLIB-LegacyRemoteCallApi\n此提示可以在配置面板中关闭');
        }

        // 发送结果（自动处理数组换行）
        reply(displayText.join('\n'));
    }
});