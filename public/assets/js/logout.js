async function cerrarSesion() {
    try {
        // 1. Llamar al endpoint de logout del servidor
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // 2. Limpiar datos locales
            localStorage.removeItem('currentUser');
            sessionStorage.clear();
            
            // 3. Redirigir al login
            window.location.href = '/login';
        } else {
            console.error('Error al cerrar sesión');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}