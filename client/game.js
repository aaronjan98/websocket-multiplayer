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
var multiplayerMode = false;
var mousePos;

// HTML elements
let clientId = null;
let gameId = null;
let playerColor = null;
let ws = new WebSocket('ws://localhost:9090');
const btnCreate = document.getElementById('btnCreate');
const btnJoin = document.getElementById('btnJoin');
const txtGameId = document.getElementById('txtGameId');
const divPlayers = document.getElementById('divPlayers');
const divBoard = document.getElementById('divBoard');

// wiring events
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

btnCreate.addEventListener('click', e => {

    const payload = {
        'method': 'create',
        'clientId': clientId
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

    // update
    if (response.method === 'update') {
        // use information from this response from the server to update the game to match the changes that my other opponent made

        let cstate = response.game;
        // console.log('update ballX: ', cstate.ballX);

        // updating paddle position for player who didn't move that paddle
        let color = cstate.playerColor;
        if (color === 'red') {
            paddle1Y = cstate.paddle1Y - (PADDLE_HEIGHT/2);
        } else if (color === 'blue') {
            paddle2Y = cstate.paddle2Y - (PADDLE_HEIGHT/2);
        }

        // update ball position and speed
        ballX = cstate.ballX;
        ballY = cstate.ballY;
        // ballSpeedX = cstate.ballSpeedX;
        // ballSpeedY = cstate.ballSpeedY;
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
            /* visual confirmation that the user is connected */
            // const d = document.createElement('div');
            // d.style.width = '200px';
            // d.style.background = c.color;
            // d.textContent = c.clientId;
            // divPlayers.appendChild(d);

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

    /****************** Render the entire canvas below ******************/

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
    
    // ? function to restart the game
    function handleMouseClick(evt) {
        if(showingWinScreen) {
            player1Score = 0;
            player2Score = 0;
            showingWinScreen = false;
        }
    }
    
    // play
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
            let eventMousePos = calculateMousePos(evt);
            if(eventMousePos.x !== null || eventMousePos.x !== undefined) {
                mousePos = eventMousePos;
            }
        });
    
        // position of the ball before the initial serve
        ballX = (30 + PADDLE_THICKNESS);
    
        // calibrating ballY position
        let puckResetPosition = function(evt) {
            ballY = paddle1Y + PADDLE_HEIGHT / 2;
        };
    
        let shootBall = function(evt) {
            ballSpeedX = -7;
            function getRandomNumberBetween(min,max){
                return Math.floor(Math.random()*(max-min+1)+min);
            }
            ballSpeedY = getRandomNumberBetween(-8, 8);
            canvas.removeEventListener('mousemove', puckResetPosition);
            canvas.removeEventListener('click', shootBall);
        };
        
        canvas.addEventListener('click', shootBall);
        canvas.addEventListener('mousemove', puckResetPosition);
    }
    
    function ballReset() {
        if(player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
            showingWinScreen = true;
        }
    
        // to reset the puck, it can't be traveling in the y-direction
        ballSpeedY = 0;
        
        // to reset the puck you have to know which direction the point made it to, which you can tell with the negative and positive x-directional speed of the puck.
        if(ballSpeedX < 0){ // paddle 2
            ballSpeedX = 0;
            ballX = canvas.width - (PADDLE_THICKNESS + 30);
    
            let positionServe = function(evt) {
                ballY = 300;
            };
    
            let computerServe = function(evt) {
                ballSpeedX = 7;
            };
            
            positionServe();

            //* This logic is meant for the AI; I'll have to think about switching it to multi-player
            setTimeout(() => {
                function getRandomNumberBetween(min,max){
                    return Math.floor(Math.random()*(max-min+1)+min);
                }
                ballSpeedY = getRandomNumberBetween(-8, 8);
                
                computerServe();
            }, 1500)
        // hold the puck until you click to serve
        } else if (ballSpeedX >= 0){ // paddle 1
            ballSpeedX = 0;
            ballX = (25 + PADDLE_THICKNESS);
    
            //! this is the culprit (maybe) for the weird puck mms.
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
    
    //? why is this here?
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
        
        if(!multiplayerMode) {
            computerMovement();
        }
    
        //? what was i thinking when writing this?
        ballX += ballSpeedX;
        ballY += ballSpeedY;
    
        //adjust the ball bounce from the paddles
        if (ballX <= (PADDLE_THICKNESS + 15)) {
            if (ballY > (paddle1Y-20) && ballY < paddle1Y+PADDLE_HEIGHT+20) {
                
                if(Math.abs(ballSpeedX) < 15) {
                    ballSpeedX = -ballSpeedX * 1.07;
                } else {
                    ballSpeedX = -ballSpeedX * 1;
                }
    
                var deltaY = ballY - (paddle1Y+PADDLE_HEIGHT/2);
                ballSpeedY = deltaY * 0.15;
            } else {
                player2Score++;
                ballReset();
            }
        }
        else if (ballX >= (canvas.width - (PADDLE_THICKNESS + 15))) {
            if(ballY > (paddle2Y-20) && ballY < paddle2Y+PADDLE_HEIGHT+20) {
                ballSpeedX = -ballSpeedX;
    
                var deltaY = ballY - (paddle2Y+PADDLE_HEIGHT/2);
                ballSpeedY = deltaY * 0.15;
            }else {
                player1Score++;
                ballReset();
            }
        }

        // puck changes direction when bumping up the walls
        if(ballY < 0){
            ballSpeedY = -ballSpeedY;
        }
        if(ballY > canvas.height) {
            ballSpeedY = -ballSpeedY;
        }
    
        // as the puck increase speed in the y-direction, the computer paddle increase mm.
        // if(Math.abs(ballSpeedY) > 6) {
        //     paddleMovement = 6;
        // }else if(Math.abs(ballSpeedY) > 4 && Math.abs(ballSpeedY) <= 6){
        //     paddleMovement = 6;
        // }else if(Math.abs(ballSpeedY) > 3 && Math.abs(ballSpeedY) <= 4){
        //     paddleMovement = 5.5;
        // }else if(Math.abs(ballSpeedY) >= 1 && Math.abs(ballSpeedY) <= 3){
        //     paddleMovement = 5;
        // }else if(Math.abs(ballSpeedY) > 0 && Math.abs(ballSpeedY) < 1){
        //     paddleMovement = 4;
        // }else if(Math.abs(ballSpeedY) === 0){
        //     paddleMovement = 3.5;
        // }
        // else if(Math.abs(ballSpeedY) == 0 && Math.abs(ballSpeedX) == 0){
        //     paddleMovement = 0;
        // }


        //* only send payload when playing multiplayer
        if(multiplayerMode) {
            
            if(!mousePos) return;
            
            // put logic to decide which player gets what paddle
            if (playerColor === 'red') {
                paddle1Y = mousePos.y - (PADDLE_HEIGHT/2);
            } else if (playerColor === 'blue') {
                paddle2Y = mousePos.y - (PADDLE_HEIGHT/2);
            }
            
            // send to the server the information that is needed to replicate the change that this event listener listened upon.
            let payload = {
                'method': 'play',
                'clientId': clientId,
                'gameId': gameId,
                'playerColor': playerColor,
                'paddle1Y': paddle1Y,
                'paddle2Y': paddle2Y,
                'ballX': ballX,
                'ballY': ballY,
                'ballSpeedX': ballSpeedX,
                'ballSpeedY': ballSpeedY
            }
            
            ws.send(JSON.stringify(payload));
        } else {
            // if not multiplayer, the person is always going to play player1
            paddle1Y = mousePos.y - (PADDLE_HEIGHT/2);
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
        colorPaddle(PADDLE_THICKNESS, 20, paddle1Y, 20, paddle1Y + PADDLE_HEIGHT , 'blue');
        
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