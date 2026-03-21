const { petsData, runtimeData, saveData } = require('./dataService');
const Pet = require('../models/Pet');
const config = require('../config');
const { generateRandomID, getRandomNumber, getBattleResult, convertLength } = require('../utils/helpers');
const { isTimeDifferenceGreaterThan, getRemainingMinutes } = require('../utils/timeUtils');

/**
 * 创建一只新宠物
 * @param {string} ownerId - 主人ID
 * @returns {Pet} 新创建的宠物实例
 */
function createPet(ownerId) {
    const petName = `牛子${String(ownerId).slice(-4)}`;
    const petId = generateRandomID(5);
    const health = getRandomNumber(1, config.init_cm, true);
    const gender = getRandomNumber(0, 1, true); // 0: 女, 1: 男

    const newPet = new Pet(ownerId, petName, petId, health, gender);
    petsData.set(ownerId, newPet);
    saveData();
    return newPet;
}

/**
 * 根据主人ID获取宠物
 * @param {string} ownerId - 主人ID
 * @returns {Pet | undefined}
 */
function getPet(ownerId) {
    return petsData.get(ownerId.toString());
}

/**
 * 根据宠物唯一ID获取宠物
 * @param {string} petId - 宠物ID
 * @returns {Pet | null}
 */
function getPetById(petId) {
    for (const pet of petsData.values()) {
        if (pet.petId === petId) {
            return pet;
        }
    }
    return null;
}

/**
 * 检查用户是否拥有宠物
 * @param {string} ownerId - 主人ID
 * @returns {boolean}
 */
function hasPet(ownerId) {
    return petsData.has(ownerId);
}

/**
 * 丢弃宠物
 * @param {string} ownerId - 主人ID
 * @returns {{success: boolean, message: string}} 操作结果
 */
function removePet(ownerId) {
    const pet = getPet(ownerId);
    if (pet && pet.spouseId) {
        return { success: false, message: "你的牛子有对象，无法抛弃！" };
    }

    petsData.delete(ownerId);
    const cooldownEnd = Date.now() + (config.reget_cd * 60000);
    runtimeData.regetCooldowns.set(ownerId, cooldownEnd);
    saveData();

    return { success: true, message: "你的牛子没了" };
}

/**
 * 修改宠物名称
 * @param {string} ownerId - 主人ID
 * @param {string} newName - 新名称
 * @returns {{success: boolean, message: string}}
 */
function changeName(ownerId, newName) {
    const pet = getPet(ownerId);
    if (!newName) {
        return { success: false, message: "请提供新的牛子名称!" };
    }
    if (newName.length > 10) {
        return { success: false, message: "牛子名称最多10个字符!" };
    }
    pet.petName = newName;
    saveData();
    return { success: true, message: `牛子的名称已被修改为：${pet.petName}` };
}

/**
 * 宠物变性
 * @param {string} ownerId - 主人ID
 * @returns {{success: boolean, message: string}}
 */
function transgender(ownerId) {
    const pet = getPet(ownerId);
    const healthLost = Math.floor(pet.health / 5);
    pet.gender = pet.gender === 0 ? 1 : 0; // 切换性别
    pet.health -= healthLost;
    saveData();
    return { success: true, message: "你的牛子变性了，并为此付出了代价！" };
}

/**
 * 处理两只宠物比划的逻辑
 * @param {string} attackerId - 攻击方主人ID
 * @param {string} defenderId - 防守方主人ID
 * @returns {{success: boolean, message: string}}
 */
function battle(attackerId, defenderId) {
    const attackerPet = getPet(attackerId);
    const defenderPet = getPet(defenderId);

    // 检查冷却时间
    if (!isTimeDifferenceGreaterThan(attackerPet.battleTimestamp, config.pkCD)) {
        const remaining = getRemainingMinutes(attackerPet.battleTimestamp + config.pkCD * 60000);
        return { success: false, message: `${attackerPet.petName} 红肿了，需要等 ${remaining} 分钟` };
    }
    if (!isTimeDifferenceGreaterThan(defenderPet.battleTimestamp, config.pkCD)) {
        const remaining = getRemainingMinutes(defenderPet.battleTimestamp + config.pkCD * 60000);
        return { success: false, message: `${defenderPet.petName} 红肿了，需要等 ${remaining} 分钟` };
    }

    // 设置新的冷却时间
    const now = Date.now();
    attackerPet.battleTimestamp = now;
    defenderPet.battleTimestamp = now;

    // 计算伤害
    const attack = getRandomNumber(1, (Math.abs(attackerPet.health) + Math.abs(defenderPet.health) / 4), true);
    const resultType = getBattleResult(config);

    if (resultType === null) {
        return { success: false, message: '---=牛子系统=---\n参数有误，概率之和不为1' };
    }

    let resultMessage = `---=牛子系统=---\n${attackerPet.petName} 和 ${defenderPet.petName} 开始比划\n`;

    if (resultType === 1) { // 攻击方赢
        attackerPet.health += attack;
        defenderPet.health -= attack;
        resultMessage += `${attackerPet.petName} 赢得了${convertLength(attack)}！`;
    } else if (resultType === 2) { // 防守方赢
        attackerPet.health -= attack;
        defenderPet.health += attack;
        resultMessage += `${defenderPet.petName} 赢得了${convertLength(attack)}！`;
    } else { // 双输
        attackerPet.health -= attack;
        defenderPet.health -= attack;
        resultMessage += `两败俱伤！ 都输掉了${convertLength(attack)}！`;
    }

    saveData();
    return { success: true, message: resultMessage };
}

