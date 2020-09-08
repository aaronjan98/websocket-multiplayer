let canvas;
let canvasContext;
let ballX = 350;
let ballY = 295;
let ballSpeedX = 0;
let ballSpeedY = 0;

var player1Score = 0;
var player2Score = 0;
const WINNING_SCORE = 2;
var count = 0;

let paddle1Y = 250;
let paddle2Y = 250;
let paddleMovement = 4;
const PADDLE_THICKNESS = 10;
const PADDLE_HEIGHT = 90;

var showingWinScreen = false;
var multiplayerMode = false;
var redIsServing = false;
var sendBallSpeedX = false;
var mousePosBlue;
var mousePosRed;

// HTML elements
let clientId = null;
let gameId = null;
let playerColor = 'blue';
let ws = new WebSocket('ws://localhost:9090');
const btnCreate = document.getElementById('btnCreate');
const btnJoin = document.getElementById('btnJoin');
const txtGameId = document.getElementById('txtGameId');
const divPlayers = document.getElementById('divPlayers');
const divBoard = document.getElementById('divBoard');

// wiring events
btnCreate.addEventListener('click', e => {

    const payload = {
        'method': 'create',
        'clientId': clientId
    }

    ws.send(JSON.stringify(payload));
    
})

btnJoin.addEventListener('click', e => {

    if (gameId == null) {
        gameId  = txtGameId.value
    }
    
    const payload = {
        'method': 'join',
        'clientId': clientId,
        'gameId': gameId
    }

    ws.send(JSON.stringify(payload));           
})

// when the server sends the client a message
ws.onmessage = message => {
    // string server sends: message.data
    const response = JSON.parse(message.data);

    // Connect Method: save clientId in global name space
    if (response.method === 'connect') {
        clientId = response.clientId;
        console.log('Client ID set successfully: ' + clientId);
        console.log('connect response: ', response);
    }

    // create
    if (response.method === 'create') {
        gameId = response.game.id;
        console.log('Game successfully created with ID: ' + response.game.id);
        copyToClipboard(response.game.id);
    }

    // join
    if (response.method === 'join') {
        console.log('response when joining: ', response);
        const game = response.game;

        // doing this to prevent premature requests of update method
        if(game.clients.length === 2) {
            multiplayerMode = true;
        }

        // while divPlayers is empty, remove all the elements
        while(divPlayers.firstChild) {
            divPlayers.removeChild(divPlayers.firstChild);
        }

        game.clients.forEach(c => {
            // c.color is the personal color so this makes it dynamic
            if (c.clientId === clientId) {
                playerColor = c.color;
            }
        });

        /*    Put things here if you want to render
        \*    a page, to a black screen w/ your name
        \*    and the other player who just connected
         */
    }

    // update
    if (response.method === 'update') {
        // use information from this response from the server to update the game to match the changes that my other opponent made

        let cstate = response.game;

        // updating paddle position for player who didn't move that paddle
        if (playerColor === 'blue') {
            mousePosRed = cstate.mousePosRed;
            paddle2Y = cstate.paddle2Y - (PADDLE_HEIGHT/2);
            sendBallSpeedX = cstate.sendBallSpeedX;
        } else if (playerColor === 'red') {
            paddle1Y = cstate.paddle1Y - (PADDLE_HEIGHT/2);
            ballSpeedX = cstate.ballSpeedX;
            player1Score = cstate.player1Score;
            player2Score = cstate.player2Score;
        }
        redIsServing = cstate.redIsServing;

        // update ball position and speed
        ballX = cstate.ballX;
        ballY = cstate.ballY;
    }
}

/****************** Render the entire canvas below ******************/

// play
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    canvasContext = canvas.getContext("2d");
    canvasContext.fillStyle = 'white';
    canvasContext.font = "30px Arial";

    var framesPerSecond = 60;

    function redServes(evt) {
        sendBallSpeedX = true;
        canvas.removeEventListener('click', redServes);
    }

    setInterval(function() {
        moveEverything();
        drawEverything();

        if (playerColor === 'red' && redIsServing) {
            canvas.addEventListener('click', redServes);
        };
    }, 1000 / framesPerSecond );


    canvas.addEventListener('mousemove', function(evt) {
        let eventMousePos = calculateMousePos(evt);

        if (playerColor === 'blue') {
            if(eventMousePos.x !== null || eventMousePos.x !== undefined) {
                mousePosBlue = eventMousePos;
            }
        } else if (playerColor === 'red') {
            if (eventMousePos.x !== null || eventMousePos.x !== undefined) {
                mousePosRed = eventMousePos;
            }
        }
    });

    // position of the ball before the initial serve
    ballX = (30 + PADDLE_THICKNESS);

    let puckResetPosition = function(evt) {
        ballY = mousePosBlue.y;
    };

    let shootBall = function(evt) {
        ballSpeedX = -4;
        function getRandomNumberBetween(min,max){
            return Math.floor(Math.random()*(max-min+1)+min);
        }
        ballSpeedY = getRandomNumberBetween(-8, 8);
        canvas.removeEventListener('mousemove', puckResetPosition);
        canvas.removeEventListener('click', shootBall);
    };
    
    if (playerColor === 'blue' && !showingWinScreen) {
        canvas.addEventListener('click', shootBall);
        canvas.addEventListener('mousemove', puckResetPosition);
    }
} // window onload

