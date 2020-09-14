/* * from [Heroku](https://devcenter.heroku.com/articles/node-websockets)
const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });
*/
// const PORT = process.env.PORT || 3000;
// const INDEX = '/index.html';

// const server = express()
// .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
// .listen(PORT, () => console.log(`Listening on ${PORT}`));

const http = require('http');

// serve this page on another port with express
const INDEX = '/public/index.html';
const PORT = process.env.PORT || 80;
const express = require('express');
const app = express();
// app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/', (req, res) => res.sendFile(INDEX, { root: __dirname }))
app.listen(9000, () => console.log(`Listening on http port ${9000}`));

// app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));

const websocketServer = require('websocket').server;
const httpServer = http.createServer();
httpServer.listen(PORT, () => console.log(`listening on ${PORT}`));

let color = 'blue';

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
            const gameId = guid();
            games[gameId] = {
                'id': gameId,
                'clients': [],
                'state': {}
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
            const gameId = result.gameId;
            let game = games[gameId];

            try {
                if ((game[clients]).length > 2) {
                    // two players max
                    alert('No more than two players is allowed.');
                }
            } catch {
                // pass
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
            state.redIsServing = result.redIsServing;
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

    //{"gameid", fasdfsf}
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