const express = require('express'); 
const router = express.Router();
const Order = require('../models/Order'); // <--- 1. IMPORTAR EL MODELO
const express = require('express');
const MercadoPagoConfig = require('mercadopago').MercadoPagoConfig;
const Preference = require('mercadopago').Preference;
const Payment = require('mercadopago').Payment; // Para consultar el estado
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const { Rcon } = require('rcon-client');
const Product = require('../models/Product');
// --- Obtener usuario actual ---
router.get('/user', (req, res) => {
    if (req.user) {
        res.json({
            name: req.user.displayName || req.user.username,
            avatar: req.user.avatar,
            id: req.user._id,
            balance: req.user.balance,
            provider: req.user.provider
        });
    } else {
        res.json(null);
    }
});

// --- Obtener clave pública de Mercado Pago ---
router.get('/mp-public-key', (req, res) => {
    res.json({ publicKey: process.env.MP_PUBLIC_KEY });
});

// --- 2. NUEVA RUTA: Obtener historial de compras ---
router.get('/my-orders', async (req, res) => {
    // Si no está logueado, devolvemos lista vacía
    if (!req.user) return res.json([]);

    try {
        // Buscamos órdenes que pertenezcan a este usuario (req.user._id)
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 }) // Ordenar por fecha: las más nuevas primero
            .limit(50); // Traer solo las últimas 50

        res.json(orders);
    } catch (error) {
        console.error("Error buscando órdenes:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// 1. Crear Preferencia (Modificado para incluir notification_url y metadata)
router.post('/create_preference', async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findById(productId);
        const user = req.user; // Asumiendo que el usuario está logueado

        // Definimos el comando RCON aquí
        const commandToExecute = `givevip ${user.steamId} ${product.value}`; // Ejemplo

        // Creamos la orden en Mongo PRIMERO con estado pendiente
        const newOrder = new Order({
            user: user._id,
            product: product._id,
            status: 'pending',
            deliveryStatus: 'pending',
            rconCommand: commandToExecute
        });
        await newOrder.save();

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{
                    title: product.name,
                    unit_price: Number(product.price),
                    quantity: 1,
                }],
                // Importante: Enviamos el ID de nuestra orden en Mongo como referencia externa
                external_reference: newOrder._id.toString(),
                // URL donde MercadoPago nos avisará (debe ser HTTPS y pública, usa ngrok para probar en local)
                notification_url: `${process.env.MY_DOMAIN}/api/webhook`, 
                back_urls: {
                    success: `${process.env.MY_DOMAIN}/exito`,
                    failure: `${process.env.MY_DOMAIN}/fallo`,
                    pending: `${process.env.MY_DOMAIN}/pendiente`,
                },
                auto_return: "approved",
            }
        });

        res.json({ id: result.id });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Error al crear preferencia" });
    }
});

// 2. Ruta Webhook (La que recibe el aviso de MercadoPago)
router.post('/webhook', async (req, res) => {
    const { query } = req;
    const topic = query.topic || query.type;
    const paymentId = query.id || query['data.id'];

    try {
        if (topic === 'payment') {
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: paymentId });
            
            // Obtenemos el status y la referencia externa (ID de orden)
            const status = paymentData.status;
            const orderId = paymentData.external_reference;

            if (status === 'approved') {
                // Actualizamos la orden a PAGADO
                // Nota: No entregamos el ítem aquí, dejamos que el CRON lo haga para ser más robustos
                // O puedes intentar entregarlo aquí y si falla, el CRON lo arregla.
                await Order.findByIdAndUpdate(orderId, { 
                    status: 'approved', 
                    paymentId: paymentId 
                });
                console.log(`Orden ${orderId} pagada. Lista para entrega.`);
            }
        }
        res.sendStatus(200); // Responder rápido a MP
    } catch (error) {
        console.error("Webhook error:", error);
        res.sendStatus(500);
    }
});
// 1. Endpoint para Gráficas de Ventas (Ganancias por día)
router.get('/admin/sales-chart', async (req, res) => {
    try {
        const salesData = await Order.aggregate([
            { $match: { status: 'approved' } }, // Solo órdenes pagadas
            {
                $lookup: {
                    from: 'products', // Nombre de tu colección de productos en Mongo (suele ser plural)
                    localField: 'product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' }, // Descomprimir el array
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: "$productInfo.price" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Ordenar por fecha ascendente
        ]);
        res.json(salesData);
    } catch (error) {
        console.error('Error fetching sales chart:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// 2. Endpoint para obtener Logs de RCON (Últimas 50 órdenes)
router.get('/admin/rcon-logs', async (req, res) => {
    try {
        const logs = await Order.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user', 'username steamId') // Traer datos del usuario
            .populate('product', 'name'); // Traer nombre del producto
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo logs' });
    }
});

// 3. Endpoint para Crear Orden Manual (Sin pasar por MercadoPago)
router.post('/admin/manual-order', async (req, res) => {
    const { steamId, productId } = req.body;
    
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

        // Lógica de comando (similar a tu webhook)
        const command = `givevip ${steamId} ${product.value}`; // Ajusta según tus comandos reales

        // Crear la orden directamente como 'approved' pero pendiente de entrega
        const newOrder = new Order({
            // Nota: Si el usuario no existe en tu DB, tendrás que manejarlo o crear un usuario "dummy"
            // Aquí asumo que puedes buscar el usuario o dejarlo null si tu Schema lo permite
            user: req.user ? req.user._id : null, 
            product: product._id,
            status: 'approved',
            deliveryStatus: 'pending', // El CRON se encargará de entregarla
            rconCommand: command,
            paymentId: 'MANUAL_' + Date.now()
        });

        await newOrder.save();
        res.json({ message: 'Orden manual creada. El Cron Job la entregará en breve.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando orden manual' });
    }
});
module.exports = router;