function moveEverything() {
    if(showingWinScreen) {
        return;
    }

    // put logic to decide which player controls what paddle
    if (playerColor === 'blue') {
        paddle1Y = mousePosBlue.y - (PADDLE_HEIGHT/2);
    } else if (playerColor === 'red') {
        paddle2Y = mousePosRed.y - (PADDLE_HEIGHT/2);
    }
    
    if(!multiplayerMode) {
        computerMovement();
    }

    if (playerColor === 'blue') {
        // serving red player's puck
        if(redIsServing && sendBallSpeedX && playerColor === 'blue') {
            ballSpeedX = -3;
            ballSpeedY = 0;
            ballY = mousePosRed.y;
            sendBallSpeedX = false;
            redIsServing = false;
        }
        
        // incrementing puck position by its components speeds to appear speeding up
        ballX += ballSpeedX;
        ballY += ballSpeedY;

        //adjust the ball bounce from the paddles
        // left side of the canvas
        if (ballX < (PADDLE_THICKNESS + 15)) {
            // inside paddle
            if (ballY > (paddle1Y-15) && ballY < paddle1Y+PADDLE_HEIGHT+15) {
                
                if (Math.abs(ballSpeedX) < 15) {
                    ballSpeedX = -ballSpeedX * 1.07;
                } else {
                    ballSpeedX = -ballSpeedX * 1;
                }

                var deltaY = ballY - (paddle1Y+PADDLE_HEIGHT/2);
                ballSpeedY = deltaY * 0.15;
            // outside of paddle, red scores
            } else {
                // reset the score upon firstly joining a multi-player game
                count++;
                if (multiplayerMode && count === 1) {
                    player1Score = 0;
                    player2Score = 0;
                } else {
                    player2Score++;
                }

                ballReset();
            }
        } // right side of the canvas
        else if (ballX > (canvas.width - (PADDLE_THICKNESS + 15))) {
            if (ballY > (paddle2Y-15) && ballY < paddle2Y+PADDLE_HEIGHT+15) {
                ballSpeedX = -ballSpeedX;

                var deltaY = ballY - (paddle2Y+PADDLE_HEIGHT/2);
                ballSpeedY = deltaY * 0.15;
            } else {
                player1Score++;
                ballReset();
            }
        }

        // puck changes direction when bumping up the walls
        if (ballY < 0) {
            ballSpeedY = -ballSpeedY;
        }
        if (ballY > canvas.height) {
            ballSpeedY = -ballSpeedY;
        }

        if (!multiplayerMode) {
            // as the puck increase speed in the y-direction, the computer paddle increase mm.
            if (Math.abs(ballSpeedY) > 6) {
                paddleMovement = 6;
            } else if (Math.abs(ballSpeedY) > 4 && Math.abs(ballSpeedY) <= 6) {
                paddleMovement = 6;
            } else if (Math.abs(ballSpeedY) > 3 && Math.abs(ballSpeedY) <= 4) {
                paddleMovement = 5.5;
            } else if (Math.abs(ballSpeedY) >= 1 && Math.abs(ballSpeedY) <= 3) {
                paddleMovement = 5;
            } else if (Math.abs(ballSpeedY) > 0 && Math.abs(ballSpeedY) < 1) {
                paddleMovement = 4;
            } else if (Math.abs(ballSpeedY) === 0){
                paddleMovement = 3.5;
            } else if (Math.abs(ballSpeedY) == 0 && Math.abs(ballSpeedX) == 0) {
                paddleMovement = 0;
            }
        }

        // when first entering multi-player mode, blue player serves first
        if (multiplayerMode && ballSpeedX === 0 && ballX < (canvas.width / 2)) {
            ballReset();
        }

    }

    if(multiplayerMode) {
        if (playerColor === 'blue') {
            // send to the server the information that is needed to replicate the change that this event listener listened upon.
            let payload = {
                'method': 'play',
                'clientId': clientId,
                'gameId': gameId,
                'playerColor': playerColor,
                'paddle1Y': paddle1Y,
                'ballX': ballX,
                'ballY': ballY,
                'ballSpeedX': ballSpeedX,
                'ballSpeedY': ballSpeedY,
                'mousePosBlue': mousePosBlue,
                'redIsServing': redIsServing,
                'player1Score': player1Score,
                'player2Score': player2Score
            }
            
            ws.send(JSON.stringify(payload));
        } else if (playerColor === 'red') {
            let payload = {
                'method': 'play',
                'clientId': clientId,
                'gameId': gameId,
                'playerColor': playerColor,
                'paddle2Y': paddle2Y,
                'mousePosRed': mousePosRed,
                'redIsServing': redIsServing,
                'sendBallSpeedX': sendBallSpeedX
            }
            
            ws.send(JSON.stringify(payload));            
            sendBallSpeedX = false;
        }
    } else {
        // if not multiplayer, the person is always going to play player1
        paddle1Y = mousePosBlue.y - (PADDLE_HEIGHT/2);
    }
} // moveEverything()
    
