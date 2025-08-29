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
        
        this.init();
    }
    
    async init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Додаємо обробники подій для мобільних кнопок
        this.captureBtn.addEventListener('click', async () => await this.capturePhoto());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.flashBtn.addEventListener('click', () => this.toggleFlash());
        
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
    
    async checkCameraPermission() {
        try {
            // Перевіряємо збережений статус дозволу
            const savedPermission = localStorage.getItem('camera_permission_granted');
            
            // Для мобільних перевіряємо термін дії
            if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
                const mobileExpires = localStorage.getItem('mobile_permission_expires');
                if (mobileExpires && Date.now() < parseInt(mobileExpires) && savedPermission === 'true') {
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                    console.log('Використовуємо збережений мобільний дозвіл');
                    return true;
                }
            } else if (savedPermission === 'true') {
                // Для десктопу
                this.permissionGranted = true;
                this.permissionChecked = true;
                return true;
            }

            // Використовуємо Permissions API якщо доступний
            if ('permissions' in navigator) {
                const permission = await navigator.permissions.query({ name: 'camera' });
                
                if (permission.state === 'granted') {
                    this.permissionGranted = true;
                    this.permissionChecked = true;
                    localStorage.setItem('camera_permission_granted', 'true');
                    return true;
                } else if (permission.state === 'denied') {
                    this.permissionGranted = false;
                    this.permissionChecked = true;
                    localStorage.setItem('camera_permission_granted', 'false');
                    this.showError('Доступ до камери заборонено. Будь ласка, дозвольте доступ у налаштуваннях браузера.');
                    return false;
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

    async requestCameraPermission() {
        try {
            // Робимо пробний запит до камери для отримання дозволу
            const testStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: this.settings.facingMode } 
            });
            
            // Якщо дозвіл отримано, зупиняємо тестовий stream
            testStream.getTracks().forEach(track => track.stop());
            
            this.permissionGranted = true;
            localStorage.setItem('camera_permission_granted', 'true');
            // Для мобільних встановлюємо довгий термін дії дозволу
            if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
                localStorage.setItem('mobile_permission_expires', Date.now() + (24 * 60 * 60 * 1000)); // 24 години
            }
            this.updatePermissionStatus();
            this.showSuccess('Дозвіл до камери надано!');
            return true;
        } catch (error) {
            console.error('Помилка при запиті дозволу до камери:', error);
            this.permissionGranted = false;
            localStorage.setItem('camera_permission_granted', 'false');
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
            // Перевіряємо дозвіл до камери спочатку
            if (!this.permissionChecked) {
                const hasPermission = await this.checkCameraPermission();
                if (!hasPermission && !this.permissionGranted) {
                    // Запитуємо дозвіл тільки якщо він ще не надавався
                    const permissionGranted = await this.requestCameraPermission();
                    if (!permissionGranted) {
                        return; // Виходимо якщо дозвіл не надано
                    }
                }
            } else if (!this.permissionGranted) {
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
            
            // Використовуємо існуючий дозвіл
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // ВАЖЛИВО: зберігаємо успішний дозвіл з датою
            this.permissionGranted = true;
            const permissionData = {
                granted: true,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            };
            localStorage.setItem('camera_permission_granted', 'true');
                            localStorage.setItem('camera_permission_data', JSON.stringify(permissionData));
            // Для мобільних встановлюємо довгий термін дії дозволу
            if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
                localStorage.setItem('mobile_permission_expires', Date.now() + (24 * 60 * 60 * 1000)); // 24 години
            }
            this.updatePermissionStatus();
            
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
            // Перевіряємо чи є дозвіл
            if (!this.permissionGranted) {
                this.showError('Дозвіл до камери не надано');
                return;
            }

            // Перемикаємо режим камери
            this.settings.facingMode = this.settings.facingMode === 'user' ? 'environment' : 'user';
            
            // Зупиняємо поточний stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            // Запускаємо камеру з новими налаштуваннями (без повторного запиту дозволу)
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: this.settings.facingMode
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
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
        }
        
        this.displayPhoto(photo);
        
        // Показуємо анімацію
        this.showCaptureAnimation();
        
        // Звуковий ефект
        if (this.settings.soundEffects) {
            this.playCaptureSound();
        }
        
        // Переключаємося на галерею після фотографування
        setTimeout(() => {
            this.switchSection('gallery');
        }, 1000);
        
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
        
        // Налаштування шрифту
        const fontSize = Math.max(width, height) * 0.018; // Трохи менший розмір для кращого вигляду
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        
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
        
        // Малюємо фон для тексту (напівпрозорий прямокутник)
        const maxLineWidth = Math.max(...watermarkLines.map(line => context.measureText(line).width));
        const backgroundPadding = 15;
        const backgroundWidth = maxLineWidth + (backgroundPadding * 2);
        const backgroundHeight = totalHeight + (backgroundPadding * 2);
        
        // Малюємо напівпрозорий фон
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(
            (width - backgroundWidth) / 2,
            startY - backgroundPadding,
            backgroundWidth,
            backgroundHeight
        );
        
        // Відновлюємо тінь для тексту
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 3;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 1;
        
        // Малюємо кожен рядок тексту
        context.fillStyle = 'white';
        watermarkLines.forEach((line, index) => {
            const y = startY + (index * lineHeight) + fontSize;
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
            // Конвертуємо base64 в Blob
            const response = await fetch(photo.data);
            const blob = await response.blob();
            
            // Створюємо файл з іменем
            const file = new File([blob], photo.filename, { type: 'image/jpeg' });
            
            // Для мобільних пристроїв використовуємо автоматичне завантаження
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = photo.filename;
            a.style.display = 'none';
            
            // Додаємо атрибути для мобільних браузерів
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener');
            
            document.body.appendChild(a);
            
            // Для мобільних пристроїв використовуємо різні методи
            if (/Android/i.test(navigator.userAgent)) {
                // Android - прямий клік
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                a.dispatchEvent(clickEvent);
            } else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                // iOS - touch event
                const event = new TouchEvent('touchstart', {
                    bubbles: true,
                    cancelable: true
                });
                a.dispatchEvent(event);
            }
            
            a.click();
            
            // Очищаємо після невеликої затримки
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            if (this.settings.showNotifications) {
                this.showSuccess(`📱 Фото автоматично збережено на телефон!`);
            }
            return true;
            
        } catch (error) {
            console.error('Помилка при збереженні на телефон:', error);
            
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
                        
                        if (this.settings.showNotifications) {
                            this.showSuccess(`📱 Фото поділено через систему!`);
                        }
                        return true;
                    }
                } catch (shareError) {
                    console.log('Web Share API не спрацював:', shareError);
                }
            }
            
            if (this.settings.showNotifications) {
                this.showError('Не вдалося автоматично зберегти на телефон. Спробуйте зберегти вручну.');
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
        const photoElement = document.createElement('div');
        photoElement.className = 'photo-item';
        photoElement.innerHTML = `
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
        
        // Додаємо на початок галереї
        this.gallery.insertBefore(photoElement, this.gallery.firstChild);
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
    
    downloadAllPhotos() {
        if (this.photos.length === 0) {
            this.showError('Галерея порожня');
            return;
        }
        
        // Створюємо ZIP архів (симуляція)
        this.showSuccess(`Завантаження ${this.photos.length} фотографій...`);
        
        // В реальному додатку тут була б логіка для створення ZIP файлу
        setTimeout(() => {
            this.showSuccess('Фотографії успішно завантажено!');
        }, 2000);
    }
    
    renderGallery() {
        this.gallery.innerHTML = '';
        this.photos.forEach(photo => this.displayPhoto(photo));
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