/**
 * 获取牛子排行榜
 * @returns {Array<{petName: string, health: number, ownerId: string}>} 排序后的数组
 */
function getRanking() {
    const dataArray = Array.from(petsData.values());
    dataArray.sort((a, b) => b.health - a.health); // 按health倒序排序

    return dataArray.map(item => ({
        petName: item.petName,
        health: item.health,
        ownerId: item.ownerId
    }));
}

/**
 * 发起搞对象请求
 * @param {string} proposerId - 求婚者ID
 * @param {string} targetId - 被求婚者ID
 * @returns {{success: boolean, message: string}}
 */
function proposeMarriage(proposerId, targetId) {
    const proposerPet = getPet(proposerId);
    const targetPet = getPet(targetId);

    if (proposerPet.spouseId) return { success: false, message: "你已经有对象了!" };
    if (targetPet.spouseId) return { success: false, message: "对方已经有对象了!" };
    if (proposerPet.gender === targetPet.gender) return { success: false, message: "同性怎么搞？" };

    runtimeData.marriageProposals.set(targetId, proposerPet.petId);
    return { success: true, message: "请求已发出，请等待对方回应" };
}

/**
 * 发起分手请求
 * @param {string} initiatorId - 发起者ID
 * @returns {{success: boolean, message: string}}
 */
function initiateBreakup(initiatorId) {
    const initiatorPet = getPet(initiatorId);
    if (!initiatorPet.spouseId) {
        return { success: false, message: "你还没有对象!" };
    }
    const spousePet = getPetById(initiatorPet.spouseId);
    if (!spousePet) {
        // 数据冗余处理，如果对象不存在，直接解除关系
        initiatorPet.spouseId = null;
        saveData();
        return { success: false, message: "你的对象找不到了，已自动分手。" };
    }

    runtimeData.breakupProposals.set(spousePet.ownerId, initiatorPet.petId);
    return { success: true, message: "分手请求已发出，请等待对方回应" };
}

/**
 * 处理（搞对象/分手）请求
 * @param {string} responderId - 回应者ID
 * @param {'搞对象'|'分手'} type - 请求类型
 * @param {'同意'|'拒绝'} decision - 决定
 * @returns {{success: boolean, message: string}}
 */
function handleProposal(responderId, type, decision) {
    const proposalMap = type === '搞对象' ? runtimeData.marriageProposals : runtimeData.breakupProposals;
    const initiatorPetId = proposalMap.get(responderId);

    if (!initiatorPetId) {
        return { success: false, message: `当前没有人向你发起${type}请求！` };
    }

    if (decision === '拒绝') {
        proposalMap.delete(responderId);
        return { success: true, message: `已拒绝对方的${type}请求。` };
    }

    // --- 同意逻辑 ---
    const responderPet = getPet(responderId);
    const initiatorPet = getPetById(initiatorPetId);

    if (!initiatorPet) {
        return { success: false, message: "对方的牛子不见了，操作失败。" };
    }

    if (type === '搞对象') {
        if (responderPet.spouseId || initiatorPet.spouseId) {
            proposalMap.delete(responderId);
            return { success: false, message: "你或对方在此期间已经有对象了，操作失败。" };
        }
        responderPet.spouseId = initiatorPet.petId;
        initiatorPet.spouseId = responderPet.petId;
    } else { // 分手
        responderPet.spouseId = null;
        initiatorPet.spouseId = null;
    }

    proposalMap.delete(responderId);
    saveData();
    return { success: true, message: `${type}成功！` };
}

/**
 * 贴贴功能
 * @param {string} ownerId - 发起贴贴的主人ID
 * @returns {{success: boolean, message: string}}
 */
function cuddle(ownerId) {
    const pet = getPet(ownerId);
    const spouse = getPetById(pet.spouseId);

    if (pet.recoveryTimestamp && Date.now() < pet.recoveryTimestamp) {
        const remaining = getRemainingMinutes(pet.recoveryTimestamp);
        return { success: false, message: `还在休息，剩余${remaining}分钟` };
    }

    const addedLength = getRandomNumber(1, config.tt_grow, true);
    pet.health += addedLength;
    spouse.health += addedLength;

    const cooldownMinutes = getRandomNumber(config.tt_cd, config.tt_cd + 20, true); // 增加一些随机性
    const cooldownEnd = Date.now() + cooldownMinutes * 60000;
    pet.recoveryTimestamp = cooldownEnd;
    spouse.recoveryTimestamp = cooldownEnd;

    saveData();
    return { success: true, message: `---=牛子系统=---\n贴上了，都增加了${addedLength} cm，但是都需要休息${cooldownMinutes}分钟` };
}


module.exports = {
    createPet,
    getPet,
    getPetById,
    hasPet,
    removePet,
    changeName,
    transgender,
    battle,
    getRanking,
    proposeMarriage,
    initiateBreakup,
    handleProposal,
    cuddle
};