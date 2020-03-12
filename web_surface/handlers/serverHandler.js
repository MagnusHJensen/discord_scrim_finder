const { Pool, Client} = require('pg');
const creds = require("../../creds/creds");
const pool = new Pool({
    user: creds.user,
    host: creds.host,
    database: creds.db,
    password: creds.password,
    port: creds.port
});




async function serverCreate(serverid, ip, port) {
    
    return new Promise(async (res, rej) => {
        let success;
        let dbclient = await pool.connect();
        let serversQuery = await dbclient.query(`select * from servers where server_id = '${serverid}'`);
        let serversResult = await serversQuery;
        if (serversResult.rows.length > 0) {
            console.log("This server is already in the database.");
            success = false
        } else {
            console.log("A wild server has appeared.")
            let serverInsert = await dbclient.query(`insert into server (ip, port, available) VALUES ('${ip}', '${port}', true)`);
            console.log("The wild server has been put in its cage.")
            success = true
        }
        res(success);

    })
}

async function serverHeartbeat(serverid) {

}





module.exports = {
    serverCreate
};