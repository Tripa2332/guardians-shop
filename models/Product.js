const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true
  },
  nombre: {
    type: String,
    required: true
  },
  descripcion: {
    type: String
  },
  precio: {
    type: Number,
    required: true
  },
  emoji: {
    type: String,
    default: '📦'
  },
  category: {
    type: String,
    enum: ['vips', 'kits', 'dinos', 'blueprints', 'tribelog'],
    default: 'vips'
  },
  activo: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: -1 // -1 = ilimitado
  },
  rconCommand: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', ProductSchema);