/// <reference path="../../SparkBridgeDevelopTool/index.d.ts"/>
const { img } = require("../../handles/msgbuilder");


spark.on('message.group.normal',(e,reply)=>{
    let {group_id} = e;
    if(reBuildRawMessage(e.message) == ' 给我图'){
        let rep = findReply(e.message);
        // console.log(rep);
        if(!rep) return;
        spark.QClient.getMsg(rep).then(res=>{
            let imag = findImg(res.message);
            spark.QClient.sendGroupMsg(group_id,img(imag.data.url));
            // reply(res.sender.nickname+'的图: '+res.url);
        })
    }
})



function reBuildRawMessage(message) {
    return message
        .filter(item => item.type === 'text')
        .map(item => item.data.text)
        .join('');
}

function findReply(msg) {
    // 找到第一个 type 为 'reply' 的 item
    const replyItem = msg.find(item => {
        // console.log(item);
        return item.type === 'reply';
    });
    // 有则返回 id，无则返回 null
    return replyItem ? replyItem.data.id : null;
}

function findImg(msg){
    return msg.find(item => item.type === 'image')
}