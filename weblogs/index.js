spark.web.registerPage("日志查看器", "index.html")

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ================= 缓存系统 =================
// 结构：Map<String(日期), Object{ data: Array(全量数据), timestamp: Number(存入时间) }>
const CACHE_TTL = 10 * 60 * 1000; // 缓存存活时间：10 分钟 (单位：毫秒)
const logCache = new Map();

// 定时清理过期缓存 (每分钟执行一次，防止不被访问的缓存导致内存泄漏)
setInterval(() => {
    const now = Date.now();
    for (const [date, cacheObj] of logCache.entries()) {
        if (now - cacheObj.timestamp > CACHE_TTL) {
            logCache.delete(date);
            // console.log(`[Cache] 释放过期日志缓存: ${date}`);
        }
    }
}, 60 * 1000);

// 核心过滤与分页逻辑封装（供缓存读取和文件读取共同使用）
const processAndRespond = (allRecords, queryParams, res) => {
    const page = parseInt(queryParams.page) || 1;
    const pageSize = parseInt(queryParams.pageSize) || 15;
    const {
        dimension, source, sourceX, sourceY, sourceZ,
        event, target, targetX, targetY, targetZ, additionalInfo
    } = queryParams;

    // 执行多条件过滤
    const filteredRecords = allRecords.filter(record => {
        let isMatch = true;
        if (isMatch && !fuzzyMatch(record.dimension, dimension)) isMatch = false;
        if (isMatch && !fuzzyMatch(record.source, source)) isMatch = false;
        if (isMatch && !fuzzyMatch(record.event, event)) isMatch = false;
        if (isMatch && !fuzzyMatch(record.target, target)) isMatch = false;
        if (isMatch && !fuzzyMatch(record.additionalInfo, additionalInfo)) isMatch = false;

        if (isMatch && !exactMatch(record.sourceX, sourceX)) isMatch = false;
        if (isMatch && !exactMatch(record.sourceY, sourceY)) isMatch = false;
        if (isMatch && !exactMatch(record.sourceZ, sourceZ)) isMatch = false;
        if (isMatch && !exactMatch(record.targetX, targetX)) isMatch = false;
        if (isMatch && !exactMatch(record.targetY, targetY)) isMatch = false;
        if (isMatch && !exactMatch(record.targetZ, targetZ)) isMatch = false;

        return isMatch;
    });

    // 执行分页
    const total = filteredRecords.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    res.json({
        code: 200,
        message: '成功',
        data: {
            total: total,
            records: paginatedRecords
        }
    });
};


// --- 获取当前日期格式 yyyy-MM-dd ---
const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- 工具函数：模糊匹配与精确匹配 ---
const fuzzyMatch = (fieldValue, queryValue) => {
    if (!queryValue) return true; // 未传参则不限制该条件
    return String(fieldValue).toLowerCase().includes(String(queryValue).toLowerCase());
};

const exactMatch = (fieldValue, queryValue) => {
    if (!queryValue) return true;
    return String(fieldValue) === String(queryValue);
};

// --- 日志接口路由 ---
spark.web.registerApi('GET','/weblogs', (req, res) => {
    const targetDate = req.query.date || getFormattedDate();
    const currentDate = getFormattedDate();
    const isToday = (targetDate === currentDate);

    // 参数安全校验
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        return res.status(400).json({ code: 400, message: '日期格式错误，请使用 YYYY-MM-DD' });
    }
    if ((parseInt(req.query.page) || 1) < 1 || (parseInt(req.query.pageSize) || 15) < 1) {
        return res.status(400).json({ code: 400, message: '分页参数错误' });
    }

    // ---- 1. 尝试从缓存获取 (非当日日志) ----
    if (!isToday && logCache.has(targetDate)) {
        const cacheObj = logCache.get(targetDate);
        // 检查缓存是否在有效期内
        if (Date.now() - cacheObj.timestamp <= CACHE_TTL) {
            // console.log(`[Cache Hit] 直接从内存返回日志: ${targetDate}`);
            // 刷新缓存的存活时间 (可选，实现 LRU 效果。如果你希望绝对时间过期，可注释此行)
            cacheObj.timestamp = Date.now();
            return processAndRespond(cacheObj.data, req.query, res);
        } else {
            // 过期则删除，走下面的文件读取流程
            logCache.delete(targetDate);
        }
    }

    // ---- 2. 从文件读取 ----
    const fileName = `BehaviorLog-${targetDate}.csv`;
    const filePath ='./logs/'+ fileName;

    if (!fs.existsSync(filePath)) {
        return res.json({ code: 200, message: '成功', data: { total: 0, records: [] } });
    }

    const allRecords = [];
    let isFirstLine = true;

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf8' }),
        crlfDelay: Infinity
    });

    rl.on('line', (line) => {
        if (!line.trim()) return;
        if (isFirstLine) { isFirstLine = false; return; } // 跳过表头

        const parts = line.split(',');
        const additionalInfoFull = parts.length > 11 ? parts.slice(11).join(',') : '';

        allRecords.push({
            time: parts[0] || '',
            dimension: parts[1] || '',
            source: parts[2] || '',
            sourceX: parts[3] || '',
            sourceY: parts[4] || '',
            sourceZ: parts[5] || '',
            event: parts[6] || '',
            target: parts[7] || '',
            targetX: parts[8] || '',
            targetY: parts[9] || '',
            targetZ: parts[10] || '',
            additionalInfo: additionalInfoFull || ''
        });
    });

    rl.on('close', () => {
        // 读取完毕后，如果是非当日日志，则写入缓存
        if (!isToday) {
            logCache.set(targetDate, {
                data: allRecords,
                timestamp: Date.now()
            });
            logger.info(`[Cache Set] 已缓存历史日志: ${targetDate}`);
        }

        // 执行过滤与响应
        processAndRespond(allRecords, req.query, res);
    });

    rl.on('error', (err) => {
        console.error(`读取日志文件 ${fileName} 失败:`, err);
        res.status(500).json({ code: 500, message: '服务器内部错误：日志文件读取失败' });
    });
});