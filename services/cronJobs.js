const cron = require('node-cron');
const Order = require('../models/Order');
const { Rcon } = require('rcon-client');

// Configuración RCON (sácala de tu .env)
const rconOptions = {
    host: process.env.RCON_HOST,
    port: parseInt(process.env.RCON_PORT),
    password: process.env.RCON_PASSWORD
};

const startOrderProcessing = () => {
    // Ejecutar cada minuto (* * * * *)
    cron.schedule('* * * * *', async () => {
        console.log('🔎 Buscando órdenes pendientes de entrega...');

        // Buscar órdenes que:
        // 1. Estén PAGADAS (status: approved)
        // 2. NO hayan sido entregadas (deliveryStatus: pending o failed)
        const ordersToProcess = await Order.find({
            status: 'approved',
            deliveryStatus: { $in: ['pending', 'failed'] }
        }).limit(10); // Procesamos de a 10 para no saturar

        if (ordersToProcess.length === 0) return;

        let rcon;
        try {
            // Intentar conectar RCON
            rcon = await Rcon.connect(rconOptions);
            console.log("✅ Conexión RCON establecida para procesar cola.");

            for (const order of ordersToProcess) {
                try {
                    console.log(`Entregando orden: ${order._id} - Comando: ${order.rconCommand}`);
                    
                    // Ejecutar comando
                    const response = await rcon.send(order.rconCommand);
                    
                    // Si no da error, marcamos como entregado
                    order.deliveryStatus = 'delivered';
                    // Opcional: guardar la respuesta del servidor
                    // order.serverLog = response; 
                    await order.save();
                    console.log(`--> Entregado con éxito.`);

                } catch (cmdError) {
                    console.error(`❌ Fallo al entregar orden ${order._id}:`, cmdError.message);
                    // Marcamos como fallido para reintentar en el siguiente minuto
                    order.deliveryStatus = 'failed';
                    await order.save();
                }
            }

        } catch (connectionError) {
            console.error("🔥 Error fatal: No se pudo conectar al servidor RCON.", connectionError.message);
            // Si no conecta, el cron volverá a intentar el próximo minuto.
        } finally {
            if (rcon) {
                rcon.end();
            }
        }
    });
};

module.exports = startOrderProcessing;