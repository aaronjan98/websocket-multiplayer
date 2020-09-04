const http = require('http');
// serve this page on another port with express
const express = require('express');
const app = express();
app.get('/', (req, res) => res.sendFile(__dirname + '/client/index.html'));
app.listen(9091, () => console.log('Listening on http port 9091'));

app.use(express.static('client'));

const websocketServer = require('websocket').server;
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log(`listening on 9090`));

let color = 'blue';

// hash map clients
const clients = {};
let games = {};

const wsServer = new websocketServer({
    'httpServer': httpServer
});

// websocketServer.broadcast = function(data, sender) {
//     websocketServer.clients.forEach(function(client) {
//       if (client !== sender) {
//         client.send(data);
//       }
//     })
// }

wsServer.on('request', request => {
    // connect
    const connection = request.accept(null, request.origin);
    connection.on('open', () => console.log('opened'));
    connection.on('close', () => console.log('closed'));

    connection.on('message', message => {
        // Data that the server receives
        const result = JSON.parse(message.utf8Data);
        // console.log('RESULT from message connection: ', result);

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
            // let ballSpeedX = result.ballSpeedX;
            // let ballSpeedY = result.ballSpeedY;
            let state = {};

            state = games[gameId].state;
            
            state.playerColor = playerColor;
            if (playerColor === 'blue') {
                state.ballX = ballX;
                state.ballY = ballY;
                // state.ballSpeedX = ballSpeedX;
                // state.ballSpeedY = ballSpeedY;
            } else if (playerColor === 'red') {
                state.ballX += 0;
                state.ballY += 0;
                // webSocketServer.broadcast(result.mousePosRed, ws);
                state.mousePosRed = result.mousePosRed;
                // state.ballSpeedX += ballSpeedX;
                // state.ballSpeedY += ballSpeedY;
            }

            // only update your own paddle position so that you don't affect the other player when the state updates.
            if (playerColor === 'blue') {
                state.paddle1Y = playerPaddle1Y+45;
            } else if (playerColor === 'red') {
                state.paddle2Y = playerPaddle2Y+45;
            }

            games[gameId].state = state;
            // console.log('GAMES: ', games);
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
        // console.log('game from server: ', game.state);
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