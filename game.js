// --- ELEMENTOS DO DOM ---
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const playerNameInput = document.getElementById('playerNameInput');
const startGameBtn = document.getElementById('startGameBtn');

// --- EFEITOS SONOROS ---
const startGameSound = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c74438.mp3'); 
const hitSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2b4b1a629b.mp3');
const wallSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_554823a4b9.mp3');
const scoreSound = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3b99a67a0.mp3');

// Função para tocar os sons
function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
        // O .catch() é uma boa prática para lidar com erros de áudio, embora a nossa solução principal evite isso.
        console.error("Erro ao tocar o áudio:", error);
    });
}

// --- CONSTANTES E CONFIGURAÇÕES ---
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 100;
const PADDLE_GAP = 24;
const PADDLE_SPEED = 8;
const BALL_SIZE = 16;
const WINNING_SCORE = 5;

// --- ESTADO DO JOGO ---
let gameState = 'menu';
let playerName = 'JOGADOR';
let winner = '';
let ballX, ballY, ballVX, ballVY;
let leftPaddleY = HEIGHT / 2 - PADDLE_HEIGHT / 2;
let rightPaddleY = HEIGHT / 2 - PADDLE_HEIGHT / 2;
let leftScore = 0;
let rightScore = 0;

// --- RESPONSIVIDADE ---
let canvasRect;
let scaleX;
let scaleY;

function handleResize() {
    canvasRect = canvas.getBoundingClientRect();
    scaleX = canvas.width / canvasRect.width;
    scaleY = canvas.height / canvasRect.height;
}
window.addEventListener('resize', handleResize);

// --- EVENTOS DE CONTROLE ---
startGameBtn.addEventListener('click', () => {
    // Tocar um som aqui "destrava" o áudio para o navegador
    playSound(startGameSound);

    const name = playerNameInput.value.trim().toUpperCase();
    if (name) {
        playerName = name;
    }
    startScreen.style.display = 'none';
    resetGame();
    gameState = 'play';
});

canvas.addEventListener('click', () => {
    if (gameState === 'done') {
        playSound(startGameSound);
        resetGame();
        gameState = 'play';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p') {
        if (gameState === 'play') {
            gameState = 'paused';
        } else if (gameState === 'paused') {
            gameState = 'play';
        }
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (!canvasRect) return;
    let mouseYOnScreen = e.clientY - canvasRect.top;
    let mouseYInGame = mouseYOnScreen * scaleY;
    leftPaddleY = mouseYInGame - PADDLE_HEIGHT / 2;
    leftPaddleY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, leftPaddleY));
});

// --- FUNÇÕES DE DESENHO ---
function draw() {
    ctx.fillStyle = 'rgba(24, 24, 24, 0.3)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';

    ctx.strokeStyle = '#00ffff';
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    drawRect(PADDLE_GAP, leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, '#fff');
    drawRect(WIDTH - PADDLE_GAP - PADDLE_WIDTH, rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT, '#fff');
    
    if (gameState === 'play') {
        drawRect(ballX, ballY, BALL_SIZE, BALL_SIZE, '#ffff00');
    }
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(playerName, WIDTH / 4, 40);
    ctx.fillText("CPU", WIDTH * 3 / 4, 40);
    
    ctx.font = "40px 'Press Start 2P'";
    ctx.fillText(leftScore, WIDTH / 4, 80);
    ctx.fillText(rightScore, WIDTH * 3 / 4, 80);

    if (gameState === 'paused') {
        drawText("Pausado");
    } else if (gameState === 'done') {
        drawText(`${winner} Venceu!`, "Clique para jogar novamente");
    }
}

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawText(text1, text2 = '') {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "40px 'Press Start 2P'";
    ctx.fillText(text1, WIDTH / 2, HEIGHT / 2 - 20);
    if (text2) {
        ctx.font = "20px 'Press Start 2P'";
        ctx.fillText(text2, WIDTH / 2, HEIGHT / 2 + 20);
    }
}

// --- FUNÇÕES DE LÓGICA ---
function update() {
    ballX += ballVX;
    ballY += ballVY;
    if (ballY < 0 || ballY + BALL_SIZE > HEIGHT) {
        ballVY = -ballVY;
        playSound(wallSound);
    }
    let paddle = (ballVX < 0) ? { x: PADDLE_GAP, y: leftPaddleY } : { x: WIDTH - PADDLE_GAP - PADDLE_WIDTH, y: rightPaddleY };
    if (collides(paddle, {x: ballX, y: ballY})) {
        ballVX = -ballVX * 1.05;
        ballVY *= 1.05;
        let hitPos = (ballY + BALL_SIZE / 2) - (paddle.y + PADDLE_HEIGHT / 2);
        ballVY = hitPos * 0.2;
        playSound(hitSound);
    }
    if (ballX < 0) {
        rightScore++;
        playSound(scoreSound);
        checkWin();
        resetBall(-1);
    } else if (ballX + BALL_SIZE > WIDTH) {
        leftScore++;
        playSound(scoreSound);
        checkWin();
        resetBall(1);
    }
    const aiCenter = rightPaddleY + PADDLE_HEIGHT / 2;
    const aiErrorFactor = 0.85;
    const targetY = ballY + BALL_SIZE / 2;
    rightPaddleY += (targetY - aiCenter) * aiErrorFactor * 0.1;
    rightPaddleY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, rightPaddleY));
}

function collides(paddle, ball) {
    return ball.x < paddle.x + PADDLE_WIDTH && ball.x + BALL_SIZE > paddle.x && ball.y < paddle.y + PADDLE_HEIGHT && ball.y + BALL_SIZE > paddle.y;
}

function resetBall(direction) {
    ballX = WIDTH / 2 - BALL_SIZE / 2;
    ballY = HEIGHT / 2 - BALL_SIZE / 2;
    ballVX = 5 * direction;
    let randomVY = Math.random() * 6 - 3;
    ballVY = randomVY === 0 ? 2 : randomVY;
}

function checkWin() {
    if (leftScore >= WINNING_SCORE) {
        winner = playerName;
        gameState = 'done';
    } else if (rightScore >= WINNING_SCORE) {
        winner = "CPU";
        gameState = 'done';
    }
}

function resetGame() {
    leftScore = 0;
    rightScore = 0;
    winner = '';
    resetBall(1);
}

// --- LOOP PRINCIPAL ---
function gameLoop() {
    if (gameState === 'play') {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    handleResize();
    gameLoop();
});