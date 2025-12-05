const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    discordUsername: String,
    steamId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    avatar: String,
    authProvider: {
        type: String,
        enum: ['discord', 'steam', 'local'],
        default: 'local'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Índices para mejor performance
userSchema.index({ discordId: 1 });
userSchema.index({ steamId: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);