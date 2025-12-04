function cerrarSesion() {
    // 1. Limpiar localStorage
    localStorage.removeItem('currentUser');
    
    // 2. Limpiar sessionStorage (si lo usas)
    sessionStorage.clear();
    
    // 3. Redirigir al logout del servidor
    window.location.href = '/logout';
}