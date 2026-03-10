spark.web.registerPage("网页聊天", "index.html");

let chatlog = [];

function addChatLog(name,content) {
    chatlog.push({
        name,
        content,
        time: new Date().getTime()
    });
    if (chatlog.length > 50) {
        chatlog.shift();
    }
}

mc.listen("onChat", (player, message) => {
    addChatLog(player.name, message);
});

spark.web.registerApi("GET", "/webtalk/chatlog/",(req,res)=>{
    res.json({ code: 200, data: chatlog, msg: "success", });
})

spark.web.registerApi("POST", "/webtalk/send/", (req, res) => {
    const { name, content } = req.body;
    mc.broadcast(`[控制台] ${content}`);
    addChatLog('网页面板', content);
    res.json({ code: 200, msg: "发送成功", });
})