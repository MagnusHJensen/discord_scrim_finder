const express = require('express')
const app = express();
const { Pool, Client} = require('pg')
const creds = require("../creds/creds");
const serverHandler = require("./handlers/serverHandler.js");
const matchHandler = require("./handlers/matchHandler.js");

const pool = new Pool({
    user: creds.user,
    host: creds.host,
    database: creds.db,
    password: creds.password,
    port: creds.port
});

// Body Parser
app.use(express.json());
app.use(express.urlencoded({extended: false}));


app.get("/api/accounts", (req, res) => {
    pool
        .connect()
        .then(dbclient => {
            dbclient
                .query("Select * from accounts")
                .then((result) => {
                    const o = {}
                    const data = result.rows;
                    data.forEach((account ,index) => {
                        console.log("New account")
                        let data = {
                            name: `${account.username_discord}`,
                            id: `${account.id}`,
                            elo: `${account.elo}`
                        }
                        o[index] = []
                        o[index].push(data)
                    })
                    res.json(o)
                })
                .catch(e => console.error(e))
        })
        .catch(e => console.error(e))
});

app.post("/api/server/send/data", (req, res) => {
    const serverid = req.header('serverid');
    console.log(req.body);
    res.send(req.body);
})

app.post("/api/server/create", async (req, res) => {
    const serverid = req.header('serverid');
    let stats = req.body;
    let ip = stats.ip;
    let port = stats.port;

    let created = await serverHandler.serverCreate(serverid, ip, port);
    if (created) {
        console.log("Server created succesfully.")
    } else {
        console.log("Something went wrong in creating the server, or it already existed.")
    }
    
});

app.post("/api/server/match/end", async (req, res) => {
    const serverid = req.header("serverid");
    let endedMatch = await matchHandler.matchEnd(serverid)
    console.log("Ending the match with ID: " + endedMatch.match_id);
    res.send(req.body);
})

app.post("/api/server/match/heartbeat", async (req, res) => {
    const serverid = req.header("serverid");
    const status = req.header("status");
    console.log("Server: " + serverid + " has the status: " + status);
    res.send(req.body);
})

app.post("/api/match/create", async (req, res) => {
    console.log(req.body.todo);
    res.send(req.body);
})

app.post("/api/match/round/end", async (req, res) => {
    console.log(`Counter Terroist score: ${req.body.ct_score}`);
    console.log(`Terroist score: ${req.body.t_score}`);
    res.send(req.body);
})

app.post("/api/match/player/update", async (req, res) => {
    console.log(req.body);
    res.send(req.body);
})

app.listen(8000, ()=>{
    console.log("Example app listening on port 8000");
})

