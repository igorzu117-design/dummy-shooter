import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Глобальный обработчик для предотвращения вывода SecurityError от Pointer Lock
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (event.reason.name === 'SecurityError' || event.reason.message.includes('Pointer'))) {
        event.preventDefault();
    }
});

// --- УПРАВЛЕНИЕ UI ---
const uiScreens = document.querySelectorAll('.screen');
const hud = document.getElementById('hud');
let currentScreen = 'intro';
let isTransitioning = false;

function showScreen(screenId) {
    const bgOverlay = document.getElementById('menu-background-overlay');
    uiScreens.forEach(s => {
        s.classList.remove('active');
        s.style.display = ''; // Сбрасываем возможные inline-стили на всякий случай
    });
    if (screenId) {
        document.body.classList.remove('in-game');
        document.getElementById('screen-' + screenId).classList.add('active');
        hud.style.display = 'none';

        // Скрываем фон во всех экранах, кроме самых начальных
        if (bgOverlay) {
            const isInitial = (screenId === 'intro' || screenId === 'main' || screenId === 'play-options');
            const isMulti = (screenId === 'multi-servers' || screenId === 'create-server' || screenId === 'waiting-players');

            bgOverlay.style.display = (isInitial || isMulti) ? 'block' : 'none';
            bgOverlay.classList.toggle('multiplayer-bg', isMulti);

            // --- TRAP: Background Integrity Check ---
            if (isMulti) {
                console.log("[TRAP] Entering Multiplayer. Applying background...");
                bgOverlay.style.backgroundImage = "url('assets/multi-bg-trap-final.jpg?v=5.0')";

                // Check if something else is covering it
                const computed = window.getComputedStyle(bgOverlay);
                console.log("[TRAP] Computed Background:", computed.backgroundImage);
                if (!computed.backgroundImage.includes('multi-bg-trap-final')) {
                    console.error("[TRAP] CONFLICT DETECTED! Background image overridden by other style.");
                }
            } else if (isInitial) {
                bgOverlay.style.backgroundImage = "url('assets/menu-bg.png')";
            }
        }

        if (gunMesh) gunMesh.visible = false; // Прячем руки в любом меню

        if (screenId === 'team') {
            // Вид сверху на всю карту
            controls.unlock();
            const camObj = controls.getObject();
            camObj.position.set(0, 60, 0);
            camObj.rotation.set(-Math.PI / 2, 0, 0);
        }

        if (screenId === 'gameover') {
            document.getElementById('gameover-score').innerText = `Счет матча: ${ctfScore.blue} - ${ctfScore.red}`;
        }
    } else {
        document.body.classList.add('in-game');
        hud.style.display = isHudHidden ? 'none' : 'block'; // В игре соблюдаем настройку скрытия
        if (gunMesh) gunMesh.visible = true; // Возвращаем руки в игре
        if (bgOverlay) bgOverlay.style.display = 'none'; // Скрываем фон в самой игре
        document.getElementById('score-display').style.display = isTutorialMode ? 'none' : 'block';
        document.getElementById('health-wrapper').style.display = isTutorialMode ? 'none' : 'flex';
        document.getElementById('timer-display').style.display = isTutorialMode ? 'none' : 'block';
    }
    currentScreen = screenId;
}

document.getElementById('btn-play').addEventListener('click', () => showScreen('play-options'));
document.getElementById('btn-play-bots').addEventListener('click', () => showScreen('team'));
document.getElementById('btn-team-blue').addEventListener('click', () => { playerTeam = 'blue'; startGame('normal'); });
document.getElementById('btn-team-red').addEventListener('click', () => { playerTeam = 'red'; startGame('normal'); });

document.getElementById('btn-tutorial-new').addEventListener('click', () => startGame('tutorial'));
document.getElementById('btn-resume').addEventListener('click', () => startGame('resume'));

// --- Settings Tabs ---
const tabMouse = document.getElementById('btn-tab-mouse');
const tabKeyboard = document.getElementById('btn-tab-keyboard');
const tabVideo = document.getElementById('btn-tab-video');
const tabHelp = document.getElementById('btn-tab-help');
const contentMouse = document.getElementById('settings-mouse');
const contentKeyboard = document.getElementById('settings-keyboard');
const contentVideo = document.getElementById('settings-video');
const contentHelp = document.getElementById('settings-help');

tabMouse.addEventListener('click', () => {
    tabMouse.classList.add('active');
    tabKeyboard.classList.remove('active');
    tabVideo.classList.remove('active');
    tabHelp.classList.remove('active');
    contentMouse.style.display = 'block';
    contentKeyboard.style.display = 'none';
    contentVideo.style.display = 'none';
    contentHelp.style.display = 'none';
});

tabKeyboard.addEventListener('click', () => {
    tabKeyboard.classList.add('active');
    tabMouse.classList.remove('active');
    tabVideo.classList.remove('active');
    tabHelp.classList.remove('active');
    contentKeyboard.style.display = 'block';
    contentMouse.style.display = 'none';
    contentVideo.style.display = 'none';
    contentHelp.style.display = 'none';
});

tabVideo.addEventListener('click', () => {
    tabVideo.classList.add('active');
    tabMouse.classList.remove('active');
    tabKeyboard.classList.remove('active');
    tabHelp.classList.remove('active');
    contentVideo.style.display = 'block';
    contentMouse.style.display = 'none';
    contentKeyboard.style.display = 'none';
    contentHelp.style.display = 'none';
});

tabHelp.addEventListener('click', () => {
    tabHelp.classList.add('active');
    tabMouse.classList.remove('active');
    tabKeyboard.classList.remove('active');
    tabVideo.classList.remove('active');
    contentHelp.style.display = 'block';
    contentMouse.style.display = 'none';
    contentKeyboard.style.display = 'none';
    contentVideo.style.display = 'none';
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && currentScreen === 'intro' && !isTransitioning) {
        isTransitioning = true;
        const fade = document.getElementById('fade-overlay');
        fade.style.transition = 'opacity 0.8s ease';
        fade.style.opacity = '1';

        setTimeout(() => {
            showScreen('main');
            fade.style.opacity = '0';

            setTimeout(() => {
                fade.style.transition = 'opacity 2s ease';
                isTransitioning = false;
            }, 800);
        }, 800);
    }
});
// Кнопка «Возродиться» теперь в kill-cam оверлее
document.getElementById('btn-respawn').addEventListener('click', () => { hideKillCam(); });

document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));

const returnToMenu = () => {
    // Очищаем kill cam если он активен
    if (isKillCamActive) {
        isKillCamActive = false;
        killCamTarget = null;
        document.getElementById('killcam-overlay').classList.remove('active');
        const btn = document.getElementById('btn-respawn');
        btn.disabled = true;
        btn.classList.remove('ready-red', 'ready-blue');
    }
    resetGame();
    showScreen('main');
};
document.getElementById('btn-menu').addEventListener('click', returnToMenu);
document.getElementById('btn-menu-death').addEventListener('click', returnToMenu);

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
        if (currentScreen === 'multi-servers') {
            showScreen('play-options');
        } else {
            showScreen(currentScreen === 'pause' ? 'pause' : 'main');
        }
    });
});

// --- MULTIPLAYER UI LOGIC ---
document.getElementById('btn-play-multi').addEventListener('click', () => showScreen('multi-servers'));
document.getElementById('btn-create-server-init').addEventListener('click', () => {
    showScreen('create-server');
    resetCreateSteps();
});

let currentCreateStep = 1;
const createSteps = document.querySelectorAll('.create-step');
const btnPrev = document.getElementById('btn-create-prev');
const btnNext = document.getElementById('btn-create-next');
const btnFinish = document.getElementById('btn-create-finish');

function resetCreateSteps() {
    currentCreateStep = 1;
    updateCreateUI();
}

function updateCreateUI() {
    createSteps.forEach((s, i) => {
        s.classList.toggle('active', (i + 1) === currentCreateStep);
    });

    btnPrev.style.display = currentCreateStep > 1 ? 'block' : 'none';
    btnNext.style.display = currentCreateStep < 3 ? 'block' : 'none';
    btnFinish.style.display = currentCreateStep === 3 ? 'block' : 'none';
}

btnNext.addEventListener('click', () => {
    if (currentCreateStep < 3) {
        currentCreateStep++;
        updateCreateUI();
    }
});

btnPrev.addEventListener('click', () => {
    if (currentCreateStep > 1) {
        currentCreateStep--;
        updateCreateUI();
    }
});

document.querySelector('.btn-back-main').addEventListener('click', () => showScreen('multi-servers'));

// Step 1: Password toggle
const passEnable = document.getElementById('server-pass-enable');
const passInput = document.getElementById('server-password');
passEnable.addEventListener('change', (e) => {
    passInput.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) passInput.focus();
});

// Step 2: Slider formatting (two-digit)
const playersSlider = document.getElementById('server-players-slider');
const playersVal = document.getElementById('server-players-val');
playersSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    playersVal.innerText = val < 10 ? '0' + val : val;
});

// Step 3: Finish / Validation
let waitTimerInterval = null;

btnFinish.addEventListener('click', () => {
    const waitTimeStr = document.getElementById('server-wait-time').value.trim().toLowerCase();
    if (!waitTimeStr) {
        alert('Пожалуйста, введите время ожидания');
        return;
    }

    // Parse wait time (simple)
    let seconds = 5; // Default
    if (waitTimeStr.includes('мин')) {
        seconds = parseInt(waitTimeStr) * 60;
    } else {
        seconds = parseInt(waitTimeStr);
    }

    if (isNaN(seconds)) seconds = 5;
    seconds = Math.max(5, Math.min(300, seconds)); // Limit 5s to 300s

    showScreen('waiting-players');
    startWaitTimer(seconds);
});

function startWaitTimer(duration) {
    let timeLeft = duration;
    const timerDisplay = document.getElementById('wait-timer-val');
    const errorMsg = document.getElementById('server-error-msg');

    // Clear any previous error
    if (errorMsg) errorMsg.style.display = 'none';

    const updateDisplay = () => {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerDisplay.innerText = `${m}:${s < 10 ? '0' + s : s}`;
    };

    updateDisplay();

    if (waitTimerInterval) clearInterval(waitTimerInterval);

    waitTimerInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            clearInterval(waitTimerInterval);
            validateAndStartGame();
        }
    }, 1000);
}

function validateAndStartGame() {
    // MOCK: In a real game, we'd check actual connected players
    // For now, we simulate failure as requested (only 1 player)
    const playerCount = 1;

    showScreen('multi-servers');
    const errorMsg = document.getElementById('server-error-msg');
    if (errorMsg) {
        errorMsg.innerText = "В сервере недостаточно игроков или нечётное число игроков";
        errorMsg.style.display = 'block';
    }
}

document.getElementById('btn-cancel-waiting').addEventListener('click', () => {
    if (waitTimerInterval) clearInterval(waitTimerInterval);
    showScreen('multi-servers');
});

const sensSlider = document.getElementById('sens-slider');
const sensVal = document.getElementById('sens-val');
sensSlider.addEventListener('input', (e) => {
    sensVal.innerText = e.target.value;
    if (controls && !isAiming) {
        controls.pointerSpeed = parseFloat(e.target.value);
    }
});

const aimSensSlider = document.getElementById('aim-sens-slider');
const aimSensVal = document.getElementById('aim-sens-val');
aimSensSlider.addEventListener('input', (e) => {
    aimSensVal.innerText = e.target.value;
    if (controls && isAiming) {
        if (currentWeapon === 'sniper') {
            const totalZoom = 4 * sniperScope;
            controls.pointerSpeed = parseFloat(e.target.value) * (1 / totalZoom);
        } else {
            controls.pointerSpeed = parseFloat(e.target.value) * 0.6;
        }
    }
});

let invertWheelCheckbox;
let quietStepCheckbox;
let showFpsCheckbox;

function setupUIListeners() {
    if (showFpsCheckbox) {
        showFpsCheckbox.addEventListener('change', (e) => {
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) fpsDisplay.style.display = e.target.checked ? 'block' : 'none';
        });
    }
    if (hideUiCheckbox) {
        hideUiCheckbox.addEventListener('change', (e) => {
            toggleHud(e.target.checked);
        });
    }
}

let targetFPS = 0; // 0 means unlimited
const fpsRadios = document.querySelectorAll('input[name="fps-limit"]');
fpsRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        targetFPS = parseInt(e.target.value);
    });
});

let isHudHidden = false;
let hideUiCheckbox;

