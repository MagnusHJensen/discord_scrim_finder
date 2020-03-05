const { Pool, Client} = require('pg');
const creds = require("../creds/creds");
const pool = new Pool({
    user: creds.user,
    host: creds.host,
    database: creds.db,
    password: creds.password,
    port: creds.port
});


async function matchEnd(serverid) {
    pool
        .connect()
        .then((dbclient) => {
            let matchid = matchFind(dbclient, serverid);
            setTimeout(() => {
                matchid.then((match_id) => {
                    console.log(match_id);
                    console.log("Ending match with match ID: " + match_id);
                })
                .catch((e) => console.error(e));
            }, 2000);
            
        })
        .catch((e) => console.error(e));
}

async function matchFind(dbclient, serverid) {
    await dbclient
        .query(`select * from matches where server_id = '${serverid}'`)
        .then((match) => {
            const matchData = match.rows[0];
            console.log("Match found with match ID: " + matchData.match_id);
            return matchData.match_id;
        })
        .catch((e) => console.error(e));
}





module.exports = {
    matchEnd
};