const Pet = require('../models/Pet');
const configFile = spark.getFileHelper('niuzi');

// 初始化数据文件
configFile.initFile("data.json", {}, false);

// 内存中的数据缓存
const petsData = new Map(); // 使用 Map 结构，性能更好
const runtimeData = {
    regetCooldowns: new Map(), // 记录重置冷却
    marriageProposals: new Map(), // 记录求婚请求 on
    breakupProposals: new Map()   // 记录分手请求 off
};

/**
 * 从 data.json 加载宠物数据到内存
 */
function loadData() {
    const rawData = JSON.parse(configFile.getFile("data.json"));
    for (const ownerId in rawData) {
        const pet = new Pet();
        pet.loadFromJson(rawData[ownerId]);
        //console.log(`[牛子系统] 加载了 ${pet.petName} (${ownerId}) 的数据。`);
        petsData.set(ownerId, pet);
    }
    console.log(`[牛子系统] 成功加载 ${petsData.size} 条宠物数据。`);
}

/**
 * 将内存中的所有宠物数据保存到 data.json
 */
function saveData() {
    const dataToSave = {};
    for (const [ownerId, pet] of petsData.entries()) {
        dataToSave[ownerId] = pet.saveAsJson();
    }
    configFile.updateFile("data.json", dataToSave);
}

// 导出模块
module.exports = {
    petsData,
    runtimeData,
    loadData,
    saveData
};