function toggleHud(hidden) {
    if (hidden !== undefined) isHudHidden = hidden;
    else isHudHidden = !isHudHidden;

    if (hideUiCheckbox) hideUiCheckbox.checked = isHudHidden;

    // Применяем видимость только если мы не в меню (там HUD всегда hidden)
    if (!currentScreen) {
        hud.style.display = isHudHidden ? 'none' : 'block';
    }
}

// --- ИГРОВЫЕ ПЕРЕМЕННЫЕ ---
let scene, camera, renderer, controls;
let objects = []; // Для столкновений со стенами
let dummies = []; // Массив объектов-манекенов
let bullets = []; // Массив пуль (игрока и манекенов)
let raycaster;
let collidableBoxes = []; // Предварительно рассчитанные Box3 для оптимизации коллизий

// Переменные для игрового цикла и FPS
let lastFrameTime = performance.now();
let fpsFramesCount = 0;
let lastFpsUpdateTime = performance.now();
let fpsDisplayElement; // Будет инициализирован в init() или при объявлении если возможно

let score = 0;
let playerHealth = 100;
let playerArmor = 0;
let maxArmor = 0;
let coins = 800; // Стартовые монеты

let ctfScore = { blue: 0, red: 0 };
let blueFlag = { mesh: null, basePos: new THREE.Vector3(0, 0, 40), carrier: null, status: 'base' }; // status: 'base', 'carried', 'dropped'
let redFlag = { mesh: null, basePos: new THREE.Vector3(0, 0, -40), carrier: null, status: 'base' };
let gameDuration = 120; // 2 минуты игры
let currentRound = 1;
const maxRounds = 5;
let roundsWon = { blue: 0, red: 0 };

let currentWeapon = 'pistol'; // 'pistol', 'traumat', 'auto', 'sniper'
let sniperScope = 1; // 1, 2, 3, 5
let playerTeam = 'blue'; // 'blue', 'red'
let weaponStats = {
    'pistol': { damage: 20, speed: 60, rate: 300, price: 0, maxAmmo: 50 },
    'traumat': { damage: 10, speed: 60, rate: 5000, price: 300, isStun: true, maxAmmo: 10 },
    'auto': { damage: 15, speed: 120, rate: 100, price: 400, maxAmmo: 70 },
    'sniper': { damage: 80, headDamage: 100, speed: 200, rate: 1000, price: 500, maxAmmo: 10 },
    'shotgun': { damage: 25, pellets: 4, speed: 100, rate: 800, price: 600, maxAmmo: 4 },
    'knife': { damage: 70, rate: 500, range: 2.5, isMelee: true }
};

let ownedWeapons = ['pistol', 'knife'];
let weaponAmmoStash = { // Патроны в запасе
    'pistol': 0, 'traumat': 0, 'auto': 0, 'sniper': 0, 'shotgun': 0
};
let weaponCurrentAmmo = { // Текущие патроны в магазине
    'pistol': 50, 'traumat': 10, 'auto': 70, 'sniper': 10, 'shotgun': 4
};
let playerStunnedUntil = 0;
let isMouseButtonDown = false;
let knifeSwingTime = 0;

let gamePhase = 'idle'; // 'idle', 'pre_warmup', 'warmup', 'playing'
let phaseTimer = 0; // в секундах
let lastTimerUpdate = 0;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let isSneaking = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Оружие
let gunMesh;
let isShooting = false;
let recoilTime = 0;

// Прицеливание
let isAiming = false;
const defaultFov = 75;
let aimFov = 50;
const defaultGunPos = new THREE.Vector3(0.3, -0.25, -0.5);
const aimGunPos = new THREE.Vector3(0, -0.15, -0.4);
const currentGunBasePos = new THREE.Vector3().copy(defaultGunPos);

// Переменные для обучения
let isTutorialMode = false;
let tutorialStep = 0;
let tutorialFullText = "";
let tutorialCurrentIndex = 0;
let tutorialIsTyping = false;
let tutorialWaitingForAction = false;
let tutorialOnComplete = null;
let typeInterval = null;
let advanceTimeout = null;

// Kill Cam / Orbit Camera
let killCamTarget = null;    // больше не используется (оставлено для совместимости)
let isKillCamActive = false; // флаг активного наблюдения
let killCamAngle = 0;        // текущий угол орбиты

init();
animate();

function init() {
    scene = new THREE.Scene();
    window._debugScene = scene;
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6;
    window._debugCamera = camera;

    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    controls = new PointerLockControls(camera, document.body);
    controls.pointerSpeed = parseFloat(sensSlider.value);
    scene.add(controls.getObject());

    controls.addEventListener('lock', function () {
        // Pointer lock successful
    });

    controls.addEventListener('unlock', function () {
        isAiming = false;
        controls.pointerSpeed = parseFloat(sensSlider.value);
        document.getElementById('crosshair').style.transform = 'translate(-50%, -50%) scale(1)';

        if (currentScreen !== 'intro' && currentScreen !== 'main' && currentScreen !== 'play-options' && currentScreen !== 'gameover' && currentScreen !== 'shop' && playerHealth > 0) {
            showScreen('pause');
        }
    });

    raycaster = new THREE.Raycaster();

    createMap();

    // Создаем базы и флаги
    createBaseStation(0x3b82f6, 40); // Синяя база
    createBaseStation(0xef4444, -40); // Красная база

    blueFlag.mesh = createFlag(0x3b82f6, blueFlag.basePos);
    redFlag.mesh = createFlag(0xef4444, redFlag.basePos);

    for (let i = 0; i < 8; i++) spawnDummy(null, null, i % 2 === 0 ? 'blue' : 'red');

    createWeapon();

    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('contextmenu', e => e.preventDefault());

    setupShop();
    updateInventoryUI();

    // Инициализируем элементы UI после загрузки DOM
    invertWheelCheckbox = document.getElementById('invert-wheel-checkbox');
    quietStepCheckbox = document.getElementById('quiet-step-checkbox');
    showFpsCheckbox = document.getElementById('show-fps-checkbox');
    hideUiCheckbox = document.getElementById('hide-ui-checkbox');
    fpsDisplayElement = document.getElementById('fps-display');

    setupUIListeners();
}

function updateCoinsUI() {
    document.getElementById('coin-text').innerText = coins;
    document.getElementById('shop-balance').innerText = `Баланс: ${coins} 🪙`;
    updateInventoryUI();
}

function updateAmmoUI() {
    const ammoDisplay = document.getElementById('ammo-display');
    if (currentWeapon === 'knife') {
        ammoDisplay.style.display = 'none';
        return;
    }

    if (isTutorialMode) {
        // В туториале патроны бесконечные (для простоты), можно просто показать статику или скрыть
        ammoDisplay.style.display = 'none';
        return;
    }

    ammoDisplay.style.display = 'block';

    // Получаем имя оружия для отображения
    const names = {
        'pistol': 'Пистолет',
        'traumat': 'Травмат',
        'auto': 'Автомат',
        'shotgun': 'Дробовик',
        'sniper': 'Снайперка'
    };

    const curr = weaponCurrentAmmo[currentWeapon];
    const stash = weaponAmmoStash[currentWeapon];

    ammoDisplay.innerHTML = `${names[currentWeapon]} <span id="ammo-text">${curr}/${stash}</span>`;

    // Красный цвет если пусто
    if (curr === 0) {
        document.getElementById('ammo-text').style.color = '#ef4444';
    } else {
        document.getElementById('ammo-text').style.color = '#eab308';
    }
}

function updateArmorUI() {
    const armorWrapper = document.getElementById('armor-wrapper');
    const armorBar = document.getElementById('armor-bar');
    const armorText = document.getElementById('armor-text');

    if (maxArmor > 0) {
        armorWrapper.style.display = 'flex';
        armorText.innerText = playerArmor;
        armorBar.style.width = Math.max(0, (playerArmor / maxArmor) * 100) + '%';
    } else {
        armorWrapper.style.display = 'none';
    }
}

function setupShop() {
    document.getElementById('btn-close-shop').addEventListener('click', () => {
        showScreen(null);
        controls.lock();
    });

    document.querySelectorAll('.shop-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            const price = parseInt(el.getAttribute('data-price'));
            if (coins >= price) {
                const type = el.getAttribute('data-type');
                const id = el.getAttribute('data-id');

                if (type === 'weapon') {
                    coins -= price;
                    if (!ownedWeapons.includes(id)) ownedWeapons.push(id);
                    currentWeapon = id;
                    // Сбрасываем прицел
                    sniperScope = 1;
                    createWeapon(); // ОБНОВЛЯЕМ МОДЕЛЬ ОРУЖИЯ
                    updateInventoryUI();
                    updateAmmoUI();
                } else if (type === 'scope') {
                    if (currentWeapon === 'sniper') {
                        coins -= price;
                        if (id === 'scope2x') sniperScope = 2;
                        if (id === 'scope3x') sniperScope = 3;
                        if (id === 'scope5x') sniperScope = 5;
                    } else {
                        // Ошибка: нужна снайперка
                        console.log("Нужна снайперская винтовка!");
                        return;
                    }
                } else if (type === 'armor') {
                    coins -= price;
                    let def = 0;
                    if (id === 'armor1') def = 10;
                    if (id === 'armor2') def = 15;
                    if (id === 'armor3') def = 20;
                    if (id === 'armor4') def = 30;
                    if (id === 'armor5') def = 50;

                    maxArmor = def;
                    playerArmor = maxArmor;
                    updateArmorUI();
                } else if (type === 'ammo') {
                    // id - это тип оружия
                    let amount = 0;
                    if (id === 'pistol') amount = 50;
                    if (id === 'traumat') amount = 10;
                    if (id === 'auto') amount = 70;
                    if (id === 'sniper') amount = 30;
                    if (id === 'shotgun') amount = 30;

                    coins -= price;
                    weaponAmmoStash[id] += amount;
                    updateAmmoUI();
                }
                updateCoinsUI();
                document.getElementById('damage-flash').style.background = 'rgba(255, 215, 0, 0.3)';
                document.getElementById('damage-flash').style.opacity = 1;
                setTimeout(() => { document.getElementById('damage-flash').style.opacity = 0; document.getElementById('damage-flash').style.background = 'rgba(255, 0, 0, 0.3)'; }, 150);
            } else {
                console.log("Недостаточно монет!");
            }
        });
    });
}

function createMap() {
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const mats = [
        new THREE.MeshLambertMaterial({ color: 0xff8c00 }),
        new THREE.MeshLambertMaterial({ color: 0x475569 })
    ];

    createWall(0, 5, -50, 100, 10, 1, mats[1]);
    createWall(0, 5, 50, 100, 10, 1, mats[1]);
    createWall(-50, 5, 0, 1, 10, 100, mats[1]);
    createWall(50, 5, 0, 1, 10, 100, mats[1]);

    for (let i = 0; i < 30; i++) {
        const w = Math.random() * 4 + 2;
        const h = Math.random() * 2 + 1.5;
        const d = Math.random() * 4 + 2;

        const mat = mats[Math.floor(Math.random() * mats.length)];
        const mesh = new THREE.Mesh(boxGeo, mat);

        mesh.scale.set(w, h, d);
        mesh.position.x = Math.random() * 80 - 40;
        mesh.position.y = h / 2;
        mesh.position.z = Math.random() * 80 - 40;

        // Не спавним препятствия на базах и в центре
        if (Math.abs(mesh.position.z) > 25 || (Math.abs(mesh.position.x) < 5 && Math.abs(mesh.position.z) < 5)) continue;

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        objects.push(mesh);
        collidableBoxes.push(new THREE.Box3().setFromObject(mesh));
    }
}

function createBaseStation(color, zPos) {
    const platformGeo = new THREE.CylinderGeometry(4, 4, 0.1, 32);
    const platformMat = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.3 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.05, zPos);
    scene.add(platform);
    objects.push(platform);
    // REMOVED: collidableBoxes.push(new THREE.Box3().setFromObject(platform));

    const towerGeo = new THREE.BoxGeometry(2, 1, 2);
    const towerMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 0.5, zPos);

    scene.add(tower);
    objects.push(tower);
    collidableBoxes.push(new THREE.Box3().setFromObject(tower));

    // Добавляем линию границы на 25% территории
    // Центр базы на 40, край всей карты 50. Граница территории будет на 25 (четверть от 100).
    const lineZObj = zPos > 0 ? 25 : -25;
    const lineGeo = new THREE.PlaneGeometry(100, 1);
    const lineMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.position.set(0, 0.01, lineZObj);
    scene.add(lineMesh);
}

function createFlag(color, position) {
    const group = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.25;

    const clothGeo = new THREE.BoxGeometry(0.05, 0.6, 0.8);
    const clothMat = new THREE.MeshLambertMaterial({ color: color });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(0, 2.2, 0.4);

    group.add(pole, cloth);
    group.position.copy(position);
    group.position.y += 1; // Поднимаем над башней
    scene.add(group);
    return group;
}

