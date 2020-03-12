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
bool g_bAlive;
int g_iTIndex = 2;
int g_iCTIndex = 3;

public Plugin myinfo =
{
    name = "Discord Scrim Finder",
    author = "Magnus Jensen",
    description = "Discord Scrim finder csgo plugin, to communicate with servers, and send stats afterwards.",
    version = "0.2",
    url = "http://www.sourcemod.net"
};

// JSON Object for HTTP Request
methodmap ServerStats < JSON_Object
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

    public ServerStats(const char[] ip)
    {
        ServerStats self = view_as<ServerStats>(new JSON_Object());
        self.port = g_iPort;
        self.SetIp(ip);
        
        return self;
    }
}

methodmap PlayerStats < JSON_Object
{
    public bool SetName(const char[] value)
    {
        return this.SetString("name", value);
    }

    public bool GetName(char[] buffer, int max_size)
    {
        return this.GetString("name", buffer, max_size);
    }

    property int frags
    {
        public get() { return this.GetInt("frags"); }
        public set(int value) { this.SetInt("frags", value); }
    }

    public PlayerStats(const char[] name, int frags)
    {
        PlayerStats self = view_as<PlayerStats>(new JSON_Object());
        self.SetName(name);
        self.frags = frags;
        return self;
    }
}

methodmap MatchStats < JSON_Object {
    property int ctscore {
        public get() { return this.GetInt("ct_score"); }
        public set(int value) { this.SetInt("ct_score", value); }
    }

    property int tscore {
        public get() { return this.GetInt("t_score"); }
        public set(int value) { this.SetInt("t_score", value); }
    }

    public MatchStats(int value1, int value2) {
        MatchStats stats = view_as<MatchStats>(new JSON_Object());
        stats.ctscore = value1;
        stats.tscore = value2;
        return stats;
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
void ServerCreation()
{
    char json[2048];
    char serverip[32];
    GetIp(serverip);
    ServerStats serverstats = new ServerStats(serverip);
    serverstats.Encode(json, sizeof(json));

    GetCommandLineParam("-serverid", g_sServerId, 32);

    // Static Link - TODO Make URL Dynamic
    char url[512];
    url = "http://192.168.1.50:8000/api/server/create";
    Handle httpRequest = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);

    SteamWorks_SetHTTPRequestRawPostBody(httpRequest, "application/json; charset=utf-8", json, strlen(json));
    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "serverid", g_sServerId);

    SteamWorks_SetHTTPCallbacks(httpRequest, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequest);
}

void MatchEnd()
{
    GetCommandLineParam("-serverid", g_sServerId, 32);

    // Static Link - TODO Make URL Dynamic
    char url[512];
    url = "http://192.168.1.50:8000/api/server/match/end";
    Handle httpRequest = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);

    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "serverid", g_sServerId);

    SteamWorks_SetHTTPCallbacks(httpRequest, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequest);
}

Action serverHeartbeat(Handle timer) {
    /* char json[2048];
    PlayerStats playerstats = new PlayerStats();
    playerstats.Encode(json, sizeof(json)); */
    g_bAlive = IsServerProcessing();
    char status[16];
    if (g_bAlive)
    {
        status = "alive";
    } 
    else 
    {
        status = "dead";
    } 

    PrintToServer(status);

    GetCommandLineParam("-serverid", g_sServerId, 32);

    // Static Link - TODO Make URL Dynamic
    char url[512];
    url = "http://192.168.1.50:8000/api/server/match/heartbeat";
    Handle httpRequest = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);
    //SteamWorks_SetHTTPRequestRawPostBody(httpRequest, "application/json; charset=utf-8", json, strlen(json));

    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "serverid", g_sServerId);
    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "status", status);
    SteamWorks_SetHTTPCallbacks(httpRequest, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequest);

    return Plugin_Continue;
}

void sendHttpRequest(char[] json)
{
    char url[512];
    url = "http://192.168.1.50:8000/api/server/create";
    Handle httpRequest = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);

    SteamWorks_SetHTTPRequestRawPostBody(httpRequest, "application/json; charset=utf-8", json, strlen(json));
    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "serverid", g_sServerId);

    SteamWorks_SetHTTPCallbacks(httpRequest, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequest);
}

void EmptyHttpCallback(Handle httpRequest, bool failure, bool requestSuccessful, EHTTPStatusCode statusCode, any data) {
    CloseHandle(httpRequest);
}

public void Event_roundEnd(Event event, const char[] name, bool dontBroadcast)
{
    for (int i = 1; i < 10; i++)
    {
        UpdatePlayerStats(i);
    }
    


    char json[2048];
    int t_score, ct_score;
    t_score = GetTeamScore(g_iTIndex);
    ct_score = GetTeamScore(g_iCTIndex);


    MatchStats matchstat = new MatchStats(ct_score, t_score);
    matchstat.Encode(json, sizeof(json));


    char url[512];
    url = "http://192.168.1.50:8000/api/match/round/end";
    Handle httpRequest = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);

    SteamWorks_SetHTTPRequestRawPostBody(httpRequest, "application/json; charset=utf-8", json, strlen(json));
    SteamWorks_SetHTTPRequestHeaderValue(httpRequest, "serverid", g_sServerId);

    SteamWorks_SetHTTPCallbacks(httpRequest, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequest);
}

void UpdatePlayerStats(int client) {

    char name[32];
    GetClientName(client, name, sizeof(name));
    int frags = GetClientFrags(client);
    char json[2048];
    PlayerStats player = new PlayerStats(name, frags);
    player.Encode(json, sizeof(json));

    char url[512];
    url = "http://192.168.1.50:8000/api/match/player/update";
    Handle httpRequestPlayer = SteamWorks_CreateHTTPRequest(k_EHTTPMethodPOST, url);

    SteamWorks_SetHTTPRequestRawPostBody(httpRequestPlayer, "application/json; charset=utf-8", json, strlen(json));
    SteamWorks_SetHTTPRequestHeaderValue(httpRequestPlayer, "serverid", g_sServerId);

    SteamWorks_SetHTTPCallbacks(httpRequestPlayer, EmptyHttpCallback);
    SteamWorks_SendHTTPRequest(httpRequestPlayer);
}



public void OnPluginStart()
{
    GetIp(g_sIp);
    HookEvent("round_end", Event_roundEnd);
    // Defining global cvar
    AutoExecConfig(true, "myPlugin"); // Name of file/plugin.
    // Timer to send serverCheckIn repeatly.
    //CreateTimer(5.0, ServerCreation, _, TIMER_REPEAT);
}

public void OnMapStart()
{
    ServerCreation();
    CreateTimer(150.0, serverHeartbeat, _, TIMER_REPEAT);
}



public void OnMapEnd()
{
    MatchEnd();
}

