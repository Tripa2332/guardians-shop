
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  paymentId: { 
    type: String, 
    required: true, 
    unique: true // IMPORTANTE: Evita duplicados a nivel base de datos
  },
  productSku: String,
  productName: String,
  price: Number,
  quantity: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'delivered', 'failed_delivery', 'refunded'], 
    default: 'pending' 
  },
  deliveryStatus: {
    type: String,
    default: 'pending' // Para saber si el RCON funcionó
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);