function createWall(x, y, z, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    objects.push(mesh);
    collidableBoxes.push(new THREE.Box3().setFromObject(mesh));
}

function createPistolModel() {
    const group = new THREE.Group();
    const matMetalDark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.8 });
    const matMetalBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.7 });
    const matGrip = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 });

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.18), matMetalDark);
    slide.position.set(0, 0.02, 0);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 12), matMetalBlack);
    barrel.rotateX(Math.PI / 2); barrel.position.set(0, 0.015, 0);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.025, 0.12), matGrip);
    frame.position.set(0, -0.01, 0.02);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.05), matGrip);
    grip.rotateX(Math.PI / 8); grip.position.set(0, -0.07, 0.06);

    const triggerGuardGeo = new THREE.TorusGeometry(0.015, 0.003, 8, 16, Math.PI);
    triggerGuardGeo.rotateZ(Math.PI / 2); triggerGuardGeo.rotateY(Math.PI / 2);
    const triggerGuard = new THREE.Mesh(triggerGuardGeo, matGrip);
    triggerGuard.position.set(0, -0.03, 0.01); triggerGuard.scale.set(1, 1.5, 1);

    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.005), matMetalBlack);
    trigger.position.set(0, -0.03, 0.01); trigger.rotation.x = -Math.PI / 6;

    group.add(slide, barrel, frame, grip, triggerGuard, trigger);
    return group;
}

function createAutoModel() {
    const group = new THREE.Group();
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.8 });
    const matWood = new THREE.MeshStandardMaterial({ color: 0x4a2c1d, roughness: 0.8 });
    const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Receiver (body)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.25), matMetal);
    body.position.z = 0.05;

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 12), matMetal);
    barrel.rotateX(Math.PI / 2); barrel.position.z = -0.22; barrel.position.y = 0.02;

    // Gas Tube
    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 12), matMetal);
    gasTube.rotateX(Math.PI / 2); gasTube.position.z = -0.15; gasTube.position.y = 0.045;

    // Handguard (Wood)
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.15), matWood);
    handguard.position.z = -0.12; handguard.position.y = 0.01;

    // Magazine (Curved AK style)
    const magGroup = new THREE.Group();
    const magPart1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.06), matBlack);
    magPart1.position.y = -0.1; magPart1.position.z = -0.05; magPart1.rotation.x = 0.2;
    magGroup.add(magPart1);
    magGroup.position.y = 0.02;

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), matWood);
    grip.position.set(0, -0.08, 0.08); grip.rotation.x = 0.4;

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.2), matWood);
    stock.position.set(0, -0.02, 0.25); stock.rotation.x = 0.1;

    // Sights
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.02), matMetal);
    frontSight.position.set(0, 0.05, -0.38);
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.04), matMetal);
    rearSight.position.set(0, 0.06, -0.05);

    group.add(body, barrel, gasTube, handguard, magGroup, grip, stock, frontSight, rearSight);
    return group;
}

function createShotgunModel() {
    const group = new THREE.Group();
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.7 });
    const matWood = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12), matMetal);
    barrel.rotateX(Math.PI / 2); barrel.position.z = -0.25;
    group.add(barrel);

    // Magazine Tube (under barrel)
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 12), matMetal);
    magTube.rotateX(Math.PI / 2); magTube.position.z = -0.15; magTube.position.y = -0.035;
    group.add(magTube);

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), matMetal);
    receiver.position.z = 0.1;
    group.add(receiver);

    // Pump (Forend)
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), matWood);
    pump.rotateX(Math.PI / 2); pump.position.z = -0.15; pump.position.y = -0.035;
    group.add(pump);

    // Stock
    const stock = new THREE.Group();
    const stockMain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.25), matWood);
    stockMain.position.set(0, -0.05, 0.3); stockMain.rotation.x = 0.2;
    stock.add(stockMain);
    group.add(stock);

    return group;
}

function createSniperModel() {
    const group = new THREE.Group();
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });
    const matGreen = new THREE.MeshStandardMaterial({ color: 0x2d4a22, roughness: 0.9 });
    const matBlack = new THREE.MeshStandardMaterial({ color: 0x050505 });

    // Main Body (V-shape characteristic of AWP)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), matGreen);
    body.position.z = 0;

    // Barrel (Long)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 12), matMetal);
    barrel.rotateX(Math.PI / 2); barrel.position.z = -0.45; barrel.position.y = 0.02;

    // Muzzle Brake
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), matMetal);
    muzzle.position.z = -0.75; muzzle.position.y = 0.02;

    // Bolt handle
    const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 8), matMetal);
    boltHandle.rotateZ(Math.PI / 2); boltHandle.position.set(0.05, 0.03, 0.05);
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), matMetal);
    boltKnob.position.set(0.09, 0.03, 0.05);

    // Stock with hole (Thumbhole stock)
    const stockGroup = new THREE.Group();
    const stockMain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.3), matGreen);
    stockMain.position.set(0, -0.02, 0.3);
    const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.03), matBlack);
    buttPad.position.set(0, -0.02, 0.45);
    stockGroup.add(stockMain, buttPad);

    // Scope (More detailed)
    const scopeGroup = new THREE.Group();
    const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.25, 12), matMetal);
    scopeBody.rotateX(Math.PI / 2); scopeBody.position.y = 0.08;
    const scopeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.06, 12), matMetal);
    scopeFront.rotateX(Math.PI / 2); scopeFront.position.set(0, 0.08, -0.15);
    const scopeBack = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.05, 12), matMetal);
    scopeBack.rotateX(Math.PI / 2); scopeBack.position.set(0, 0.08, 0.12);
    scopeGroup.add(scopeBody, scopeFront, scopeBack);

    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.08), matMetal);
    mag.position.set(0, -0.06, -0.05);

    group.add(body, barrel, muzzle, boltHandle, boltKnob, stockGroup, scopeGroup, mag);
    return group;
}

function createStrazhnikModel() {
    const group = new THREE.Group();
    const matMetalBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.7 });
    const matGrip = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 });

    // Корпус (вертикальный блок)
    const bodyGeo = new THREE.BoxGeometry(0.04, 0.08, 0.06);
    const body = new THREE.Mesh(bodyGeo, matGrip);
    body.position.set(0, -0.01, 0.02);
    group.add(body);

    // Два коротких ствола (вертикально друг над другом)
    const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 12);
    barrelGeo.rotateX(Math.PI / 2);

    const topBarrel = new THREE.Mesh(barrelGeo, matMetalBlack);
    topBarrel.position.set(0, 0.015, -0.04);
    group.add(topBarrel);

    const bottomBarrel = new THREE.Mesh(barrelGeo, matMetalBlack);
    bottomBarrel.position.set(0, -0.015, -0.04);
    group.add(bottomBarrel);

    // Рукоятка (характерная форма)
    const gripGeo = new THREE.BoxGeometry(0.042, 0.1, 0.05);
    gripGeo.rotateX(Math.PI / 6);
    const grip = new THREE.Mesh(gripGeo, matGrip);
    grip.position.set(0, -0.08, 0.05);
    group.add(grip);

    // Спусковой крючок (внутри корпуса)
    const triggerGeo = new THREE.BoxGeometry(0.005, 0.02, 0.01);
    const trigger = new THREE.Mesh(triggerGeo, matMetalBlack);
    trigger.position.set(0, -0.03, 0);
    group.add(trigger);

    return group;
}

function createKnifeModel() {
    const group = new THREE.Group();
    // Материалы на основе картинки: коричневое лезвие (D2/FDE), черная текстурированная рукоять
    const matBlade = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.4, metalness: 0.6 }); // Coyote Brown / Bronze
    const matHandle = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 }); // Black G10

    // Лезвие (кинжальной формы)
    const bladeGeo = new THREE.BoxGeometry(0.005, 0.04, 0.25);
    const blade = new THREE.Mesh(bladeGeo, matBlade);
    blade.position.set(0, 0, -0.15);
    group.add(blade);

    // Острие
    const tipGeo = new THREE.ConeGeometry(0.02, 0.08, 4);
    tipGeo.rotateX(-Math.PI / 2);
    tipGeo.rotateZ(Math.PI / 4);
    const tip = new THREE.Mesh(tipGeo, matBlade);
    tip.position.set(0, 0, -0.315);
    tip.scale.set(0.1, 1, 1);
    group.add(tip);

    // Гарда
    const guardGeo = new THREE.BoxGeometry(0.01, 0.08, 0.015);
    const guard = new THREE.Mesh(guardGeo, matBlade);
    guard.position.set(0, 0, -0.03);
    group.add(guard);

    // Рукоятка
    const handleGeo = new THREE.BoxGeometry(0.025, 0.045, 0.18);
    const handle = new THREE.Mesh(handleGeo, matHandle);
    handle.position.set(0, -0.005, 0.07);
    group.add(handle);

    // Выемки на рукоятке
    for (let i = 0; i < 3; i++) {
        const notchGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16);
        notchGeo.rotateZ(Math.PI / 2);
        const notch = new THREE.Mesh(notchGeo, matHandle);
        notch.position.set(0, -0.02, 0.02 + i * 0.05);
        group.add(notch);
    }

    // Отверстие под темляк
    const pommelGeo = new THREE.BoxGeometry(0.025, 0.05, 0.03);
    const pommel = new THREE.Mesh(pommelGeo, matBlade);
    pommel.position.set(0, -0.01, 0.17);
    group.add(pommel);

    group.rotation.set(0, 0, 0);
    group.position.set(0, 0, 0);

    return group;
}

function createWeapon() {
    if (gunMesh) camera.remove(gunMesh);

    // Сбрасываем эффекты прицела при смене оружия
    document.getElementById('sniper-scope-overlay').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';

    const gunGroup = new THREE.Group();
    let model;

    if (currentWeapon === 'traumat') {
        model = createStrazhnikModel();
    } else if (currentWeapon === 'auto') {
        model = createAutoModel();
    } else if (currentWeapon === 'sniper') {
        model = createSniperModel();
    } else if (currentWeapon === 'shotgun') {
        model = createShotgunModel();
    } else if (currentWeapon === 'knife') {
        model = createKnifeModel();
    } else {
        model = createPistolModel();
    }

    gunGroup.add(model);

    // --- Руки (Игрок) ---
    const armColor = playerTeam === 'blue' ? 0x3b82f6 : 0xef4444;
    const matSkin = new THREE.MeshStandardMaterial({ color: armColor, roughness: 0.8 });
    const armGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.3, 8);
    armGeo.rotateX(Math.PI / 2);

    const rightArm = new THREE.Mesh(armGeo, matSkin);
    const leftArm = new THREE.Mesh(armGeo, matSkin);

    if (currentWeapon === 'knife') {
        // Убираем вращение с модели
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);

        // Правая рука (теперь точно на рукояти): x=0.08, y=0.02
        rightArm.position.set(0.08, 0.02, 0.1);
        rightArm.rotation.set(-0.5, -0.3, 0);

        // Левая рука: поддерживающая поза, чуть левее центра
        leftArm.position.set(-0.25, -0.1, 0.15);
        leftArm.rotation.set(-0.9, -0.2, -0.1);

        // СБОРКА СПРАВА
        currentGunBasePos.set(0.35, -0.2, -0.6);
        gunGroup.position.copy(currentGunBasePos);
    } else {
        // Стандартная позиция для огнестрела
        rightArm.position.set(0.04, -0.15, 0.2);
        rightArm.rotation.x = -Math.PI / 6;
        rightArm.rotation.y = -Math.PI / 12;

        leftArm.position.set(-0.10, -0.12, 0.15);
        leftArm.rotation.x = -Math.PI / 6;
        leftArm.rotation.y = Math.PI / 6;

        gunGroup.position.set(0.2, -0.2, -0.4);
    }

    gunGroup.add(rightArm, leftArm);
    gunGroup.scale.set(1.5, 1.5, 1.5);

    camera.add(gunGroup);
    gunMesh = gunGroup;
}

// Вспомогательная функция создания оружия для манекенов
function createDummyWeapon() {
    const group = new THREE.Group();
    const matMetalDark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.8 });
    const matGrip = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 });

    // Упрощенная модель пистолета для манекенов
    const slideGeo = new THREE.BoxGeometry(0.03, 0.04, 0.18);
    const slide = new THREE.Mesh(slideGeo, matMetalDark);
    slide.position.set(0, 0.02, 0);

    const gripGeo = new THREE.BoxGeometry(0.03, 0.1, 0.05);
    gripGeo.rotateX(Math.PI / 8);
    const grip = new THREE.Mesh(gripGeo, matGrip);
    grip.position.set(0, -0.05, 0.05);

    group.add(slide);
    group.add(grip);
    group.scale.set(1.2, 1.2, 1.2);
    return group;
}

