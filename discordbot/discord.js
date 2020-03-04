const creds = require("../creds/creds");
const { Pool, Client} = require('pg')
const Discord = require('discord.js')
const client = new Discord.Client()

const QUEUELENGTH = 2;

let queueRole;

const pool = new Pool({
    user: creds.user,
    host: creds.host,
    database: creds.db,
    password: creds.password,
    port: creds.port
})



client.on('ready', () => {



    // Connection Status
    console.log("Connected as " + client.user.tag+"\n")

    // Listing all servers, the bot is connected to.
    console.log("Servers:")
    client.guilds.cache.forEach(guild => {
        console.log(" - " + guild.name + `(${guild.id})`)
        guild.roles.cache.forEach((role) => {
            if (role.name === "Queued") {
                queueRole = role.id
                console.log("Found queue role: " + queueRole);
            }
        })

        // Listing all individual channels on the server, with type and their id.
        guild.channels.cache.forEach((channel) => {
            console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`)
        })
    })

    //Setting the bot's activity status
    client.user.setActivity("with Javascript", {type: "PLAYING"})

    queueHandler(client)




    // Delcaring generalChannel, and sending a message
    /*var generalChannel = client.channels.get("681952244492795944")
    generalChannel.send("Hello mister!")


    // Create new attachment, from URL or local path and send it.
    var attachment = new Discord.Attachment("https://www.google.com/url?sa=i&url=https%3A%2F%2Ficatcare.org%2F&psig=AOvVaw17udXp9YNXuJYKTaoZBCPz&ust=1582747128297000&source=images&cd=vfe&ved=0CAIQjRxqFwoTCLD69Na-7ecCFQAAAAAdAAAAABAD")
    generalChannel.send(attachment)*/

})


client.on('guildMemberAdd', (newMember) => {
    databaseCommand(["create", newMember.id, newMember.user.username], null);
})

// Bot respond on every message
client.on('message', (receivedMessage) => {
    if (receivedMessage.author == client.user) {
        return
    }

    if (receivedMessage.content.startsWith("!")) {
        processCommand(receivedMessage)
    }
})

// Funtion to process commands.
function processCommand(receivedMessage) {
    let fullCommand = receivedMessage.content.substr(1) // Remove the leading !
    let splitCommand = fullCommand.split(" ") // split the message up in to pieces after every space.
    let primaryCommand = splitCommand[0] // The word after the !
    let arguments = splitCommand.splice(1) // All the other words are arguments for the command.

    console.log("Command received: " + primaryCommand)
    console.log("Arguments: " + arguments + "\n")

    if (primaryCommand == "help") {
        helpCommand(arguments, receivedMessage)
    } else if (primaryCommand == "multiply") {
        multiplyCommand(arguments, receivedMessage)
    } else if (primaryCommand == "dev") {
        devCommand(arguments, receivedMessage)
    } else if (primaryCommand == "db") {
        databaseCommand(arguments, receivedMessage)
    }else if (primaryCommand == "queue"){
        queueCommand(arguments, receivedMessage)
    } else {
        receivedMessage.channel.send(`${receivedMessage.author.toString()} I don't seem to understand, your command. \nTry typing !help or !list`)
    }
}

function helpCommand(arguments, receivedMessage) {
    if (arguments.length > 0) {
        receivedMessage.channel.send(`${receivedMessage.author.toString()} It seems like you need help with ` + arguments)
        if (arguments[0] == "multiply") {
            receivedMessage.channel.send("To multiply try `!multiply 2 4 10` or `!multiply 5.2 7`")
        }
    } else {
        receivedMessage.channel.send("I'm not sure what you need help with. \nTry `!help [topic]`")
    }
}

function multiplyCommand (arguments, receivedMessage, help) {
    if (arguments.length < 2) {
        receivedMessage.channel.send("Not enough values to multiply. Try `!multiply 2 4 10` or `!multiply 5.2 7`")
        return
    }
    let product = 1
    arguments.forEach((argument) => {
        product *= parseFloat(argument)
    })
    receivedMessage.channel.send("The product of " + arguments + " multiplied together is: " + product.toString())
}

function devCommand(arguments, receivedMessage) {
    let guildUser = receivedMessage.member

    if (guildUser.roles.cache.some(role => role.name === "Developer")) {
        console.log("A !dev command was just executed!")
    } else {
        receivedMessage.channel.send(receivedMessage.member.user.username + " is not allowed to use the `!dev` command.")
        return
    }
}

function databaseCommand(arguments, receivedMessage) {
    pool
        .connect()
        .then(dbclient => {
            dbclient
                .query('SELECT * FROM accounts')
                .then((res) => {
                    const data = res.rows;
                    if (arguments[0] == "show") {
                        data.forEach((row) => {
                            receivedMessage.channel.send(`Name: ${row.username_discord}, ID: ${row.id} and ELO: ${row.elo} -- Queue Status: ${row.queued}`)
                        })

                    } else if (arguments[0] == "create") {
                        dbclient
                            .query("insert into accounts (id, username_discord, elo, queued) values ($1, $2, 1000, false)", [arguments[1], arguments[2]])
                            .then(() =>  {
                                console.log("A new user has been created")
                            })
                            .catch(e => console.error(e))

                        dbclient.release()

                    } else if (arguments[0] == "updateQueueStatus") {
                        if (arguments[1] == "joined") {

                            dbclient
                                .query(`update accounts set queued = true where id = '${receivedMessage.member.id}'`)
                                .then(() => console.log("Accounts table - queue status set to TRUE"))
                                .catch(e => console.error(e.stack))

                            dbclient
                                .query(`insert into queue (user_id, username_discord, elo) values ('${receivedMessage.member.id}', '${receivedMessage.member.user.username}', 1000)`)
                                .then(() => console.log("Inserted into queue table."))
                                .catch(e => console.error(e))

                            dbclient.release()

                        } else if (arguments[1] == "left") {

                            dbclient
                                .query(`update accounts set queued = false where id = ${receivedMessage.member.id}`)
                                .then(() => console.log("Accounts Table - queue status set to False"))
                                .catch(e => console.error(e))
                            dbclient
                                .query(`delete from queue where user_id = ${receivedMessage.member.id}`)
                                .then(() => console.log("Removed from queue table."))
                                .catch(e => console.error(e))

                            dbclient.release()
                        }
                    }
                })

        })
        .catch(err => {
            console.error(err)
        })
        /*.then(() => dbClient.query("select * from accounts"))
        .then(results => {
            const data = results.rows

            data.forEach((row) => {
                console.table(`${row.username_discord}, ID: ${row.id} and ELO: ${row.elo}`)
            })
        })*!/
    .catch(e => console.log)
    .finally(() => {
        dbClient.end()
    })*/
}


// Handles all the queue.
function queueCommand (arguments, receivedMessage) {
    let alreadyQueued;
    if (arguments.length < 1) {
        receivedMessage.channel.send("I don't seem to know, what you want to do with the `!queue` command!")

    } else if (arguments[0] == "join") { // If "!queue join" is issued
        try {
            alreadyQueued = receivedMessage.member.roles.cache.has(`${queueRole}`)
            if (alreadyQueued) { // Check if the user is already queued
                console.log("User is already queued!")
            } else {
                console.log(`${receivedMessage.member.user.username} has joined the queue!`)
                receivedMessage.member.roles.add(queueRole)
                databaseCommand(["updateQueueStatus", "joined"], receivedMessage)
            }
        } catch (TypeError) {
            console.log("Role does not exist.")
        }
        
        

    } else if (arguments[0] == "leave") { // If "!queue leave" is issued
        try {
            alreadyQueued = receivedMessage.member.roles.cache.has(`${queueRole}`)
            if (!alreadyQueued) { // Check if the user is already queued
                console.log("User is not currently in queue!")
    
            } else {
                console.log(`${receivedMessage.member.user.username} has left the queue!`)
                receivedMessage.member.roles.remove(queueRole)
                databaseCommand(["updateQueueStatus", "left"], receivedMessage)
            }
        } catch (TypeError) {
            console.log("Role does not exist.")
        }
        
    }
}






async function queueHandler (client, playersInQueue, serverid, ip, port, matchid){
    
    var playersInQueue;
    
    const dbclient = await pool.connect()
    setInterval(() => {
        dbclient
            .query("select * from queue")
            .then((playerInQueue) => {
                playersInQueue = playerInQueue
                if (playersInQueue.rows.length >= QUEUELENGTH) {
                    matchCreater(playersInQueue, dbclient);
                }
            })
            .catch(e => {
                console.log(e)
            })                
    }, 5000);
    
}

async function matchCreater(playersInQueue, dbclient){
    var serverid;
    var ip;
    var port;
    var matchid;
    
            
    await dbclient
        .query("select * from servers limit 1")
        .then((server) => {
            const serverData = server.rows
            serverid = serverData[0].server_id;
            ip = serverData[0].ip;
            port = serverData[0].port;
            console.log(ip);
            console.log(port);
        })
        .catch(e => console.error(e)) 

                
    await dbclient
        .query(`insert into matches (server_id) values ('${serverid}')`)
        .then(() => {
            console.log("Match has been inserted.")
        })
        .catch(e => console.error(e)) 
        

    await dbclient
        .query("select * from matches where server_id = '" + serverid + "' limit 1")
        .then((match) => {
            const matchData = match.rows
            matchid = matchData[0].match_id
            //matchid = matchData[0].match_id;
            console.log("Selected match: " + matchid)
        })
        .then((matchid) => {
            return matchid;
        })
        .catch(e => console.error(e))
        

    playerInQueueHandler(playersInQueue, ip, port, matchid, dbclient);  
            
    }

async function playerInQueueHandler(playersInQueue, ip, port, matchid, dbclient){
    let currentGuild = client.guilds.cache.get("681873204628684828")
    let generalChannel = currentGuild.channels.cache.get("681873204628684831")
    playersInQueue.rows.slice(0,QUEUELENGTH).forEach((player) => {
        //TODO FIX THIS!!
        console.log(player.user_id)
        let currentPlayer = currentGuild.members.cache.get(`${player.user_id}`)
        currentPlayer.roles.remove(queueRole)
        dbclient.query("update accounts set queued = false where id = " + currentPlayer.id)
            .then(() => {
                console.log("Queue status set to false")
            })
            .catch(e => {
                console.log(e)
            })
        dbclient.query("delete from queue where user_id = " + currentPlayer.id)
            .then(() => {
                console.log("Succesfully removed player from queue.")
            })
            .catch(e => {
                console.log(e)
            })

        
        dbclient
            .query(`insert into playersinmatch (user_id, match_id) values ('${currentPlayer.id}', '${matchid}')`)
            .then(() => {
                console.log("Player inserted into match table.");
            })
            .catch(e => console.error(e))
            currentPlayer.send(`This is the server ip: ${ip}:${port}`);
        
    })

    generalChannel.send("Match has been created!\n Match ID: " + matchid);
    console.log(`matchid: ${matchid} - ip: ${ip} - port: ${port}`)
}

function serverHandler() {
    return
}

bot_secret_token = creds.bot_token;

client.login(bot_secret_token)