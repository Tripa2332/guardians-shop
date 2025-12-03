const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  steamId: { type: String, required: true, unique: true },
  displayName: String,
  avatar: String
});

module.exports = mongoose.model('User', UserSchema);