function spawnDummy(x = null, z = null, team = 'red') {
    const dummyGroup = new THREE.Group();
    const colorBody = team === 'blue' ? 0x3b82f6 : 0xef4444;
    const matDummy = new THREE.MeshLambertMaterial({ color: colorBody });
    const matHead = new THREE.MeshLambertMaterial({ color: colorBody });

    // Тело
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.3);
    const body = new THREE.Mesh(bodyGeo, matDummy);
    body.position.y = 0.6;

    // Голова (индекс 1 в children)
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeo, matHead);
    head.position.y = 1.45;

    // Руки
    const armGeo = new THREE.BoxGeometry(0.2, 0.9, 0.2);
    const armL = new THREE.Mesh(armGeo, matDummy);
    armL.position.set(-0.4, 0.7, 0);
    const armR = new THREE.Mesh(armGeo, matDummy);
    armR.position.set(0.4, 0.7, 0);

    // Пистолет в правой руке
    const dummyGun = createDummyWeapon();
    dummyGun.position.set(0.4, 0.4, -0.2); // Смещение вперед

    dummyGroup.add(body, head, armL, armR, dummyGun);
    dummyGroup.gun = dummyGun; // Сохраняем ссылку на оружие
    dummyGroup.lastShot = performance.now() + 1000 + Math.random() * 2000;

    dummyGroup.userData = {
        team: team,
        health: 100, // Здоровье ботов
        moveDir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        changeDirTime: performance.now() + Math.random() * 3000,
        speed: 4.0 // Скорость передвижения
    };

    let posX = 0, posZ = 0;
    if (x !== null && z !== null) {
        posX = x; posZ = z;
        dummyGroup.position.set(posX, 0, posZ);
        dummyGroup.lookAt(0, 0, 0);
    } else {
        // Спавним на территории своей команды (25% от всей карты в краях)
        let validSpot = false;
        let attempts = 0;
        while (!validSpot && attempts < 50) {
            posX = Math.random() * 80 - 40;

            // Защита от спавна прямо на флаге (он на x=0, z=40 / -40)
            if (team === 'blue') {
                posZ = Math.random() * 20 + 25; // от 25 до 45 (граница 25%)
            } else {
                posZ = -(Math.random() * 20 + 25); // от -25 до -45 (граница 25%)
            }

            // Если бот слишком близко к флагу - двигаем
            if (Math.abs(posX) < 3 && Math.abs(posZ - (team === 'blue' ? 40 : -40)) < 3) {
                posX += 5;
            }

            if (!checkCollisions(new THREE.Vector3(posX, 0, posZ), true)) {
                validSpot = true;
            }
            attempts++;
        }
        dummyGroup.position.set(posX, 0, posZ);
        dummyGroup.rotation.y = Math.random() * Math.PI * 2;
    }

    dummyGroup.isDummy = true;
    scene.add(dummyGroup);
    dummies.push(dummyGroup);
}

function destroyDummy(dummy) {
    const team = dummy.userData.team;
    scene.remove(dummy);
    dummies = dummies.filter(d => d !== dummy);

    if (blueFlag.carrier === dummy) {
        blueFlag.status = 'dropped';
        blueFlag.carrier = null;
        blueFlag.mesh.position.y = 0.5;
    }
    if (redFlag.carrier === dummy) {
        redFlag.status = 'dropped';
        redFlag.carrier = null;
        redFlag.mesh.position.y = 0.5;
    }

    const hitMarker = document.getElementById('hit-marker');
    hitMarker.style.opacity = 1;
    setTimeout(() => { hitMarker.style.opacity = 0; }, 200);

    if (!isTutorialMode) {
        setTimeout(() => spawnDummy(null, null, team), 3000); // Респавн через 3 сек
    } else {
        if (tutorialStep === 3) runTutorialStep(4);
        else if (tutorialStep === 6) runTutorialStep(7);
    }
}

// --- ЗДОРОВЬЕ И УРОН ---
function updateHealthUI() {
    const bar = document.getElementById('health-bar');
    const text = document.getElementById('health-text');
    const pct = Math.max(0, (playerHealth / 100) * 100);

    bar.style.width = pct + '%';
    text.innerText = Math.ceil(playerHealth);

    if (pct > 50) bar.style.backgroundColor = '#22c55e';
    else if (pct > 25) bar.style.backgroundColor = '#eab308';
    else bar.style.backgroundColor = '#ef4444';
}

function takeDamage(amount, attacker) {
    if (playerHealth <= 0 || isTutorialMode) return;

    if (playerArmor > 0) {
        if (amount <= playerArmor) {
            playerArmor -= amount;
            amount = 0;
        } else {
            amount -= playerArmor;
            playerArmor = 0;
        }
        updateArmorUI();
    }

    playerHealth -= amount;
    if (playerHealth < 0) playerHealth = 0;
    updateHealthUI();

    // Вспышка урона на экране
    const flash = document.getElementById('damage-flash');
    flash.style.opacity = 1;
    setTimeout(() => { flash.style.opacity = 0; }, 150);

    // Подсветка атаковавшего манекена (голова становится желтой)
    if (attacker && attacker.isDummy && dummies.includes(attacker)) {
        const head = attacker.children[1];
        if (head && head.material) {
            const mat = head.material;
            const oldColor = mat.color.getHex();
            mat.color.setHex(0xffff00); // Желтый
            mat.emissive.setHex(0x555500); // Свечение

            setTimeout(() => {
                if (head && head.material) {
                    mat.color.setHex(oldColor);
                    mat.emissive.setHex(0x000000);
                }
            }, 300);
        }
    }

    if (playerHealth <= 0) {
        if (redFlag.carrier === 'player') resetFlagToDropped(redFlag);
        if (blueFlag.carrier === 'player') resetFlagToDropped(blueFlag);
        gameOver(attacker);
    }
}

function gameOver(killer = null) {
    controls.unlock();

    if (playerHealth <= 0) {
        // Игрок погиб — орбитальная камера + кнопка возрождения
        showKillCam();
    } else {
        // Конец раунда/матча (время вышло)
        let winnerText = "Время вышло!";
        if (ctfScore.blue > ctfScore.red) winnerText = "Победа Синих!";
        else if (ctfScore.red > ctfScore.blue) winnerText = "Победа Красных!";
        else winnerText = "Ничья!";

        document.querySelector('#screen-gameover h1').innerText = winnerText;
        document.getElementById('gameover-score').innerText = `Счет матча: ${ctfScore.blue} - ${ctfScore.red}`;
        showScreen('gameover');
    }
}

function showKillCam() {
    isKillCamActive = true;

    // Сбрасываем физику и локальную позицию камеры при смерти
    velocity.set(0, 0, 0);
    camera.position.set(0, 0, 0);

    // Устанавливаем начальный угол орбиты с текущей позиции камеры
    const controlObj = controls.getObject();
    killCamAngle = Math.atan2(controlObj.position.x, controlObj.position.z);

    // Скрываем HUD и оружие, но не переходим на экран меню
    document.getElementById('hud').style.display = 'none';
    if (gunMesh) gunMesh.visible = false;

    // Показываем оверлей с кнопкой возрождения
    document.getElementById('killcam-overlay').classList.add('active');

    // Кнопка «Возродиться» — серая и заблокирована
    const btn = document.getElementById('btn-respawn');
    btn.disabled = true;
    btn.classList.remove('ready-red', 'ready-blue');

    // Через 3 секунды разблокируем кнопку в цвет команды игрока
    setTimeout(() => {
        if (isKillCamActive) { // Игрок ещё не нажал раньше времени
            btn.disabled = false;
            btn.classList.add(playerTeam === 'red' ? 'ready-red' : 'ready-blue');
        }
    }, 3000);
}

function hideKillCam() {
    isKillCamActive = false;
    killCamTarget = null;

    // Скрываем оверлей
    const overlay = document.getElementById('killcam-overlay');
    overlay.classList.remove('active');

    // Сбрасываем кнопку для будущих смертей
    const btn = document.getElementById('btn-respawn');
    btn.disabled = true;
    btn.classList.remove('ready-red', 'ready-blue');

    // Возрождаем игрока — только HP, позиция, UI. Игра продолжается!
    playerHealth = 100;
    playerArmor = 0;
    maxArmor = 0;
    updateHealthUI();
    updateArmorUI();

    resetPlayerToSpawn();
    velocity.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);

    // Возвращаем HUD и продолжаем
    document.getElementById('hud').style.display = 'block';
    document.getElementById('damage-flash').style.opacity = 0;
    gunMesh.visible = true;

    controls.lock();
}

// --- ФЛАГИ И ОЧКИ ---
function resetFlag(flag) {
    flag.status = 'base';
    flag.carrier = null;
    flag.mesh.position.copy(flag.basePos);
    flag.mesh.position.y += 1;
    if (flag === redFlag) updateFlagStatusUI();
}

function resetFlagToDropped(flag) {
    flag.status = 'dropped';
    flag.carrier = null;
    flag.mesh.position.y = 0.5;
    updateFlagStatusUI();
}

let flagAlertTimeout = null;
function showFlagAlert() {
    const el = document.getElementById('flag-alert');
    el.style.display = 'block';
    if (flagAlertTimeout) clearTimeout(flagAlertTimeout);
    flagAlertTimeout = setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}

function updateScoreUI() {
    const scoreEl = document.getElementById('score-display');
    const matchScoreStr = `<div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 4px;">Раунд ${currentRound}/${maxRounds} (Победы: С ${roundsWon.blue} - ${roundsWon.red} К)</div>`;

    if (playerTeam === 'blue') {
        scoreEl.innerHTML = `${matchScoreStr}Счёт раунда: <span style="color:#3b82f6">Синие (Вы) ${ctfScore.blue}</span> - <span style="color:#ef4444">${ctfScore.red} Красные</span>`;
    } else {
        scoreEl.innerHTML = `${matchScoreStr}Счёт раунда: <span style="color:#3b82f6">Синие ${ctfScore.blue}</span> - <span style="color:#ef4444">${ctfScore.red} Красные (Вы) ${ctfScore.red}</span>`;
    }
}

