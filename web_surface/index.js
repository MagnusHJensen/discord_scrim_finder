const express = require('express')
const app = express();
const { Pool, Client} = require('pg')
const creds = require("../creds");

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

app.listen(8000, ()=>{
    console.log("Example app listening on port 8000");
})