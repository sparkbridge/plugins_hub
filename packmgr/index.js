/// <reference path="../../SparkBridgeDevelopTool/index.d.ts"/>
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // 统一使用原生 promise 版本
const { constants } = require('fs');
const AdmZip = require('adm-zip');

spark.web.registerPage("资源包管理", 'index.html');

const BDS_PATH = './'; // 修改为你的 BDS 根目录
var WORLD_NAME = 'Bedrock level';    // 修改为你的世界名


const CFG = {"levelname":"Bedrock level"};

let fileObj = spark.getFileHelper("packmgr");
fileObj.initFile("pack_registry.json",[]);
fileObj.initFile("config.json",CFG);
const config = JSON.parse(fileObj.read('config.json'));
const pack_registry = JSON.parse(fileObj.read("pack_registry.json"));
WORLD_NAME = config.levelname;

spark.web.createConfig("packmgr").text("levelname",config.levelname,"地图名称").register();

spark.on("update.config.packmgr", (k,v) => {
    config[k] = v;
    WORLD_NAME = v;
    fileObj.write("config.json",config);
})

// const REGISTRY_FILE = path.join(BDS_PATH, 'pack_registry.json'); // 新增：用于记录通过 API 上传的包

const upload = multer({ dest: 'uploads/' }).single('file'); // 匹配前端 formData.append('file', file)

const progressStore = {
    task: '等待中',
    percent: 0,
    status: 'idle'
};

// --- 异步辅助函数 ---

/**
 * 异步检查文件/文件夹是否存在
 */
async function checkExists(filePath) {
    try {
        await fs.access(filePath, constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * 异步获取包的注册表
 */
function getPackRegistry() {
        try {
            return JSON.parse(fileObj.read('pack_registry.json'));
        } catch (e) {
            return [];
        }
    
}

/**
 * 异步保存包的注册表
 */
 function savePackRegistry(data) {
    fileObj.write("pack_registry.json",data);
}

/**
 * 递归扫描目录，找出所有包含 manifest.json 的文件夹路径
 */
async function findPackDirectories(baseDir) {
    let packDirs = [];

    async function scan(currentDir) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        let hasManifest = false;

        for (const entry of entries) {
            if (entry.name === 'manifest.json' && entry.isFile()) {
                hasManifest = true;
                break;
            }
        }

        // 如果当前目录有 manifest，说明这是一个包的根目录，直接记录
        if (hasManifest) {
            packDirs.push(currentDir);
        } else {
            // 如果没有，就继续往子文件夹深挖
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
                    await scan(path.join(currentDir, entry.name));
                }
            }
        }
    }

    await scan(baseDir);
    return packDirs;
}

// --- API 注册区 ---

spark.web.registerApi("get", "/packmgr/track", (req, res) => {
    res.json(progressStore);
});

