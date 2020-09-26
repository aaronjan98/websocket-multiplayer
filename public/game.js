let canvas;
let mouseEventCanvas;
let canvasContext;
let ballX = 345;
let ballY = 250;
let ballSpeedX = 0;
let ballSpeedY = 0;

var player1Score = 0;
var player2Score = 0;
const WINNING_SCORE = 3;
var winner = null;
var count = 0;

let paddle1Y = 250;
let paddle2Y = 250;
let paddleMovement = 4;
const PADDLE_THICKNESS = 10;
const PADDLE_HEIGHT = 90;

var scoreBoard = false;
var multiplayerMode = false;
var redIsServing = false;
var blueIsServing = true;
var sendBallSpeedX = false;
var sendPlayAgain = false;
var mousePosBlue = {x: 250, y: 250};
var mousePosRed = {x: 250, y: 250};

let clientId = null;
let gameId = null;
let game = null;
let playerColor = 'blue';
var motionTrailLength = 30;
var positions = [];

let protocol = location.protocol.replace(/^http/, 'ws').replace(/^https/, 'ws');
// retrieve gameId from URL parameters
const url = new URL(window.location.href);
let myURL;
var paddle2YCenter;

var requestAnimationFrame = window.requestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.msRequestAnimationFrame;

// let ws = new WebSocket('ws://localhost:80');
let ws = new WebSocket(`${protocol}//websocket-multiplayer-pong.herokuapp.com`);

// HTML elements
// const btnCreate = document.getElementById('btnCreate');
const copyLink = document.getElementsByClassName('copyLink')
const txtGameId = document.getElementById('txtGameId');
const divPlayers = document.getElementById('divPlayers');
const divBoard = document.getElementById('divBoard');

for (var i = 0; i < copyLink.length; i++) {
    copyLink[i].addEventListener('click', copyInviteLink, false);
}

function copyInviteLink() {
    copyToClipboard(myURL.href);

    divPlayers.style.opacity = 1;
    divPlayers.style.width = '100vw';
    divPlayers.style.height = '30px';
    divPlayers.style.background = '#05ab74';
    divPlayers.style.justifyContent = 'center';
    divPlayers.style.alignItems = 'center';
    divPlayers.textContent = 'copied ✔️';
    setTimeout(() => {
        divPlayers.style.opacity = 0;
    }, 4000);
}

// wiring events
async function joinNewMultiplayerGame() {
    
    // function getClientLength() {
    //     return new Promise((resolve, reject) => {
    //         resolve(game.clients.length);
    //     })
    // }
    // console.log('game.clients.length: ', game);
    // try {
        
    //     if (numClients === 1) {
    //         numClients = await getClientLength();
    //         console.log('close existing connection');
    //         // ws.close(1000, "Closing Connection Normally");
    //         // Close the WebSocket connection
    //         multiplayerMode = false;
    //     }
    // } catch (TypeError) {
    //     multiplayerMode = false;
    // }

    // only for red player
    if (url.search.length) {
        gameId  = url.searchParams.get('');
    // if there aren't any params, then the player is going to host the game
    } else if (url.search.length === 0) {
        gameId = gameId;
    }

    const joinPayload = {
        'method': 'join',
        'clientId': clientId,
        'gameId': gameId
    }

    ws.send(JSON.stringify(joinPayload));
};

// function ping() {
//     if (multiplayerMode) {
//         ws.send('__ping__');
//         tm = setTimeout(function () {
//             console.log('connection closed');
//             divPlayers.style.background = '#d91403';
//             divPlayers.textContent = 'connection closed';
//             divPlayers.style.opacity = 1;
//             multiplayerMode = false;
//         }, 5000);
//     }
//     divPlayers.style.opacity = 0;
// }

// function pong() {
//     clearTimeout(tm);
// }

// ws.onopen = function () {
//     setInterval(ping, 30000);
// }

