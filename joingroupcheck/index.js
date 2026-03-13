const { at } = require("../../handles/msgbuilder");
/// <reference path="../../SparkBridgeDevelopTool/index.d.ts"/>

// spark.on("notice.group_decrease",(e)=>{
//     if (e.group_id !== spark.env.get("main_group")) return;
//     spark.QClient.sendGroupMsg(e.group_id,e.user_id+" 退出群聊");

// });
const fileObj = spark.getFileHelper("joingroupcheck");
fileObj.initFile("config.json",{
    enable:true,
    time: 60000,
    kick:true
});
const config = JSON.parse(fileObj.read("config.json"));

spark.web.createConfig("joingroupcheck")
    .switch("enable",config.enable,"是否开启群组加入验证")
    .number("time",config.time,"等待时间，单位毫秒")
    .switch("kick",config.kick,"是否踢人")
    .register();

spark.on("config.update.joingroupcheck",(k,v)=>{
    config[k] = v;
    fileObj.write("config.json",config);
})

/* {
  time: 1773396706,
  self_id: 2837945976,
  post_type: 'notice',
  group_id: 1084041281,
  user_id: 2582152047,
  notice_type: 'group_increase',
  operator_id: 2959435045,
  sub_type: 'invite'
}
 */

let user_check_list = {}

function generateRandomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

spark.on("notice.group_increase",(e)=>{
    if(!config.enable)return;
    if (e.group_id !== spark.env.get("main_group")) return;
    let msg = [];
    let tmp_id = generateRandomString(5);
    msg.push(at(e.user_id));
    msg.push(" 欢迎加入本群，请在"+(config.time / 60000).toFixed(1)+"分钟内发送验证码："+tmp_id);
    spark.QClient.sendGroupMsg(e.group_id,msg);
    user_check_list[e.user_id] = tmp_id;
    setTimeout(() => {
        if(user_check_list[e.user_id] !== undefined){
            delete user_check_list[e.user_id];
            spark.QClient.sendGroupMsg(e.group_id,"验证码已过期，请重新加入群组");
            if(config.kick){
                setTimeout(() => {
                    spark.QClient.setGroupKick(e.group_id, e.user_id);
                }, 3000);
            }
        }
    }, config.time);
});

spark.on("message.group.normal",(e)=>{
    let {raw_message,group_id} = e;
    if(group_id !== spark.env.get("main_group"))return;
    if(raw_message == user_check_list[e.user_id]){ 
        spark.QClient.sendGroupMsg(group_id,"验证成功");
        delete user_check_list[e.user_id];
    }
})