#!/bin/bash

wget https://github.com/clugg/sm-json/archive/v2.3.0.tar.gz

tar -xzf v2.3.0.tar.gz

cp -r sm-json-2.3.0/addons/sourcemod/scripting/include/* ~/serverfiles/csgo/addons/sourcemod/scripting/include/
