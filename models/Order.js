const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userSteamId: { type: String, required: true }, // Quién compró
  paymentId: { type: String, required: true }, // ID de MercadoPago
  item: { type: String, required: true }, // Qué compró (ej: "Rex Tek")
  price: Number,
  status: { 
    type: String, 
    enum: ['pending_delivery', 'delivered', 'failed'], 
    default: 'pending_delivery' 
  },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);