function updateFlagStatusUI() {
    const el = document.getElementById('flag-status');
    if (redFlag.carrier === 'player' || blueFlag.carrier === 'player') {
        const flagName = redFlag.carrier === 'player' ? 'ВРАЖЕСКИЙ ФЛАГ' : 'ВРАЖЕСКИЙ ФЛАГ'; // Зависит от команды, но суть одна
        el.innerText = `ВЫ НЕСЕТЕ ${flagName}! БЕГИТЕ НА БАЗУ!`;
        el.style.color = playerTeam === 'blue' ? '#3b82f6' : '#ef4444'; // Цвет своей базы
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

function handleFlags() {
    if (gamePhase !== 'playing') return;

    const playerPos = controls.getObject().position;

    // --- Взаимодействие игрока ---
    if (playerHealth > 0) {
        const enemyFlag = playerTeam === 'blue' ? redFlag : blueFlag;
        const myFlag = playerTeam === 'blue' ? blueFlag : redFlag;

        // Подобрать вражеский флаг
        if (enemyFlag.status !== 'carried' && playerPos.distanceTo(enemyFlag.mesh.position) < 2.5) {
            enemyFlag.status = 'carried';
            enemyFlag.carrier = 'player';
            updateFlagStatusUI();
        }

        // Вернуть свой флаг, если он сброшен
        if (myFlag.status === 'dropped' && playerPos.distanceTo(myFlag.mesh.position) < 2.5) {
            resetFlag(myFlag);
        }

        // Доставить флаг на базу
        if (enemyFlag.carrier === 'player' && playerPos.distanceTo(myFlag.basePos) < 4) {
            if (playerTeam === 'blue') ctfScore.blue++;
            else ctfScore.red++;

            updateScoreUI();
            resetFlag(enemyFlag);
            updateFlagStatusUI(); // Убираем надпись «Вы несёте флаг»
        }

        // --- Взаимодействие манекенов ---
        dummies.forEach(d => {
            if (d.userData.team === 'blue') {
                if (redFlag.status !== 'carried' && d.position.distanceTo(redFlag.mesh.position) < 2) {
                    redFlag.status = 'carried';
                    redFlag.carrier = d;
                    if (playerTeam === 'red') showFlagAlert();
                }
                if (blueFlag.status === 'dropped' && d.position.distanceTo(blueFlag.mesh.position) < 2) {
                    resetFlag(blueFlag);
                }
                if (redFlag.carrier === d && d.position.distanceTo(blueFlag.basePos) < 4) {
                    ctfScore.blue++;
                    updateScoreUI();
                    resetFlag(redFlag);
                }
            } else {
                if (blueFlag.status !== 'carried' && d.position.distanceTo(blueFlag.mesh.position) < 2) {
                    blueFlag.status = 'carried';
                    blueFlag.carrier = d;
                    if (playerTeam === 'blue') showFlagAlert();
                }
                if (redFlag.status === 'dropped' && d.position.distanceTo(redFlag.mesh.position) < 2) {
                    resetFlag(redFlag);
                }
                if (blueFlag.carrier === d && d.position.distanceTo(redFlag.basePos) < 4) {
                    ctfScore.red++;
                    updateScoreUI();
                    resetFlag(blueFlag);
                }
            }
        });

        // --- Обновление позиций флагов ---
        if (blueFlag.carrier) {
            if (blueFlag.carrier === 'player') {
                // Флаг на спине игрока
                const backOffset = new THREE.Vector3(0, 0.5, 0.3);
                backOffset.applyQuaternion(playerPos.quaternion || camera.quaternion); // Упрощенно используем камеру если нет объекта игрока
                blueFlag.mesh.position.copy(playerPos).add(backOffset);
                blueFlag.mesh.rotation.y = (camera.rotation.y || 0);
            } else {
                // Флаг на спине бота
                const backOffset = new THREE.Vector3(0, 1.2, 0.4);
                backOffset.applyQuaternion(blueFlag.carrier.quaternion);
                blueFlag.mesh.position.copy(blueFlag.carrier.position).add(backOffset);
                blueFlag.mesh.rotation.y = blueFlag.carrier.rotation.y;
            }
        }
        if (redFlag.carrier) {
            if (redFlag.carrier === 'player') {
                // Флаг на спине игрока
                const backOffset = new THREE.Vector3(0, 0.5, 0.3);
                const camQuat = new THREE.Quaternion();
                camera.getWorldQuaternion(camQuat);
                backOffset.applyQuaternion(camQuat);
                redFlag.mesh.position.copy(playerPos).add(backOffset);
                redFlag.mesh.rotation.y = camera.rotation.y;
            } else {
                // Флаг на спине бота
                const backOffset = new THREE.Vector3(0, 1.2, 0.4);
                backOffset.applyQuaternion(redFlag.carrier.quaternion);
                redFlag.mesh.position.copy(redFlag.carrier.position).add(backOffset);
                redFlag.mesh.rotation.y = redFlag.carrier.rotation.y;
            }
        }
    }
}

// --- ТАЙМЕРЫ ---
function updateTimerDisplay() {
    const timerEl = document.getElementById('timer-display');
    if (gamePhase === 'playing') {
        const minutes = Math.floor(gameDuration / 60).toString().padStart(2, '0');
        const seconds = (gameDuration % 60).toString().padStart(2, '0');
        timerEl.innerText = `Игра: ${minutes}:${seconds}`;
        timerEl.style.color = '#22c55e'; // Зеленый
    } else {
        const minutes = Math.floor(phaseTimer / 60).toString().padStart(2, '0');
        const seconds = (phaseTimer % 60).toString().padStart(2, '0');
        const timeStr = `${minutes}:${seconds}`;
        if (gamePhase === 'pre_warmup') {
            timerEl.innerText = `До разминки: ${timeStr}`;
            timerEl.style.color = '#94a3b8'; // Slate
        } else if (gamePhase === 'warmup') {
            timerEl.innerText = `Разминка: ${timeStr}`;
            timerEl.style.color = '#eab308'; // Желтый
        } else if (gamePhase === 'match_countdown') {
            timerEl.innerText = `До игры: ${timeStr}`;
            timerEl.style.color = '#ef4444'; // Красный
        }
    }
}

// --- ПУЛИ ---
function spawnBullet(startPos, direction, team, owner) {
    // Создаем геометрию трассера (длинный цилиндр/сфера)
    const bulletColor = team === 'blue' ? 0x60a5fa : 0xf87171;
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: bulletColor });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.scale.set(1, 1, 8); // Растягиваем пулю по направлению
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    mesh.position.copy(startPos);

    let speed = 40.0;
    if (owner && owner.isPlayer && owner.stats) speed = owner.stats.speed;

    scene.add(mesh);
    bullets.push({
        mesh,
        direction: direction.normalize(),
        team: team,
        owner,
        distanceTraveled: 0,
        speed: speed
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame(mode) {
    window.focus();
    document.body.focus();

    if (mode === 'tutorial') {
        isTutorialMode = true;
        resetGameVariables();
        showScreen(null);
        controls.lock();
        setTimeout(() => runTutorialStep(1), 500);
    } else if (mode === 'normal') {
        isTutorialMode = false;
        resetGameVariables(); // Сбрасываем позицию игрока с «неба» на землю
        if (dummies.length === 0) {
            // Спавн ботов в зависимости от команды игрока 
            // 9 ботов в команде игрока, 10 во вражеской
            if (playerTeam === 'blue') {
                for (let i = 0; i < 9; i++) spawnDummy(null, null, 'blue');
                for (let i = 0; i < 10; i++) spawnDummy(null, null, 'red');
            } else {
                for (let i = 0; i < 10; i++) spawnDummy(null, null, 'blue');
                for (let i = 0; i < 9; i++) spawnDummy(null, null, 'red');
            }
        }
        gamePhase = 'pre_warmup';
        phaseTimer = 5; // 5 секунд ожидания до разминки
        lastTimerUpdate = performance.now();
        updateTimerDisplay();
        updateCoinsUI();
        updateArmorUI();
        resetPlayerToSpawn();
        resetBotsToSpawn();
        prevTime = performance.now();
        showScreen(null); // Явно скрываем UI меню
        controls.lock(); // Пытаемся захватить мышь
    } else if (mode === 'resume') {
        showScreen(null);
        controls.lock();
    }
}

function resetPlayerToSpawn() {
    if (playerTeam === 'blue') {
        controls.getObject().position.set(0, 1.6, 35);
        controls.getObject().rotation.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
    } else {
        controls.getObject().position.set(0, 1.6, -35);
        // Красным нужно развернуться на 180 градусов, чтобы смотреть в центр
        controls.getObject().rotation.set(0, Math.PI, 0);
        camera.rotation.set(0, 0, 0);
    }
}

function resetBotsToSpawn() {
    dummies.forEach(d => {
        let posX = Math.random() * 80 - 40;
        let posZ;
        if (d.userData.team === 'blue') {
            posZ = Math.random() * 20 + 25;
        } else {
            posZ = -(Math.random() * 20 + 25);
        }
        d.position.set(posX, 0, posZ);
        d.lookAt(0, 0, 0);
        d.userData.health = 100;
        d.userData.moveDir.set(0, 0, 0); // Останавливаем их на мгновение
    });
}

function resetGameVariables() {
    clearInterval(typeInterval);
    clearTimeout(advanceTimeout);
    tutorialIsTyping = false;
    document.getElementById('tutorial-box').style.display = 'none';

    score = 0;
    playerHealth = 100;
    playerArmor = 0;
    maxArmor = 0;
    coins = 800; // Возвращаем стартовый баланс при рестарте
    currentWeapon = 'pistol';
    ownedWeapons = ['pistol', 'knife'];
    weaponAmmoStash = {
        'pistol': 0, 'traumat': 0, 'auto': 0, 'sniper': 0, 'shotgun': 0
    };
    weaponCurrentAmmo = {
        'pistol': 50, 'traumat': 10, 'auto': 70, 'sniper': 10, 'shotgun': 4
    };
    createWeapon();
    sniperScope = 1;
    gamePhase = 'idle';
    gameDuration = 120;
    ctfScore = { blue: 0, red: 0 };
    updateHealthUI();
    updateArmorUI();
    updateCoinsUI();
    updateScoreUI();
    updateAmmoUI();
    document.getElementById('flag-status').style.display = 'none';
    document.getElementById('timer-display').innerText = `Ожидание: 00:00`;
    document.getElementById('damage-flash').style.opacity = 0;

    // Сброс флагов к базам
    if (blueFlag.mesh) {
        blueFlag.carrier = null;
        blueFlag.status = 'base';
        blueFlag.mesh.position.copy(blueFlag.basePos);
        blueFlag.mesh.position.y += 1;
        scene.add(blueFlag.mesh);
    }
    if (redFlag.mesh) {
        redFlag.carrier = null;
        redFlag.status = 'base';
        redFlag.mesh.position.copy(redFlag.basePos);
        redFlag.mesh.position.y += 1;
        scene.add(redFlag.mesh);
    }

    resetPlayerToSpawn();
    velocity.set(0, 0, 0);

    dummies.forEach(d => scene.remove(d));
    dummies = [];

    bullets.forEach(b => scene.remove(b.mesh));
    bullets = [];
}

function resetGame() {
    resetGameVariables();
    if (!isTutorialMode) {
        for (let i = 0; i < 8; i++) spawnDummy();
    }
}

// --- ЛОГИКА ТЕКСТА ОБУЧЕНИЯ ---
function playDialogue(text, actionRequired, nextCallback) {
    clearInterval(typeInterval);
    clearTimeout(advanceTimeout);

    document.getElementById('tutorial-box').style.display = 'block';
    const textEl = document.getElementById('tutorial-text');
    textEl.textContent = "";

    tutorialFullText = text;
    tutorialCurrentIndex = 0;
    tutorialIsTyping = true;
    tutorialWaitingForAction = actionRequired;
    tutorialOnComplete = nextCallback;

    typeInterval = setInterval(() => {
        textEl.textContent += tutorialFullText.charAt(tutorialCurrentIndex);
        tutorialCurrentIndex++;
        if (tutorialCurrentIndex >= tutorialFullText.length) {
            finishTyping();
        }
    }, 50);
}

function finishTyping() {
    clearInterval(typeInterval);
    document.getElementById('tutorial-text').textContent = tutorialFullText;
    tutorialIsTyping = false;

    if (!tutorialWaitingForAction) {
        advanceTimeout = setTimeout(() => {
            if (tutorialOnComplete) {
                let cb = tutorialOnComplete;
                tutorialOnComplete = null;
                cb();
            }
        }, 2000);
    }
}

function skipDialogue() {
    if (tutorialIsTyping) {
        finishTyping();
    } else if (!tutorialWaitingForAction && tutorialOnComplete) {
        clearTimeout(advanceTimeout);
        let cb = tutorialOnComplete;
        tutorialOnComplete = null;
        cb();
    }
}

function runTutorialStep(step) {
    tutorialStep = step;
    switch (step) {
        case 1:
            playDialogue("Привет! Если ты зашёл сюда, значит ещё не знаешь как играть здесь.", false, () => runTutorialStep(2));
            break;
        case 2:
            playDialogue("Теперь я могу тебе обьяснить всё сейчас!", false, () => runTutorialStep(3));
            break;
        case 3:
            spawnDummy(0, -10);
            playDialogue("Смотри, это манекен.\nНажми Левую Кнопку Мыши, чтобы стрельнуть в него.", true, null);
            break;
        case 4:
            playDialogue("Отлично! Теперь следующее.", false, () => runTutorialStep(5));
            break;
        case 5:
            spawnDummy(0, -40);
            playDialogue("А тут задача посложнее. Видишь там вдалеке манекена?\nДо него сложно достать. Но зажми Правую Кнопку Мыши.", true, null);
            break;
        case 6:
            playDialogue("Видишь? Теперь его стало намного виднее! Стрельни по нему!", true, null);
            break;
        case 7:
            playDialogue("Отлично! Ты освоил весь туториал. В будущем будут новые механики, так что не скучай там!", false, () => runTutorialStep(8));
            break;
        case 8:
            document.getElementById('fade-overlay').style.opacity = '1';
            setTimeout(() => {
                document.getElementById('tutorial-box').style.display = 'none';
                isTutorialMode = false;
                resetGame();
                currentScreen = 'main';
                controls.unlock();
                showScreen('main');

                setTimeout(() => {
                    document.getElementById('fade-overlay').style.opacity = '0';
                }, 500);
            }, 2000);
            break;
    }
}

// --- ОБРАБОТЧИКИ ВВОДА ---
function onKeyDown(event) {
    if (playerHealth <= 0) return;
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
        case 'KeyB':
            if (controls.isLocked && gamePhase !== 'idle') {
                const pz = controls.getObject().position.z;
                const inZone = (playerTeam === 'blue') ? (pz > 25) : (pz < -25);

                if (inZone || isTutorialMode) {
                    currentScreen = 'shop'; // Устанавливаем ДО разблокировки
                    controls.unlock();
                    showScreen('shop');
                } else {
                    // Можно добавить звуковой эффект отказа или сообщение в лог, если нужно
                }
            }
            break;
        case 'Escape':
            if (currentScreen === 'shop') {
                showScreen(null);
                controls.lock();
            }
            break;
        case 'Space':
            if (canJump === true) velocity.y += 10;
            canJump = false;
            break;
        case 'Enter':
            if (isTutorialMode && document.getElementById('tutorial-box').style.display === 'block') {
                skipDialogue();
            }
            break;
        case 'Digit1': switchWeapon(0); break;
        case 'Digit2': switchWeapon(1); break;
        case 'Digit4': switchWeapon(3); break;
        case 'Digit5': switchWeapon(4); break;
        case 'Digit6': switchWeapon(5); break;
        case 'KeyR': reloadWeapon(); break;
        case 'AltLeft':
        case 'AltRight':
            event.preventDefault();
            if (quietStepCheckbox && quietStepCheckbox.checked) isSneaking = true;
            break;
        case 'KeyU':
            toggleHud();
            break;
    }
}

function switchWeapon(index) {
    const weaponsOrder = ['pistol', 'traumat', 'auto', 'knife', 'shotgun', 'sniper'];
    const targetWeapon = weaponsOrder[index];

    if (ownedWeapons.includes(targetWeapon)) {
        currentWeapon = targetWeapon;
        createWeapon();
        updateInventoryUI();
        updateAmmoUI();
    } else {
        // Опционально: звук ошибки или лог
        console.log("Оружие не куплено:", targetWeapon);
    }
}

function updateInventoryUI() {
    const slots = document.querySelectorAll('.inventory-slot');
    const weaponsOrder = ['pistol', 'traumat', 'auto', 'knife', 'shotgun', 'sniper'];

    slots.forEach((slot, i) => {
        const wType = weaponsOrder[i];
        if (ownedWeapons.includes(wType)) {
            slot.style.display = 'flex';
            if (currentWeapon === wType) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        } else {
            slot.style.display = 'none';
        }
    });
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
        case 'AltLeft':
        case 'AltRight':
            event.preventDefault();
            isSneaking = false;
            break;
    }
}

function onMouseDown(event) {
    if (!controls.isLocked || playerHealth <= 0) return;

    if (event.button === 0) {
        // Запрет стрельбы во время обратного отсчета
        if (gamePhase === 'pre_warmup' || gamePhase === 'match_countdown') return;

        isMouseButtonDown = true;
        shoot();
    } else if (event.button === 2) {
        isAiming = true;

        if (currentWeapon === 'sniper') {
            const totalZoom = 4 * sniperScope;
            aimFov = defaultFov / totalZoom;
            controls.pointerSpeed = parseFloat(aimSensSlider.value) * (1 / totalZoom);

            document.getElementById('sniper-scope-overlay').style.display = 'block';
            document.getElementById('crosshair').style.display = 'none';
            if (gunMesh) gunMesh.visible = false;
        } else {
            aimFov = 50;
            controls.pointerSpeed = parseFloat(aimSensSlider.value) * 0.6;
        }

        document.getElementById('crosshair').style.transform = `translate(-50%, -50%) scale(${aimFov / defaultFov})`;

        if (isTutorialMode && tutorialStep === 5) {
            runTutorialStep(6);
        }
    }
}

function onMouseUp(event) {
    if (!controls.isLocked) return;

    if (event.button === 0) {
        isMouseButtonDown = false;
    }

    if (event.button === 2) {
        isAiming = false;
        controls.pointerSpeed = parseFloat(sensSlider.value);
        document.getElementById('crosshair').style.transform = 'translate(-50%, -50%) scale(1)';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('sniper-scope-overlay').style.display = 'none';
        if (gunMesh) gunMesh.visible = true;
    }
}

// Управление колесиком мыши для переключения оружия
document.addEventListener('wheel', (event) => {
    if (!controls || !controls.isLocked || playerHealth <= 0) return;

    const weaponsOrder = ['pistol', 'traumat', 'auto', 'knife', 'sniper'];

    // Получаем текущие доступные пушки в правильном порядке
    const availableWeapons = weaponsOrder.filter(w => ownedWeapons.includes(w));
    if (availableWeapons.length <= 1) return; // Нет смысла скроллить если только 1 оружие

    let currentIndex = availableWeapons.indexOf(currentWeapon);
    if (currentIndex === -1) currentIndex = 0;

    const invertDir = invertWheelCheckbox.checked ? -1 : 1;
    let dir = Math.sign(event.deltaY) * invertDir;

    let nextIndex = currentIndex + dir;
    if (nextIndex < 0) nextIndex = availableWeapons.length - 1;
    if (nextIndex >= availableWeapons.length) nextIndex = 0;

    // Симулируем выбор по индексу из weaponsOrder (найдем 'global' индекс)
    const nextWeapon = availableWeapons[nextIndex];
    const globalIndex = weaponsOrder.indexOf(nextWeapon);

    switchWeapon(globalIndex);
});

let lastShootTime = 0;

function shoot() {
    if (playerHealth <= 0 || currentScreen === 'shop') return;

    const now = performance.now();
    const stats = weaponStats[currentWeapon];
    if (now - lastShootTime < stats.rate) return; // Ограничение скорострельности
    lastShootTime = now;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    if (stats.isMelee) {
        // Логика ножа
        knifeSwingTime = 0.3;
        const ray = new THREE.Raycaster(camera.position, dir, 0, stats.range);
        const intersects = ray.intersectObjects(dummies, true);
        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            let parentDummy = hitObj.parent;
            while (parentDummy && !parentDummy.isDummy) parentDummy = parentDummy.parent;

            if (parentDummy) {
                parentDummy.userData.health -= stats.damage;
                if (parentDummy.userData.health <= 0) destroyDummy(parentDummy);

                const hitMarker = document.getElementById('hit-marker');
                hitMarker.style.opacity = 1;
                setTimeout(() => { hitMarker.style.opacity = 0; }, 200);
            }
        }
    } else {
        // Логика огнестрела

        // Проверка патронов
        if (!isTutorialMode) {
            if (weaponCurrentAmmo[currentWeapon] <= 0) {
                // Пустой магазин, можно проиграть звук клика
                return;
            }
            weaponCurrentAmmo[currentWeapon]--;
            updateAmmoUI();
        }

        const startPos = camera.position.clone().addScaledVector(dir, 0.5);

        if (stats.pellets) {
            for (let i = 0; i < stats.pellets; i++) {
                // Добавляем разброс для дробовика
                const spread = 0.05;
                const spreadDir = dir.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * spread,
                    (Math.random() - 0.5) * spread,
                    (Math.random() - 0.5) * spread
                )).normalize();
                spawnBullet(startPos, spreadDir, playerTeam, { isPlayer: true, stats: stats });
            }
        } else {
            spawnBullet(startPos, dir, playerTeam, { isPlayer: true, stats: stats });
        }
    }

    setTimeout(() => { isShooting = false; }, 50);
}

