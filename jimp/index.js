const { Jimp, loadFont } = require('jimp');

// 直接把完整的字体常量库导出
const fonts = require('jimp/fonts');

spark.env.set("jimp_lib",{
    Jimp,           // 核心类：让他们自己去 read 图片
    loadFont,       // 加载器：让他们自己去解析字体
    jimpFonts: fonts // 字体包：16种字体让他们自己挑
});