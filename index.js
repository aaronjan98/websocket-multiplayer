const http = require('http');

// serve this page on another port with express
const INDEX = '/public/index.html';
const PORT = process.env.PORT || 80;
let appListenPort = 8080;
const express = require('express');
const app = express();

app.get('/', (req, res) => res.sendFile(INDEX, { root: __dirname }))
app.listen(appListenPort, () => console.log(`App's listening on http port ${appListenPort}`));

app.use(express.static(__dirname + '/public'));

const websocketServer = require('websocket').server;
const httpServer = http.createServer();
httpServer.listen(PORT, () => console.log(`http server's listening on port ${PORT}`));

let color = 'blue';
let gameId;

// hash map clients
const clients = {};
let games = {};

const wsServer = new websocketServer({
    'httpServer': httpServer
});

wsServer.on('request', request => {
    // connect
    const connection = request.accept(null, request.origin);
    connection.on('open', () => console.log('opened'));
    connection.on('close', () => console.log('closed'));

    connection.on('message', message => {
        // Data that the server receives
        const result = JSON.parse(message.utf8Data);

        // I have received a message from the client
        // User wants to create a new game
        if (result.method === 'create') {
            const clientId = result.clientId;
            gameId = guid();
            games[gameId] = {
                'id': gameId,
                'clients': [],
                'state': {
                    'ballX': 35,
                    'ballY': 250,
                    'ballSpeedX': 0,
                    'ballSpeedY': 0,
                    'player1Score': 0,
                    'player2Score': 0,
                    'paddle1Y': 250,
                    'paddle2Y': 250,
                    'multiplayerMode': false,
                    'scoreBoard': false,
                    'redIsServing': false,
                    'blueIsServing': true,
                    'sendBallSpeedX': false,
                    'sendPlayAgain': false,
                    'mousePosBlue': {x: 250, y: 250},
                    'mousePosRed': {x: 250, y: 250}
                }
            }

            const payload = {
                'method': 'create',
                'game': games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payload));
        }

        // a client wants to join
        if (result.method === 'join') {
            const clientId = result.clientId;
            let gameId = result.gameId;
            let game = games[gameId];

            try {
                if ((game[clients]).length > 2) {
                    alert('No more than two players is allowed.');
                }
            } catch {
                // alert('Failed to join a multi-player game.');
            }

            color = {'0': 'blue', '1': 'red'}[game.clients.length];
            
            game.clients.push({
                'clientId': clientId,
                'color': color
            });

            // start the multi-player game
            if (game.clients.length === 2) {
                updateGameState();
            }

            const payload = {
                'method': 'join',
                'game': game
            };

            // look through all the clients and tell them another player has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payload));
            });
        }

        // once a player moves the paddle, that info is sent to the server here to update the state and send it back to all clients.
        if (result.method === 'play') {
            const gameId = result.gameId;
            let playerColor = result.playerColor;
            let playerPaddle1Y = result.paddle1Y;
            let playerPaddle2Y = result.paddle2Y;
            let ballX = result.ballX;
            let ballY = result.ballY;
            let ballSpeedX = result.ballSpeedX;
            let ballSpeedY = result.ballSpeedY;
            let state = {};

            state = games[gameId].state;
            state.playerColor = playerColor;
            
            // only update your own puck and paddle state so that you don't affect the other player when the state updates.
            if (playerColor === 'blue') {
                state.ballX = ballX;
                state.ballY = ballY;
                state.ballSpeedX = ballSpeedX;
                state.ballSpeedY = ballSpeedY;
                state.paddle1Y = playerPaddle1Y+45;
                state.player1Score = result.player1Score;
                state.player2Score = result.player2Score;
                state.redIsServing = result.redIsServing;
                state.scoreBoard = result.scoreBoard;
                state.winner = result.winner;
            } else if (playerColor === 'red') {
                state.mousePosRed = result.mousePosRed;
                state.sendBallSpeedX = result.sendBallSpeedX;
                state.sendPlayAgain = result.sendPlayAgain;
                state.paddle2Y = playerPaddle2Y+45;
            }

            games[gameId].state = state;
        }
    })

    connection.on('exit', code => console.log(`About to exit with code: ${code}`));

    // generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        'connection': connection
    };

    // response to the client connection
    const payload = {
        'method': 'connect',
        'clientId': clientId
    };
    // send back the client connect
    connection.send(JSON.stringify(payload));
});

function updateGameState(){
    // {"gameId", fasdfsf}
    for (const g of Object.keys(games)) {
        const game = games[g];

        const payLoad = {
            "method": "update",
            "game": game.state
        }

        game.clients.forEach(c=> {
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        })
    }

    setTimeout(updateGameState);
}

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();