function reloadWeapon() {
    if (playerHealth <= 0 || currentWeapon === 'knife' || isTutorialMode) return;

    let curr = weaponCurrentAmmo[currentWeapon];
    let stash = weaponAmmoStash[currentWeapon];
    let max = weaponStats[currentWeapon].maxAmmo;

    if (curr >= max) return; // Магазин полон
    if (stash <= 0) return; // Нет патронов в запасе

    let needed = max - curr;
    if (stash >= needed) {
        weaponAmmoStash[currentWeapon] -= needed;
        weaponCurrentAmmo[currentWeapon] = max;
    } else {
        weaponCurrentAmmo[currentWeapon] += stash;
        weaponAmmoStash[currentWeapon] = 0;
    }

    updateAmmoUI();
}

function checkCollisions(newPos, isDummy = false) {
    const radius = 0.5;
    // У игрока newPos.y - уровень глаз (1.6). У манекена newPos.y - это пол (0).
    const topY = isDummy ? newPos.y + 1.6 : newPos.y;
    const bottomY = isDummy ? newPos.y : newPos.y - 1.6;

    for (let i = 0; i < collidableBoxes.length; i++) {
        const box = collidableBoxes[i];
        if (
            newPos.x + radius > box.min.x &&
            newPos.x - radius < box.min.x + (box.max.x - box.min.x) && // Используем размеры из box
            newPos.x - radius < box.max.x &&
            newPos.z + radius > box.min.z &&
            newPos.z - radius < box.max.z &&
            topY > box.min.y &&
            bottomY < box.max.y
        ) {
            return true;
        }
    }
    return false;
}

