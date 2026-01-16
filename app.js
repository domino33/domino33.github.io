// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker success:', registration);
            })
            .catch(error => {
                console.log('Error ServiceWorker:', error);
            });
    });
}

// Установка PWA
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';

    installBtn.addEventListener('click', () => {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();

        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Пользователь установил PWA');
            }
            deferredPrompt = null;
        });
    });
});

// Проверка установки
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA успешно установлено');
});

// Проверка онлайн/офлайн статуса
window.addEventListener('online', () => {
    console.log('Приложение онлайн');
});

window.addEventListener('offline', () => {
    console.log('Приложение офлайн');
});