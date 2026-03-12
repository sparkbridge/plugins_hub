const fs = require('fs');
const logger = spark.getLogger('DiskInformation')
const { exec } = require('child_process');
const _config = spark.getFileHelper('DiskInformation');

_config.initFile("config.json",{
    Enable: true
})

var jsconfig = JSON.parse(_config.getFile('config.json'));
// const  WebConfigBuilder   = spark.telemetry.WebConfigBuilder;
// let wbc = new WebConfigBuilder("DiskInformation");
// wbc.addSwitch("Enable",jsconfig.Enable,"启用");
// spark.emit("event.telemetry.pushconfig", wbc);


spark.web.createConfig("DiskInformation")
 .switch("Enable",jsconfig.Enable,"启用")
    .register();

spark.on("update.config.DiskInformation", (K, newV) => {
    jsconfig[K] = newV;
    _config.updateFile("config.json",jsconfig);
});

// 返回 Promise，等待 exec 完成后返回磁盘信息
async function getAllDiskInfo() {
    return new Promise((resolve, reject) => {
        exec('Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID,FreeSpace,Size,VolumeName | ConvertTo-Json', { shell: 'powershell.exe' }, (error, stdout, stderr) => {
            if (error) {
                reject(`获取磁盘信息时出错: ${error}`);
                return;
            }
            try {
                const disks = JSON.parse(stdout);
                let diskInfoString = "";
                disks.forEach(disk => {
                    const diskPath = disk.DeviceID;
                    const totalGB = (disk.Size / 1024 / 1024 / 1024).toFixed(2);
                    const freeGB = (disk.FreeSpace / 1024 / 1024 / 1024).toFixed(2);
                    const usedGB = (totalGB - freeGB).toFixed(2);
                    const usagePercentage = (100 * (1 - disk.FreeSpace / disk.Size)).toFixed(2);
                    diskInfoString += `盘${diskPath} ${usedGB}GB/${totalGB}GB ${usagePercentage}%\n`;
                });
                resolve(diskInfoString.trim());
            } catch (parseError) {
                reject(`解析磁盘信息时出错: ${parseError}`);
            }
        });
    });
}

spark.on('message.group.normal', async (e, reply) => {
    const { raw_message, group_id } = e;
    // const jsconfigis = JSON.parse(_config.getFile('config.json'));
    if (raw_message.startsWith('磁盘信息') && group_id == spark.env.get("main_group") && jsconfig.Enable) {
        // console.log('开始获取磁盘信息...');
        try {
            const diskInfo = await getAllDiskInfo();
            reply(diskInfo);
        } catch (error) {
            logger.warn(`出错了: ${error}`);
        }
    }
});
