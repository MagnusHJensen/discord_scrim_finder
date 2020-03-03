#include <sourcemod>
#include <sdktools>
#include <cstrike>
#include <SteamWorks>
#include <json>


#pragma semicolon 1
#pragma newdecls required

char g_sIp[32];
int g_iPort;
char g_sServerId[32];

public Plugin myinfo =
{
    name = "My first plugin",
    author = "Magnus Jensen",
    description = "My first csgo plugin",
    version = "0.1",
    url = "http://www.sourcemod.net"
};

// JSON Object for HTTP Request
methodmap Stats < JSON_Object
{
    public bool SetName(const char[] value)
    {
        return this.SetString("name", value);
    }

    public bool GetName(char[] buffer, int max_size)
    {
        return this.GetString("name", buffer, max_size);
    }

    // JSON_Object for setting strings.
    public bool SetIp(const char[] ip)
    {
        return this.SetString("ip", ip);
    }

    public bool GetIp(char[] buffer, int max_size)
    {
        return this.GetString("ip", buffer, max_size);
    }

    property int port
    {
        public set(int value)
        {
            this.SetInt("port", value);
        }
    }

    public Stats(const char[] ip)
    {
        Stats self = view_as<Stats>(new JSON_Object());
        self.port = g_iPort;
        self.SetIp(ip);
        
        return self;
    }
}


// Get Server Public IP.
void GetIp(char[] buffer)
{
    int ipaddress[4];
    SteamWorks_GetPublicIP(ipaddress);
    Format(buffer, 32, "%d.%d.%d.%d", ipaddress[0], ipaddress[1], ipaddress[2], ipaddress[3]);
    g_iPort = GetConVarInt(FindConVar("hostport"));
    
}


// Send Server Data. IP and Port with Serverid to Backend.
Action SendServerCheckIn(Handle timer){
    char json[2048];
    char serverip[32];
    GetIp(serverip);
    Stats serverstats = new Stats(serverip);
    serverstats.Encode(json, sizeof(json));

    GetCommandLineParam("-serverid", g_sServerId, 32);

    // Static Link - TODO Make URL Dynamic
    char url[512];
    url = "http://192.168.1.50:8000/api/server/send/data";
    Handle httpRequest = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);

    SteamWorks_SetHTTPRequestRawPostBody(httpRequest, "application/json; charset=utf-8", json, strlen(json));
    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "serverid", g_sServerId);

    SteamWorks_SetHTTPCallbacks(httpRequest, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequest);
    return Plugin_Continue;
}

void EmptyHttpCallback(Handle httpRequest, bool failure, bool requestSuccessful, EHTTPStatusCode statusCode, any data) {
    CloseHandle(httpRequest);
}

public Action get_teams(int client, int args){
    int teams = GetTeamCount();
    ShowActivity2(client, "[SM] ", "Amount of teams: %d", teams);
    return Plugin_Handled;
}

// Team index 2 is T
// Team index 3 is CT
public Action get_team_name(int client, int args){
    char arg1[32];
	GetCmdArg(1, arg1, sizeof(arg1));
	int index = StringToInt(arg1);
	char name[32];
	GetTeamName(index, name, sizeof(name));
	ShowActivity2(client, "[SM] ", "Team %d name: %s", index, name);
	return Plugin_Handled;
}

public Action get_team_score(int client, int args) 
{
	char arg1[32];
	GetCmdArg(1, arg1, sizeof(arg1));
	int index = StringToInt(arg1);
	int score = GetTeamScore(index);
	ReplyToCommand(client, "The score is: %d", score);
	return Plugin_Handled;
}


// Test Hooks - Use as example.
public void Event_bombDrop(Event event, const char[] name, bool dontBroacast)
{
    int user = event.GetInt("userid");
    char name[64];
    
    int dropper = GetClientOfUserId(user);
    GetClientName(dropper, name, sizeof(name));
    PrintToConsole(dropper, "User: %s dropped the bomb!", name);

}

// TODO Send data to webserver. (SteamWorks HTTP)
public void Event_roundEnd(Event event, const char[] name, bool dontBroadcast)
{
    int winner = event.GetInt("winner");
    char team_name[32], message[128];
    GetTeamName(winner, team_name, sizeof(team_name));
    event.GetString("message", message, sizeof(message));
    int count = event.GetInt("player_count");   
    PrintToServer("Round winner: %s - Players Alive: %d - Message: %s", team_name, count, message);
}



public void OnPluginStart()
{
    GetIp(g_sIp);
    LoadTranslations("common.phrases.txt"); // Required for find target Fail reply.
    RegAdminCmd("sm_get_teams", get_teams, ADMFLAG_GENERIC);
    RegAdminCmd("sm_get_team_name", get_team_name, ADMFLAG_GENERIC);
    HookEvent("bomb_dropped", Event_bombDrop);
    HookEvent("round_end", Event_roundEnd);
    // Defining global cvar
    AutoExecConfig(true, "myPlugin"); // Name of file/plugin.


    // Timer to send serverCheckIn repeatly.
    CreateTimer(5.0, SendServerCheckIn, _, TIMER_REPEAT);
}

