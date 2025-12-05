const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  steamId: { type: String, unique: true, sparse: true },
  discordId: { type: String, unique: true, sparse: true },
  displayName: String,
  email: String,
  avatar: String,
  provider: String,
  balance: { type: Number, default: 0 },
  role: { 
      type: String, 
      enum: ['user', 'admin'], 
      default: 'user' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);