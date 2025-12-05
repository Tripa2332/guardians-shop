const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    paymentId: { type: String }, // ID de transacción de MercadoPago
    
    // Estado del PAGO (MercadoPago)
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },

    // Nuevo: Estado de la ENTREGA (RCON)
    deliveryStatus: {
        type: String,
        enum: ['pending', 'delivered', 'failed'],
        default: 'pending'
    },

    // Nuevo: Guardamos el comando exacto para reintentarlo si falla
    rconCommand: { type: String, required: true },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);