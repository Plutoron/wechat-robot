// 用户存储数据模型 

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ConversationSchema = new Schema({
  user: { type: Schema.ObjectId, ref: 'User', required: '`user`必填字段' },
  question: { type: String, required: '`question`是必填' },
  answer: { type: String, default: ''},
  createAt: { type: Date, required: '`createdAt`是必填'}
});

mongoose.model('Conversation', ConversationSchema);