// when the server sends the client a message
ws.onmessage = async message => {
    // check if connectin is lost
    // var msg = message.data;
    // if (multiplayerMode && msg == '__pong__') {
    //     pong();
    //     return;
    // }
    
    // string server sends: message.data
    function response_fxn() {
        return new Promise((resolve, reject) => {
            resolve(JSON.parse(message.data));
        })
    }

    const response = await response_fxn();

    function connect_fxn() {
        return new Promise((resolve, reject) => {
            resolve(response.clientId);
        })
    }

    async function connect_async_fxn() {
        try {
            clientId = await connect_fxn();
            // if receiving an invitation link, have the client join automatically
            const createPayload = {
                'method': 'create',
                'clientId': clientId
            }
            ws.send(JSON.stringify(createPayload));
        } catch (error) {
            console.log("ooops ", error);
        }
    }

    // Connect Method: save clientId in global name space
    if (response.method === 'connect') {
        connect_async_fxn();
        console.log('Client ID set successfully: ' + clientId);
        console.log('connect response: ', response);
    }

    // create
    if (response.method === 'create') {
        gameId = await response.game.id;
        console.log('Game successfully created with ID: ' + gameId);

        // create shareable url for multiplayer game
        myURL = new URL('https://multiplayer-pong.netlify.app/');
        // myURL = new URL('http://localhost:8080/');

        myURL.searchParams.set('', gameId);
        txtGameId.defaultValue = myURL.href;

        joinNewMultiplayerGame();
    }

    // join
    if (response.method === 'join') {
        console.log('response when joining: ', response);
        game = await response.game;

        // resetting game state for multiplayer
        if (game.clients.length === 2) {
            multiplayerMode = true;
            ballX = (25 + PADDLE_THICKNESS);
            ballY = 250;
            ballSpeedX = 0;
            ballSpeedY = 0;
            player1Score = 0;
            player2Score = 0;
            paddle1Y = mousePosBlue.y;
            paddle2Y = mousePosRed.y;
            scoreBoard = false;
            redIsServing = false;
            blueIsServing = true;
            sendBallSpeedX = false;
            sendPlayAgain = false;
            mousePosBlue = {x: 250, y: 250};
            mousePosRed = {x: 250, y: 250};
        }

        game.clients.forEach(c => {
            // c.color is the personal color so this makes it dynamic
            if (c.clientId === clientId) {
                playerColor = c.color;
            }
        });
    }

    // update
    if (response.method === 'update' && multiplayerMode) {
        // use information from this response from the server to update the game to match the changes that my other opponent made
        let cstate = await response.game;

        // updating paddle position for player who didn't move that paddle
        if (playerColor === 'blue') {
            mousePosRed = cstate.mousePosRed;
            paddle2Y = cstate.paddle2Y - (PADDLE_HEIGHT/2);
            sendBallSpeedX = cstate.sendBallSpeedX;
            sendPlayAgain = cstate.sendPlayAgain;
        } else if (playerColor === 'red') {
            paddle1Y = cstate.paddle1Y - (PADDLE_HEIGHT/2);
            ballX = cstate.ballX;
            ballY = cstate.ballY;
            ballSpeedX = cstate.ballSpeedX;
            ballSpeedY = cstate.ballSpeedY;
            redIsServing = cstate.redIsServing;
            player1Score = cstate.player1Score;
            player2Score = cstate.player2Score;
            scoreBoard = cstate.scoreBoard;
            winner = cstate.winner;
        }
    }
}

/****************** Render the entire canvas below ******************/
 
