class Pet {
    constructor(ownerId, petName, petId, health, gender, battleTimestamp = null, recoveryTimestamp = null, spouseId = null) {
        this.ownerId = ownerId; // 宠物主人ID
        this.petName = petName; // 宠物名称
        this.petId = petId;     // 宠物唯一ID
        this.health = health;   // 宠物生命值
        this.battleTimestamp = battleTimestamp; // 宠物战斗时间戳
        this.recoveryTimestamp = recoveryTimestamp; // 宠物恢复时间戳
        this.gender = gender;   // 宠物性别
        this.spouseId = spouseId; // 宠物配偶ID
    }

    loadFromJson(json) {
        if (typeof json === 'string') {
            json = JSON.parse(json);
        }
        this.ownerId = json.ownerId;
        this.petName = json.petName;
        this.petId = json.petId;
        this.health = json.health;
        this.battleTimestamp = json.battleTimestamp;
        this.recoveryTimestamp = json.recoveryTimestamp;
        this.gender = json.gender;
        this.spouseId = json.spouseId || null;
    }

    saveAsJson() {
        return { // 返回对象而不是字符串，以便于数据服务统一处理
            ownerId: this.ownerId,
            petName: this.petName,
            petId: this.petId,
            health: this.health,
            battleTimestamp: this.battleTimestamp,
            recoveryTimestamp: this.recoveryTimestamp,
            gender: this.gender,
            spouseId: this.spouseId
        };
    }

    getMinutesSinceLastBattle() {
        if (!this.battleTimestamp) return Infinity;
        const now = Math.floor(Date.now() / 1000);
        const minutesSinceLastBattle = Math.floor((now - this.battleTimestamp) / 60);
        return minutesSinceLastBattle;
    }
}
module.exports = Pet;