spark.web.registerApi("post", "/packmgr/upload", (req, res) => {
    const runMulter = () => new Promise((resolve, reject) => {
        progressStore.task = '正在接收文件...';
        progressStore.percent = 0;
        progressStore.status = 'processing';

        upload(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    (async () => {
        let tempExtractBase = '';
        try {
            await runMulter();
            if (!req.file) throw new Error('未收到文件');

            progressStore.task = '正在解压文件...';
            progressStore.percent = 20;
            tempExtractBase = path.join(__dirname, 'temp', req.file.filename);
            await fs.mkdir(tempExtractBase, { recursive: true });

            const zip = new AdmZip(req.file.path);
            zip.extractAllTo(tempExtractBase, true);

            progressStore.task = '正在全面扫描包内容...';
            progressStore.percent = 40;

            // 获取解压出来的所有模组包路径（通常 .mcaddon 会扫出2个）
            const packDirs = await findPackDirectories(tempExtractBase);
            if (packDirs.length === 0) {
                throw new Error('在压缩包内未找到任何 manifest.json，非合法模组包');
            }

            const registry =  getPackRegistry();
            const installedPacks = [];

            // 核心环节：循环处理找出的每一个包
            for (let i = 0; i < packDirs.length; i++) {
                const currentPackDir = packDirs[i];
                progressStore.task = `正在处理第 ${i + 1}/${packDirs.length} 个包...`;
                progressStore.percent = 40 + Math.floor((40 / packDirs.length) * (i + 1));

                // 1. 解析
                const manifest = JSON.parse(await fs.readFile(path.join(currentPackDir, 'manifest.json'), 'utf-8'));
                const { uuid } = manifest.header;
                const isResource = manifest.modules.some(m => m.type === 'resources');

                const packTypeFolder = isResource ? 'resource_packs' : 'behavior_packs';
                const packTypeStr = isResource ? 'resource' : 'behavior';
                const configFileName = isResource ? 'world_resource_packs.json' : 'world_behavior_packs.json';

                const finalPackDir = path.join(BDS_PATH, packTypeFolder, uuid);
                const worldConfigPath = path.join(BDS_PATH, 'worlds', WORLD_NAME, configFileName);

                // 2. 搬运文件
                await fs.mkdir(path.dirname(finalPackDir), { recursive: true });
                if (await checkExists(finalPackDir)) {
                    await fs.rm(finalPackDir, { recursive: true, force: true });
                }
                await fs.cp(currentPackDir, finalPackDir, { recursive: true });

                // 3. 修改世界配置 (启用)
                let configData = [];
                if (await checkExists(worldConfigPath)) {
                    configData = JSON.parse(await fs.readFile(worldConfigPath, 'utf-8'));
                }
                const entry = { pack_id: uuid, version: manifest.header.version };
                const idx = configData.findIndex(p => p.pack_id === uuid);
                if (idx > -1) configData[idx] = entry;
                else configData.push(entry);
                await fs.writeFile(worldConfigPath, JSON.stringify(configData, null, 2));

                // 4. 登记到注册表
                const existingRegIdx = registry.findIndex(p => p.uuid === uuid);
                if (existingRegIdx > -1) {
                    registry[existingRegIdx].name = manifest.header.name;
                    registry[existingRegIdx].type = packTypeStr;
                } else {
                    const nextId = registry.length > 0 ? Math.max(...registry.map(p => p.id)) + 1 : 1;
                    registry.push({
                        id: nextId,
                        uuid: uuid,
                        name: manifest.header.name,
                        type: packTypeStr
                    });
                }

                installedPacks.push(manifest.header.name);
            }

            progressStore.task = '正在保存配置...';
            progressStore.percent = 95;
            savePackRegistry(registry);

            progressStore.task = '安装完成';
            progressStore.percent = 100;
            progressStore.status = 'success';

            // 彻底清理临时文件
            await fs.rm(tempExtractBase, { recursive: true, force: true });
            await fs.unlink(req.file.path);

            res.json({
                success: true,
                msg: `安装成功！共装载 ${installedPacks.length} 个模块: ${installedPacks.join(', ')}`
            });

        } catch (error) {
            console.error(error);
            progressStore.task = `出错: ${error.message}`;
            progressStore.status = 'error';
            res.json({ success: false, msg: error.message });

            if (req.file && await checkExists(req.file.path)) await fs.unlink(req.file.path).catch(() => { });
            if (tempExtractBase && await checkExists(tempExtractBase)) await fs.rm(tempExtractBase, { recursive: true, force: true }).catch(() => { });
        }
    })();
});


// 接口：获取包列表（纯净版：只读注册表，完全忽略系统自带包）
spark.web.registerApi('get', '/packmgr/list', (req, res) => {
    (async () => {
        try {
            const typeReq = req.query.type || 'resource';
            const isResource = typeReq === 'resource';
            const configFileName = isResource ? 'world_resource_packs.json' : 'world_behavior_packs.json';
            const configPath = path.join(BDS_PATH, 'worlds', WORLD_NAME, configFileName);

            // 1. 获取世界已启用的 UUID 集合
            const enabledUuids = new Set();
            if (await checkExists(configPath)) {
                try {
                    const worldConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
                    worldConfig.forEach(p => enabledUuids.add(p.pack_id));
                } catch (e) { /* 忽略读取错误 */ }
            }

            // 2. 直接从我们自己的注册表中读取
            const registry = getPackRegistry();
            const filteredPacks = registry
                .filter(p => p.type === typeReq)
                .map(p => ({
                    id: p.id,
                    uuid: p.uuid,
                    name: p.name,
                    cover: `/api/plugin/packmgr/icon?uuid=${p.uuid}&type=${typeReq}`,
                    enabled: enabledUuids.has(p.uuid),
                    type: p.type
                }));

            res.json({
                success: true,
                code: 200,
                msg: "获取包列表成功",
                data: filteredPacks
            });
        } catch (error) {
            res.json({ success: false, code: 500, msg: "服务器内部错误" });
        }
    })();
});

// 接口：获取图标
spark.web.registerApi('get', '/packmgr/icon', (req, res) => {
    (async () => {
        const { uuid, type } = req.query;
        const folder = type === 'resource' ? 'resource_packs' : 'behavior_packs';
        const iconPath = path.join(BDS_PATH, folder, uuid, 'pack_icon.png');

        if (await checkExists(iconPath)) {
            res.sendFile(path.resolve(iconPath));
        } else {
            res.status(404).send('Icon not found');
        }
    })();
});

// 接口：切换启用/禁用状态
spark.web.registerApi('post', '/packmgr/toggle', (req, res) => {
    (async () => {
        const { uuid, type, enabled } = req.body;

        const isResource = type === 'resource';
        const configFileName = isResource ? 'world_resource_packs.json' : 'world_behavior_packs.json';
        const globalFolderName = isResource ? 'resource_packs' : 'behavior_packs';

        const configPath = path.join(BDS_PATH, 'worlds', WORLD_NAME, configFileName);
        const globalPackPath = path.join(BDS_PATH, globalFolderName, uuid, 'manifest.json');

        try {
            let configData = [];
            if (await checkExists(configPath)) {
                configData = JSON.parse(await fs.readFile(configPath, 'utf-8'));
            }

            if (enabled === false) {
                // 禁用包
                configData = configData.filter(p => p.pack_id !== uuid);
            } else {
                // 启用包
                const exists = configData.some(p => p.pack_id === uuid);
                if (!exists) {
                    if (await checkExists(globalPackPath)) {
                        const manifest = JSON.parse(await fs.readFile(globalPackPath, 'utf-8'));
                        configData.push({
                            pack_id: uuid,
                            version: manifest.header.version
                        });
                    } else {
                        return res.json({ success: false, msg: "全局目录中找不到该包文件" });
                    }
                }
            }

            await fs.writeFile(configPath, JSON.stringify(configData, null, 2));

            res.json({
                success: true,
                code: 200,
                msg: enabled ? "启用成功" : "禁用成功"
            });
        } catch (err) {
            console.error("切换状态失败:", err);
            res.json({ success: false, msg: "服务器写入失败" });
        }
    })();
});