// play
window.onload = function() {
    mouseEventCanvas = document.getElementById('mouseEventCanvas');
    canvas = document.getElementById('gameCanvas');
    canvasContext = canvas.getContext("2d");
    canvasContext.fillStyle = 'pink';
    canvasContext.font = "70px arcadeclassic";

    function redServes(e) {
        sendBallSpeedX = true;
        redIsServing = false;
        mouseEventCanvas.removeEventListener('click', redServes);
    }

    function blueServes(e) {
        blueIsServing = false;
        ballSpeedX = 5;
        function getRandomNumberBetween(min,max){
            return Math.floor(Math.random()*(max-min+1)+min);
        }
        ballSpeedY = getRandomNumberBetween(-4, 4);
        mouseEventCanvas.removeEventListener('click', blueServes);
    }

    function mainGameLoop() {
        moveEverything();
        playMethod();
        drawEverything();

        if (playerColor === 'red' && redIsServing && !scoreBoard) {
            mouseEventCanvas.addEventListener('click', redServes);
        } else if (playerColor === 'blue' && blueIsServing && !scoreBoard) {
            ballY = mousePosBlue.y;
            mouseEventCanvas.addEventListener('click', blueServes);
        };

        requestAnimationFrame(mainGameLoop);
    };
    requestAnimationFrame(mainGameLoop);

    mouseEventCanvas.addEventListener('mousemove', function(e) {
        let eventMousePos = calculateMousePos(e);

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
    ballX = (25 + PADDLE_THICKNESS);
} // window onload

function moveEverything() {
    // put logic to decide which player controls what paddle
    if (playerColor === 'blue') {
        if (mousePosBlue !== undefined) {
            paddle1Y = mousePosBlue.y - (PADDLE_HEIGHT/2);
        }
    } else if (playerColor === 'red') {
        if (mousePosRed !== undefined) {
            paddle2Y = mousePosRed.y - (PADDLE_HEIGHT/2);
        }
    }
    
    if (!multiplayerMode) {
        computerMovement();
    }

    if (scoreBoard) {
        return;
    }

    if (playerColor === 'blue') {
        // serving red player's puck
        if (redIsServing && sendBallSpeedX) {
            ballSpeedX = -5;
            function getRandomNumberBetween(min,max){
                return Math.floor(Math.random()*(max-min+1)+min);
            }
            ballSpeedY = getRandomNumberBetween(-4, 4);
            sendBallSpeedX = false;
            redIsServing = false;
        }
        
        // incrementing puck position by its components speeds to appear speeding up
        ballX += ballSpeedX;
        ballY += ballSpeedY;

        // adjust the ball bounce from the paddles
        // left side of the canvas
        if ((ballX - 10) < (PADDLE_THICKNESS + 15)) {
            // inside paddle
            if (ballY > (paddle1Y-15) && ballY < paddle1Y+PADDLE_HEIGHT+15) {
                if (Math.abs(ballSpeedX) < 15) {
                    ballSpeedX = -ballSpeedX * 1.07;
                } else {
                    ballSpeedX = -ballSpeedX * 1;
                }

                var deltaY = ballY - (paddle1Y+PADDLE_HEIGHT/2);
                ballSpeedY = deltaY * 0.15;
            // // show the puck missing the paddle by it continuing to move beyond the paddle
            // } else if ((ballX - 10) > -10) {
            //     return;
            // outside of paddle, red scores
            } else {
                player2Score++;
                ballReset();
            }
        } // right side of the canvas
        else if ((ballX + 10) > (canvas.width - (PADDLE_THICKNESS + 15))) {
            if (ballY > (paddle2Y-15) && ballY < paddle2Y+PADDLE_HEIGHT+15) {
                ballSpeedX = -ballSpeedX;
                var deltaY = ballY - (paddle2Y+PADDLE_HEIGHT/2);
                ballSpeedY = deltaY * 0.15;
            // // show the puck missing the paddle by it continuing to move beyond the paddle
            // } else if ((ballX + 10) < canvas.width+10) {
            //     return;
            } else {
                player1Score++;
                ballReset();
            }
        }

        // puck changes direction when bumping up the walls
        if ((ballY-10) < 0) {
            ballSpeedY = -ballSpeedY;
        }
        if ((ballY+10) > canvas.height) {
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
    }
} // moveEverything()

function playMethod() {
    if (multiplayerMode) {
        sendPlayPayload();
    } else {
        // if not multiplayer, the person is always going to play player1
        paddle1Y = mousePosBlue.y - (PADDLE_HEIGHT/2);
    }
}

async function sendPlayPayload() {
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
            'player2Score': player2Score,
            'scoreBoard': scoreBoard,
            'winner': winner
        }
        
        await ws.send(JSON.stringify(payload));
    } else if (playerColor === 'red') {
        let payload = {
            'method': 'play',
            'clientId': clientId,
            'gameId': gameId,
            'playerColor': playerColor,
            'paddle2Y': paddle2Y,
            'sendBallSpeedX': sendBallSpeedX,
            'sendPlayAgain': sendPlayAgain,
            'mousePosRed': mousePosRed
        }
        
        await ws.send(JSON.stringify(payload));            
        sendBallSpeedX = false;
        sendPlayAgain = false;
    }
}
    
function ballReset() {
    // game is played to 11 points if the player ahead is 2 points or above
    if (player1Score >= WINNING_SCORE && (player1Score - player2Score >= 2)) {
        winner = 'blue';
        scoreBoard = true;
    }
    if (player2Score >= WINNING_SCORE && (player2Score - player1Score >= 2)) {
        winner = 'red';
        scoreBoard = true;
    }

    // to reset the puck, it can't be traveling in the y-direction
    ballSpeedY = 0;
    
    // to reset the puck you have to know which direction the point made it to, which you can tell with the negative and positive x-directional speed of the puck.
    if (ballSpeedX < 0) { // paddle 2 scores
        ballSpeedX = 0;
        ballX = canvas.width - (PADDLE_THICKNESS + 25);

        // after the robo scores, the puck should reset in the middle of the canvas where the ai paddle will follow
        if (multiplayerMode) {
            // ballY = paddle2Y + (PADDLE_HEIGHT / 2);
            ballY = mousePosRed.y;
        } else if (!multiplayerMode) {
            ballY = canvas.height / 2;
        }

        // set this to true so that the click event handler for the red player to serve meets the condition
        redIsServing = true;

        if (!multiplayerMode && !scoreBoard) {
            let computerServe = function(e) {
                ballSpeedX = 5;
            };
            
            setTimeout(() => {
                function getRandomNumberBetween(min,max) {
                    return Math.floor(Math.random()*(max-min+1)+min);
                }
                ballSpeedY = getRandomNumberBetween(-4, 4);
                
                computerServe();
            }, 1500);
        }
    // hold the puck until you click to serve
    } else if (ballSpeedX >= 0) { // paddle 1 scored
        blueIsServing = true;
        redIsServing = false;
        ballSpeedX = 0;
        ballX = (25 + PADDLE_THICKNESS);
        ballY = mousePosBlue.y;
    }
} // ballReset()

function drawEverything() {
    if (scoreBoard) {
        canvasContext.filter = 'blur(4px)';

        // if (navigator.userAgent.indexOf("Safari") != -1) {
        //     canvasContext.globalAlpha = 0.2;
        // }
    }

    // blanks the screen black
    colorRect(0, 0, canvas.width, canvas.height, 'black');

    // the scores are rendered before the puck so that it doesn't block the players' view.
    canvasContext.fillStyle = '#00008B';
    canvasContext.fillText(player1Score, 100, 100);
    canvasContext.fillStyle = '#8D0101';
    canvasContext.fillText(player2Score, canvas.width - 130, 100);
    
    // draws the ball
    // the puck's position will be updated above when this information is transferred through update method
    // only the logic dealing with changing the puck's position and velocity should be conditioned to only execute with one player
    if (redIsServing && playerColor === 'blue' && multiplayerMode) {
        ballY = mousePosRed.y;
    } else if (blueIsServing && playerColor === 'blue') {
        ballY = mousePosBlue.y;
    }

    // draw the trail for the puck
    for (var i = 1; i < positions.length; i++) {
        var ratio = i / positions.length;
        canvasContext.beginPath();
        canvasContext.arc(positions[i].x, positions[i].y, i/(positions.length/10), 0, Math.PI*2, true);
        canvasContext.fillStyle = "rgba(27, 2, 163, " + ratio / 2 + ")";
        canvasContext.fill();
    }

    colorCircle(ballX, ballY, 10, 'yellow');

    // store the puck position to be used for the trail
    storeLastPosition(ballX, ballY);

    //left player paddle
    colorPaddle(PADDLE_THICKNESS, 20, paddle1Y, 20, paddle1Y + PADDLE_HEIGHT , '#440BD4');
    
    //right computer paddle
    colorPaddle(PADDLE_THICKNESS, canvas.width - (PADDLE_THICKNESS + 10), paddle2Y, canvas.width - (PADDLE_THICKNESS + 10), paddle2Y + PADDLE_HEIGHT , '#800000');

    // blacks the screen at the end of the game and tells who won
    if (scoreBoard) {
        canvasContext.fillStyle = 'pink';
        canvasContext.filter = 'blur(0px)';
        // if (navigator.userAgent.indexOf("Safari") != -1) {
        //     canvasContext.globalAlpha = 0;
        // }

        if (multiplayerMode) {
            if (winner === 'blue' && playerColor === 'blue') {
                canvasContext.fillText("You   Won", 235, 150);
            } else if (winner === 'blue' && playerColor === 'red') {
                canvasContext.fillText("You   Lost", 230, 150);
            }
            if (winner === 'red' && playerColor === 'red') {
                canvasContext.fillText("You   Won", 235, 150);
            } else if (winner === 'red' && playerColor === 'blue') {
                canvasContext.fillText("You   Lost", 230, 150);
            }
        } else if (!multiplayerMode) {
            if (winner === 'blue') {
                canvasContext.fillText("You   Won", 235, 150);
            }
            if (winner === 'red') {
                canvasContext.fillText("Robo   Won", 225, 150);
            }
        }
        
        canvasContext.font = "40px arcadeclassic";
        canvasContext.fillText("click   to   play   again", 175, 450);
        canvasContext.font = "70px arcadeclassic";

        // if red player touched to play again, that is indicated in the var sendPlayAgain
        if (playerColor === 'blue' && sendPlayAgain) {
            player1Score = 0;
            player2Score = 0;
            scoreBoard = false;
            sendPlayAgain = false;
        }
        mouseEventCanvas.addEventListener('click', handleMouseClick);
    }
} // drawEverything()

function calculateMousePos(e) {
    var mouseX = e.offsetX;
    var mouseY = e.offsetY;
    return {
        x: mouseX,
        y: mouseY+10
    };
}

// while on the black screen when you receive the scores, this fxn allows the player to click to restart the game
function handleMouseClick(e) {
    if (playerColor === 'red') {
        sendPlayAgain = true;
    }

    player1Score = 0;
    player2Score = 0;
    scoreBoard = false;
    
    mouseEventCanvas.removeEventListener('click', handleMouseClick);

    // setTimeout for robo to shoot starts after scoreBoard is exited
    if (!multiplayerMode && redIsServing) {
        console.log('robo served');
        redIsServing = false;

        let computerServe = function(e) {
            ballSpeedX = -5;
        };
        
        setTimeout(() => {
            function getRandomNumberBetween(min,max){
                return Math.floor(Math.random()*(max-min+1)+min);
            }
            ballSpeedY = getRandomNumberBetween(-4, 4);
            
            computerServe();
        }, 1500);
    }
}
    
function computerMovement() {
    if (scoreBoard) {
        paddle2Y = canvas.height / 2 - (PADDLE_HEIGHT / 2);
    } else {
        paddle2YCenter = paddle2Y + (PADDLE_HEIGHT / 2);
        if (paddle2YCenter < ballY) {
            paddle2Y += paddleMovement;
        } else if (paddle2YCenter > ballY) {
            paddle2Y -= paddleMovement;
        }
    }
}

function colorRect(leftX, topY, width, height, drawColor) {
    canvasContext.shadowColor = 'BLACK';
    canvasContext.shadowBlur = 50;
    canvasContext.shadowOffsetX = 1;
    canvasContext.shadowOffsetY = 1;
    
    canvasContext.globalCompositeOperation='source-over';
    canvasContext.rect(1, 1, 698, 498);
    canvasContext.fillStyle = "#bc00fe";
    canvasContext.fill();
    canvasContext.lineWidth = 5;
    canvasContext.strokeStyle = "#1B02A3";
    canvasContext.stroke();

    // no shadow
    canvasContext.shadowColor = null;
    canvasContext.shadowBlur = 0;
    canvasContext.shadowOffsetX = 0;
    canvasContext.shadowOffsetY = 0;
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
    // canvasContext.fillStyle = drawColor;
    canvasContext.beginPath();
    canvasContext.arc(centerX, centerY, radius, 0, Math.PI*2, true);
    canvasContext.fillStyle = 'rgb(255, 255, 0)';
    canvasContext.fill();
}

function storeLastPosition(ballX, ballY) {
    // push an item
    positions.push({
      x: ballX,
      y: ballY
    });
   
    //get rid of first item
    if (positions.length > motionTrailLength) {
      positions.shift();
    }
}

// Since Async Clipboard API is not supported for all browser!
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    .then(() => { console.log(`Copied: ${text}`) })
    .catch((error) => { console.log(`Copy failed! ${error}`) });
}