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
                'ball': 1,
                'clients': []
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
            if (game.clients.length > 2) {
                // two players max
                return;
            }
            const color = {'0': 'red', '1': 'blue'}[game.clients.length];
            game.clients.push({
                'clientId': clientId,
                'color': color
            });

            //start the game
            if (game.clients.length === 2) updateGameState();

            const payload = {
                'method': 'join',
                'game': game
            };

            // look through all the clients and tell them another player has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payload));
            });
        }

        // a user plays
        // once a player moves the paddle, that info is sent to the server here to update the state and send it back to the other player.
        // if (result.method === 'play') {
        //     const clientId = result.clientId;
        //     const gameId = result.gameId;
        //     const playerColor = result.playerColor;
        //     const paddle1Y = result.paddle1Y;
        //     const paddle2Y = result.paddle2Y;
        //     let state = {};
            
        //     try {
        //         state = games[gameId].state;
        //     } catch (TypError) {
        //         state = {}
        //     };
            
        //     state['playerColor'] = playerColor;
        //     // only update your own paddle position so that you don't affect the other player when the state updates.
        //     if (playerColor === 'red') {
        //         // not sure if it should be state['paddle1Y'] with the quotes
        //         state.paddle1Y = paddle1Y;
        //     } else if (playerColor === 'blue') {
        //         state.paddle2Y = paddle2Y;
        //     }

        //     games[gameId].state = state;
        // }
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
        const game = games[g]
        const payLoad = {
            "method": "update",
            "game": game
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