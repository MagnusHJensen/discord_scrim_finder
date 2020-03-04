const express = require('express')
const app = express();
const { Pool, Client} = require('pg')
const creds = require("../creds/creds");

const pool = new Pool({
    user: creds.user,
    host: creds.host,
    database: creds.db,
    password: creds.password,
    port: creds.port
})

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
    console.log(req.body)
    res.send(req.body)
})

app.post("/api/server/create", (req, res) => {
    const serverid = req.header('serverid');
    let stats = req.body;
    let ip = stats.ip;
    let port = stats.port;
    pool
    .connect()
    .then(client => {
        client
        .query(`select * from servers where server_id = ${serverid}`)
        .then((dbresult) => {
            const data = dbresult.rows;
            if (data[0] != null)
            {
                console.log("This server is already in the database.");
            } else {
                console.log("A wild server has appeared");
                client
                .query(`insert into servers (ip, port, available) VALUES ('${ip}', '${port}', true)`)
                .then(() => {
                    console.log("The wild server has been put in the database.");
                })
                .catch(e => console.error(e))
            }
        })
        .catch(e => console.error(e))
    })
    .catch(e => console.error(e))
});

app.listen(8000, ()=>{
    console.log("Example app listening on port 8000");
})