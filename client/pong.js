let canvas;
let canvasContext;
let ballX = 350;
let ballY = 295;
let ballSpeedX = 0;
let ballSpeedY = 0;

var player1Score = 0;
var player2Score = 0;
const WINNING_SCORE = 2;

let paddle1Y = 250;
let paddle2Y = 250;
const PADDLE_THICKNESS = 10;
const PADDLE_HEIGHT = 90;

var showingWinScreen = false;

function calculateMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    var root = document.documentElement;
    var mouseX = evt.clientX - rect.left - root.scrollLeft;
    var mouseY = evt.clientY - rect.top - root.scrollTop;
    return {
        x: mouseX,
        y: mouseY
    };
}


function handleMouseClick(evt) {
    if(showingWinScreen) {
        player1Score = 0;
        player2Score = 0;
        showingWinScreen = false;
    }
}

window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    canvasContext = canvas.getContext("2d");
    canvasContext.fillStyle = 'white';
    canvasContext.font = "30px Arial";

    var framesPerSecond = 60;
    setInterval(function() {
        moveEverything();
        drawEverything();
    }, 1000 / framesPerSecond );

    canvas.addEventListener('mousedown', handleMouseClick);

    canvas.addEventListener('mousemove', function(evt) {
            var mousePos = calculateMousePos(evt);
            paddle1Y = mousePos.y - (PADDLE_HEIGHT/2);
    });

    // maybe
    ballX = (30 + PADDLE_THICKNESS);

    let mouseMoveBall = function(evt) {
        let mousePos = calculateMousePos(evt);
        ballY = mousePos.y;
    };

    let shootBall = function(evt) {
        ballSpeedX = -7;
        function getRandomNumberBetween(min,max){
            return Math.floor(Math.random()*(max-min+1)+min);
        }
        ballSpeedY = getRandomNumberBetween(-8, 8);
        canvas.removeEventListener('mousemove', mouseMoveBall);
        canvas.removeEventListener('click', shootBall);
    };
    
    canvas.addEventListener('click', shootBall);
    canvas.addEventListener('mousemove', mouseMoveBall);
}

function ballReset() {
    if(player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
        showingWinScreen = true;
    }

    ballSpeedY = 0;
    
    if(ballSpeedX < 0){
        ballSpeedX = 0;
        ballX = canvas.width - (PADDLE_THICKNESS + 30);

        let positionServe = function(evt) {
            ballY = 300;
        };

        let computerServe = function(evt) {
            ballSpeedX = 7;
        };
        
        positionServe();
        setTimeout(() => {
            function getRandomNumberBetween(min,max){
                return Math.floor(Math.random()*(max-min+1)+min);
            }
            ballSpeedY = getRandomNumberBetween(-8, 8);
            // console.log('ballSpeedY', ballSpeedY);
            
            computerServe();
        }, 1500)

    } else if (ballSpeedX > 0){
        ballSpeedX = 0;
        ballX = (25 + PADDLE_THICKNESS);

        let mouseMoveBall = function(evt) {
            let mousePos = calculateMousePos(evt);
            ballY = mousePos.y;
        };

        let shootBall = function(evt) {
            ballSpeedX = -7;
            function getRandomNumberBetween(min,max){
                return Math.floor(Math.random()*(max-min+1)+min);
            }
            ballSpeedY = getRandomNumberBetween(-8, 8);
            canvas.removeEventListener('mousemove', mouseMoveBall);
            canvas.removeEventListener('click', shootBall);
        };
        
        canvas.addEventListener('click', shootBall);
        canvas.addEventListener('mousemove', mouseMoveBall);
    }
}

let paddleMovement = 4;

function computerMovement() {
    var paddle2YCenter = paddle2Y + (PADDLE_HEIGHT / 2);
    if(paddle2YCenter < ballY) {
        paddle2Y += paddleMovement;
    }else if (paddle2YCenter > ballY){
        paddle2Y -= paddleMovement;
    }
}