// --- ИГРОВОЙ ЦИКЛ ---

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();

    // Подсчет FPS
    fpsFramesCount++;
    try {

        if (time - lastFpsUpdateTime >= 1000) {
            if (showFpsCheckbox && showFpsCheckbox.checked && fpsDisplayElement) {
                fpsDisplayElement.innerText = `FPS: ${fpsFramesCount}`;
            }
            fpsFramesCount = 0;
            lastFpsUpdateTime = time;
        }

        // Ограничение кадров
        if (targetFPS > 0) {
            const frameInterval = 1000 / targetFPS;
            if (time - lastFrameTime < frameInterval) {
                return; // Пропускаем кадр, если прошло недостаточно времени
            }
            // Корректируем lastFrameTime, чтобы избежать накопления задержек,
            // но при этом не делаем его больше текущего времени.
            lastFrameTime = time - ((time - lastFrameTime) % frameInterval);
        } else {
            lastFrameTime = time;
        }

        const delta = Math.min((time - prevTime) / 1000, 0.1); // Ограничение delta для стабильности физики

        const controlObj = controls.getObject();

        // --- ОБНОВЛЕНИЕ ИГРОКА (Движение и камера) ---
        const isStunned = time < playerStunnedUntil;
        if (controls.isLocked === true && playerHealth > 0) {
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            velocity.y -= 9.8 * 3.0 * delta;

            if (!isStunned && (gamePhase === 'warmup' || gamePhase === 'playing' || isTutorialMode)) {
                direction.z = Number(moveForward) - Number(moveBackward);
                direction.x = Number(moveRight) - Number(moveLeft);
                direction.normalize();
            } else {
                direction.set(0, 0, 0);
            }

            const speed = (isSneaking && quietStepCheckbox.checked) ? 15.0 : 40.0;
            if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
            if (moveLeft || moveRight) velocity.x += direction.x * speed * delta; // Направление вправо теперь положительное

            // Получаем истинные глобальные векторы движения из матрицы камеры
            // Это предотвращает баг с инверсией управления при взгляде вверх/вниз
            const vecRight = new THREE.Vector3();
            vecRight.setFromMatrixColumn(controlObj.matrix, 0);
            vecRight.y = 0;
            vecRight.normalize();

            const vecForward = new THREE.Vector3();
            vecForward.crossVectors(controlObj.up, vecRight);
            vecForward.y = 0;
            vecForward.normalize();

            // Вычисляем смещение
            const moveX = vecRight.x * (velocity.x * delta) + vecForward.x * (-velocity.z * delta);
            const moveZ = vecRight.z * (velocity.x * delta) + vecForward.z * (-velocity.z * delta);

            // --- Движение и проверка коллизий по глобальной оси X ---
            const oldX = controlObj.position.x;
            controlObj.position.x += moveX;
            if (checkCollisions(controlObj.position)) {
                controlObj.position.x = oldX;
            }

            const oldZ = controlObj.position.z;
            controlObj.position.z += moveZ;

            if (checkCollisions(controlObj.position)) {
                controlObj.position.z = oldZ;
            }

            controlObj.position.y += (velocity.y * delta);
            if (controlObj.position.y < 1.6) {
                velocity.y = 0;
                controlObj.position.y = 1.6;
                canJump = true;
            }

            // --- ЛОГИКА ОРУЖИЯ И ПРИЦЕЛИВАНИЯ ---
            const aimSpeed = 15.0 * delta;
            const targetFov = isAiming ? aimFov : defaultFov;
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, aimSpeed);
            camera.updateProjectionMatrix();

            const targetGunPos = isAiming ? aimGunPos : defaultGunPos;
            currentGunBasePos.lerp(targetGunPos, aimSpeed);

            let recoilOffsetZ = 0;
            let recoilRotX = 0;
            if (recoilTime > 0) {
                recoilOffsetZ = Math.sin(recoilTime * Math.PI * 10) * 0.05;
                recoilRotX = Math.sin(recoilTime * Math.PI * 10) * 0.1;
                recoilTime -= delta;
            }

            let breathOffsetY = 0;
            if ((moveForward || moveBackward || moveLeft || moveRight) && canJump && !isAiming) {
                breathOffsetY = Math.sin(time * 0.01) * 0.01;
            }

            let knifeVisualRotationX = 0;
            let knifeVisualRotationY = 0;
            let knifeVisualPosZ = 0;

            if (knifeSwingTime > 0) {
                const swingFactor = Math.sin((0.3 - knifeSwingTime) / 0.3 * Math.PI);
                knifeVisualRotationX = -swingFactor * 0.5;
                knifeVisualRotationY = swingFactor * 0.3;
                knifeVisualPosZ = -swingFactor * 0.1;
                knifeSwingTime -= delta;
            }

            // Автоматическая стрельба для автомата
            if (isMouseButtonDown && currentWeapon === 'auto' && controls.isLocked && gamePhase !== 'pre_warmup' && gamePhase !== 'match_countdown') {
                shoot();
            }

            gunMesh.position.set(
                currentGunBasePos.x,
                currentGunBasePos.y + breathOffsetY,
                currentGunBasePos.z + recoilOffsetZ + knifeVisualPosZ
            );
            if (currentWeapon === 'knife') {
                // Базовый поворот (наклон вперед и ПОВОРОТ ВПРАВО)
                gunMesh.rotation.x = recoilRotX + knifeVisualRotationX + 0.5;
                gunMesh.rotation.y = knifeVisualRotationY + 0.4; // Положительный Y поворачивает вправо
            } else {
                gunMesh.rotation.x = recoilRotX + (knifeVisualRotationX || 0);
                gunMesh.rotation.y = (knifeVisualRotationY || 0);
            }
        } // Конец блока controls.isLocked

        // --- ОБНОВЛЕНИЕ МИРА (Боты, Пули, Таймеры) ---
        if (gamePhase !== 'idle') {

            // --- ОБНОВЛЕНИЕ ФЛАГОВ ---
            handleFlags();

            // --- ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ МАНЕКЕНОВ ---
            if (!isTutorialMode && (gamePhase === 'warmup' || gamePhase === 'playing')) {
                const playerPos = controlObj.position;
                dummies.forEach(d => {
                    if (d.userData.stunnedUntil && time < d.userData.stunnedUntil) return; // Пропуск ИИ если оглушен

                    const myFlag = d.userData.team === 'blue' ? blueFlag : redFlag;
                    const enemyFlag = d.userData.team === 'blue' ? redFlag : blueFlag;
                    const isCarrier = (enemyFlag.carrier === d);

                    let target = null;
                    let targetHeadPos = null;
                    let distToTarget = Infinity;
                    const enemyTeam = d.userData.team === 'blue' ? 'red' : 'blue';

                    // Find teammate carrier
                    let teammateCarrier = null;
                    if (!isCarrier) {
                        if (enemyFlag.carrier && enemyFlag.carrier !== 'player' && enemyFlag.carrier.userData.team === d.userData.team) {
                            teammateCarrier = enemyFlag.carrier;
                        }
                    }

                    if (isCarrier) {
                        // Я НЕСУ ФЛАГ: Только база, никакой стрельбы по пути
                        target = 'base';
                        targetHeadPos = myFlag.basePos.clone();
                        targetHeadPos.y = 1.6;
                        distToTarget = d.position.distanceTo(targetHeadPos);
                    } else if (teammateCarrier) {
                        // ТИММЕЙТ НЕСЕТ ФЛАГ: Защищаем его
                        const distToCarrier = d.position.distanceTo(teammateCarrier.position);

                        // Если мы далеко от кэрриера - идем к нему
                        if (distToCarrier > 5) {
                            target = teammateCarrier;
                            targetHeadPos = teammateCarrier.position.clone();
                            targetHeadPos.y = 1.45;
                            distToTarget = distToCarrier;
                        } else {
                            // Если мы рядом - ищем врагов вокруг него
                            let nearestEnemy = null;
                            let minDist = 30;

                            // Проверяем игрока (только если живой)
                            if (playerTeam === enemyTeam && playerHealth > 0) {
                                const dP = teammateCarrier.position.distanceTo(playerPos);
                                if (dP < minDist) {
                                    minDist = dP;
                                    nearestEnemy = 'player';
                                }
                            }

                            // Проверяем других ботов
                            dummies.forEach(otherD => {
                                if (otherD.userData.team === enemyTeam) {
                                    const dE = teammateCarrier.position.distanceTo(otherD.position);
                                    if (dE < minDist) {
                                        minDist = dE;
                                        nearestEnemy = otherD;
                                    }
                                }
                            });

                            if (nearestEnemy) {
                                target = nearestEnemy;
                                targetHeadPos = (nearestEnemy === 'player' ? playerPos.clone() : nearestEnemy.position.clone());
                                if (nearestEnemy !== 'player') targetHeadPos.y = 1.45;
                                distToTarget = d.position.distanceTo(targetHeadPos);
                            }
                        }
                    } else {
                        // ОБЫЧНЫЙ РЕЖИМ: Агрессия
                        // Check player if teammate is enemy
                        if (playerTeam === enemyTeam && playerHealth > 0) {
                            const distToPlayer = d.position.distanceTo(playerPos);
                            if (distToPlayer < distToTarget) {
                                distToTarget = distToPlayer;
                                target = 'player';
                                targetHeadPos = playerPos.clone();
                            }
                        }

                        // Check enemy dummies
                        dummies.forEach(otherD => {
                            if (otherD.userData.team === enemyTeam) {
                                const dist = d.position.distanceTo(otherD.position);
                                if (dist < distToTarget) {
                                    distToTarget = dist;
                                    target = otherD;
                                    targetHeadPos = otherD.position.clone();
                                    targetHeadPos.y = 1.45;
                                }
                            }
                        });

                        // Если нет врагов - идем к вражескому флагу
                        if (!target && enemyFlag.status !== 'carried') {
                            target = 'enemy_flag';
                            targetHeadPos = enemyFlag.mesh.position.clone();
                            distToTarget = d.position.distanceTo(targetHeadPos);
                        }
                    }

                    let canSeeEnemy = false;
                    let dirToTarget = new THREE.Vector3();

                    if (target && distToTarget < 60) {
                        // Проверка видимости через Raycaster (от глаз до головы цели)
                        const headPos = d.position.clone();
                        headPos.y = 1.45;
                        dirToTarget.subVectors(targetHeadPos, headPos).normalize();
                        const realDistToTarget = headPos.distanceTo(targetHeadPos);

                        raycaster.set(headPos, dirToTarget);
                        const intersects = raycaster.intersectObjects(objects);

                        canSeeEnemy = true;
                        if (intersects.length > 0 && intersects[0].distance < realDistToTarget && target !== 'base' && target !== 'enemy_flag') {
                            canSeeEnemy = false;
                        }

                        if (canSeeEnemy || target === 'base' || target === 'enemy_flag') {
                            // Поворачиваемся к цели
                            d.lookAt(targetHeadPos.x, d.position.y, targetHeadPos.z);

                            // Движение
                            if (target === 'base') {
                                // Кэрриер бежит домой
                                d.userData.moveDir.copy(dirToTarget);
                                d.userData.moveDir.y = 0;
                                d.userData.moveDir.normalize();
                            } else if (distToTarget > (teammateCarrier ? 3 : 15)) {
                                // Обычное сближение
                                d.userData.moveDir.copy(dirToTarget);
                                d.userData.moveDir.y = 0;
                                d.userData.moveDir.normalize();
                            }

                            // Стрельба (кэрриеры ВООБЩЕ не стреляют, чтобы не отвлекаться)
                            if (gamePhase === 'playing' && time > d.lastShot && !isCarrier) {
                                if (target !== 'base' && target !== 'enemy_flag') {
                                    const gunTip = new THREE.Vector3();
                                    d.gun.getWorldPosition(gunTip);

                                    const inaccuracy = 0; // Идеальная точность (без промахов)
                                    const shootDir = dirToTarget.clone().normalize(); // Прямое направление без отклонений

                                    spawnBullet(gunTip, shootDir, d.userData.team, d);
                                    d.lastShot = time + 400 + Math.random() * 600;
                                }
                            }
                        }
                    }

                    // --- Движение ---
                    // --- Движение при отсутствии визуального контакта ---
                    if (!canSeeEnemy && time > d.userData.changeDirTime) {
                        let dest = null;
                        if (target === 'base' || target === 'enemy_flag' || (target && target.isDummy) || target === 'player') {
                            dest = targetHeadPos;
                        } else {
                            // Если нет цели - патрулируем к вражескому флагу
                            if (d.userData.team === 'blue') {
                                if (redFlag.status !== 'carried') dest = redFlag.mesh.position;
                            } else {
                                if (blueFlag.status !== 'carried') dest = blueFlag.mesh.position;
                            }
                        }

                        if (dest) {
                            d.userData.moveDir.subVectors(dest, d.position);
                            d.userData.moveDir.y = 0;
                            if (!isCarrier && !teammateCarrier) {
                                // Рандом для патрульных
                                d.userData.moveDir.x += (Math.random() - 0.5) * 15;
                                d.userData.moveDir.z += (Math.random() - 0.5) * 15;
                            }
                            d.userData.moveDir.normalize();
                        } else {
                            const angle = Math.random() * Math.PI * 2;
                            d.userData.moveDir.set(Math.cos(angle), 0, Math.sin(angle));
                        }
                        d.userData.changeDirTime = time + (isCarrier ? 500 : 1000) + Math.random() * 1000;
                    }

                    if (!canSeeEnemy && d.userData.moveDir.lengthSq() > 0) {
                        // Смотрим по направлению движения, если патрулируем
                        const targetLook = d.position.clone().add(d.userData.moveDir);
                        d.lookAt(targetLook.x, d.position.y, targetLook.z);
                    }

                    const moveDist = d.userData.speed * delta;

                    // Движение и коллизии X
                    const dOldX = d.position.x;
                    d.position.x += d.userData.moveDir.x * moveDist;
                    if (checkCollisions(d.position, true) || d.position.x < -48 || d.position.x > 48) {
                        d.position.x = dOldX;
                        d.userData.moveDir.x *= -1; // Отскок от стены
                    }

                    // Движение и коллизии Z
                    const dOldZ = d.position.z;
                    d.position.z += d.userData.moveDir.z * moveDist;
                    if (checkCollisions(d.position, true) || d.position.z < -48 || d.position.z > 48) {
                        d.position.z = dOldZ;
                        d.userData.moveDir.z *= -1; // Отскок от стены
                    }
                });
            }

            // --- ЛОГИКА ТАЙМЕРОВ (1 раз в секунду) ---
            if (time - lastTimerUpdate > 1000) {
                lastTimerUpdate = time;

                if (gamePhase === 'pre_warmup') {
                    phaseTimer--;
                    if (phaseTimer <= 0) {
                        gamePhase = 'warmup';
                        phaseTimer = 20; // 20 секунд разминки
                    }
                } else if (gamePhase === 'warmup') {
                    phaseTimer--;
                    if (phaseTimer <= 0) {
                        gamePhase = 'match_countdown';
                        phaseTimer = 15; // 15 секунд до игры
                        resetPlayerToSpawn();
                        resetBotsToSpawn();
                    }
                } else if (gamePhase === 'match_countdown') {
                    phaseTimer--;
                    if (phaseTimer <= 0) {
                        gamePhase = 'playing';
                    }
                } else if (gamePhase === 'playing') {
                    gameDuration--;
                    if (gameDuration <= 0) {
                        endRound();
                    }
                }
                updateTimerDisplay();
            }
        }

        // --- ОБНОВЛЕНИЕ ПУЛЬ (Внутри animate) ---
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            const moveDist = b.speed * delta;
            const oldPos = b.mesh.position.clone();
            b.mesh.position.addScaledVector(b.direction, moveDist);
            b.distanceTraveled += moveDist;

            let hit = false;
            raycaster.set(oldPos, b.direction);

            const enemyTeam = b.team === 'blue' ? 'red' : 'blue';
            const enemyDummies = dummies.filter(d => d.userData.team === enemyTeam);
            const targets = [...objects, ...enemyDummies.flatMap(d => d.children)];
            const intersects = raycaster.intersectObjects(targets);

            if (intersects.length > 0 && intersects[0].distance < moveDist) {
                hit = true;
                const hitObj = intersects[0].object;
                let parentDummy = hitObj.parent;
                if (parentDummy && parentDummy.isDummy) {
                    let damage = 20;
                    if (b.owner && b.owner.stats) {
                        damage = b.owner.stats.damage;
                        if (b.owner.stats.isStun) {
                            parentDummy.userData.stunnedUntil = performance.now() + 2000;
                        }
                        if (parentDummy.children.indexOf(hitObj) === 1 && b.owner.stats.headDamage) {
                            damage = b.owner.stats.headDamage;
                        }
                    }
                    parentDummy.userData.health -= damage;
                    if (parentDummy.userData.health <= 0) {
                        if (b.owner && b.owner.isPlayer) {
                            coins += 100;
                            updateCoinsUI();
                        }
                        destroyDummy(parentDummy);
                    } else {
                        if (hitObj.material) {
                            const oldColor = hitObj.material.color.getHex();
                            hitObj.material.color.setHex(0xff0000);
                            setTimeout(() => { if (hitObj.material) hitObj.material.color.setHex(oldColor); }, 100);
                        }
                    }
                }
            } else if (playerTeam === enemyTeam) {
                const px = controls.getObject().position.x;
                const pz = controls.getObject().position.z;
                const py = controls.getObject().position.y - 0.8;
                const dist2d = Math.hypot(b.mesh.position.x - px, b.mesh.position.z - pz);
                if (dist2d < 0.6 && b.mesh.position.y > 0 && b.mesh.position.y < 1.8) {
                    let dmg = 15;
                    if (b.owner && b.owner.stats) {
                        dmg = b.owner.stats.damage;
                        if (b.owner.stats.isStun) playerStunnedUntil = performance.now() + 2000;
                    }
                    takeDamage(dmg, b.owner);
                    hit = true;
                }
            }

            if (hit || b.distanceTraveled > 150) {
                scene.remove(b.mesh);
                bullets.splice(i, 1);
            }
        }

        prevTime = time;

        // DEBUG: Отлов NaN-ошибки позиционирования (предотвращает черный экран)
        if (isNaN(controlObj.position.x) || isNaN(controlObj.position.y) || isNaN(controlObj.position.z)) {
            console.error("CAMERA POSITION NaN DETECTED", controlObj.position);
            controlObj.position.set(0, 1.6, 0);
        }



        // --- ОРБИТАЛЬНАЯ КАМЕРА (смерть игрока) ---
        // Перемещена в самый конец кадра, чтобы гарантированно перекрыть любые смещения от гравитации/коллизий/фаз
        if (isKillCamActive) {
            // Медленно вращаемся вокруг центра карты
            killCamAngle += delta * 0.25;

            const orbitRadius = 0;
            const orbitHeight = 5;

            // Позиция в центре на заданной высоте
            const cx = Math.sin(killCamAngle) * orbitRadius;
            const cz = Math.cos(killCamAngle) * orbitRadius;

            // СБРОС: Гарантируем отсутствие поворотов от мыши и локальных смещений камеры
            controlObj.rotation.set(0, 0, 0);
            camera.position.set(0, 0, 0);
            controlObj.position.set(cx, orbitHeight, cz);

            // Камера смотрит вперёд по касательной (хотя при радиусе 0 это просто вращение на месте)
            const forwardX = Math.cos(killCamAngle);
            const forwardZ = -Math.sin(killCamAngle);
            camera.rotation.set(
                -0.2,                               // Наклон вниз
                Math.atan2(forwardX, forwardZ),     // Направление
                0,
                'YXZ'
            );
        }

        renderer.render(scene, camera);
    } catch (err) {
        console.error("ANIMATE CRASH:", err);
        const fpsDiv = document.getElementById('fps-display');
        if (fpsDiv) {
            fpsDiv.style.display = 'block';
            fpsDiv.style.color = 'red';
            fpsDiv.innerText = "CRASH: " + err.message;
        }
    }
}

