class CameraApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.flashBtn = document.getElementById('flashBtn');
        this.captureBtnDesktop = document.getElementById('captureBtnDesktop');
        this.switchCameraBtnDesktop = document.getElementById('switchCameraBtnDesktop');
        this.flashBtnDesktop = document.getElementById('flashBtnDesktop');
        this.gallery = document.getElementById('gallery');
        this.clock = document.getElementById('clock');
        this.clearGalleryBtn = document.getElementById('clearGalleryBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.saveToDeviceBtn = document.getElementById('saveToDeviceBtn');
        this.menuItems = document.querySelectorAll('.menu-item');
        this.cameraSection = document.querySelector('.camera-section');
        this.gallerySection = document.querySelector('.gallery-section');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.photoViewerModal = document.getElementById('photoViewerModal');
        this.themeBtns = document.querySelectorAll('.theme-btn');
        this.styleBtns = document.querySelectorAll('.style-btn');
        this.closeSettingsBtn = document.querySelector('.close-settings');
        
        this.stream = null;
        this.currentCameraIndex = 0;
        this.cameras = [];
        this.photos = [];
        this.currentSection = 'camera';
        this.currentTheme = 'default';
        this.currentButtonStyle = '1';
        this.currentPhotoIndex = 0; // Індекс поточної фотографії у перегляді
        this.permissionGranted = false; // Статус дозволу до камери
        this.permissionChecked = false; // Чи був перевірений дозвіл
        
        // Нові змінні для додаткових функцій
        this.currentZoom = 1.0;
        this.maxZoom = 3.0;
        this.minZoom = 1.0;
        this.zoomStep = 0.2;
        this.timerActive = false;
        this.timerSeconds = 3;
        this.burstMode = false;
        this.burstCount = 5;
        this.burstPhotos = [];
        
        // iOS Safari спеціальні змінні
        this.iosStreamCache = null;
        this.iosPermissionsPermanent = false;
        
        this.settings = {
            autoSave: true,
            autoSaveToDevice: false,
            highQuality: false,
            watermarkEnabled: true,
            showDateTime: true,
            showOwner: true,
            soundEffects: false,
            showNotifications: true,
            currentFilter: 'none',
            slideshowEnabled: false,
            slideshowSpeed: 3,
            gpsEnabled: false,
            weatherEnabled: true,
            calendarEnabled: false,
            darkMode: true,
            showWeather: true,
            facingMode: 'user', // 'user' для передньої, 'environment' для задньої
            videoFillMode: true, // true для повного екрану, false для звичайного режиму
            autoSaveToPhone: true // автоматичне збереження на телефон
        };
        
        // Змінні для слайд-шоу
        this.slideshowInterval = null;
        this.slideshowCurrentIndex = 0;
        this.slideshowIsPlaying = false;
        
        // Змінні для геолокації та контексту
        this.currentLocation = null;
        this.currentWeather = null;
        this.currentEvent = null;
        this.metadataVisible = false;
        
        // PWA встановлення
        this.deferredPrompt = null;
        this.pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
        this.installPwaBtn = document.getElementById('installPwaBtn');
        this.dismissPwaBtn = document.getElementById('dismissPwaBtn');
        this.installAppBtn = document.getElementById('installAppBtn');
        
        this.init();
    }
    
    async init() {
        console.log('Ініціалізація камери...', window.innerWidth, 'x', window.innerHeight);
        console.log('User Agent:', navigator.userAgent);
        console.log('Mobile detection:', /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
        
        // Детекція iOS Safari для діагностики
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS && isSafari) {
            console.log('🍎 Детектовано iOS Safari - використовуємо спеціальну логіку');
            this.showInfo('🍎 iOS Safari підтримка активована');
            
            // ВІДНОВЛЮЄМО всі дозволи при завантаженні
            this.restoreIOSPermissions();
        } else if (isIOS) {
            console.log('🍎 Детектовано iOS (інший браузер)');
        }
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Автоматично перевіряємо та запускаємо камеру
        setTimeout(() => {
            this.autoStartCameraIfPermissions();
        }, 1000);
        
        // Додаємо обробники подій для мобільних кнопок
        this.captureBtn.addEventListener('click', async () => await this.capturePhoto());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.flashBtn.addEventListener('click', () => this.toggleFlash());
        
        // Нові кнопки
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('timerBtn').addEventListener('click', () => this.toggleTimer());
        document.getElementById('burstBtn').addEventListener('click', () => this.toggleBurstMode());
        
        // Додаємо обробники подій для десктопних кнопок
        if (this.captureBtnDesktop) {
            this.captureBtnDesktop.addEventListener('click', async () => await this.capturePhoto());
        }
        if (this.switchCameraBtnDesktop) {
            this.switchCameraBtnDesktop.addEventListener('click', () => this.switchCamera());
        }
        if (this.flashBtnDesktop) {
            this.flashBtnDesktop.addEventListener('click', () => this.toggleFlash());
        }
        
        // Обробники для галереї
        this.clearGalleryBtn.addEventListener('click', () => this.clearGallery());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllPhotos());
        this.saveToDeviceBtn.addEventListener('click', () => this.saveAllToDevice());
        
        // Обробники для мобільного меню
        this.menuItems.forEach(item => {
            item.addEventListener('click', () => this.switchSection(item.dataset.section));
        });
        
        // Обробники для тем
        this.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changeTheme(btn.dataset.theme));
        });
        
        // Обробники для стилів кнопок
        this.styleBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changeButtonStyle(btn.dataset.style));
        });
        
        // Обробник для закриття налаштувань
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        
        // PWA обробники
        if (this.installPwaBtn) {
            this.installPwaBtn.addEventListener('click', () => this.installPWA());
        }
        if (this.dismissPwaBtn) {
            this.dismissPwaBtn.addEventListener('click', () => this.dismissInstallPrompt());
        }
        
        // Обробник для beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 PWA: beforeinstallprompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        // Обробник для appinstalled
        window.addEventListener('appinstalled', () => {
            console.log('📱 PWA: App was installed');
            this.hideInstallPrompt();
            this.showSuccess('📱 Додаток успішно встановлено!');
            this.deferredPrompt = null;
        });
        
        // Обробники для налаштувань
        document.getElementById('autoSave').addEventListener('change', (e) => this.updateSetting('autoSave', e.target.checked));
        document.getElementById('autoSaveToDevice').addEventListener('change', (e) => this.updateSetting('autoSaveToDevice', e.target.checked));
        document.getElementById('highQuality').addEventListener('change', (e) => this.updateSetting('highQuality', e.target.checked));
        document.getElementById('watermarkEnabled').addEventListener('change', (e) => this.updateSetting('watermarkEnabled', e.target.checked));
        document.getElementById('showDateTime').addEventListener('change', (e) => this.updateSetting('showDateTime', e.target.checked));
        document.getElementById('showOwner').addEventListener('change', (e) => this.updateSetting('showOwner', e.target.checked));
        document.getElementById('soundEffects').addEventListener('change', (e) => this.updateSetting('soundEffects', e.target.checked));
        document.getElementById('showNotifications').addEventListener('change', (e) => this.updateSetting('showNotifications', e.target.checked));
        document.getElementById('slideshowEnabled').addEventListener('change', (e) => this.updateSetting('slideshowEnabled', e.target.checked));
        document.getElementById('gpsEnabled').addEventListener('change', (e) => this.updateSetting('gpsEnabled', e.target.checked));
        document.getElementById('weatherEnabled').addEventListener('change', (e) => this.updateSetting('weatherEnabled', e.target.checked));
        document.getElementById('calendarEnabled').addEventListener('change', (e) => this.updateSetting('calendarEnabled', e.target.checked));
        document.getElementById('fullScreenVideo').addEventListener('change', (e) => this.updateSetting('videoFillMode', e.target.checked));
        document.getElementById('autoSaveToPhone').addEventListener('change', (e) => this.updateSetting('autoSaveToPhone', e.target.checked));
        
        // Обробники для фільтрів
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.changeFilter(btn.dataset.filter));
        });
        
        // Обробники для слайд-шоу
        document.getElementById('slideshowSpeed').addEventListener('input', (e) => this.updateSlideshowSpeed(e.target.value));
        document.getElementById('playSlideshow').addEventListener('click', () => this.playSlideshow());
        document.getElementById('pauseSlideshow').addEventListener('click', () => this.pauseSlideshow());
        document.getElementById('stopSlideshow').addEventListener('click', () => this.stopSlideshow());
        
        // Обробник для кнопки слайд-шоу в галереї
        document.getElementById('slideshowGalleryBtn').addEventListener('click', () => this.startGallerySlideshow());
        
        // Додаємо обробники клавіатури для перегляду фотографій
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        
        await this.getCameras();
        await this.startCamera();
        this.loadPhotos();
        this.loadSettings();
        this.loadTheme();
        this.loadWeatherWidget();
        this.loadButtonStyle();
        
        // Додаємо обробник для відстеження змін дозволів
        this.setupPermissionWatcher();
        
        // Перевірка PWA статусу
        this.checkPWAStatus();
        
        // Оновлюємо статус дозволу в UI
        this.updatePermissionStatus();
        
        // Застосовуємо режим заповнення відео
        setTimeout(() => this.applyVideoFillMode(), 500);
        
        // Оновлюємо попередній перегляд водяних знаків
        this.updateWatermarkPreview();
        
        // Оновлюємо попередній перегляд фільтрів
        this.updateFilterPreview(this.settings.currentFilter);
        
        // Ініціалізуємо кнопку перемикання камери
        this.updateCameraSwitchButton();
        

        
        // Додаємо обробник для зміни орієнтації
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
        
        // Додаємо обробник для зміни розміру екрана (також спрацьовує при повороті)
        window.addEventListener('resize', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
        
        // Додаємо обробник для зміни розміру вікна
        window.addEventListener('resize', () => this.handleResize());
    }
    
    handleKeyboardNavigation(event) {
        if (!this.photoViewerModal.style.display || this.photoViewerModal.style.display === 'none') {
            return;
        }
        
        switch (event.key) {
            case 'Escape':
                this.closePhotoViewer();
                break;
            case 'ArrowLeft':
                this.showPreviousPhoto();
                break;
            case 'ArrowRight':
                this.showNextPhoto();
                break;
        }
    }
    
    openPhotoViewer(photoIndex) {
        if (this.photos.length === 0) return;
        
        this.currentPhotoIndex = photoIndex;
        this.showPhotoInViewer();
        this.photoViewerModal.style.display = 'flex';
        
        // Оновлюємо навігаційні кнопки
        this.updateNavigationButtons();
    }
    
    closePhotoViewer() {
        this.photoViewerModal.style.display = 'none';
    }
    
    showPhotoInViewer() {
        const photo = this.photos[this.currentPhotoIndex];
        if (!photo) return;
        
        const fullscreenPhoto = document.getElementById('fullscreenPhoto');
        const photoCounter = document.getElementById('photoCounter');
        const photoTimestamp = document.getElementById('photoTimestamp');
        const photoLocation = document.getElementById('photoLocation');
        const photoWeather = document.getElementById('photoWeather');
        const photoEvent = document.getElementById('photoEvent');
        
        // Встановлюємо зображення
        fullscreenPhoto.src = photo.data;
        
        // Оновлюємо лічильник
        photoCounter.textContent = `${this.currentPhotoIndex + 1} з ${this.photos.length}`;
        
        // Оновлюємо часову мітку
        photoTimestamp.textContent = new Date(photo.timestamp).toLocaleString('uk-UA');
        
        // Оновлюємо метадані
        if (photo.metadata) {
            if (photo.metadata.location) {
                photoLocation.innerHTML = `📍 <strong>Місце:</strong> ${photo.metadata.location.name}`;
                photoLocation.style.display = 'flex';
            } else {
                photoLocation.style.display = 'none';
            }
            
            if (photo.metadata.weather) {
                const weather = photo.metadata.weather;
                photoWeather.innerHTML = `${weather.icon} <strong>Погода:</strong> ${weather.description}, ${weather.temperature}°C`;
                photoWeather.style.display = 'flex';
            } else {
                photoWeather.style.display = 'none';
            }
            
            if (photo.metadata.event) {
                const event = photo.metadata.event;
                photoEvent.innerHTML = `${event.icon} <strong>Подія:</strong> ${event.description}`;
                photoEvent.style.display = 'flex';
            } else {
                photoEvent.style.display = 'none';
            }
        } else {
            // Приховуємо всі метадані якщо їх немає
            photoLocation.style.display = 'none';
            photoWeather.style.display = 'none';
            photoEvent.style.display = 'none';
        }
        
        // Оновлюємо навігаційні кнопки
        this.updateNavigationButtons();
    }
    
    updateNavigationButtons() {
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) {
            prevBtn.style.display = this.currentPhotoIndex > 0 ? 'flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.currentPhotoIndex < this.photos.length - 1 ? 'flex' : 'none';
        }
    }
    
    showPreviousPhoto() {
        if (this.currentPhotoIndex > 0) {
            this.currentPhotoIndex--;
            this.showPhotoInViewer();
        }
    }
    
    showNextPhoto() {
        if (this.currentPhotoIndex < this.photos.length - 1) {
            this.currentPhotoIndex++;
            this.showPhotoInViewer();
        }
    }
    
    saveCurrentPhoto() {
        const photo = this.photos[this.currentPhotoIndex];
        if (photo) {
            this.savePhotoToDevice(photo);
        }
    }
    
    shareCurrentPhoto() {
        const photo = this.photos[this.currentPhotoIndex];
        if (photo) {
            this.sharePhoto(photo);
        }
    }
    
    deleteCurrentPhoto() {
        const photo = this.photos[this.currentPhotoIndex];
        if (photo) {
            if (confirm('Ви впевнені, що хочете видалити цю фотографію?')) {
                this.deletePhoto(photo.id);
                
                // Якщо це була остання фотографія, закриваємо переглядач
                if (this.photos.length === 0) {
                    this.closePhotoViewer();
                    return;
                }
                
                // Оновлюємо індекс
                if (this.currentPhotoIndex >= this.photos.length) {
                    this.currentPhotoIndex = this.photos.length - 1;
                }
                
                // Показуємо нову фотографію
                this.showPhotoInViewer();
            }
        }
    }
    
    updateClock() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        
        this.clock.textContent = now.toLocaleDateString('uk-UA', options);
        
        // Оновлюємо попередній перегляд водяних знаків
        this.updateWatermarkPreview();
    }
    
    updateWatermarkPreview() {
        const now = new Date();
        const dateTimeText = now.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const previewDateTime = document.getElementById('previewDateTime');
        const previewOwner = document.getElementById('previewOwner');
        
        if (previewDateTime) {
            previewDateTime.innerHTML = `
                <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px; line-height: 1.4;">
                    📅 ${dateTimeText}<br>
                    👑 Власниця програми Катерина Миколаївна<br>
                    📍 Київ, Україна<br>
                    🌤️ Сонячно, 22°C
                </div>
            `;
        }
        
        if (previewOwner) {
            previewOwner.style.display = 'none'; // Приховуємо окремий блок власниці, оскільки все разом
        }
    }

    setupPermissionWatcher() {
        // Відстежуємо зміни дозволів через Permissions API
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'camera' })
                .then(permission => {
                    // Відстежуємо зміни дозволу
                    permission.addEventListener('change', () => {
                        console.log('Статус дозволу камери змінився:', permission.state);
                        
                        if (permission.state === 'granted') {
                            this.permissionGranted = true;
                            localStorage.setItem('camera_permission_granted', 'true');
                            this.updatePermissionStatus();
                        } else if (permission.state === 'denied') {
                            this.permissionGranted = false;
                            localStorage.setItem('camera_permission_granted', 'false');
                            
                            // Зупиняємо камеру якщо дозвіл відкликано
                            if (this.stream) {
                                this.stream.getTracks().forEach(track => track.stop());
                                this.stream = null;
                                this.video.srcObject = null;
                            }
                            
                            this.updatePermissionStatus();
                            this.showError('Доступ до камери було відкликано');
                        }
                    });
                })
                .catch(error => {
                    console.log('Permissions API не підтримується:', error);
                });
        }

        // Додатково відстежуємо через MediaDevices API
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', () => {
                console.log('Пристрої медіа змінилися');
                this.getCameras(); // Оновлюємо список камер
            });
        }
    }
    
    // Нова функція для збереження дозволів з розширеними даними
    savePermissionData(granted) {
        const permissionData = {
            granted: granted,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            domain: window.location.hostname,
            protocol: window.location.protocol,
            url: window.location.origin
        };
        
        // Зберігаємо в різних місцях для надійності
        localStorage.setItem('camera_permission_data', JSON.stringify(permissionData));
        sessionStorage.setItem('camera_permission_session', JSON.stringify(permissionData));
        
        // Залишаємо старий формат для сумісності
        localStorage.setItem('camera_permission_granted', granted ? 'true' : 'false');
        
        // Додаткове збереження для HTTPS
        if (window.location.protocol === 'https:') {
            localStorage.setItem('https_camera_permission', granted ? 'true' : 'false');
            localStorage.setItem('https_permission_timestamp', Date.now().toString());
        }
        
        // Якщо дозвіл надано, зберігаємо "назавжди"
        if (granted) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            localStorage.setItem('camera_always_allowed', 'true');
            localStorage.setItem('camera_never_ask', Date.now().toString());
            
            // Для iOS Safari МАКСИМАЛЬНО агресивне збереження
            if (isIOS && isSafari) {
                this.saveIOSPermissionsAggressively();
            } else {
                console.log('📱 Дозвіл збережено стандартно');
            }
        }
    }
    
    async checkCameraPermission() {
        try {
            // Спеціальна перевірка для iOS Safari через sessionStorage
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;
            
            if (isIOS && isSafari) {
                console.log('🍎 iOS режим:', isPWA ? 'PWA (Початковий екран)' : 'Safari браузер');
                
                // СПЕЦІАЛЬНА ЛОГІКА ДЛЯ PWA РЕЖИМУ
                if (isPWA) {
                    console.log('🍎 PWA: Спеціальний режим для додатку на початковому екрані');
                    
                    // В PWA режимі Service Worker може не працювати, використовуємо localStorage
                    const pwaPermission = localStorage.getItem('ios_pwa_camera_permission');
                    const pwaTimestamp = localStorage.getItem('ios_pwa_permission_timestamp');
                    
                    if (pwaPermission === 'true' && pwaTimestamp) {
                        const timeDiff = Date.now() - parseInt(pwaTimestamp);
                        // Для PWA дозволи зберігаємо на довший час - 30 днів
                        if (timeDiff < 30 * 24 * 60 * 60 * 1000) {
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                            console.log('🍎 PWA: ЗНАЙДЕНО збережений дозвіл для PWA режиму');
                            this.showInfo('🍎 PWA: Дозвіл відновлено');
                    this.updatePermissionStatus();
                    return true;
                }
                    }
                } else {
                    // В браузері перевіряємо IndexedDB першим
                    const indexedDBPermission = await this.checkIOSPermissionsFromDB();
                    if (indexedDBPermission) {
                this.permissionGranted = true;
                this.permissionChecked = true;
                        console.log('🍎 iOS Safari: ЗНАЙДЕНО дозвіл в IndexedDB через Service Worker');
                        this.showInfo('🍎 iOS: Дозвіл відновлено з DB');
                        this.updatePermissionStatus();
                return true;
                    }
                }
                // МАКСИМАЛЬНА перевірка для iOS Safari у ВСІХ можливих місцях
                const iosSafariGranted = sessionStorage.getItem('ios_safari_camera_granted');
                const iosPermanent = sessionStorage.getItem('ios_camera_permission_permanent');
                const iosBackup = localStorage.getItem('ios_camera_permission_backup');
                const iosLastGranted = localStorage.getItem('ios_camera_last_granted');
                
                // Перевіряємо window об'єкт
                const windowGranted = window.iosCameraGranted;
                const documentGranted = document.iosCameraPermission;
                const globalGranted = window.CameraPermissions && window.CameraPermissions.iOS;
                const domGranted = document.body.getAttribute('data-ios-camera-granted');
                
                if (iosSafariGranted === 'true' || iosPermanent === 'true' || iosBackup === 'true' || 
                    windowGranted || documentGranted || globalGranted || domGranted === 'true') {
                    // Якщо хоча б ОДИН з дозволів знайдено - використовуємо камеру
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                    console.log('🍎 iOS Safari: ЗНАЙДЕНО збережений дозвіл (максимальна перевірка)');
                    this.showInfo('🍎 iOS: Дозвіл ЗНАЙДЕНО - камера доступна');
                    this.updatePermissionStatus();
                    return true;
                }
            }
            
            // Перевіряємо додаткові збережені дозволи
            if (localStorage.getItem('camera_always_allowed') === 'true') {
                // Для iOS Safari додаткова перевірка через кілька минут після збереження
                const neverAskTime = localStorage.getItem('camera_never_ask');
                if (neverAskTime) {
                    const timeSinceGranted = Date.now() - parseInt(neverAskTime);
                    // Для iOS Safari дозвіл "назавжди" діє тільки протягом сесії браузера
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                    
                    if (isIOS && isSafari && timeSinceGranted > 60 * 60 * 1000) { // 1 година для iOS Safari
                        console.log('iOS Safari: потрібна повторна перевірка дозволу');
                        // Не очищуємо, але перевіряємо далі
                    } else {
                        this.permissionGranted = true;
                        this.permissionChecked = true;
                        console.log('Дозвіл назавжди збережено');
                        this.updatePermissionStatus();
                        return true;
                    }
                } else {
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                    this.updatePermissionStatus();
                    return true;
                }
            }
            
            // Спочатку перевіряємо сесію - для HTTPS та iOS це важливо
            const sessionPermission = sessionStorage.getItem('camera_permission_session');
            if (sessionPermission) {
                try {
                    const sessionData = JSON.parse(sessionPermission);
                    if (sessionData.granted && sessionData.url === window.location.origin) {
                        // Довгий термін для сесії на всіх платформах
                        let sessionValidityPeriod = 30 * 24 * 60 * 60 * 1000; // 30 днів
                        
                        if (Date.now() - sessionData.timestamp < sessionValidityPeriod) {
                            this.permissionGranted = true;
                            this.permissionChecked = true;
                            console.log('Використовуємо дозвіл з сесії (iOS оптимізація)');
                            this.updatePermissionStatus();
                            return true;
                        }
                    }
                } catch (e) {
                    sessionStorage.removeItem('camera_permission_session');
                }
            }

            // Перевіряємо спеціальний HTTPS дозвіл
            if (window.location.protocol === 'https:') {
                const httpsPermission = localStorage.getItem('https_camera_permission');
                const httpsTimestamp = localStorage.getItem('https_permission_timestamp');
                
                if (httpsPermission === 'true' && httpsTimestamp) {
                    const timeDiff = Date.now() - parseInt(httpsTimestamp);
                    // Для HTTPS довгий термін
                    if (timeDiff < 365 * 24 * 60 * 60 * 1000) {
                        this.permissionGranted = true;
                        this.permissionChecked = true;
                        console.log('Використовуємо HTTPS дозвіл камери');
                        this.updatePermissionStatus();
                        return true;
                    } else {
                        localStorage.removeItem('https_camera_permission');
                        localStorage.removeItem('https_permission_timestamp');
                    }
                }
            }

            // Перевіряємо збережений дозвіл з розширеними даними
            const savedPermissionData = localStorage.getItem('camera_permission_data');
            
            if (savedPermissionData) {
                try {
                    const permissionData = JSON.parse(savedPermissionData);
                    const now = Date.now();
                    
                    // Перевіряємо чи дозвіл ще валідний та для того ж домену
                    if (permissionData.granted && permissionData.timestamp && 
                        permissionData.url === window.location.origin) {
                        
                        // Дозволи назавжди для всіх платформ
                        let validityPeriod = 365 * 24 * 60 * 60 * 1000; // 1 рік для всіх
                        
                        if (now - permissionData.timestamp < validityPeriod) {
                            this.permissionGranted = true;
                            this.permissionChecked = true;
                            console.log('Використовуємо збережений дозвіл камери');
                            this.updatePermissionStatus();
                            return true;
                        } else {
                            console.log('Збережений дозвіл застарів, видаляємо');
                            this.clearAllPermissionData();
                        }
                    }
                } catch (e) {
                    console.log('Помилка при читанні збережених дозволів:', e);
                    this.clearAllPermissionData();
                }
            }

            // Використовуємо Permissions API якщо доступний
            if ('permissions' in navigator) {
                try {
                const permission = await navigator.permissions.query({ name: 'camera' });
                
                if (permission.state === 'granted') {
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                        this.savePermissionData(true);
                    return true;
                } else if (permission.state === 'denied') {
                    this.permissionGranted = false;
                    this.permissionChecked = true;
                        this.savePermissionData(false);
                    this.showError('Доступ до камери заборонено. Будь ласка, дозвольте доступ у налаштуваннях браузера.');
                    return false;
                    }
                } catch (e) {
                    console.log('Помилка при перевірці дозволів через Permissions API:', e);
                }
            }

            this.permissionChecked = true;
            return false; // Потрібен запит дозволу
        } catch (error) {
            console.error('Помилка при перевірці дозволу до камери:', error);
            this.permissionChecked = true;
            return false;
        }
    }

    // Додаткова функція для очищення всіх дозволів
    clearAllPermissionData() {
        localStorage.removeItem('camera_permission_data');
        localStorage.removeItem('camera_permission_granted');
        localStorage.removeItem('https_camera_permission');
        localStorage.removeItem('https_permission_timestamp');
        localStorage.removeItem('camera_always_allowed');
        localStorage.removeItem('camera_never_ask');
        localStorage.removeItem('mobile_permission_expires');
        sessionStorage.removeItem('camera_permission_session');
        
        // Очищаємо iOS специфічні дозволи
        sessionStorage.removeItem('ios_safari_camera_granted');
        sessionStorage.removeItem('ios_camera_permission_permanent');
        localStorage.removeItem('ios_camera_permission_backup');
        window.iosCameraGranted = false;
        document.iosCameraPermission = false;
        if (window.CameraPermissions) window.CameraPermissions.iOS = false;
        document.body.removeAttribute('data-ios-camera-granted');
    }

    restoreIOSPermissions() {
        // Відновлюємо iOS дозволи з будь-якого доступного джерела
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (!isIOS || !isSafari) return;
        
        const sources = [
            sessionStorage.getItem('ios_safari_camera_granted') === 'true',
            sessionStorage.getItem('ios_camera_permission_permanent') === 'true',
            localStorage.getItem('ios_camera_permission_backup') === 'true',
            localStorage.getItem('camera_always_allowed') === 'true',
            window.iosCameraGranted,
            document.iosCameraPermission,
            window.CameraPermissions && window.CameraPermissions.iOS,
            document.body.getAttribute('data-ios-camera-granted') === 'true'
        ];
        
        const hasAnyPermission = sources.some(source => source === true);
        
        if (hasAnyPermission) {
            console.log('🍎 Відновлюємо iOS дозволи з існуючих джерел');
            
            // Відновлюємо ВСІ дозволи в усіх місцях
            const now = Date.now().toString();
            sessionStorage.setItem('ios_safari_camera_granted', 'true');
            sessionStorage.setItem('ios_camera_permission_permanent', 'true');
            localStorage.setItem('ios_camera_permission_backup', 'true');
            localStorage.setItem('camera_always_allowed', 'true');
            localStorage.setItem('camera_never_ask', now);
            
            window.iosCameraGranted = true;
            document.iosCameraPermission = true;
            if (!window.CameraPermissions) window.CameraPermissions = {};
            window.CameraPermissions.iOS = true;
            document.body.setAttribute('data-ios-camera-granted', 'true');
            
            this.permissionGranted = true;
            this.permissionChecked = true;
            this.updatePermissionStatus();
            
            this.showInfo('🍎 iOS: Дозволи відновлено автоматично');
            
            // АВТОМАТИЧНО запускаємо камеру без додаткових запитів
            setTimeout(() => {
                this.startCamera();
            }, 500);
        }
    }

    async getIOSCameraStream(constraints) {
        // Ультимативна функція для iOS - використовує кешований stream
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        console.log('🍎 getIOSCameraStream: isIOS =', isIOS, 'isSafari =', isSafari);
        
        if (!isIOS || !isSafari) {
            // Для не-iOS використовуємо стандартний метод
            console.log('📱 getIOSCameraStream: Не iOS/Safari, використовуємо стандартний метод');
            return await navigator.mediaDevices.getUserMedia(constraints);
        }

        // Перевіряємо чи маємо збережені дозволи
        const hasPermissions = this.iosPermissionsPermanent || 
            sessionStorage.getItem('ios_safari_camera_granted') === 'true' ||
            window.iosCameraGranted ||
            document.body.getAttribute('data-ios-camera-granted') === 'true';
            
        console.log('🍎 getIOSCameraStream: hasPermissions =', hasPermissions);
        console.log('🍎 getIOSCameraStream: iosStreamCache =', this.iosStreamCache);

        if (hasPermissions && this.iosStreamCache) {
            // Перевіряємо чи відповідає кешований stream поточним constraints
            const videoTrack = this.iosStreamCache.getVideoTracks()[0];
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                const requestedFacingMode = constraints.video?.facingMode;
                
                if (!requestedFacingMode || settings.facingMode === requestedFacingMode) {
                    // Перевіримо чи треки ще активні
                    const videoTrack = this.iosStreamCache.getVideoTracks()[0];
                    if (videoTrack && videoTrack.readyState === 'live') {
                        console.log('🍎 iOS: Використовуємо кешований stream - БЕЗ запиту дозволу');
                        console.log('🍎 iOS: Video track state:', videoTrack.readyState, 'enabled:', videoTrack.enabled);
                        this.showInfo('🍎 iOS: Камера готова (без запитів)');
                        return this.iosStreamCache;
                    } else {
                        console.log('🍎 iOS: Кешований stream не активний, оновлюємо');
                        this.iosStreamCache.getTracks().forEach(track => track.stop());
                        this.iosStreamCache = null;
                    }
                } else {
                    console.log('🍎 iOS: Кешований stream не відповідає constraints, оновлюємо');
                    // Зупиняємо старий stream
                    this.iosStreamCache.getTracks().forEach(track => track.stop());
                    this.iosStreamCache = null;
                }
            }
        }

        if (hasPermissions) {
            try {
                console.log('🍎 getIOSCameraStream: Маємо дозволи, запитуємо stream тихо');
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('🍎 getIOSCameraStream: Тихий запит успішний, stream:', stream);
                this.iosStreamCache = stream;
                this.iosPermissionsPermanent = true;
                return stream;
            } catch (error) {
                console.log('🍎 getIOSCameraStream: Помилка при тихому запиті:', error);
                console.log('🍎 getIOSCameraStream: Падаємо на стандартний метод');
            }
        }

        // Останній варіант - стандартний запит
        console.log('🍎 getIOSCameraStream: Стандартний запит getUserMedia');
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('🍎 getIOSCameraStream: Стандартний запит успішний, stream:', stream);
            this.iosStreamCache = stream;
            this.iosPermissionsPermanent = true;
            
            // Зберігаємо дозволи після успішного отримання
            this.saveIOSPermissionsAggressively();
            
            return stream;
        } catch (error) {
            console.log('🍎 getIOSCameraStream: КРИТИЧНА ПОМИЛКА:', error);
            throw error;
        }
    }

    saveIOSPermissionsAggressively() {
        // Зберігаємо дозволи МАКСИМАЛЬНО агресивно
        const now = Date.now().toString();
        
        sessionStorage.setItem('ios_safari_camera_granted', 'true');
        sessionStorage.setItem('ios_safari_grant_time', now);
        sessionStorage.setItem('ios_camera_permission_permanent', 'true');
        localStorage.setItem('ios_camera_permission_backup', 'true');
        localStorage.setItem('ios_camera_last_granted', now);
        localStorage.setItem('camera_always_allowed', 'true');
        localStorage.setItem('camera_never_ask', now);
        
        window.iosCameraGranted = true;
        window.iosCameraGrantedTime = Date.now();
        document.iosCameraPermission = true;
        
        if (!window.CameraPermissions) window.CameraPermissions = {};
        window.CameraPermissions.iOS = true;
        window.CameraPermissions.timestamp = Date.now();
        
        document.body.setAttribute('data-ios-camera-granted', 'true');
        
        this.iosPermissionsPermanent = true;
        this.permissionGranted = true;
        this.permissionChecked = true;
        
        // НОВИЙ: Зберігаємо через Service Worker в IndexedDB
        this.saveIOSPermissionsThroughSW();
        
        // СПЕЦІАЛЬНЕ ЗБЕРЕЖЕННЯ ДЛЯ PWA РЕЖИМУ
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        
        if (isPWA) {
            localStorage.setItem('ios_pwa_camera_permission', 'true');
            localStorage.setItem('ios_pwa_permission_timestamp', Date.now().toString());
            console.log('🍎 PWA: Дозволи збережено спеціально для PWA режиму');
        }
        
        console.log('🍎 iOS: Дозволи збережено в МАКСИМАЛЬНІЙ агресивності');
        this.showInfo('🍎 Дозволи НАЗАВЖДИ збережено');
    }
    
    // Новий метод збереження через Service Worker
    saveIOSPermissionsThroughSW() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const permissions = {
                granted: true,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.origin
            };
            
            navigator.serviceWorker.controller.postMessage({
                type: 'IOS_CAMERA_PERMISSION',
                permissions: permissions
            });
            
            console.log('🍎 iOS: Дозволи відправлено до Service Worker');
        }
    }
    
    // Новий метод перевірки дозволів через IndexedDB
    async checkIOSPermissionsFromDB() {
        try {
            const request = indexedDB.open('CameraPermissions', 1);
            
            return new Promise((resolve) => {
                request.onsuccess = function(e) {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('permissions')) {
                        resolve(false);
                        return;
                    }
                    
                    const transaction = db.transaction(['permissions'], 'readonly');
                    const store = transaction.objectStore('permissions');
                    const getRequest = store.get('ios_camera');
                    
                    getRequest.onsuccess = function(e) {
                        const result = e.target.result;
                        if (result && result.granted) {
                            console.log('🍎 iOS: Знайдено дозволи в IndexedDB');
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    };
                    
                    getRequest.onerror = function() {
                        resolve(false);
                    };
                };
                
                request.onerror = function() {
                    resolve(false);
                };
                
                // Timeout через 2 секунди
                setTimeout(() => resolve(false), 2000);
            });
        } catch (error) {
            console.log('🍎 iOS: Помилка перевірки IndexedDB:', error);
            return false;
        }
    }
    
    // Новий метод для перезапуску камери в PWA режимі
    async restartCameraForPWA() {
        try {
            console.log('🍎 PWA: Починаємо перезапуск камери...');
            
            // Зупиняємо поточний stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                    console.log('🍎 PWA: Зупинено track:', track.kind);
                });
                this.stream = null;
            }
            
            // Очищаємо iOS кеш
            if (this.iosStreamCache) {
                this.iosStreamCache.getTracks().forEach(track => track.stop());
                this.iosStreamCache = null;
                console.log('🍎 PWA: Очищено iOS stream cache');
            }
            
            // Очищаємо video
            this.video.srcObject = null;
            
            // Чекаємо кадр
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Форсуємо дозволи для PWA
            this.permissionGranted = true;
            this.permissionChecked = true;
            this.iosPermissionsPermanent = true;
            
            // Запитуємо новий stream
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: this.settings.facingMode
                }
            };
            
            console.log('🍎 PWA: Запитуємо новий stream...');
            this.stream = await this.getIOSCameraStream(constraints);
            
            if (this.stream) {
                this.video.srcObject = this.stream;
                
                // Чекаємо на завантаження метаданих
                await new Promise((resolve) => {
                    this.video.onloadedmetadata = () => {
                        console.log('🍎 PWA: Метадані завантажено, запускаємо відео');
                        this.video.play().then(() => {
                            console.log('🍎 PWA: Камера успішно перезапущена!');
                            resolve();
                        }).catch(e => {
                            console.log('🍎 PWA: Помилка запуску відео:', e);
                            resolve();
                        });
                    };
                    
                    // Timeout
                    setTimeout(() => {
                        console.log('🍎 PWA: Timeout метаданих');
                        resolve();
                    }, 3000);
                });
            } else {
                console.log('🍎 PWA: ПОМИЛКА - не вдалося отримати новий stream');
            }
            
        } catch (error) {
            console.error('🍎 PWA: Критична помилка при перезапуску камери:', error);
            throw error;
        }
    }

    async autoStartCameraIfPermissions() {
        // Автоматично запускаємо камеру якщо є збережені дозволи
        if (this.permissionGranted || 
            sessionStorage.getItem('ios_safari_camera_granted') === 'true' ||
            localStorage.getItem('camera_always_allowed') === 'true' ||
            window.iosCameraGranted ||
            document.body.getAttribute('data-ios-camera-granted') === 'true') {
            
            console.log('🔄 Автоматичний запуск камери з збереженими дозволами');
            this.showInfo('📷 Камера запускається автоматично');
            try {
                await this.startCamera();
            } catch (error) {
                console.log('Помилка автоматичного запуску камери:', error);
            }
        }
    }

    async requestCameraPermission() {
        try {
            // Робимо пробний запит до камери для отримання дозволу (з iOS оптимізацією)
            const testStream = await this.getIOSCameraStream({ 
                video: { facingMode: this.settings.facingMode } 
            });
            
            // Якщо дозвіл отримано, зупиняємо тестовий stream
            testStream.getTracks().forEach(track => track.stop());
            
            this.permissionGranted = true;
            this.savePermissionData(true); // Використовуємо нову систему збереження
            this.updatePermissionStatus();
            this.showSuccess('Дозвіл до камери надано!');
            return true;
        } catch (error) {
            console.error('Помилка при запиті дозволу до камери:', error);
            this.permissionGranted = false;
            this.savePermissionData(false); // Зберігаємо відмову
            this.updatePermissionStatus();
            
            if (error.name === 'NotAllowedError') {
                this.showError('Доступ до камери заборонено. Будь ласка, дозвольте доступ у налаштуваннях браузера.');
            } else if (error.name === 'NotFoundError') {
                this.showError('Камеру не знайдено. Перевірте підключення камери.');
            } else {
                this.showError('Не вдалося отримати доступ до камери.');
            }
            return false;
        }
    }

    async getCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');
            console.log(`Знайдено ${this.cameras.length} камер`);
        } catch (error) {
            console.error('Помилка при отриманні списку камер:', error);
        }
    }
    
    async startCamera() {
        try {
            console.log('🎬 startCamera: Запуск камери...');
            console.log('🎬 startCamera: permissionChecked =', this.permissionChecked);
            console.log('🎬 startCamera: permissionGranted =', this.permissionGranted);
            
            // МАКСИМАЛЬНЕ ЗМІЦНЕННЯ iOS дозволів на початку startCamera
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;

            if (isIOS && isSafari) {
                console.log('🍎 startCamera режим:', isPWA ? 'PWA (Початковий екран)' : 'Safari браузер');
                // Перевіряємо ВСІ можливі місця збереження дозволів + PWA
                const hasIOSPermissions = sessionStorage.getItem('ios_safari_camera_granted') === 'true' ||
                    sessionStorage.getItem('ios_camera_permission_permanent') === 'true' ||
                    localStorage.getItem('ios_camera_permission_backup') === 'true' ||
                    localStorage.getItem('ios_pwa_camera_permission') === 'true' ||
                    window.iosCameraGranted ||
                    document.iosCameraPermission ||
                    (window.CameraPermissions && window.CameraPermissions.iOS) ||
                    document.body.getAttribute('data-ios-camera-granted') === 'true' ||
                    localStorage.getItem('camera_always_allowed') === 'true';

                if (hasIOSPermissions) {
                    console.log('🍎 startCamera: ЗНАЙДЕНО iOS дозволи у збереженнях, ФОРСУЄМО дозволи');
                    // АГРЕСИВНО встановлюємо всі прапорці
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                    this.iosPermissionsPermanent = true;
                    // І зміцнюємо ще раз
                    this.saveIOSPermissionsAggressively();
                    console.log('🍎 startCamera: Дозволи зміцнено ПЕРЕД запуском камери');
                }
            }
            
            // Перевіряємо дозвіл до камери спочатку
            if (!this.permissionChecked) {
                console.log('🎬 startCamera: Перевіряємо дозволи...');
                const hasPermission = await this.checkCameraPermission();
                if (!hasPermission && !this.permissionGranted) {
                    console.log('🎬 startCamera: Дозволи не знайдено, запитуємо...');
                    // Запитуємо дозвіл тільки якщо він ще не надавався
                    const permissionGranted = await this.requestCameraPermission();
                    if (!permissionGranted) {
                        console.log('🎬 startCamera: Дозвіл не отримано, виходимо');
                        return; // Виходимо якщо дозвіл не надано
                    }
                }
            } else if (!this.permissionGranted) {
                console.log('🎬 startCamera: Дозвіл не надано');
                this.showError('Дозвіл до камери не надано. Будь ласка, дозвольте доступ у налаштуваннях браузера.');
                return;
            }

            // Зупиняємо попередній stream якщо він існує
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: {
                    deviceId: this.cameras[this.currentCameraIndex]?.deviceId ? 
                        { exact: this.cameras[this.currentCameraIndex].deviceId } : 
                        undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: this.settings.facingMode
                }
            };
            
            // Використовуємо існуючий дозвіл (з iOS оптимізацією)
            console.log('🎬 startCamera: Запитуємо stream з constraints:', constraints);
            this.stream = await this.getIOSCameraStream(constraints);
            console.log('🎬 startCamera: Отримано stream:', this.stream);
            
            if (this.stream) {
                // ПРИМУСОВЕ ОНОВЛЕННЯ VIDEO ДЛЯ iOS
                console.log('🎬 startCamera: Stream встановлено у video елемент');
                console.log('🎬 startCamera: Video елемент:', this.video);
                console.log('🎬 startCamera: Stream tracks:', this.stream.getTracks());
                console.log('🎬 startCamera: Video ready state:', this.video.readyState);
                console.log('🎬 startCamera: Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
                
                // Для iOS Safari - спеціальне оновлення video
                // Використовуємо вже оголошені змінні isIOS та isSafari з початку функції
                
                if (isIOS && isSafari) {
                    console.log('🍎 iOS: Застосовуємо спеціальне оновлення video');
                    
                    // Спочатку очищаємо srcObject
                    this.video.srcObject = null;
                    
                    // Чекаємо кадр
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    
                    // Тепер встановлюємо stream
            this.video.srcObject = this.stream;
            
                    // Примусово викликаємо load()
                    this.video.load();
                    
                    console.log('🍎 iOS: Video оновлено з load()');
                } else {
                    this.video.srcObject = this.stream;
                }
                
                // Чекаємо на завантаження метаданих
                await new Promise((resolve) => {
                    this.video.onloadedmetadata = () => {
                        console.log('🎬 startCamera: Метадані завантажено, запускаємо відео');
                        console.log('🎬 startCamera: Video розміри після метаданих:', this.video.videoWidth, 'x', this.video.videoHeight);
                        
                        // Для iOS додаткова перевірка
                        if (isIOS && isSafari) {
                            console.log('🍎 iOS: Додаткові налаштування video');
                            this.video.setAttribute('playsinline', 'true');
                            this.video.setAttribute('webkit-playsinline', 'true');
                            this.video.muted = true;
                        }
                        
                        // УНІВЕРСАЛЬНИЙ ФІКС: Прибираємо всі контроли для всіх платформ
                        this.video.controls = false;
                        this.video.removeAttribute('controls');
                        console.log('🚫 Контроли video видалено для всіх платформ');
                        
                        // Спеціальні налаштування для PWA режиму
                        if (isIOS && isSafari && isPWA) {
                            console.log('🍎 PWA: Спеціальні налаштування video для PWA');
                            // НЕ додаємо autoplay і controls - це створює кнопку стоп
                            this.video.removeAttribute('autoplay');
                            this.video.removeAttribute('controls');
                            this.video.style.objectFit = 'cover';
                            this.video.style.width = '100vw';
                            this.video.style.height = '100vh';
                        }
                        
                        this.video.play().then(() => {
                            console.log('🎬 startCamera: Відео запущено успішно');
                            console.log('🎬 startCamera: Video playing state:', !this.video.paused);
                            console.log('🎬 startCamera: Video currentTime:', this.video.currentTime);
                            resolve();
                        }).catch(e => {
                            console.log('🎬 startCamera: Помилка запуску відео:', e);
                            // Для iOS спробуємо ще раз
                            if (isIOS && isSafari) {
                                console.log('🍎 iOS: Повторна спроба запуску video');
                                setTimeout(() => {
                                    this.video.play().then(() => {
                                        console.log('🍎 iOS: Відео запущено при повторній спробі');
                                        resolve();
                                    }).catch(e2 => {
                                        console.log('🍎 iOS: Помилка при повторній спробі:', e2);
                                        resolve();
                                    });
                                }, 500);
                            } else {
                                resolve();
                            }
                        });
                    };
                    
                    // Додамо timeout для onloadedmetadata
                    setTimeout(() => {
                        console.log('🎬 startCamera: TIMEOUT - метадані не завантажились за 5 сек');
                        console.log('🎬 startCamera: Video ready state при timeout:', this.video.readyState);
                        console.log('🎬 startCamera: Video error при timeout:', this.video.error);
                        
                        // Для iOS спробуємо примусово
                        if (isIOS && isSafari && this.video.readyState === 0) {
                            console.log('🍎 iOS: Примусовий запуск через timeout');
                            this.video.play().catch(e => console.log('🍎 iOS: Помилка примусового запуску:', e));
                        }
                        
                        resolve();
                    }, 5000);
                });
            } else {
                console.log('🎬 startCamera: ПОМИЛКА - stream не отримано');
                this.showError('Не вдалося отримати відео stream');
                return;
            }
            
            // ВАЖЛИВО: зберігаємо успішний дозвіл в усіх можливих місцях
            this.permissionGranted = true;
            this.savePermissionData(true);
            
            // Додаткове збереження для надійності
            localStorage.setItem('camera_always_allowed', 'true');
            localStorage.setItem('camera_never_ask', Date.now().toString());
            // Для мобільних встановлюємо довгий термін дії дозволу
            if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
                localStorage.setItem('mobile_permission_expires', Date.now() + (24 * 60 * 60 * 1000)); // 24 години
            }
            this.updatePermissionStatus();
            
            // ДІАГНОСТИКА ФІНАЛЬНОГО СТАНУ VIDEO
            console.log('🎬 startCamera: ФІНАЛЬНА ДІАГНОСТИКА:');
            console.log('🎬 Video srcObject:', this.video.srcObject);
            console.log('🎬 Video readyState:', this.video.readyState);
            console.log('🎬 Video paused:', this.video.paused);
            console.log('🎬 Video videoWidth:', this.video.videoWidth);
            console.log('🎬 Video videoHeight:', this.video.videoHeight);
            console.log('🎬 Video error:', this.video.error);
            console.log('🎬 Video currentTime:', this.video.currentTime);
            console.log('🎬 Video style.display:', this.video.style.display);
            console.log('🎬 Video visibility:', window.getComputedStyle(this.video).visibility);
            
            // Перевіримо чи video елемент видимий на сторінці
            const rect = this.video.getBoundingClientRect();
            console.log('🎬 Video position/size:', rect);
            
            console.log(`Камера ${this.currentCameraIndex + 1} активована`);
        } catch (error) {
            console.error('Помилка при запуску камери:', error);
            
            // Обробляємо різні типи помилок
            if (error.name === 'NotAllowedError') {
                this.permissionGranted = false;
                localStorage.setItem('camera_permission_granted', 'false');
                this.showError('Доступ до камери заборонено. Будь ласка, дозвольте доступ у налаштуваннях браузера.');
            } else if (error.name === 'NotFoundError') {
                this.showError('Камеру не знайдено. Перевірте підключення камери.');
            } else if (error.name === 'NotReadableError') {
                this.showError('Камера використовується іншим додатком.');
            } else {
                this.showError('Не вдалося запустити камеру. Перевірте дозволи та підключення.');
            }
        }
    }
    
    // Перемикання між передньою та задньою камерою
    async switchCamera() {
        try {
            // ЗМІЦНЮЄМО iOS дозволи перед перемиканням камери
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isIOS && isSafari) {
                const hasIOSPermissions = sessionStorage.getItem('ios_safari_camera_granted') === 'true' ||
                    window.iosCameraGranted ||
                    document.body.getAttribute('data-ios-camera-granted') === 'true';
                
                if (hasIOSPermissions) {
                    console.log('🍎 switchCamera: Знайдено iOS дозволи, встановлюємо прапорці');
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                    this.iosPermissionsPermanent = true;
                }
            }
            
            // Перевіряємо чи є дозвіл
            if (!this.permissionGranted) {
                this.showError('Дозвіл до камери не надано');
                return;
            }

            // Перемикаємо режим камери
            this.settings.facingMode = this.settings.facingMode === 'user' ? 'environment' : 'user';
            
            // Зупиняємо поточний stream та очищаємо iOS кеш
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            if (this.iosStreamCache) {
                this.iosStreamCache.getTracks().forEach(track => track.stop());
                this.iosStreamCache = null;
            }
            
            // Запускаємо камеру з новими налаштуваннями (без повторного запиту дозволу)
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: this.settings.facingMode
                }
            };
            
            this.stream = await this.getIOSCameraStream(constraints);
            
            // Для iOS Safari - спеціальне оновлення video при switchCamera
            // Використовуємо вже оголошені змінні isIOS та isSafari
            
            if (isIOS && isSafari) {
                console.log('🍎 switchCamera: Застосовуємо спеціальне оновлення video');
                this.video.srcObject = null;
                await new Promise(resolve => requestAnimationFrame(resolve));
            this.video.srcObject = this.stream;
                this.video.load();
                console.log('🍎 switchCamera: Video оновлено з load()');
            } else {
                this.video.srcObject = this.stream;
            }
            
            console.log('🍎 iOS: Камера переключена БЕЗ запиту дозволу');
            this.showInfo('🍎 Камера переключена успішно');
            
            // Зберігаємо налаштування
            this.saveSettings();
            
            // Оновлюємо кнопку
            this.updateCameraSwitchButton();
            
            console.log(`Перемкнуто на ${this.settings.facingMode === 'user' ? 'передню' : 'задню'} камеру`);
        } catch (error) {
            console.error('Помилка при перемиканні камери:', error);
            this.showError('Не вдалося перемкнути камеру');
        }
    }
    
    // Оновлення тексту кнопки перемикання камери
    updateCameraSwitchButton() {
        const switchBtn = document.querySelector('.camera-switch-btn');
        const frontCameraCheckbox = document.getElementById('frontCameraEnabled');
        const currentCameraInfo = document.getElementById('currentCameraInfo');
        
        const isUserCamera = this.settings.facingMode === 'user';
        
        if (switchBtn) {
            switchBtn.innerHTML = `<span class="switch-icon">${isUserCamera ? '🤳' : '📷'}</span>`;
            switchBtn.title = isUserCamera ? 'Перемкнути на задню камеру' : 'Перемкнути на передню камеру';
        }
        
        if (frontCameraCheckbox) {
            frontCameraCheckbox.checked = isUserCamera;
        }
        
        if (currentCameraInfo) {
            currentCameraInfo.textContent = isUserCamera ? 'Передня (селфі)' : 'Задня (основна)';
        }
    }
    
    // Метод для перемикання камери з налаштувань
    async toggleCameraFacing() {
        await this.switchCamera();
    }

    // Метод для перемикання режиму заповнення відео
    toggleVideoFill() {
        this.settings.videoFillMode = !this.settings.videoFillMode;
        this.applyVideoFillMode();
        this.saveSettings();
        
        const mode = this.settings.videoFillMode ? 'розтягнуто' : 'вписано';
        this.showSuccess(`Режим відео: ${mode}`);
    }

    // Застосування режиму заповнення відео
    applyVideoFillMode() {
        const video = document.getElementById('video');
        const videoContainer = document.querySelector('.video-container');
        
        if (video && videoContainer) {
            if (this.settings.videoFillMode) {
                // Повноекранний режим - відео на весь екран без фону
                video.style.objectFit = 'cover';
                video.style.width = '100vw';
                video.style.borderRadius = '0';
                video.style.border = 'none';
                video.style.boxShadow = 'none';
                videoContainer.style.width = '100vw';
                videoContainer.style.marginLeft = 'calc(-50vw + 50%)';
            } else {
                // Звичайний режим з рамкою
                video.style.objectFit = 'cover';
                video.style.width = '100%';
                video.style.borderRadius = '25px';
                video.style.border = '3px solid var(--glass-border)';
                video.style.boxShadow = 'var(--glass-shadow)';
                videoContainer.style.width = '100%';
                videoContainer.style.marginLeft = '0';
            }
        }
    }
    

    
    toggleFlash() {
        // Симуляція спалаху (в реальному додатку тут була б логіка для фізичного спалаху)
        this.showSuccess('Спалах активовано!');
        
        // Анімація спалаху
        this.flashBtn.style.transform = 'scale(1.2)';
        this.flashBtn.style.filter = 'brightness(1.5)';
        
        setTimeout(() => {
            this.flashBtn.style.transform = 'scale(1)';
            this.flashBtn.style.filter = 'brightness(1)';
        }, 300);
    }
    
    showSwitchAnimation() {
        this.switchCameraBtn.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            this.switchCameraBtn.style.transform = 'rotate(0deg)';
        }, 300);
    }
    
    async capturePhoto() {
        if (!this.stream) {
            this.showError('Камера не активна');
            return;
        }
        
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Малюємо поточний кадр з відео на canvas
        context.drawImage(this.video, 0, 0);
        
        // Застосовуємо фільтр якщо обрано
        if (this.settings.currentFilter && this.settings.currentFilter !== 'none') {
            this.applyFilterToContext(context, this.settings.currentFilter);
        }
        
        // Додаємо водяні знаки якщо увімкнено
        if (this.settings.watermarkEnabled) {
            this.addWatermarks(context);
        }
        
        // Конвертуємо в base64
        const photoData = this.canvas.toDataURL('image/jpeg', this.settings.highQuality ? 1.0 : 0.8);
        
        // Отримуємо контекстну інформацію
        const location = await this.getLocationData();
        const weather = await this.getWeatherData();
        const event = await this.getCalendarEvent();
        
        // Створюємо об'єкт фотографії з метаданими
        const photo = {
            id: Date.now(),
            data: photoData,
            timestamp: new Date().toISOString(),
            filename: `photo_${new Date().toLocaleString('uk-UA').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
            metadata: {
                location: location,
                weather: weather,
                event: event,
                filter: this.settings.currentFilter
            }
        };
        
        this.photos.unshift(photo);
        
        if (this.settings.autoSave) {
            this.savePhotos();
        }
        
        // Автоматично зберігаємо на пристрій якщо увімкнено (старий параметр)
        if (this.settings.autoSaveToDevice) {
            this.savePhotoToDevice(photo);
        }
        
        // Автоматично зберігаємо на телефон якщо увімкнено (новий параметр)
        // Автоматичне збереження фото на телефон
        if (this.settings.autoSaveToPhone) {
            setTimeout(() => {
                this.savePhotoToPhone(photo);
            }, 500); // Затримка для кращої обробки
            
            // Без підказок для iOS
        }
        
        // Додаємо затримку для кращого відображення
        setTimeout(() => {
            this.displayPhoto(photo);
        }, 100);
        
        // Показуємо анімацію
        this.showCaptureAnimation();
        
        // Звуковий ефект
        if (this.settings.soundEffects) {
            this.playCaptureSound();
        }
        
        // Залишаємося в камері після фотографування
        console.log('📸 Залишаємося в режимі камери після фотографування');
        
        // Для PWA режиму на iOS - перезапускаємо камеру після фото
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isPWA && isIOS) {
            console.log('🍎 PWA: Перезапускаємо камеру після фото для iOS PWA');
            setTimeout(async () => {
                try {
                    // Перезапускаємо камеру через 500ms
                    await this.restartCameraForPWA();
                    this.showInfo('📸 Фото збережено!');
                } catch (error) {
                    console.log('🍎 PWA: Помилка перезапуску камери:', error);
                    this.showInfo('📸 Фото збережено!');
                }
            }, 500);
        } else {
            setTimeout(() => {
                this.showInfo('📸 Фото збережено!');
            }, 300);
        }
        
        console.log('Фотографію зроблено!');
    }
    
    addWatermarks(context) {
        const canvas = context.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Збираємо всі дані для водяного знаку
        const watermarkLines = [];
        
        // Додаємо дату та час
        if (this.settings.showDateTime) {
            const now = new Date();
            const dateTimeText = now.toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            watermarkLines.push(`📅 ${dateTimeText}`);
        }
        
        // Додаємо власницю програми
        if (this.settings.showOwner) {
            watermarkLines.push('👑 Власниця програми Катерина Миколаївна');
        }
        
        // Додаємо GPS локацію якщо доступна
        if (this.currentLocation && this.currentLocation.name) {
            watermarkLines.push(`📍 ${this.currentLocation.name}`);
        }
        
        // Додаємо погоду якщо доступна
        if (this.currentWeather) {
            watermarkLines.push(`${this.currentWeather.icon} ${this.currentWeather.description}, ${this.currentWeather.temperature}°C`);
        }
        
        // Якщо немає жодних даних, виходимо
        if (watermarkLines.length === 0) return;
        
        // Налаштування красивого шрифту
        const fontSize = Math.max(width, height) * 0.02; // Трохи більший для кращої читабельності
        context.font = `700 ${fontSize}px "SF Pro Display", "Segoe UI", "Roboto", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif`;
        
        // Налаштування тіні для кращої читабельності
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        // Вирівнювання по центру
        context.textAlign = 'center';
        
        // Розрахунок позиції (внизу по центру)
        const lineHeight = fontSize * 1.3;
        const totalHeight = watermarkLines.length * lineHeight;
        const startY = height - totalHeight - 20; // 20px відступ знизу
        
        // Малюємо стильний фон для тексту з гострими кутами
        const maxLineWidth = Math.max(...watermarkLines.map(line => context.measureText(line).width));
        const backgroundPadding = 18;
        const backgroundWidth = maxLineWidth + (backgroundPadding * 2);
        const backgroundHeight = totalHeight + (backgroundPadding * 2);
        const backgroundX = (width - backgroundWidth) / 2;
        const backgroundY = startY - backgroundPadding;
        
        // Тимчасово вимикаємо тінь
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Створюємо градієнт для фону
        const gradient = context.createLinearGradient(backgroundX, backgroundY, backgroundX, backgroundY + backgroundHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        
        // Малюємо прямокутник з напівкруглими кутами (radius = 12)
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(backgroundX, backgroundY, backgroundWidth, backgroundHeight, 12);
        context.fill();
        
        // Додаємо тонку світлу обводку для стилю
        context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(backgroundX, backgroundY, backgroundWidth, backgroundHeight, 12);
        context.stroke();
        
        // Налаштування тіні для тексту (більш контрастна)
        context.shadowColor = 'rgba(0, 0, 0, 0.9)';
        context.shadowBlur = 2;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 1;
        
        // Малюємо кожен рядок тексту з покращеним стилем
        context.fillStyle = 'rgba(255, 255, 255, 0.98)'; // Майже білий з легкою прозорістю
        context.textBaseline = 'middle';
        
        watermarkLines.forEach((line, index) => {
            const y = startY + (index * lineHeight) + fontSize;
            
            // Додаємо тонку чорну обводку для кращої читабельності
            context.lineWidth = 2;
            context.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            context.strokeText(line, width / 2, y);
            
            // Малюємо основний текст
            context.fillText(line, width / 2, y);
        });
        
        // Скидаємо налаштування
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.textAlign = 'left';
    }
    
    playCaptureSound() {
        // Створюємо простий звук фотографування
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    showCaptureAnimation() {
        // Анімація для мобільної кнопки
        this.captureBtn.style.transform = 'scale(0.8)';
        this.captureBtn.style.background = 'linear-gradient(45deg, #2ed573, #7bed9f)';
        
        setTimeout(() => {
            this.captureBtn.style.transform = 'scale(1)';
            this.captureBtn.style.background = '';
        }, 300);
        
        // Анімація для десктопної кнопки
        if (this.captureBtnDesktop) {
            this.captureBtnDesktop.style.transform = 'scale(0.95)';
            this.captureBtnDesktop.style.background = 'linear-gradient(45deg, #2ed573, #7bed9f)';
            
            setTimeout(() => {
                this.captureBtnDesktop.style.transform = 'scale(1)';
                this.captureBtnDesktop.style.background = '';
            }, 300);
        }
    }
    
    async savePhotoToDevice(photo) {
        try {
            // Конвертуємо base64 в Blob
            const response = await fetch(photo.data);
            const blob = await response.blob();
            
            // Створюємо файл з іменем
            const file = new File([blob], photo.filename, { type: 'image/jpeg' });
            
            // Спробуємо використати File System Access API (сучасні браузери)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: photo.filename,
                        types: [{
                            description: 'JPEG Image',
                            accept: { 'image/jpeg': ['.jpg', '.jpeg'] }
                        }]
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    
                    if (this.settings.showNotifications) {
                        this.showSuccess(`Фотографію збережено на пристрій!`);
                    }
                    return true;
                } catch (error) {
                    console.log('File System Access API не підтримується або користувач скасував');
                }
            }
            
            // Fallback: використовуємо download атрибут
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = photo.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (this.settings.showNotifications) {
                this.showSuccess(`Фотографію завантажено!`);
            }
            return true;
            
        } catch (error) {
            console.error('Помилка при збереженні на пристрій:', error);
            this.showError('Не вдалося зберегти фотографію на пристрій');
            return false;
        }
    }

    async savePhotoToPhone(photo) {
        try {
            console.log('💾 Збереження фото на телефон:', photo.filename);
            
            // Конвертуємо base64 в Blob
            const response = await fetch(photo.data);
            const blob = await response.blob();
            
            console.log('💾 Blob створено, розмір:', blob.size, 'bytes');
            
            // Створюємо файл з іменем
            const file = new File([blob], photo.filename, { type: 'image/jpeg' });
            
            // Спробуємо використати новий File System Access API якщо доступний
            if ('showSaveFilePicker' in window && !(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: photo.filename,
                        types: [{
                            description: 'JPEG Image',
                            accept: { 'image/jpeg': ['.jpg', '.jpeg'] }
                        }]
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    
                    console.log('💾 Файл збережено через File System Access API');
                    this.showSuccess(`💾 Фото "${photo.filename}" збережено!`);
                    return true;
                } catch (fsError) {
                    console.log('💾 File System Access API недоступний, використовуємо fallback');
                }
            }
            
            // Fallback: використовуємо стандартне завантаження
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = photo.filename;
            a.style.display = 'none';
            
            // Додаємо до DOM
            document.body.appendChild(a);
            
            // Симулюємо клік для завантаження
            console.log('💾 Запускаємо завантаження через <a> тег');
            
            // Для різних платформ
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                // iOS Safari - відкриваємо в новій вкладці
                console.log('💾 iOS detected, opening in new tab');
                a.target = '_blank';
                a.click();
                
                // Показуємо інструкцію для iOS
                setTimeout(() => {
                    this.showInfo('📱 iOS: У новій вкладці натисніть "Поділитися" → "Зберегти в Файли"');
                }, 1000);
            } else if (/Android/i.test(navigator.userAgent)) {
                // Android - прямий download
                console.log('💾 Android detected, direct download');
                a.click();
            } else {
                // Desktop та інші платформи
                console.log('💾 Desktop/other platform, direct click');
                a.click();
            }
            
            // Очищуємо через деякий час
            setTimeout(() => {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(url);
            }, 3000);
            
            console.log('💾 Збереження ініційовано успішно');
            
            // Показуємо різні повідомлення залежно від платформи
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                this.showInfo(`📱 Фото "${photo.filename}" відкрито в новій вкладці для збереження`);
            } else {
                this.showSuccess(`📱 Завантаження фото "${photo.filename}" розпочато!`);
            }
            return true;
            
        } catch (error) {
            console.error('💾 Помилка збереження на телефон:', error);
            
            // Fallback: спробуємо використати Web Share API
            if (navigator.share && navigator.canShare) {
                try {
                    const response = await fetch(photo.data);
                    const blob = await response.blob();
                    const file = new File([blob], photo.filename, { type: 'image/jpeg' });
                    
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: 'Фотографія з камери',
                            text: 'Зроблено програмою Катерини Миколаївни',
                            files: [file]
                        });
                        
                        // Тихе збереження без повідомлень
                        return true;
                    }
                } catch (shareError) {
                    console.log('Web Share API не спрацював:', shareError);
                }
            }
            
            // Показуємо детальну помилку залежно від типу
            if (error.name === 'NotAllowedError') {
                this.showError('Збереження заблоковано браузером. Спробуйте дозволити завантаження файлів.');
            } else if (error.name === 'SecurityError') {
                this.showError('Помилка безпеки. Спробуйте оновити сторінку і повторити.');
            } else if (error.message.includes('network')) {
                this.showError('Помилка мережі. Перевірте з\'єднання з інтернетом.');
            } else {
                this.showError(`Не вдалося зберегти фото: ${error.message}`);
            }
            return false;
        }
    }
    
    async saveAllToDevice() {
        if (this.photos.length === 0) {
            this.showError('Галерея порожня');
            return;
        }
        
        this.showSuccess(`Зберігаю ${this.photos.length} фотографій на пристрій...`);
        
        let savedCount = 0;
        for (const photo of this.photos) {
            if (await this.savePhotoToDevice(photo)) {
                savedCount++;
            }
            // Невелика затримка між збереженнями
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (savedCount > 0) {
            this.showSuccess(`Успішно збережено ${savedCount} з ${this.photos.length} фотографій!`);
        }
    }
    
    switchSection(section) {
        this.currentSection = section;
        
        // Оновлюємо активний пункт меню
        this.menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        const mobileHeader = document.querySelector('.mobile-header');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        // Показуємо/приховуємо секції
        if (section === 'camera') {
            this.cameraSection.style.display = 'block';
            this.gallerySection.style.display = 'none';
            this.settingsPanel.style.display = 'none';
            
            // Приховуємо заголовок, але залишаємо меню для повноекранного режиму камери
            if (mobileHeader) mobileHeader.style.display = 'none';
            if (mobileMenu) {
                mobileMenu.style.display = 'flex';
                mobileMenu.style.bottom = '0';
            }
            
            // ЗМІЦНЮЄМО iOS дозволи при поверненні до камери
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isIOS && isSafari) {
                console.log('🍎 switchSection: Зміцнюємо дозволи при поверненні до камери');
                this.saveIOSPermissionsAggressively();
                this.iosPermissionsPermanent = true;
                this.permissionGranted = true;
                this.permissionChecked = true;
            }
            
        } else if (section === 'gallery') {
            this.cameraSection.style.display = 'none';
            this.gallerySection.style.display = 'block';
            this.settingsPanel.style.display = 'none';
            
            // Показуємо заголовок та меню
            if (mobileHeader) mobileHeader.style.display = 'block';
            if (mobileMenu) {
                mobileMenu.style.display = 'flex';
                mobileMenu.style.bottom = '0';
            }
            
        } else if (section === 'settings') {
            this.cameraSection.style.display = 'none';
            this.gallerySection.style.display = 'none';
            this.settingsPanel.style.display = 'flex';
            
            // Показуємо заголовок та меню
            if (mobileHeader) mobileHeader.style.display = 'block';
            if (mobileMenu) {
                mobileMenu.style.display = 'flex';
                mobileMenu.style.bottom = '0';
            }
        }
        
        // Плавна анімація переходу
        this.animateSectionTransition(section);
    }
    
    animateSectionTransition(section) {
        const targetSection = section === 'camera' ? this.cameraSection : 
                            section === 'gallery' ? this.gallerySection : 
                            this.settingsPanel;
        
        targetSection.style.opacity = '0';
        targetSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            targetSection.style.transition = 'all 0.3s ease';
            targetSection.style.opacity = '1';
            targetSection.style.transform = 'translateY(0)';
        }, 50);
    }
    
    changeTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Оновлюємо активну кнопку теми
        this.themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        
        // Зберігаємо тему
        localStorage.setItem('camera_theme', theme);
        
        this.showSuccess(`Тема "${this.getThemeName(theme)}" активована!`);
    }
    
    getThemeName(theme) {
        const names = {
            'default': 'За замовчуванням',
            'dark': 'Темна',
            'ocean': 'Океанська',
            'forest': 'Лісова',
            'sunset': 'Захід сонця'
        };
        return names[theme] || theme;
    }
    
    changeButtonStyle(style) {
        this.currentButtonStyle = style;
        
        // Оновлюємо активну кнопку стилю
        this.styleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === style);
        });
        
        // Застосовуємо стиль до всіх кнопок
        this.applyButtonStyle(style);
        
        // Зберігаємо стиль
        localStorage.setItem('camera_button_style', style);
        
        this.showSuccess(`Стиль кнопок "${style}" активовано!`);
    }
    
    applyButtonStyle(style) {
        // Оновлюємо класи кнопок
        const buttons = [
            this.captureBtn, this.switchCameraBtn, this.flashBtn,
            this.captureBtnDesktop, this.switchCameraBtnDesktop, this.flashBtnDesktop,
            this.clearGalleryBtn, this.downloadAllBtn, this.saveToDeviceBtn, this.closeSettingsBtn
        ];
        
        buttons.forEach(btn => {
            if (btn) {
                // Видаляємо старі стилі
                btn.classList.remove('btn-style-1', 'btn-style-2', 'btn-style-3', 'btn-style-4', 'btn-style-5');
                // Додаємо новий стиль
                btn.classList.add(`btn-style-${style}`);
            }
        });
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('camera_settings', JSON.stringify(this.settings));
        
        if (key === 'highQuality') {
            this.showSuccess(`Якість фотографій: ${value ? 'висока' : 'стандартна'}`);
        } else if (key === 'watermarkEnabled') {
            this.showSuccess(`Водяні знаки: ${value ? 'увімкнено' : 'вимкнено'}`);
        } else if (key === 'showDateTime') {
            this.showSuccess(`Час та дата: ${value ? 'показуються' : 'приховані'}`);
        } else if (key === 'showOwner') {
            this.showSuccess(`Власниця програми: ${value ? 'показується' : 'прихована'}`);
        } else if (key === 'autoSaveToDevice') {
            this.showSuccess(`Автозбереження на пристрій: ${value ? 'увімкнено' : 'вимкнено'}`);
        } else if (key === 'slideshowEnabled') {
            const controls = document.getElementById('slideshowControls');
            if (controls) {
                controls.style.display = value ? 'block' : 'none';
            }
            this.showSuccess(`Слайд-шоу: ${value ? 'увімкнено' : 'вимкнено'}`);
        } else if (key === 'gpsEnabled') {
            this.showSuccess(`GPS геолокація: ${value ? 'увімкнено' : 'вимкнено'}`);
            this.updateLocationPreview();
        } else if (key === 'weatherEnabled') {
            this.showSuccess(`Погодні умови: ${value ? 'увімкнено' : 'вимкнено'}`);
            this.updateLocationPreview();
        } else if (key === 'calendarEnabled') {
            this.showSuccess(`Інтеграція з календарем: ${value ? 'увімкнено' : 'вимкнено'}`);
        } else if (key === 'videoFillMode') {
            this.applyVideoFillMode();
            const mode = value ? 'розтягнуто' : 'вписано';
            this.showSuccess(`Режим відео: ${mode}`);
        } else if (key === 'autoSaveToPhone') {
            this.showSuccess(`📱 Автозбереження на телефон: ${value ? 'увімкнено' : 'вимкнено'}`);
        }
        
        // Оновлюємо попередній перегляд
        this.updateWatermarkPreview();
    }
    
    saveSettings() {
        try {
            localStorage.setItem('camera_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Помилка при збереженні налаштувань:', error);
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('camera_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                
                // Оновлюємо чекбокси
                document.getElementById('autoSave').checked = this.settings.autoSave;
                document.getElementById('autoSaveToDevice').checked = this.settings.autoSaveToDevice;
                document.getElementById('highQuality').checked = this.settings.highQuality;
                document.getElementById('watermarkEnabled').checked = this.settings.watermarkEnabled;
                document.getElementById('showDateTime').checked = this.settings.showDateTime;
                document.getElementById('showOwner').checked = this.settings.showOwner;
                document.getElementById('soundEffects').checked = this.settings.soundEffects;
                document.getElementById('showNotifications').checked = this.settings.showNotifications;
                document.getElementById('slideshowEnabled').checked = this.settings.slideshowEnabled;
                document.getElementById('gpsEnabled').checked = this.settings.gpsEnabled;
                document.getElementById('weatherEnabled').checked = this.settings.weatherEnabled;
                document.getElementById('calendarEnabled').checked = this.settings.calendarEnabled;
                document.getElementById('fullScreenVideo').checked = this.settings.videoFillMode;
                if (document.getElementById('autoSaveToPhone')) {
                    document.getElementById('autoSaveToPhone').checked = this.settings.autoSaveToPhone;
                }
                if (document.getElementById('darkMode')) {
                    document.getElementById('darkMode').checked = this.settings.darkMode;
                }
                if (document.getElementById('showWeather')) {
                    document.getElementById('showWeather').checked = this.settings.showWeather;
                }
                
                // Завантажуємо фільтр та швидкість слайд-шоу
                this.changeFilter(this.settings.currentFilter);
                document.getElementById('slideshowSpeed').value = this.settings.slideshowSpeed;
                document.getElementById('speedValue').textContent = this.settings.slideshowSpeed;
                
                // Оновлюємо попередній перегляд локації
                this.updateLocationPreview();
            }
        } catch (error) {
            console.error('Помилка при завантаженні налаштувань:', error);
        }
    }
    
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('camera_theme');
            if (savedTheme) {
                this.changeTheme(savedTheme);
            }
        } catch (error) {
            console.error('Помилка при завантаженні теми:', error);
        }
    }
    
    loadButtonStyle() {
        try {
            const savedStyle = localStorage.getItem('camera_button_style');
            if (savedStyle) {
                this.changeButtonStyle(savedStyle);
            }
        } catch (error) {
            console.error('Помилка при завантаженні стилю кнопок:', error);
        }
    }
    
    closeSettings() {
        this.switchSection('camera');
    }
    
    displayPhoto(photo) {
        const galleryMain = document.getElementById('galleryMain');
        const galleryThumbs = document.getElementById('galleryThumbs');
        
        if (!galleryMain || !galleryThumbs) {
            console.error('Галерея не знайдена');
            return;
        }
        
        // Створюємо елемент для основної галереї (великі фото)
        const mainPhotoElement = document.createElement('div');
        mainPhotoElement.className = 'photo-item';
        
        // Перевіряємо, чи зображення завантажується правильно
        const testImg = new Image();
        testImg.onload = () => {
            console.log(`📸 Фото завантажено успішно: ${testImg.width}x${testImg.height}px`);
        };
        testImg.onerror = () => {
            console.error('📸 Помилка завантаження фото');
            this.showError('Помилка відображення фотографії');
        };
        testImg.src = photo.data;
        
        mainPhotoElement.innerHTML = `
            <img src="${photo.data}" alt="Фотографія ${photo.filename}" onclick="app.openPhotoViewer(${this.photos.indexOf(photo)})" style="cursor: pointer; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" loading="lazy">
            <div class="photo-info" style="padding: 8px; font-size: 0.9rem; color: #666;">
                <div style="font-weight: bold; margin-bottom: 4px;">${photo.filename}</div>
                <div>${new Date(photo.timestamp).toLocaleString('uk-UA')}</div>
            </div>
            <div class="photo-actions">
                <button class="photo-action-btn save-btn" onclick="app.savePhotoToDevice(${JSON.stringify(photo)})" title="Зберегти на пристрій">💾</button>
                <button class="photo-action-btn share-btn" onclick="app.sharePhoto(${JSON.stringify(photo)})" title="Поділитися">📤</button>
                <button class="photo-action-btn delete-btn" onclick="app.deletePhoto(${photo.id})" title="Видалити">×</button>
            </div>
        `;
        
        // Створюємо мініатюру з кращими стилями
        const thumbElement = document.createElement('div');
        thumbElement.className = 'photo-item';
        thumbElement.innerHTML = `
            <img src="${photo.data}" alt="Фотографія" onclick="app.openPhotoViewer(${this.photos.indexOf(photo)})" style="cursor: pointer; width: 100px; height: 100px; object-fit: cover; border-radius: 8px; transition: transform 0.2s;" loading="lazy" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        `;
        
        // Додаємо на початок основної галереї (показуємо тільки останні 4 фото)
        if (galleryMain.children.length >= 4) {
            galleryMain.removeChild(galleryMain.lastChild);
        }
        galleryMain.insertBefore(mainPhotoElement, galleryMain.firstChild);
        
        // Додаємо в мініатюри
        galleryThumbs.insertBefore(thumbElement, galleryThumbs.firstChild);
        
        // Показуємо успішне повідомлення
        console.log(`📸 Фото "${photo.filename}" додано до галереї`);
        this.showSuccess(`📸 Фото збережено в галереї!`);
    }
    
    async sharePhoto(photo) {
        try {
            // Конвертуємо base64 в Blob
            const response = await fetch(photo.data);
            const blob = await response.blob();
            
            // Створюємо файл
            const file = new File([blob], photo.filename, { type: 'image/jpeg' });
            
            // Спробуємо використати Web Share API
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Фотографія з камери',
                    text: 'Фотографія, зроблена програмою Катерини Миколаївни',
                    files: [file]
                });
                this.showSuccess('Фотографію поділено!');
            } else {
                // Fallback: копіюємо посилання
                await navigator.clipboard.writeText(photo.data);
                this.showSuccess('Посилання на фотографію скопійовано в буфер обміну!');
            }
        } catch (error) {
            console.error('Помилка при спробі поділитися:', error);
            this.showError('Не вдалося поділитися фотографією');
        }
    }
    
    deletePhoto(photoId) {
        this.photos = this.photos.filter(photo => photo.id !== photoId);
        this.savePhotos();
        this.renderGallery();
        
        // Показуємо повідомлення про видалення
        this.showSuccess('Фотографію видалено');
    }
    
    clearGallery() {
        if (this.photos.length === 0) {
            this.showError('Галерея вже порожня');
            return;
        }
        
        if (confirm('Ви впевнені, що хочете очистити всю галерею?')) {
            this.photos = [];
            this.savePhotos();
            this.renderGallery();
            this.showSuccess('Галерею очищено');
        }
    }
    
    async downloadAllPhotos() {
        if (this.photos.length === 0) {
            this.showError('Галерея порожня');
            return;
        }
        
        this.showSuccess(`Завантаження ${this.photos.length} фотографій...`);
        
        try {
            // Завантажуємо кожне фото окремо
            let downloadedCount = 0;
            
            for (let i = 0; i < this.photos.length; i++) {
                const photo = this.photos[i];
                
                try {
                    // Конвертуємо base64 в Blob
                    const response = await fetch(photo.data);
                    const blob = await response.blob();
                    
                    // Створюємо файл з іменем
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = photo.filename;
                    a.style.display = 'none';
                    
                    document.body.appendChild(a);
                    a.click();
                    
                    // Очищуємо
                    setTimeout(() => {
                        if (document.body.contains(a)) {
                            document.body.removeChild(a);
                        }
                        URL.revokeObjectURL(url);
                    }, 1000);
                    
                    downloadedCount++;
                    
                    // Затримка між завантаженнями для стабільності
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (photoError) {
                    console.error(`Помилка завантаження фото ${photo.filename}:`, photoError);
                }
            }
            
            if (downloadedCount > 0) {
                this.showSuccess(`Успішно завантажено ${downloadedCount} з ${this.photos.length} фотографій!`);
            } else {
                this.showError('Не вдалося завантажити жодної фотографії');
            }
            
        } catch (error) {
            console.error('Помилка масового завантаження:', error);
            this.showError('Помилка при завантаженні фотографій');
        }
    }
    
    renderGallery() {
        const galleryMain = document.getElementById('galleryMain');
        const galleryThumbs = document.getElementById('galleryThumbs');
        
        galleryMain.innerHTML = '';
        galleryThumbs.innerHTML = '';
        
        // Показуємо останні 4 фото в основній галереї
        const recentPhotos = this.photos.slice(-4).reverse();
        recentPhotos.forEach(photo => {
            const mainPhotoElement = document.createElement('div');
            mainPhotoElement.className = 'photo-item';
            mainPhotoElement.innerHTML = `
                <img src="${photo.data}" alt="Фотографія" onclick="app.openPhotoViewer(${this.photos.indexOf(photo)})" style="cursor: pointer;">
                <div class="photo-info">
                    ${new Date(photo.timestamp).toLocaleString('uk-UA')}
                </div>
                <div class="photo-actions">
                    <button class="photo-action-btn save-btn" onclick="app.savePhotoToDevice(${JSON.stringify(photo)})" title="Зберегти на пристрій">💾</button>
                    <button class="photo-action-btn share-btn" onclick="app.sharePhoto(${JSON.stringify(photo)})" title="Поділитися">📤</button>
                    <button class="photo-action-btn delete-btn" onclick="app.deletePhoto(${photo.id})" title="Видалити">×</button>
                </div>
            `;
            galleryMain.appendChild(mainPhotoElement);
        });
        
        // Показуємо всі фото як мініатюри
        this.photos.slice().reverse().forEach(photo => {
            const thumbElement = document.createElement('div');
            thumbElement.className = 'photo-item';
            thumbElement.innerHTML = `
                <img src="${photo.data}" alt="Фотографія" onclick="app.openPhotoViewer(${this.photos.indexOf(photo)})" style="cursor: pointer;">
            `;
            galleryThumbs.appendChild(thumbElement);
        });
    }
    
    savePhotos() {
        try {
            localStorage.setItem('camera_photos', JSON.stringify(this.photos));
        } catch (error) {
            console.error('Помилка при збереженні фотографій:', error);
        }
    }
    
    loadPhotos() {
        try {
            const savedPhotos = localStorage.getItem('camera_photos');
            if (savedPhotos) {
                this.photos = JSON.parse(savedPhotos);
                this.renderGallery();
            }
        } catch (error) {
            console.error('Помилка при завантаженні фотографій:', error);
        }
    }
    
    handleOrientationChange() {
        // Перезапускаємо камеру при зміні орієнтації з підтримкою автоповороту
        if (this.stream) {
            setTimeout(() => {
                this.rotateCamera();
            }, 200);
        }
    }
    
    rotateCamera() {
        // Визначаємо орієнтацію
        const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
        let rotation = 0;
        
        if (orientation) {
            switch (orientation.angle || window.orientation) {
                case 0:   rotation = 0; break;     // Портрет
                case 90:  rotation = -90; break;   // Ландшафт (поворот вліво)
                case -90: rotation = 90; break;    // Ландшафт (поворот вправо)
                case 180: rotation = 180; break;   // Портрет догори ногами
                default:  rotation = 0;
            }
        }
        
        // Застосовуємо поворот до відео
        const video = document.getElementById('video');
        if (video) {
            video.style.transform = `rotate(${rotation}deg)`;
            video.style.transition = 'transform 0.3s ease';
        }
        
        // Перезапускаємо камеру з новими налаштуваннями
        this.startCamera();
    }
    
    handleResize() {
        // Оптимізуємо розміри для нової роздільної здатності
        if (window.innerWidth < 768) {
            // Мобільна оптимізація
            this.optimizeForMobile();
        } else {
            // Десктопна оптимізація
            this.optimizeForDesktop();
        }
    }
    
    optimizeForMobile() {
        // Оптимізації для мобільних пристроїв
        document.body.classList.add('mobile-optimized');
    }
    
    optimizeForDesktop() {
        // Оптимізації для десктопних пристроїв
        document.body.classList.remove('mobile-optimized');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type = 'info') {
        if (!this.settings.showNotifications) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#3742fa'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Методи для роботи з фільтрами
    changeFilter(filter) {
        this.settings.currentFilter = filter;
        
        // Оновлюємо активну кнопку фільтра
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Оновлюємо попередній перегляд фільтра
        this.updateFilterPreview(filter);
        
        // Зберігаємо налаштування
        localStorage.setItem('camera_settings', JSON.stringify(this.settings));
        
        this.showSuccess(`Фільтр "${this.getFilterName(filter)}" активовано!`);
    }
    
    getFilterName(filter) {
        const names = {
            'none': 'Без фільтра',
            'retro90s': '90-ті роки',
            'retro2000s': '2000-ні роки',
            'vintage': 'Вінтаж',
            'sepia': 'Сепія'
        };
        return names[filter] || filter;
    }
    
    updateFilterPreview(filter) {
        const previewImg = document.getElementById('filterPreviewImg');
        if (!previewImg) return;
        
        // Створюємо тестове зображення з фільтром
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        
        // Малюємо простий градієнт
        const gradient = ctx.createLinearGradient(0, 0, 100, 100);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 100, 100);
        
        // Застосовуємо фільтр
        this.applyFilterToContext(ctx, filter);
        
        // Оновлюємо попередній перегляд
        previewImg.src = canvas.toDataURL();
    }
    
    applyFilterToContext(ctx, filter) {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        
        switch (filter) {
            case 'retro90s':
                // Фільтр 90-х: яскраві кольори, контраст
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.2);     // R
                    data[i + 1] = Math.min(255, data[i + 1] * 1.1); // G
                    data[i + 2] = Math.min(255, data[i + 2] * 0.9); // B
                }
                break;
                
            case 'retro2000s':
                // Фільтр 2000-х: пастельні тони, легка сепія
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    data[i] = Math.min(255, r * 0.9 + g * 0.1 + b * 0.1);     // R
                    data[i + 1] = Math.min(255, r * 0.1 + g * 0.9 + b * 0.1); // G
                    data[i + 2] = Math.min(255, r * 0.1 + g * 0.1 + b * 0.9); // B
                }
                break;
                
            case 'vintage':
                // Вінтажний фільтр: коричневі тони, старі фотографії
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    data[i] = Math.min(255, r * 0.8 + g * 0.4 + b * 0.2);     // R
                    data[i + 1] = Math.min(255, r * 0.4 + g * 0.7 + b * 0.3); // G
                    data[i + 2] = Math.min(255, r * 0.2 + g * 0.3 + b * 0.6); // B
                }
                break;
                
            case 'sepia':
                // Сепія фільтр: класичний коричневий тон
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    data[i] = Math.min(255, gray * 1.1);     // R
                    data[i + 1] = Math.min(255, gray * 0.9); // G
                    data[i + 2] = Math.min(255, gray * 0.7); // B
                }
                break;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Методи для роботи зі слайд-шоу
    updateSlideshowSpeed(speed) {
        this.settings.slideshowSpeed = parseInt(speed);
        document.getElementById('speedValue').textContent = speed;
        
        // Оновлюємо інтервал якщо слайд-шоу грає
        if (this.slideshowIsPlaying) {
            this.stopSlideshow();
            this.playSlideshow();
        }
        
        localStorage.setItem('camera_settings', JSON.stringify(this.settings));
    }
    
    playSlideshow() {
        if (this.photos.length === 0) {
            this.showError('Галерея порожня');
            return;
        }
        
        this.slideshowIsPlaying = true;
        document.getElementById('playSlideshow').style.display = 'none';
        document.getElementById('pauseSlideshow').style.display = 'inline-block';
        
        this.slideshowInterval = setInterval(() => {
            this.slideshowCurrentIndex = (this.slideshowCurrentIndex + 1) % this.photos.length;
            this.currentPhotoIndex = this.slideshowCurrentIndex;
            this.showPhotoInViewer();
        }, this.settings.slideshowSpeed * 1000);
        
        this.showSuccess('Слайд-шоу запущено!');
    }
    
    pauseSlideshow() {
        this.slideshowIsPlaying = false;
        document.getElementById('playSlideshow').style.display = 'inline-block';
        document.getElementById('pauseSlideshow').style.display = 'none';
        
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        
        this.showSuccess('Слайд-шоу призупинено');
    }
    
    stopSlideshow() {
        this.slideshowIsPlaying = false;
        document.getElementById('playSlideshow').style.display = 'inline-block';
        document.getElementById('pauseSlideshow').style.display = 'none';
        
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        
        this.slideshowCurrentIndex = 0;
        this.currentPhotoIndex = 0;
        this.showPhotoInViewer();
        
        this.showSuccess('Слайд-шоу зупинено');
    }
    
    startGallerySlideshow() {
        if (this.photos.length === 0) {
            this.showError('Галерея порожня');
            return;
        }
        
        // Сортуємо фотографії за датою
        const sortedPhotos = [...this.photos].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        // Відкриваємо першу фотографію
        this.currentPhotoIndex = this.photos.indexOf(sortedPhotos[0]);
        this.slideshowCurrentIndex = this.currentPhotoIndex;
        this.openPhotoViewer(this.currentPhotoIndex);
        
        // Запускаємо слайд-шоу
        setTimeout(() => {
            this.playSlideshow();
        }, 1000);
        
        this.showSuccess('Слайд-шоу галереї запущено!');
    }
    
    // Методи для роботи з геолокацією та контекстом
    async getLocationData() {
        if (!this.settings.gpsEnabled) return null;
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 хвилин
                });
            });
            
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Отримуємо назву місця через reverse geocoding
            const locationName = await this.reverseGeocode(lat, lon);
            
            this.currentLocation = {
                latitude: lat,
                longitude: lon,
                name: locationName,
                accuracy: position.coords.accuracy
            };
            
            return this.currentLocation;
        } catch (error) {
            console.error('Помилка отримання геолокації:', error);
            this.showError('Не вдалося визначити місцезнаходження');
            return null;
        }
    }
    
    async reverseGeocode(lat, lon) {
        try {
            // Використовуємо OpenStreetMap Nominatim API (безкоштовний)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=uk`);
            const data = await response.json();
            
            if (data.display_name) {
                // Скорочуємо назву для кращого відображення
                const parts = data.display_name.split(',');
                return parts.slice(0, 3).join(', ').trim();
            }
            
            return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        } catch (error) {
            console.error('Помилка reverse geocoding:', error);
            return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
    }
    
    async getWeatherData() {
        if (!this.settings.weatherEnabled || !this.currentLocation) return null;
        
        try {
            // Використовуємо Open-Meteo API (безкоштовний, без API ключа)
            const { latitude, longitude } = this.currentLocation;
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
            const data = await response.json();
            
            if (data.current_weather) {
                const weather = data.current_weather;
                const weatherCode = weather.weathercode;
                
                this.currentWeather = {
                    temperature: Math.round(weather.temperature),
                    windSpeed: weather.windspeed,
                    weatherCode: weatherCode,
                    description: this.getWeatherDescription(weatherCode),
                    icon: this.getWeatherIcon(weatherCode),
                    isDay: weather.is_day
                };
                
                return this.currentWeather;
            }
        } catch (error) {
            console.error('Помилка отримання погоди:', error);
            this.showError('Не вдалося отримати дані про погоду');
        }
        
        return null;
    }
    
    getWeatherDescription(code) {
        const descriptions = {
            0: 'Ясно',
            1: 'Переважно ясно',
            2: 'Частково хмарно',
            3: 'Хмарно',
            45: 'Туман',
            48: 'Іній',
            51: 'Легкий дощ',
            53: 'Помірний дощ',
            55: 'Сильний дощ',
            61: 'Слабкий дощ',
            63: 'Дощ',
            65: 'Зливи',
            71: 'Легкий сніг',
            73: 'Сніг',
            75: 'Сильний сніг',
            80: 'Грози',
            95: 'Гроза'
        };
        
        return descriptions[code] || 'Невідомо';
    }
    
    getWeatherIcon(code) {
        const icons = {
            0: '☀️', // Ясно
            1: '🌤️', // Переважно ясно
            2: '⛅', // Частково хмарно
            3: '☁️', // Хмарно
            45: '🌫️', // Туман
            48: '🌨️', // Іній
            51: '🌦️', // Легкий дощ
            53: '🌧️', // Помірний дощ
            55: '🌧️', // Сильний дощ
            61: '🌦️', // Слабкий дощ
            63: '🌧️', // Дощ
            65: '⛈️', // Зливи
            71: '🌨️', // Легкий сніг
            73: '❄️', // Сніг
            75: '❄️', // Сильний сніг
            80: '⛈️', // Грози
            95: '⛈️'  // Гроза
        };
        
        return icons[code] || '🌤️';
    }
    
    async getCalendarEvent() {
        if (!this.settings.calendarEnabled) return null;
        
        try {
            // Симуляція отримання подій календаря
            // В реальному застосунку тут була б інтеграція з Google Calendar API або іншим сервісом
            const now = new Date();
            const events = this.getSimulatedEvents(now);
            
            if (events.length > 0) {
                this.currentEvent = events[0];
                return this.currentEvent;
            }
        } catch (error) {
            console.error('Помилка отримання подій календаря:', error);
        }
        
        return null;
    }
    
    getSimulatedEvents(date) {
        // Симулюємо різні події в залежності від часу
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        const events = [];
        
        if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            events.push({
                title: 'Робочий день',
                description: 'Фото зроблено під час роботи',
                type: 'work',
                icon: '💼'
            });
        }
        
        if (hour >= 18 || hour <= 2) {
            events.push({
                title: 'Вечірній час',
                description: 'Фото зроблено ввечері',
                type: 'evening',
                icon: '🌙'
            });
        }
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            events.push({
                title: 'Вихідні',
                description: 'Фото зроблено у вихідний день',
                type: 'weekend',
                icon: '🏖️'
            });
        }
        
        // Додаємо сезонні події
        const month = date.getMonth();
        if (month >= 11 || month <= 1) {
            events.push({
                title: 'Зима',
                description: 'Зимова фотографія',
                type: 'season',
                icon: '❄️'
            });
        }
        
        return events;
    }
    
    async updateLocationPreview() {
        const locationPreview = document.getElementById('locationPreview');
        const currentLocationEl = document.getElementById('currentLocation');
        const currentWeatherEl = document.getElementById('currentWeather');
        
        if (!locationPreview || !currentLocationEl || !currentWeatherEl) {
            console.log('Елементи попереднього перегляду локації не знайдені');
            return;
        }
        
        if (this.settings.gpsEnabled || this.settings.weatherEnabled) {
            locationPreview.style.display = 'block';
            
            if (this.settings.gpsEnabled) {
                currentLocationEl.style.display = 'block';
                currentLocationEl.textContent = '📍 Визначення місцезнаходження...';
                try {
                    const location = await this.getLocationData();
                    if (location) {
                        currentLocationEl.textContent = `📍 ${location.name}`;
                    }
                } catch (error) {
                    currentLocationEl.textContent = '📍 Помилка геолокації';
                }
            } else {
                currentLocationEl.style.display = 'none';
            }
            
            if (this.settings.weatherEnabled && this.currentLocation) {
                currentWeatherEl.textContent = '🌤️ Завантаження погоди...';
                const weather = await this.getWeatherData();
                if (weather) {
                    currentWeatherEl.textContent = `${weather.icon} ${weather.description}, ${weather.temperature}°C`;
                }
            } else {
                currentWeatherEl.style.display = 'none';
            }
        } else {
            locationPreview.style.display = 'none';
        }
    }
    
    toggleMetadata() {
        const metadata = document.getElementById('photoMetadata');
        const toggleBtn = document.getElementById('metadataToggle');
        
        if (!metadata || !toggleBtn) {
            console.log('Елементи метаданих не знайдені');
            return;
        }
        
        this.metadataVisible = !this.metadataVisible;
        
        if (this.metadataVisible) {
            metadata.style.display = 'block';
            toggleBtn.textContent = '❌ Сховати';
        } else {
            metadata.style.display = 'none';
            toggleBtn.textContent = 'ℹ️ Деталі';
        }
    }

    updatePermissionStatus() {
        const permissionIndicator = document.getElementById('permissionIndicator');
        const permissionText = document.getElementById('permissionText');
        const requestPermissionBtn = document.getElementById('requestPermissionBtn');
        
        if (!permissionIndicator || !permissionText || !requestPermissionBtn) {
            return;
        }

        if (this.permissionGranted) {
            permissionIndicator.textContent = '🟢';
            permissionText.textContent = 'Доступ до камери дозволено';
            requestPermissionBtn.style.display = 'none';
        } else if (this.permissionChecked) {
            permissionIndicator.textContent = '🔴';
            permissionText.textContent = 'Доступ до камери заборонено';
            requestPermissionBtn.style.display = 'block';
        } else {
            permissionIndicator.textContent = '🟡';
            permissionText.textContent = 'Перевірка дозволу...';
            requestPermissionBtn.style.display = 'none';
        }
    }

    async requestCameraPermissionManual() {
        try {
            const permissionGranted = await this.requestCameraPermission();
            if (permissionGranted) {
                this.updatePermissionStatus();
                // Спробуємо запустити камеру
                await this.startCamera();
                this.showSuccess('Доступ до камери надано! Камера запущена.');
            }
        } catch (error) {
            console.error('Помилка при ручному запиті дозволу:', error);
            this.updatePermissionStatus();
        }
    }
    
    // Функція для очищення всіх дозволів (доступна глобально)
    clearAllPermissions() {
        this.clearAllPermissionData();
        this.permissionGranted = false;
        this.permissionChecked = false;
        
        // Зупиняємо камеру якщо працює
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
        }
        
        this.updatePermissionStatus();
        this.showSuccess('Дозволи камери очищено. При наступному використанні буде запитано дозвіл знову.');
        
        console.log('Всі дозволи камери очищено');
    }
    
    // ========== НОВІ ФУНКЦІЇ ==========
    
    // Зум функції
    zoomIn() {
        if (this.currentZoom < this.maxZoom) {
            this.currentZoom = Math.min(this.currentZoom + this.zoomStep, this.maxZoom);
            this.applyZoom();
        }
    }
    
    zoomOut() {
        if (this.currentZoom > this.minZoom) {
            this.currentZoom = Math.max(this.currentZoom - this.zoomStep, this.minZoom);
            this.applyZoom();
        }
    }
    
    applyZoom() {
        if (this.video) {
            this.video.style.transform = `scale(${this.currentZoom})`;
            const zoomIndicator = document.getElementById('zoomIndicator');
            const zoomLevel = document.getElementById('zoomLevel');
            
            if (this.currentZoom > 1.0) {
                zoomIndicator.style.display = 'block';
                zoomLevel.textContent = `${this.currentZoom.toFixed(1)}x`;
            } else {
                zoomIndicator.style.display = 'none';
            }
        }
    }
    
    // Таймер функції
    toggleTimer() {
        this.timerActive = !this.timerActive;
        const timerBtn = document.getElementById('timerBtn');
        
        if (this.timerActive) {
            timerBtn.classList.add('active');
        } else {
            timerBtn.classList.remove('active');
        }
    }
    
    async startTimerCountdown() {
        if (!this.timerActive) return false;
        
        const timerIndicator = document.getElementById('timerIndicator');
        const timerCountdown = document.getElementById('timerCountdown');
        
        timerIndicator.style.display = 'block';
        
        for (let i = this.timerSeconds; i > 0; i--) {
            timerCountdown.textContent = i;
            
            // Анімація пульсації
            timerIndicator.style.transform = 'scale(1.2)';
            setTimeout(() => {
                timerIndicator.style.transform = 'scale(1.0)';
            }, 200);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        timerIndicator.style.display = 'none';
        return true;
    }
    
    // Серійна зйомка
    toggleBurstMode() {
        this.burstMode = !this.burstMode;
        const burstBtn = document.getElementById('burstBtn');
        
        if (this.burstMode) {
            burstBtn.classList.add('active');
        } else {
            burstBtn.classList.remove('active');
        }
    }
    
    async startBurstCapture() {
        const burstIndicator = document.getElementById('burstIndicator');
        const burstCount = document.getElementById('burstCount');
        
        burstIndicator.style.display = 'block';
        this.burstPhotos = [];
        
        for (let i = 0; i < this.burstCount; i++) {
            burstCount.textContent = `${i + 1}`;
            
            // Анімація спалаху
            this.showQuickFlash();
            
            // Знімаємо фото (без переходу в галерею)
            await this.capturePhotoSilent();
            
            // Коротка затримка між кадрами
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        burstIndicator.style.display = 'none';
        
        // Залишаємося в камері після серійної зйомки
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isPWA && isIOS) {
            console.log('🍎 PWA: Перезапускаємо камеру після серійної зйомки для iOS PWA');
            setTimeout(async () => {
                try {
                    await this.restartCameraForPWA();
                    this.showInfo(`📸 Серійна зйомка завершена! ${this.burstCount} фото`);
                } catch (error) {
                    console.log('🍎 PWA: Помилка перезапуску камери після серійної зйомки:', error);
                    this.showInfo(`📸 Серійна зйомка завершена! ${this.burstCount} фото`);
                }
            }, 500);
        } else {
            setTimeout(() => {
                this.showInfo(`📸 Серійна зйомка завершена! ${this.burstCount} фото`);
            }, 300);
        }
    }
    
    // Тихе фотографування (без переходу в галерею)
    async capturePhotoSilent() {
        if (!this.stream) return;
        
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Враховуємо зум
        const scaledWidth = this.video.videoWidth / this.currentZoom;
        const scaledHeight = this.video.videoHeight / this.currentZoom;
        const offsetX = (this.video.videoWidth - scaledWidth) / 2;
        const offsetY = (this.video.videoHeight - scaledHeight) / 2;
        
        context.drawImage(this.video, offsetX, offsetY, scaledWidth, scaledHeight, 0, 0, this.canvas.width, this.canvas.height);
        
        // Застосовуємо фільтр
        if (this.settings.currentFilter && this.settings.currentFilter !== 'none') {
            this.applyFilterToContext(context, this.settings.currentFilter);
        }
        
        // Додаємо водяні знаки
        if (this.settings.watermarkEnabled) {
            this.addWatermarks(context);
        }
        
        const photoData = this.canvas.toDataURL('image/jpeg', this.settings.highQuality ? 1.0 : 0.8);
        
        const photo = {
            id: Date.now() + Math.random(),
            data: photoData,
            timestamp: new Date().toISOString(),
            filename: `burst_${Date.now()}_${this.burstPhotos.length + 1}.jpg`,
            metadata: {
                burstPhoto: true,
                burstIndex: this.burstPhotos.length + 1,
                zoom: this.currentZoom
            }
        };
        
        this.photos.unshift(photo);
        this.burstPhotos.push(photo);
        
        if (this.settings.autoSave) {
            this.savePhotos();
        }
        
        if (this.settings.autoSaveToPhone) {
            setTimeout(() => {
                this.savePhotoToPhone(photo);
            }, 200);
        }
    }
    
    // Швидкий спалах для серійної зйомки
    showQuickFlash() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            z-index: 9999;
            opacity: 0.8;
            pointer-events: none;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(flash)) {
                    document.body.removeChild(flash);
                }
            }, 100);
        }, 50);
    }
    
    // Оновлена функція capturePhoto з підтримкою нових функцій
    async capturePhoto() {
        if (!this.stream) {
            this.showError('Камера не активна');
            return;
        }
        
        // Перевіряємо таймер
        if (this.timerActive) {
            const timerCompleted = await this.startTimerCountdown();
            if (!timerCompleted) return;
        }
        
        // Перевіряємо серійну зйомку
        if (this.burstMode) {
            await this.startBurstCapture();
            return;
        }
        
        // Звичайна зйомка
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Враховуємо зум
        if (this.currentZoom > 1.0) {
            const scaledWidth = this.video.videoWidth / this.currentZoom;
            const scaledHeight = this.video.videoHeight / this.currentZoom;
            const offsetX = (this.video.videoWidth - scaledWidth) / 2;
            const offsetY = (this.video.videoHeight - scaledHeight) / 2;
            
            context.drawImage(this.video, offsetX, offsetY, scaledWidth, scaledHeight, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            context.drawImage(this.video, 0, 0);
        }
        
        // Застосовуємо фільтр якщо обрано
        if (this.settings.currentFilter && this.settings.currentFilter !== 'none') {
            this.applyFilterToContext(context, this.settings.currentFilter);
        }
        
        // Додаємо водяні знаки якщо увімкнено
        if (this.settings.watermarkEnabled) {
            this.addWatermarks(context);
        }
        
        // Конвертуємо в base64
        const photoData = this.canvas.toDataURL('image/jpeg', this.settings.highQuality ? 1.0 : 0.8);
        
        // Отримуємо контекстну інформацію
        const location = await this.getLocationData();
        const weather = await this.getWeatherData();
        const event = await this.getCalendarEvent();
        
        // Створюємо об'єкт фотографії з метаданими
        const photo = {
            id: Date.now(),
            data: photoData,
            timestamp: new Date().toISOString(),
            filename: `photo_${new Date().toLocaleString('uk-UA').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
            metadata: {
                location: location,
                weather: weather,
                event: event,
                filter: this.settings.currentFilter,
                zoom: this.currentZoom,
                timer: this.timerActive,
                burst: this.burstMode
            }
        };
        
        this.photos.unshift(photo);
        
        if (this.settings.autoSave) {
            this.savePhotos();
        }
        
        // Автоматично зберігаємо на пристрій якщо увімкнено (старий параметр)
        if (this.settings.autoSaveToDevice) {
            this.savePhotoToDevice(photo);
        }
        
        // Автоматично зберігаємо на телефон якщо увімкнено (новий параметр)
        // Автоматичне збереження фото на телефон
        if (this.settings.autoSaveToPhone) {
            setTimeout(() => {
                this.savePhotoToPhone(photo);
            }, 500); // Затримка для кращої обробки
            
            // Без підказок для iOS
        }
        
        // Додаємо затримку для кращого відображення
        setTimeout(() => {
            this.displayPhoto(photo);
        }, 100);
        
        // Показуємо анімацію
        this.showCaptureAnimation();
        
        // Звуковий ефект
        if (this.settings.soundEffects) {
            this.playCaptureSound();
        }
        
        // ЗАВЖДИ залишаємося в режимі камери після фото
        console.log('📸 Залишаємося в режимі камери після фотографування');
        
        // Для PWA режиму на iOS - перезапускаємо камеру після фото
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isPWA && isIOS) {
            console.log('🍎 PWA: Перезапускаємо камеру після фото для iOS PWA');
            setTimeout(async () => {
                try {
                    // Перезапускаємо камеру через 500ms
                    await this.restartCameraForPWA();
                    this.showInfo('📸 Фото збережено!');
                } catch (error) {
                    console.log('🍎 PWA: Помилка перезапуску камери:', error);
                    this.showInfo('📸 Фото збережено!');
                }
            }, 500);
        } else {
            setTimeout(() => {
                this.showInfo('📸 Фото збережено!');
            }, 300);
        }
        
        console.log('Фотографію зроблено!');
        
        // ЗМІЦНЮЄМО iOS дозволи після фотографії
        // Використовуємо вже оголошені змінні isIOS з початку функції
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS && isSafari) {
            console.log('🍎 capturePhoto: Зміцнюємо дозволи після фотографії');
            this.saveIOSPermissionsAggressively();
            this.iosPermissionsPermanent = true;
            this.permissionGranted = true;
            this.permissionChecked = true;
            this.showInfo('🍎 Дозволи зміцнено після фото');
        }
    }
    
    // PWA методи
    showInstallPrompt() {
        // Перевіряємо чи вже встановлено
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            console.log('📱 PWA: App already installed');
            this.hideInstallPrompt();
            return;
        }
        
        // Перевіряємо чи користувач раніше відхилив
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) { // 7 днів
            console.log('📱 PWA: Install prompt recently dismissed');
            return;
        }
        
        if (this.pwaInstallPrompt) {
            this.pwaInstallPrompt.style.display = 'block';
            console.log('📱 PWA: Showing install prompt');
        }
        
        if (this.installAppBtn) {
            this.installAppBtn.style.display = 'inline-block';
        }
        
        // Автоматично ховаємо через 10 секунд
        setTimeout(() => {
            this.hideInstallPrompt();
        }, 10000);
    }
    
    hideInstallPrompt() {
        if (this.pwaInstallPrompt) {
            this.pwaInstallPrompt.style.display = 'none';
        }
        if (this.installAppBtn) {
            this.installAppBtn.style.display = 'none';
        }
    }
    
    dismissInstallPrompt() {
        this.hideInstallPrompt();
        localStorage.setItem('pwa_install_dismissed', Date.now().toString());
        console.log('📱 PWA: Install prompt dismissed by user');
    }
    
    async installPWA() {
        if (!this.deferredPrompt) {
            console.log('📱 PWA: No deferred prompt available');
            this.showError('Встановлення недоступне на цьому пристрої');
            return;
        }
        
        try {
            console.log('📱 PWA: Starting installation');
            this.hideInstallPrompt();
            
            // Показуємо нативний промпт
            this.deferredPrompt.prompt();
            
            // Чекаємо на рішення користувача
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('📱 PWA: User accepted the install prompt');
                this.showSuccess('📱 Додаток встановлюється...');
            } else {
                console.log('📱 PWA: User dismissed the install prompt');
                this.dismissInstallPrompt();
            }
            
            // Очищуємо deferred prompt
            this.deferredPrompt = null;
            
        } catch (error) {
            console.error('📱 PWA: Installation error:', error);
            this.showError('Помилка при встановленні додатку');
        }
    }
    
    checkPWAStatus() {
        // Перевіряємо чи вже встановлено
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        
        if (isStandalone) {
            console.log('📱 PWA: App is running in standalone mode');
            this.hideInstallPrompt();
            return;
        }
        
        // Для мобільних пристроїв показуємо промпт через деякий час
        if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
            setTimeout(() => {
                if (!this.deferredPrompt) {
                    console.log('📱 PWA: No deferred prompt, showing manual install hint');
                    this.showManualInstallHint();
                }
            }, 5000); // Показуємо через 5 секунд
        }
    }
    
    showManualInstallHint() {
        // Показуємо підказку для ручного встановлення
        if (this.installAppBtn) {
            this.installAppBtn.style.display = 'inline-block';
        }
        
        // Для iOS Safari показуємо спеціальну підказку
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent)) {
            setTimeout(() => {
                this.showInfo('📱 iOS: Для встановлення натисніть "Поділитися" → "На екран «Домівка»"');
            }, 1000);
        }
    }

}

// Додаємо CSS анімації
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .mobile-optimized .camera-section {
        padding: 10px;
    }
    
    .mobile-optimized #video {
        height: 50vh;
    }
    
    .notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    /* Анімації для тем */
    body {
        transition: background 0.5s ease, color 0.5s ease;
    }
    
    .mobile-header,
    .camera-section,
    .gallery-section,
    .mobile-menu {
        transition: background 0.5s ease, border-color 0.5s ease;
    }
    
    /* Анімації для кнопок */
    .mobile-capture-btn,
    .mobile-switch-btn,
    .mobile-flash-btn,
    .btn {
        transition: all 0.3s ease;
    }
    
    /* Стилі для статусу дозволу */
    .permission-section {
        margin-top: 15px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.05);
    }
    
    .permission-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
    }
    
    .permission-indicator {
        font-size: 16px;
    }
    
    #requestPermissionBtn {
        width: 100%;
        margin-top: 5px;
    }
`;
document.head.appendChild(style);

// Перемикач теми
CameraApp.prototype.toggleTheme = function() {
    const isDark = document.getElementById('darkMode').checked;
    this.settings.darkMode = isDark;
    this.saveSettings();
    
    if (isDark) {
        document.documentElement.style.setProperty('--primary-bg', '#1a1a1a');
        document.documentElement.style.setProperty('--secondary-bg', '#2d2d2d');
        document.documentElement.style.setProperty('--text-color', '#ffffff');
        document.documentElement.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.2)');
        document.documentElement.style.setProperty('--menu-bg', 'rgba(26, 26, 26, 0.95)');
    } else {
        document.documentElement.style.setProperty('--primary-bg', '#ffffff');
        document.documentElement.style.setProperty('--secondary-bg', '#f8f9fa');
        document.documentElement.style.setProperty('--text-color', '#2c3e50');
        document.documentElement.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
        document.documentElement.style.setProperty('--menu-bg', 'rgba(255, 255, 255, 0.95)');
    }
};

// Отримання погоди та місця
CameraApp.prototype.loadWeatherWidget = async function() {
    if (!this.settings.showWeather) {
        document.getElementById('weatherWidget').style.display = 'none';
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false
            });
        });

        const { latitude, longitude } = position.coords;
        
        const locationResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=uk`
        );
        const locationData = await locationResponse.json();
        const city = locationData.address?.city || locationData.address?.town || locationData.address?.village || 'Невідоме місце';

        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
        );
        const weatherData = await weatherResponse.json();
        const temp = Math.round(weatherData.current_weather.temperature);
        
        const weatherCode = weatherData.current_weather.weathercode;
        let weatherIcon = '☀️';
        if (weatherCode >= 61 && weatherCode <= 67) weatherIcon = '🌧️';
        else if (weatherCode >= 71 && weatherCode <= 77) weatherIcon = '❄️';
        else if (weatherCode >= 80 && weatherCode <= 82) weatherIcon = '🌦️';
        else if (weatherCode >= 45 && weatherCode <= 48) weatherIcon = '🌫️';
        else if (weatherCode >= 51 && weatherCode <= 57) weatherIcon = '🌦️';
        else if (weatherCode >= 1 && weatherCode <= 3) weatherIcon = '⛅';

        document.getElementById('weatherInfo').innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${weatherIcon}</span>
                <span>${temp}°C</span>
                <span>📍 ${city}</span>
            </div>
        `;
        document.getElementById('weatherWidget').style.display = 'block';

    } catch (error) {
        console.log('Не вдалося завантажити погоду:', error);
        document.getElementById('weatherInfo').innerHTML = '📍 Геолокація недоступна';
        document.getElementById('weatherWidget').style.display = 'block';
    }
};

// Очищення кешу для мобільних пристроїв
if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
    // Примусове перезавантаження без кешу
    if (!sessionStorage.getItem('mobile_reload_done')) {
        sessionStorage.setItem('mobile_reload_done', 'true');
        location.reload(true);
    }
}

// Запускаємо додаток
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CameraApp();
});

// Обробка помилок
window.addEventListener('error', (event) => {
    console.error('Помилка додатку:', event.error);
});

// Обробка необроблених відхилень
window.addEventListener('unhandledrejection', (event) => {
    console.error('Необроблена помилка Promise:', event.reason);
});

// Додаємо підтримку PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW зареєстровано:', registration);
            })
            .catch(registrationError => {
                console.log('SW реєстрація не вдалася:', registrationError);
            });
    });
}
