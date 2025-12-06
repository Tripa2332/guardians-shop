# 🎮 Guardians Shop - E-commerce Automático para Servidores de Juegos

**Guardians Shop** es una solución completa de comercio electrónico diseñada para servidores de juegos (ARK, Minecraft, Rust, etc.). Permite a los jugadores comprar ítems o rangos VIP utilizando **Mercado Pago** y recibir sus recompensas automáticamente en el juego a través de **RCON**, sin intervención de administradores.

---

## 🚀 Características Principales

* **Automatización Total:** Entrega de ítems y rangos en tiempo real tras el pago mediante comandos RCON.
* **Pagos en Latinoamérica:** Integración nativa con la pasarela de **Mercado Pago**.
* **Autenticación Gamer:** Login seguro con **Steam** y **Discord** (Passport.js).
* **Panel de Administración:** Gestión de productos, control de stock y visualización de órdenes.
* **Seguridad Robusta:** Protección de sesiones con MongoDB Store y manejo de webhooks verificados.
* **Historial de Compras:** Los usuarios pueden ver sus compras pasadas y estado de entrega.
* **Base de Datos Escalable:** Backend construido sobre MongoDB y Mongoose.

---

## 📋 Requisitos Previos

Para desplegar esta tienda necesitas:

* **Node.js** (Versión 20.x o superior recomendada).
* **MongoDB** (Instancia local o cluster en MongoDB Atlas).
* **Cuenta de Mercado Pago** (Para obtener las credenciales de desarrollador).
* **Servidor de Juego con RCON habilitado**.

---

## 🛠️ Instalación Paso a Paso

1.  **Descargar el código:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd guardians-shop
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar el entorno:**
    * Crea un archivo llamado `.env` en la raíz del proyecto.
    * Copia el contenido de `.env.example` o usa la siguiente plantilla y rellena tus datos:

    ```env
    # Configuración del Servidor
    PORT=3000
    BASE_URL=http://localhost:3000
    SESSION_SECRET=tu_secreto_super_seguro_aqui

    # Base de Datos
    MONGO_URI=mongodb://localhost:27017/guardians-shop

    # Pasarela de Pagos (Mercado Pago)
    MP_ACCESS_TOKEN=TU_ACCESS_TOKEN_DE_MERCADO_PAGO
    MP_PUBLIC_KEY=TU_PUBLIC_KEY_DE_MERCADO_PAGO
    WEBHOOK_URL=[https://tu-dominio-publico.com](https://tu-dominio-publico.com)
    # Nota: WEBHOOK_URL debe ser HTTPS y accesible desde internet (usa ngrok para local)

    # Conexión RCON (Servidor del Juego)
    RCON_HOST=127.0.0.1
    RCON_PORT=25575
    RCON_PASSWORD=tu_contraseña_rcon

    # Autenticación Social
    STEAM_API_KEY=TU_API_KEY_DE_STEAM
    DISCORD_CLIENT_ID=TU_CLIENT_ID_DISCORD
    DISCORD_CLIENT_SECRET=TU_CLIENT_SECRET_DISCORD
    ```

4.  **Cargar productos iniciales (Opcional):**
    Si tienes un script de "seed", puedes ejecutarlo:
    ```bash
    npm run seed
    ```

---

## ▶️ Ejecución

### Modo Desarrollo (con reinicio automático)
```bash
npm run dev
## Instalación

1. Copia `.env.example` a `.env`
2. Llena `.env` con tus credenciales
3. `npm install`
4. `npm start`