function endRound() {
    // Определяем победителя раунда
    if (ctfScore.blue > ctfScore.red) roundsWon.blue++;
    else if (ctfScore.red > ctfScore.blue) roundsWon.red++;
    // Ничья - никому очко

    if (currentRound < maxRounds) {
        currentRound++;

        // Смена сторон — переносим очки на противоположные команды
        // (то, что набрала синяя, теперь идёт красной, и наоборот)
        const prevBlue = ctfScore.blue;
        const prevRed = ctfScore.red;
        ctfScore.blue = prevRed;
        ctfScore.red = prevBlue;

        playerTeam = playerTeam === 'blue' ? 'red' : 'blue';
        gameDuration = 120;

        resetFlag(blueFlag);
        resetFlag(redFlag);

        // Пересоздаем ботов с новыми командами
        dummies.forEach(d => scene.remove(d));
        dummies = [];
        for (let i = 0; i < 8; i++) spawnDummy(null, null, i % 2 === 0 ? 'blue' : 'red');

        createWeapon(); // Обновляем цвет рук
        updateScoreUI();

        gamePhase = 'warmup';
        phaseTimer = 20;

        resetPlayerToSpawn();
        resetBotsToSpawn();

        // Уведомление
        const el = document.getElementById('flag-status');
        el.innerText = `КОНЕЦ РАУНДА! СМЕНА СТОРОН. ТЕПЕРЬ ВЫ ЗА ${playerTeam === 'blue' ? 'СИНИХ' : 'КРАСНЫХ'}`;
        el.style.color = 'gold';
        el.style.display = 'block';
        setTimeout(() => { if (gamePhase !== 'idle') el.style.display = 'none'; }, 5000);
    } else {
        gameOver();
    }
}

// --- MOBILE MODE LOGIC ---
const initMobileMode = () => {
    // Robust mobile detection: User Agent + Touch pointer support
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.matchMedia('(pointer: coarse)').matches);

    const settingsAlert = document.getElementById('mobile-alert-main');
    const videoAlert = document.getElementById('mobile-alert-video');
    const btnTabVideo = document.getElementById('btn-tab-video');
    const mobileCheckbox = document.getElementById('mobile-mode-checkbox');

    function updateMobileUI(active) {
        if (active) {
            document.body.classList.add('mobile-ui-active');
            if (settingsAlert) settingsAlert.style.display = 'none';
            if (videoAlert) videoAlert.style.display = 'none';
            if (btnTabVideo) {
                btnTabVideo.style.color = '';
                btnTabVideo.style.textShadow = '';
            }
        } else {
            document.body.classList.remove('mobile-ui-active');
            // If it's actually a mobile device but user turned off UI, show alerts as a hint
            if (isMobile) {
                if (settingsAlert) settingsAlert.style.display = 'block';
                if (videoAlert) videoAlert.style.display = 'inline';
                if (btnTabVideo) {
                    btnTabVideo.style.color = 'red';
                    btnTabVideo.style.textShadow = '0 0 5px red';
                }
            }
        }
    }

    if (mobileCheckbox) {
        mobileCheckbox.addEventListener('change', (e) => {
            updateMobileUI(e.target.checked);
        });
    }

    // AUTO-DETECTION: Enable if mobile detected
    if (isMobile) {
        if (mobileCheckbox) {
            mobileCheckbox.checked = true;
        }
        updateMobileUI(true);
    }

    // Touch controls
    const btnJump = document.getElementById('btn-mobile-jump');
    const btnShoot = document.getElementById('btn-mobile-shoot');
    const btnAim = document.getElementById('btn-mobile-aim');
    const btnShop = document.getElementById('btn-mobile-shop');
    const btnReload = document.getElementById('btn-mobile-reload');
    const joystickZone = document.getElementById('mobile-joystick-zone');
    const joystickKnob = document.getElementById('mobile-joystick-knob');

    if (btnJump) btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); if (canJump) velocity.y += 10; canJump = false; }, { passive: false });

    if (btnShoot) {
        btnShoot.addEventListener('touchstart', (e) => { e.preventDefault(); isMouseButtonDown = true; shoot(); }, { passive: false });
        btnShoot.addEventListener('touchend', (e) => { e.preventDefault(); isMouseButtonDown = false; }, { passive: false });
    }

    if (btnAim) {
        btnAim.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isAiming = true;
            if (currentWeapon === 'sniper') {
                const totalZoom = 4 * sniperScope;
                aimFov = defaultFov / totalZoom;
                document.getElementById('sniper-scope-overlay').style.display = 'block';
                document.getElementById('crosshair').style.display = 'none';
                if (gunMesh) gunMesh.visible = false;
            } else { aimFov = 50; }
            document.getElementById('crosshair').style.transform = `translate(-50%, -50%) scale(${aimFov / defaultFov})`;
        }, { passive: false });
        btnAim.addEventListener('touchend', (e) => {
            e.preventDefault();
            isAiming = false;
            document.getElementById('crosshair').style.transform = 'translate(-50%, -50%) scale(1)';
            document.getElementById('crosshair').style.display = 'block';
            document.getElementById('sniper-scope-overlay').style.display = 'none';
            if (gunMesh) gunMesh.visible = true;
        }, { passive: false });
    }

    if (btnShop) btnShop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gamePhase !== 'idle') {
            const pz = controls.getObject().position.z;
            const inZone = (playerTeam === 'blue') ? (pz > 25) : (pz < -25);
            if (inZone || isTutorialMode) {
                currentScreen = 'shop';
                controls.unlock();
                showScreen('shop');
            }
        }
    }, { passive: false });

    if (btnReload) btnReload.addEventListener('touchstart', (e) => { e.preventDefault(); reloadWeapon(); }, { passive: false });

    // Joystick Logic
    let joyActive = false;
    let joyCenterX = 0;
    let joyCenterY = 0;
    const maxRadius = 35;

    if (joystickZone) {
        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joyActive = true;
            const rect = joystickZone.getBoundingClientRect();
            joyCenterX = rect.left + rect.width / 2;
            joyCenterY = rect.top + rect.height / 2;
            updateJoystick(e.touches[0]);
        }, { passive: false });

        joystickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!joyActive) return;
            updateJoystick(e.touches[0]);
        }, { passive: false });

        const resetJoy = (e) => {
            e.preventDefault();
            joyActive = false;
            joystickKnob.style.transform = `translate(-50%, -50%)`;
            moveForward = false;
            moveBackward = false;
            moveLeft = false;
            moveRight = false;
        };

        joystickZone.addEventListener('touchend', resetJoy, { passive: false });
        joystickZone.addEventListener('touchcancel', resetJoy, { passive: false });

        function updateJoystick(touch) {
            let dx = touch.clientX - joyCenterX;
            let dy = touch.clientY - joyCenterY;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > maxRadius) {
                dx = dx * maxRadius / distance;
                dy = dy * maxRadius / distance;
            }

            joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

            const thresh = 10;
            const inputMultiplier = 0.8;
            moveForward = dy < -thresh;
            moveBackward = dy > thresh;
            moveLeft = dx < -thresh;
            moveRight = dx > thresh;
        }
    }

    // Camera Look Logic for Mobile (right half of screen swipe)
    let isDragging = false;
    let previousTouch = null;
    let activeCameraTouchId = null;

    document.addEventListener('touchstart', (e) => {
        if (!document.body.classList.contains('mobile-ui-active')) return;

        // Find a touch on the right half that didn't hit a button
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            // Ignore if it's a mobile button, joystick, or screen overlay
            if (target && (target.closest('.mobile-btn') || target.closest('#mobile-joystick-zone') || target.closest('.screen') || target.closest('button') || target.closest('input'))) continue;

            // Only allow aiming on the right half of the screen
            if (touch.clientX > window.innerWidth / 2) {
                if (!isDragging) {
                    // Prevent ghost scrolling/dragging ONLY when we are sure this touch is for the camera
                    e.preventDefault();
                    isDragging = true;
                    activeCameraTouchId = touch.identifier;
                    previousTouch = touch;
                    break;
                }
            }
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || !document.body.classList.contains('mobile-ui-active')) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === activeCameraTouchId) {
                const movementX = touch.clientX - previousTouch.clientX;
                const movementY = touch.clientY - previousTouch.clientY;

                if (camera) {
                    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                    euler.setFromQuaternion(camera.quaternion);

                    const sens = sensSlider ? parseFloat(sensSlider.value) : 1.0;
                    euler.y -= movementX * 0.002 * sens;
                    euler.x -= movementY * 0.002 * sens;
                    // Limit up/down viewing angle
                    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

                    camera.quaternion.setFromEuler(euler);
                }

                previousTouch = touch;
                break;
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeCameraTouchId) {
                isDragging = false;
                previousTouch = null;
                activeCameraTouchId = null;
                break;
            }
        }
    }, { passive: false });

    document.addEventListener('touchcancel', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeCameraTouchId) {
                isDragging = false;
                previousTouch = null;
                activeCameraTouchId = null;
                break;
            }
        }
    }, { passive: false });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMode);
} else {
    initMobileMode();
}

