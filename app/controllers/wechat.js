const express = require('express');
const moment = require('moment');
const lodash = require('lodash');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Conversation = mongoose.model('Conversation');
const wechat = require('wechat');
const request = require('request');
const cheerio = require('cheerio');

const jssdk = require('../libs/jssdk')

const baseURL = 'http://123.206.212.174'
module.exports = function (app) {
    app.use('/wechat', router);
};

const getSignPackage = function (req,res,next) {
    // console.log(req.originalUrl)
    // const pathname = req.originalUrl.split('?').shift();
    jssdk.getSignPackage(`${baseURL}${req.originalUrl}`,function (err, signPackage) {
        if (err) {
            return next(err);
        }
        req.signPackage = signPackage;
        next()
    })
}

router.get('/hello', getSignPackage ,function(req, res, next) {
    jssdk.getSignPackage(`${baseURL}${req.url}`, function(err, signPackage) {
        if(err) {
            return next(err);
        }
        res.render('index', {
            title: 'hah',
            signPackage: req.signPackage,
            pretty: true
        })
    })  
});

router.get('/history/:userid' , getSignPackage, function (req,res,next) {
    if(!req.params.userid){
        return next(new Error('非法请求，缺少 userid 参数'))
    }
    User.findOne({ _id: req.params.userid}).exec(function(err,user){
        if(err || !user){
            return next(new Error('没有找到用户'));
        }
        console.log(`find user: ${user}`);
        Conversation.find({ user }).sort('createdAt').limit(20).exec(function (err,conversations) {
            if (err) {
                return next(new Error('查找历史出错'));
            }
            res.render('history', {
                user,conversations,
                signPackage: req.signPackage,
                title: '问答历史',
                moment: moment,
                pretty: true
            })
            // res.jsonp({ user, conversation})
        })
    })
})

router.get('/random', getSignPackage, function (req,res,next) {
   
    Conversation.find().limit(100).exec(function (err,conversations) {
        if (err) {
            return next(new Error('查找随机问答失败'));
        }
        res.render('history', {
            conversations: lodash.shuffle(conversations).slice(0, 20),
            title: '随机问答',
            signPackage: req.signPackage,
            moment: moment,
            pretty: true
        })
    })
})

var config = {
    token: 'CZFKjfryooFv9C5Hmcew',
    appid: 'wx29a2228d1a16e1e7',
    checkSignature: true // 可选，默认为true。由于微信公众平台接口调试工具在明文模式下不发送签名，所以如要使用该测试工具，请将其设置为false 
};

//只处理文本消息
const handleWechatTextMessage = function (req,res,next) {
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
            const results = $('.xpath-log.c-container'); //百度服务相关的dom
            if (results.length === 0) {
                return res.reply('好伤心，我竟然不知道答案')
            }
            let result = '';
            results.each(function (i,item) {
                let ndItem = item;
                let att = $(ndItem).attr();
                let mu = att.mu;
                if (mu.indexOf('baike') > -1) {  //找到百科
                    return result = item;
                }
            })
            const span = $(result).find('.c-span-last').get(0);
            const p = $(span).find('p').get(0);
            const answer = $(p).text().replace(/\s/g,'');
            res.reply(answer ? answer : '空答案呜呜')

             //保存会话历史
            const conversation = new Conversation({
                user: req.user,
                question: msgcontent,
                answer,
                createdAt: new Date()
            });
            conversation.save(function (err, conversation) {
                if (err) {
                    console.error('conversation save err:' , err);
                }
                //更新会话历史
                req.user.conversationCount = req.user.conversationCount + 1;
                req.user.save(function (err,user) {
                    if (err) {
                        return console.error('user conversation stats save error:' , err);
                    }
                })
            })
        }
    )
}

const handleWechatEventMessage = function (req,res,next) {
    const message = req.weixin;
    const event = message.Event;
    const eventKey = message.EventKey;

    if (event === 'CLICK') {
        if (eventKey === 'conversation-history') {
            res.reply(`${baseURL}/wechat/history/${req.user._id.toString()}`);
        }else {
            res.reply('无法处理的单击事件')
        }
    } else {
        res.reply('无法处理的时间类型')
    }
}


const handleWechatRequest = wechat(config, function (req, res, next) {
    const message = req.weixin;
    console.log(message, req.query);
    const msgtype = message.MsgType;
    if (msgtype === 'text') {
        handleWechatTextMessage(req,res,next);
    }
    else if (msgtype === 'event') {
        handleWechatEventMessage(req,res,next);
    }
    else {
        res.reply('无法处理的消息类型')
    }
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

