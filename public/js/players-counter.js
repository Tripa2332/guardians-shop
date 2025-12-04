async function actualizarJugadores() {
    try {
        const response = await fetch('/api/players-online');
        const data = await response.json();
        
        const contador = document.querySelector('[data-players]');
        if (contador) {
            contador.textContent = `${data.online}/${data.max} Online`;
        }
    } catch (error) {
        console.error('Error al obtener jugadores:', error);
    }
}

// Actualizar cada 10 segundos
setInterval(actualizarJugadores, 10000);
actualizarJugadores(); // Llamar una vez al cargar