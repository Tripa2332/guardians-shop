// public/assets/js/animated-background.js
class AnimatedBackground {
    constructor(containerSelector = 'body') {
        this.createBackgroundStyle();
    }

    createBackgroundStyle() {
        // Crear un elemento div para el background animado
        const bgElement = document.createElement('div');
        bgElement.id = 'animated-bg';
        bgElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
            background: radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.03) 0%, transparent 70%);
            animation: glowMove 20s ease-in-out infinite;
        `;
        
        document.body.insertBefore(bgElement, document.body.firstChild);
        
        // Crear las animaciones CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes glowMove {
                0%, 100% {
                    background: radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.03) 0%, transparent 70%);
                }
                50% {
                    background: radial-gradient(ellipse at 55% 45%, rgba(255, 215, 0, 0.04) 0%, transparent 70%);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Exportar para uso global
window.AnimatedBackground = AnimatedBackground;