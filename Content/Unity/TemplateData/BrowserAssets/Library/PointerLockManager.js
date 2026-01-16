class PointerLockManager {
    constructor() {
        this.isUnityControlled = false;
        this.lastCursorStyle = '';
        this.isPointerLocked = false;
        this.isWindowFocused = true;
        this.escapeMessageShown = false;
		this.firstClick=false;
		this.exitWindows=false;
        this.init();
    }
    destroy() {
		 document.removeEventListener('pointerlockchange', this.handleLockChange.bind(this));
		 this.hideEscapeMessage();
		this.exitWindows=true;
	}
    init() {
        // Следим за изменениями курсора
        this.setupCursorObserver();
        
        // Следим за pointer lock
        document.addEventListener('pointerlockchange', this.handleLockChange.bind(this));
        
        // Следим за фокусом окна
        window.addEventListener('blur', () => {
			if(this.exitWindows){
				return;
			}
         //   console.log('Window lost focus');
            this.isWindowFocused = false;
            this.handleFocusLoss();
        });

        window.addEventListener('focus', () => {
						if(this.exitWindows){
				return;
			}
         //   console.log('Window gained focus');
            this.isWindowFocused = true;
            this.handleFocusGain();
        });

        // Следим за кликами по canvas для перезахвата
        const canvas = document.querySelector("#unity-canvas");
        if (canvas) {
            canvas.addEventListener('click', (event) => {
							if(this.exitWindows){
				return;
			}
              //  console.log('Click on Unity app area');
                this.handleCanvasClick();
            });
        }

        // Дополнительный обработчик ESC на всякий случай
        document.addEventListener('keydown', (event) => {
						if(this.exitWindows){
				return;
			}
            if (event.key === 'Escape' && this.isPointerLocked) {
            //    console.log('ESC key detected while pointer locked');
                // Не предотвращаем стандартное поведение, но отмечаем
                this.isUnityControlled = false;
            }
        });

        // Проверяем начальное состояние
        this.checkInitialState();
    }
    
    setupCursorObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    this.handleCursorChange();
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style']
        });
    }

    checkInitialState() {
        this.isPointerLocked = !!document.pointerLockElement;
        this.isWindowFocused = document.hasFocus();
        
        if (!this.isPointerLocked && !this.escapeMessageShown) {
            this.showClickToPlayMessage();
        }
    }
    
    handleCursorChange() {
        const currentCursor = document.body.style.cursor;
        
        // Unity обычно меняет курсор явно
        if (currentCursor !== this.lastCursorStyle) {
          //  console.log('Cursor style changed:', currentCursor);
            
            // Если курсор стал visible и изменился стиль - вероятно Unity
            if (currentCursor === 'default' || currentCursor === 'auto') {
                this.detectUnityRelease();
            }
            
            this.lastCursorStyle = currentCursor;
        }
    }
    
    handleLockChange() {
        const wasLocked = this.isPointerLocked;
        this.isPointerLocked = !!document.pointerLockElement;
        
     //   console.log('Pointer lock changed:', this.isPointerLocked);
        
        if (wasLocked && !this.isPointerLocked) {
            // Даем время Unity обновить курсор
            setTimeout(() => {
                this.detectReleaseSource();
            }, 50);
        } else if (!wasLocked && this.isPointerLocked) {
            // Курсор захвачен - скрываем сообщение
            this.hideEscapeMessage();
        }
    }

    detectReleaseSource() {
        const canvas = document.querySelector('#unity-canvas');
        
        if (!canvas) {
            this.onEscapeDetected();
            return;
        }
        
        const canvasStyle = window.getComputedStyle(canvas);
        const canvasCursor = canvasStyle.cursor;
        
        // Если курсор canvas изменился на default/auto - вероятно Unity освободила
        if (canvasCursor === 'default' || canvasCursor === 'auto') {
       //     console.log('Unity-controlled cursor release detected');
            this.handleUnityRelease();
        } else {
        //    console.log('Browser/system cursor release detected');
            this.onEscapeDetected();
        }
    }
    
    handleUnityRelease() {
        // Освобождение из Unity - нормальное поведение
       // console.log('Cursor released by Unity');
        this.hideEscapeMessage();
    }
    
    onEscapeDetected() {
      //  console.log('Cursor released by browser ESC or focus loss');
        
        // Показываем сообщение только если окно в фокусе
        if (this.isWindowFocused) {
            this.showEscapeMessage();
        } else {
            // Если окно не в фокусе, отложим показ сообщения до возвращения фокуса
            this.pendingEscapeMessage = true;
        }
    }

    handleFocusLoss() {
      //  console.log('Handling focus loss');
        // При потере фокуса считаем что это системное освобождение
        if (this.isPointerLocked) {
            this.isUnityControlled = false;
        }
		this.showEscapeMessage();
       // this.hideEscapeMessage();
    }

    handleFocusGain() {
       // console.log('Handling focus gain');
        // При возвращении фокуса проверяем состояние
        if (!this.isPointerLocked) {
            if (this.pendingEscapeMessage) {
                this.showEscapeMessage();
                this.pendingEscapeMessage = false;
            } else {
                this.showClickToPlayMessage();
            }
        }
    }

    handleCanvasClick() {
      //  console.log('Canvas clicked - attempting to regain pointer lock');
        
        // Пытаемся перезахватить курсор при клике
        const canvas = document.querySelector("#unity-canvas");
        if (canvas && !this.isPointerLocked) {
		  this.hideEscapeMessage();
           /* canvas.requestPointerLock().then(() => {
                console.log('Pointer lock regained');
                this.hideEscapeMessage();
            }).catch(err => {
                console.error('Failed to regain pointer lock:', err);
            });*/
        }
    }

    showEscapeMessage() {
        if (this.escapeMessageShown) return;
        
      //  console.log('Showing escape message');
        this.removeExistingMessage();
        
        const message = document.createElement('div');
        message.id = 'pointer-lock-message';
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px 30px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 16px;
                z-index: 10000;
                border: 2px solid #fff;
                backdrop-filter: blur(5px);
            ">
                <div style="margin-bottom: 10px;">🔓 Курсор освобожден</div>
                <div style="font-size: 14px; opacity: 0.8;">Нажмите на рабочую область для продолжения</div>
            </div>
        `;
        
        // Добавляем клик по сообщению для быстрого перезахвата
        message.addEventListener('click', (e) => {
						if(this.exitWindows){
				return;
			}
            e.stopPropagation();
            this.handleCanvasClick();
        });
        
        document.body.appendChild(message);
        this.escapeMessageShown = true;
    }

    showClickToPlayMessage() {
        if (this.escapeMessageShown) return;
        
       // console.log('Showing click to play message');
        this.removeExistingMessage();
        
        const message = document.createElement('div');
        message.id = 'pointer-lock-message';
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 30%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px 30px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 16px;
                z-index: 10000;
                border: 2px solid #4CAF50;
                backdrop-filter: blur(5px);
            ">
                <div style="margin-bottom: 10px;">🎮 Курсор освобожден</div>
                <div style="font-size: 14px; opacity: 0.8;">Нажмите на рабочую область для продолжения</div>
            </div>
        `;
        
        message.addEventListener('click', (e) => {
						if(this.exitWindows){
				return;
			}
            e.stopPropagation();
            this.handleCanvasClick();
        });
        
        document.body.appendChild(message);
        this.escapeMessageShown = true;
    }

    hideEscapeMessage() {
      //  console.log('Hiding escape message');
        this.removeExistingMessage();
        this.escapeMessageShown = false;
        this.pendingEscapeMessage = false;
    }

    removeExistingMessage() {
        const existingMessage = document.getElementById('pointer-lock-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Публичный метод для принудительного показа сообщения
    showMessage(text = 'Нажмите на рабочую область') {
        this.removeExistingMessage();
        
        const message = document.createElement('div');
        message.id = 'pointer-lock-message';
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px 30px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 16px;
                z-index: 10000;
                border: 2px solid #fff;
                backdrop-filter: blur(5px);
            ">
                ${text}
            </div>
        `;
        
        message.addEventListener('click', (e) => {
						if(this.exitWindows){
				return;
			}
            e.stopPropagation();
            this.handleCanvasClick();
        });
        
        document.body.appendChild(message);
        this.escapeMessageShown = true;
    }

    // Публичный метод для скрытия сообщения
    hideMessage() {
        this.hideEscapeMessage();
    }
}