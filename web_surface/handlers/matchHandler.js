const { Pool, Client} = require('pg');
const creds = require("../../creds/creds");
const pool = new Pool({
    user: creds.user,
    host: creds.host,
    database: creds.db,
    password: creds.password,
    port: creds.port
});

async function matchEnd(serverid) {
    return new Promise(async (res, rej) => {
        let dbclient = await pool.connect();
        let matchId = await matchFind(dbclient, serverid)
        let result = await matchId;
        res(result);
    })
}

async function matchFind(dbclient, serverid) {
    return new Promise(async (res, rej) => {
        let match = await dbclient.query(`select * from matches where server_id = '${serverid}'`);
        let matchData = await match.rows[0];
        let matchId = await matchData.match_id
        console.log("Match found with Match ID: " + matchId);
        res(matchData); 
    })
}





module.exports = {
    matchEnd
};