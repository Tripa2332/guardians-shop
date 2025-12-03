document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('navbar.html');
    const navbarHTML = await response.text();
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    
    // Marcar enlace activo
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link, .nav-link-vip');
    
    navLinks.forEach(link => {
      if (link.getAttribute('href').includes(currentPage)) {
        link.classList.add('active');
      }
    });
  } catch (error) {
    console.error('Error cargando navbar:', error);
  }
});