function ballReset() {
    // commenting the win screen temporarily
    if(player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
        showingWinScreen = true;
        return;
    }

    // to reset the puck, it can't be traveling in the y-direction
    ballSpeedY = 0;
    
    // to reset the puck you have to know which direction the point made it to, which you can tell with the negative and positive x-directional speed of the puck.
    if(ballSpeedX < 0){ // paddle 2 scores
        ballSpeedX = 0;
        ballX = canvas.width - (PADDLE_THICKNESS + 25);

        // after the robo scores, the puck should reset in the middle
        if (!multiplayerMode) {
            ballY = canvas.height / 2;
        } else {
            ballY = paddle2Y + (PADDLE_HEIGHT / 2);
        }

        let computerServe = function(evt) {
            ballSpeedX = 4;
        };
        
        // only have robo serve when single player
        if (multiplayerMode) {
            // set this to true so that the click event handler for the red player to serve meets the condition
            redIsServing = true;
        } else if (!multiplayerMode) {
            setTimeout(() => {
                function getRandomNumberBetween(min,max){
                    return Math.floor(Math.random()*(max-min+1)+min);
                }
                ballSpeedY = getRandomNumberBetween(-8, 8);
                
                computerServe();
            }, 1500);
        }
    // hold the puck until you click to serve
    } else if (ballSpeedX >= 0){ // paddle 1 scored
        ballSpeedX = 0;
        ballX = (25 + PADDLE_THICKNESS);

        ballY = mousePosBlue.y;

        let mouseMoveBall = function(evt) {
            ballY = mousePosBlue.y;
        };

        let shootBall = function(evt) {
            // ballSpeedX = -7;
            ballSpeedX = -3;
            function getRandomNumberBetween(min,max){
                return Math.floor(Math.random()*(max-min+1)+min);
            }
            // ballSpeedY = getRandomNumberBetween(-8, 8);
            ballSpeedY = 0;
            canvas.removeEventListener('mousemove', mouseMoveBall);
            canvas.removeEventListener('click', shootBall);
        };
        
        if (playerColor === 'blue') {
            canvas.addEventListener('click', shootBall);
            canvas.addEventListener('mousemove', mouseMoveBall);
        }
    }
} // ballReset()

function drawEverything() {
    // blanks the screen black
    colorRect(0, 0, canvas.width, canvas.height, 'black');
    
    // blacks the screen at the end of the game and tells who won
    if(showingWinScreen) {
        canvasContext.fillStyle = 'white';

        if(player1Score >= WINNING_SCORE){
            canvasContext.fillText("You won!", 340, 200);
        }
        else if(player2Score >= WINNING_SCORE) {
            canvasContext.fillText("Robo Won", 340, 200);
        }
        
        canvasContext.fillText("click to play again", 305, 500);
        canvas.addEventListener('click', handleMouseClick);
        return;
    }

    drawNet();
    
    // draws the ball
    // the puck's position will be updated above when this information is transferred through update method
    // only the logic dealing with changing the puck's position and velocty should be conditioned to only execute with one player
    if (redIsServing) {
        ballY = mousePosRed.y;
    }

    colorCircle(ballX, ballY, 10, 'yellow');

    //left player paddle
    colorPaddle(PADDLE_THICKNESS, 20, paddle1Y, 20, paddle1Y + PADDLE_HEIGHT , 'blue');
    
    //right computer paddle
    colorPaddle(PADDLE_THICKNESS, canvas.width - (PADDLE_THICKNESS + 10), paddle2Y, canvas.width - (PADDLE_THICKNESS + 10), paddle2Y + PADDLE_HEIGHT , 'red');
    
    canvasContext.fillStyle = 'white';
    canvasContext.fillText(player1Score, 100, 100);
    canvasContext.fillText(player2Score, canvas.width - 100, 100);

} // drawEverything()

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

// while on the black screen when you receive the scores, this fxn allows the player to click to restart the game
function handleMouseClick(evt) {
    if(showingWinScreen) {
        player1Score = 0;
        player2Score = 0;
        // ballSpeedX = 0;
        // ballSpeedY = 0;
        showingWinScreen = false;
        ballReset();
        canvas.removeEventListener('click', handleMouseClick);
    }
}
    
function computerMovement() {
    var paddle2YCenter = paddle2Y + (PADDLE_HEIGHT / 2);
    if(paddle2YCenter < ballY) {
        paddle2Y += paddleMovement;
    }else if (paddle2YCenter > ballY){
        paddle2Y -= paddleMovement;
    }
}
    
function drawNet() {
    for(let i = 0; i < canvas.height; i+=40) {
        colorRect(canvas.width/2-1, i, 4, 20, 'pink');
    }
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

// Since Async Clipboard API is not supported for all browser!
function copyToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
      console.log('Copying text command was ' + msg);
    } catch (err) {
      console.log('Oops, unable to copy');
    }
  
    document.body.removeChild(textArea);
}