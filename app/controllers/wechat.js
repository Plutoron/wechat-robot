const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Conversation = mongoose.model('Conversation');
const wechat = require('wechat');
const request = require('request');
const cheerio = require('cheerio');

const jssdk = require('../libs/jssdk')
module.exports = function (app) {
    app.use('/wechat', router);
};

router.get('/hello', function(req, res, next) {
    jssdk.getSignPackage(`http://123.206.212.174${req.url}`, function(err, signPackage) {
        if(err) {
            return next(err);
        }
        res.render('index', {
            title: 'hah',
            signPackage: signPackage,
            pretty: true
        })
    })  
});

var config = {
    token: 'CZFKjfryooFv9C5Hmcew',
    appid: 'wx29a2228d1a16e1e7',
    checkSignature: true // 可选，默认为true。由于微信公众平台接口调试工具在明文模式下不发送签名，所以如要使用该测试工具，请将其设置为false 
};

const handleWechatRequest = wechat(config, function (req, res, next) {
    const message = req.weixin;
    console.log(message, req.query);
    const msgtype = message.MsgType;
    const msgcontent = message.Content;
    if (msgtype !== 'text') {
        return res.reply('无法处理的消息')
    }
    if (!msgcontent) {
        return res.reply('为什么不说话呢')
    }
    
    const keyword = msgcontent;

    request.get({
            url: `https://www.baidu.com/s?wd=${encodeURI(keyword)}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36'
            }
        },function (err, response, body) {
            if (err) {
                console.error(err)
                return res.reply('寻找答案时出错');
            }
            const $ = cheerio.load(body);
            const results = $('.xpath-log.c-container');
            if (results.length === 0) {
                return res.reply('好伤心，我竟然不知道答案')
            }
            let result = '';
            results.each(function (i,item) {
                let ndItem = item;
                let att = $(ndItem).attr();
                let mu = att.mu;
                if (mu.indexOf('baike') > -1) {
                    return result = item;
                }
            })
            // console.log(1,result)
            // const result = $(results.get(0));
            const span = $(result).find('.c-span-last').get(0);
            const p = $(span).find('p').get(0);
            const answer = $(p).text();
            // console.log(1,results);
            // console.log(2,span);
            // console.log(3,p);
            // console.log(4,text);
            res.reply(answer ? answer : '空答案呜呜')
        }
    )
    // if (msgtype == 'text') {  
    //     res.reply({
    //         type: msgtype,
    //         content: msgcontent
    //     });
    // } else if(msgtype == 'image' ||  "voice" || "video") {
    //     res.reply({
    //         type: msgtype,
    //         content: {
    //             mediaId: mediaId
    //         }
    //     });
    // } 
})

const handleUserSync = function (req, res, next) {
    if (!req.query.openid) {
        return next();
    }

    const openid = req.query.openid;
    User.findOne({ openid }).exec(function(err,user){
        if(err){
            return next(err);
        }

        if (user) {
            console.log(`user 存在: ${openid}`);
            req.user = user;
            return next();
        }

        console.log(`create new user: ${openid}`);
        const newUser = new User({
            openid,
            createdAt: new Date(),
            conversationCount: 0
        });

        newUser.save(function (err,user) {
            if (err) {
                return next(err);
            }
            req.user = user;
            next();
        })
    })
}


router.get('/conversation', handleWechatRequest);
router.post('/conversation', handleUserSync, handleWechatRequest);

