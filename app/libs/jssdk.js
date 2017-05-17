const crypto = require('crypto');
const debug = require('debug')('jswechat:jssdk');
const fs = require('fs');
const request = require('request');

function JSSDK(appId, appSecret) {
	this.appId = appId;
	this.appSecret = appSecret;
}

JSSDK.prototype = {
	getSignPackage: function (url, done) {
		const instance = this;
		this.getJsApiTicket(function(err, jsApiTicket){
			  if(err) {
				return done(err);
		          }
			  const timestamp = Math.round(Date.now() / 1000);
	                  const noncestr = instance.createNonceStr();
                  
        	          const rawString = `jsapi_ticket=${jsApiTicket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
	                 
                	  const hash = crypto.createHash('sha1');
               		  const signature = hash.update(rawString).digest('hex');
                  
                	  done(null, {
                        	 appId: instance.appId,
                         	 nonceStr: noncestr,
                         	 timestamp,
                         	 url,
                       		 signature,
                        	 rawString
                 	 });
		});
	},
	getJsApiTicket: function (done) {
		const cacheFile = '.jsApiTicket.json';
		const data = this.readCacheFile(cacheFile);
		const time = Math.round(Date.now() / 1000);
		const instance = this;
		if (typeof data.expireTime === 'undefined' || data.expireTime < time) {
			instance.getAccessToken(function (err, accessToken) {
				debug('getAccessToken from server')

				if(err) {
					debug('getJsApiTicket.token.error:', err);
					return done(err, null);
				}
						
				const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${accessToken}`
				request.get(url, function (err, res, body) {
					if(err) {
						debug('getJsApiTicket.request.error:', err, url);
						return done(err, null);
					}
					debug('getJsApiTicket.request.body:', body);
					
					try {
						const data = JSON.parse(body);
						instance.writeCacheFile(cacheFile, {
							expireTime: Math.round(Date.now() / 1000 ) + 7200,
							jsApiTicket: data.ticket  
						})
						done(null, data.ticket)
						
					} catch (e) {
						debug('getJsApiTicket.parse.error:', err, url);
						done(e, null);
					}	
				})
			});
		} else {
			debug('getJsApiTicket from localcache');
			done(null, data.jsApiTicket);
		}
	},
	getAccessToken: function (done) {
		const cacheFile = '.accesstoken.json';
		const data = this.readCacheFile(cacheFile);
                const time = Math.round(Date.now() / 1000);
                const instance = this;
                if (typeof data.expireTime === 'undefined' || data.expireTime < time) {
			debug('getAcesssToken from server')
                        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
                        request.get(url, function (err, res, body) {
                               if(err) {
                                     debug('getAccessToken.request.error:', err, url);
                                     return done(err, null);
                               }
                               debug('getAcessToken.request.body:', body);
                               try {
                                     const data = JSON.parse(body);
                                     instance.writeCacheFile(cacheFile, {
                                                expireTime: Math.round(Date.now() / 1000 ) + 7200,
                                               	accessToken: data.access_token
                                      })
                                      done(null, data.access_token)
                                } catch (e) {
                                      debug('getAcessToken.parse.error:', err, url);
                                      done(e, null);
                                }
                       })
                } else {
			debug('getAccessToken from localcache')
                        done(null, data.accessToken);
		}
	},
	createNonceStr: function () {
		const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
   		const length = chars.length;
		let str = "";
    		for (let i = 0; i < length; i++) {
      			str += chars.substr(Math.round(Math.random() * length), 1);
   		}
    		return str;
	},
	readCacheFile: function (filename) {
		try {
			return JSON.parse(fs.readFileSync(filename))
		} catch (e) {
			debug('read file %s failed: %s', filename, e);
		}			
		
		return {}; 
	},
	writeCacheFile: function (filename, data) {
		return fs.writeFileSync(filename, JSON.stringify(data));
	}
	
};

const jssdk = new JSSDK('wx29a2228d1a16e1e7','a161d6b27b123c73a896f730527a8fd6');
module.exports = jssdk;

//debug(sdk.createNonceStr());
//jssdk.getAccessToken(function(err, accessToken){
//	console.log(arguments);
//});

//jssdk.getJsApiTicket(function(err, jsApiTicket){
//	console.log(arguments);
//});

//jssdk.getSignPackage('http://123.206.212.174/api/wechat', function(err, accessToken){
//	console.log(arguments);
//});