function moveEverything() {
    if(showingWinScreen) {
        return;
    }
    
    computerMovement();

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    //adjust the ball bounce from the paddles
    if(ballX <= (PADDLE_THICKNESS + 15)) {
        if(ballY > (paddle1Y-20) && ballY < paddle1Y+PADDLE_HEIGHT+20) {
            
            if(Math.abs(ballSpeedX) < 15) {
                ballSpeedX = -ballSpeedX * 1.07;
            } else {
                ballSpeedX = -ballSpeedX * 1;
            }

            var deltaY = ballY - (paddle1Y+PADDLE_HEIGHT/2);
            ballSpeedY = deltaY * 0.15;
        }else {
            player2Score++;
            ballReset();
        }
    }
    if(ballX >= (canvas.width - (PADDLE_THICKNESS + 15))) {
        if(ballY > (paddle2Y-20) && ballY < paddle2Y+PADDLE_HEIGHT+20) {
            ballSpeedX = -ballSpeedX;

            var deltaY = ballY - (paddle2Y+PADDLE_HEIGHT/2);
            ballSpeedY = deltaY * 0.15;
        }else {
            player1Score++;
            ballReset();
        }
    }
    if(ballY < 0){
        ballSpeedY = -ballSpeedY;
    }
    if(ballY > canvas.height) {
        ballSpeedY = -ballSpeedY;
    }

    if(Math.abs(ballSpeedY) > 6) {
        paddleMovement = 6;
    }else if(Math.abs(ballSpeedY) > 4 && Math.abs(ballSpeedY) <= 6){
        paddleMovement = 6;
    }else if(Math.abs(ballSpeedY) > 3 && Math.abs(ballSpeedY) <= 4){
        paddleMovement = 5.5;
    }else if(Math.abs(ballSpeedY) >= 1 && Math.abs(ballSpeedY) <= 3){
        paddleMovement = 5;
    }else if(Math.abs(ballSpeedY) > 0 && Math.abs(ballSpeedY) < 1){
        paddleMovement = 4;
    }else if(Math.abs(ballSpeedY) === 0){
        paddleMovement = 3.5;
    }
    else if(Math.abs(ballSpeedY) == 0 && Math.abs(ballSpeedX) == 0){
        paddleMovement = 0;
    }
}

function drawNet() {
    for(let i = 0; i < canvas.height; i+=40) {
        colorRect(canvas.width/2-1, i, 4, 20, 'pink');
    }
}

function drawEverything() {
    //blanks the screen black
    colorRect(0, 0, canvas.width, canvas.height, 'black');
    
    if(showingWinScreen) {
        canvasContext.fillStyle = 'white';

        if(player1Score >= WINNING_SCORE){
            canvasContext.fillText("You won!", 340, 200);
        }
        else if(player2Score >= WINNING_SCORE) {
            canvasContext.fillText("Robo Won", 340, 200);
        }
        
        canvasContext.fillText("click to play again", 305, 500);
        return;
    }

    drawNet();
    
    // draws the ball
    colorCircle(ballX, ballY, 10, 'yellow');

    //left player paddle
    colorPaddle(PADDLE_THICKNESS, 20, paddle1Y, 20, paddle1Y + PADDLE_HEIGHT , 'dodgerblue');
    
    //right computer paddle
    colorPaddle(PADDLE_THICKNESS, canvas.width - (PADDLE_THICKNESS + 10), paddle2Y, canvas.width - (PADDLE_THICKNESS + 10), paddle2Y + PADDLE_HEIGHT , 'red');
    
    canvasContext.fillStyle = 'white';
    canvasContext.fillText(player1Score, 100, 100);
    canvasContext.fillText(player2Score, canvas.width - 100, 100);

}

function colorRect(leftX, topY, width, height, drawColor) {
    canvasContext.beginPath();
    canvasContext.lineCap = "round";

    canvasContext.fillStyle = drawColor;
    canvasContext.fillRect(leftX, topY, width, height);
}

function colorPaddle(width, topX, topY, bottomX, bottomY, color) {
    canvasContext.lineWidth = width;
    canvasContext.beginPath();
    canvasContext.lineCap = "round";
    canvasContext.moveTo(topX, topY);
    canvasContext.lineTo(bottomX, bottomY);
    canvasContext.strokeStyle = color;
    canvasContext.stroke();
}

function colorCircle(centerX, centerY, radius, drawColor) {
    canvasContext.fillStyle = drawColor;
    canvasContext.beginPath();
    canvasContext.arc(centerX, centerY, radius, 0, Math.PI*2, true);
    canvasContext.fill();
}