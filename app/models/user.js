// 问答数据模型 

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var UserSchema = new Schema({
  openid: { type: String, required: '`openid`是必填' },
  createdAt: { type: Date, required: '`createAt`是必填' },
  conversationCount: { type: Number, default: 0}
});

mongoose.model('User', UserSchema);

