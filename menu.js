const request = require('request');
const jssdk = require('./app/libs/jssdk');
const schedule = require('node-schedule');

const menuItem = {
	'button': [
		{
			'type': 'click',
			'name': '问答历史',
			'key': 'conversation-history'
		},
		{
			'type': 'view',
			'name': '随机问答',
			'url': "http://123.206.212.174/wechat/random" //这里要双引号！！！
		}
	]
};

doMenuSync();

// schedule.scheduleJob({ second: 0,minute: 0 }, function(){
//   console.log('The answer to life, the universe, and everything!');
//   doMenuSync();
// });

// setInterval(function () {
// 	console.log(new Date());
// }, 2000);

function doMenuSync() {
	jssdk.getAccessToken(function (err, token) {
		if (err) {
			return console.error('获取 access_token 失败');
		}
		console.log({ token });

		request.get(`https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${token}`,function (err,response,body) {
			if (err) {
				return console.error('菜单删除失败');
			}
			console.log('菜单删除成功',body)
		})

		request.post({ 
			url: `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${token}`,
			json: menuItem
		},function (err,response,body) {
			if (err) {
				return console.error('菜单创建失败');
			}
			console.log('菜单创建成功',body)
		})
	})
}

