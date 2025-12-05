const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Eliminamos 'required: true' para que puedan entrar usuarios de Discord
  steamId: { type: String, unique: true, sparse: true }, 
  discordId: { type: String, unique: true, sparse: true }, // Nuevo campo
  displayName: String,
  avatar: String,
  email: String,
  provider: String, // Para saber si es de 'steam' o 'discord'
  balance: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);