const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: {
        type: String,
        index: true
    },
    steamId: {
        type: String,
        index: true
    },
    email: {
        type: String,
        index: true
    },
    name: {
        type: String,
        required: true
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

module.exports = mongoose.model('User', userSchema);