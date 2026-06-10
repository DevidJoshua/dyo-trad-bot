//+------------------------------------------------------------------+
//|                                          TradeBotEA.mq5          |
//|                                    Forex Trading Bot EA Bridge   |
//+------------------------------------------------------------------+
#property copyright "TradBot"
#property link      ""
#property version   "1.00"
#property strict

#include <Trade/Trade.mqh>
#include <Trade/PositionInfo.mqh>
#include <Trade/AccountInfo.mqh>
#include <Json.mqh>

//--- Input parameters
input string BridgeHost = "127.0.0.1";
input int BridgePort = 5000;
input int PollIntervalMs = 1000;

//--- Global variables
CTrade trade;
CPositionInfo positionInfo;
CAccountInfo accountInfo;
int socket;
int lastCommandId;
bool connected;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
   connected = false;
   socket = -1;
   lastCommandId = 0;

   Print("TradeBot EA initializing...");
   EventSetMillisecondTimer(PollIntervalMs);

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   EventKillTimer();
   if (socket != -1) {
      SocketClose(socket);
   }
   Print("TradeBot EA shutdown");
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer() {
   if (!connected) {
      ConnectToBridge();
      return;
   }

   SendAccountUpdate();
   CheckForCommands();
}

//+------------------------------------------------------------------+
//| Connect to Node.js bridge                                        |
//+------------------------------------------------------------------+
void ConnectToBridge() {
   socket = SocketCreate();
   if (socket == -1) {
      Print("Failed to create socket");
      return;
   }

   if (!SocketConnect(socket, BridgeHost, BridgePort, 5000)) {
      SocketClose(socket);
      socket = -1;
      return;
   }

   connected = true;
   Print("Connected to Node.js bridge");
}

//+------------------------------------------------------------------+
//| Send account information to bridge                               |
//+------------------------------------------------------------------+
void SendAccountUpdate() {
   string openPositions = "[";
   int total = PositionsTotal();
   for (int i = 0; i < total; i++) {
      if (PositionSelectByTicket(PositionGetTicket(i))) {
         string pos = StringFormat(
            "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%g,"
            "\"openPrice\":%g,\"stopLoss\":%g,\"takeProfit\":%g,\"profit\":%g,"
            "\"swap\":%g,\"openTime\":\"%s\"}",
            PositionGetInteger(POSITION_TICKET),
            PositionGetString(POSITION_SYMBOL),
            (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL"),
            PositionGetDouble(POSITION_VOLUME),
            PositionGetDouble(POSITION_PRICE_OPEN),
            PositionGetDouble(POSITION_SL),
            PositionGetDouble(POSITION_TP),
            PositionGetDouble(POSITION_PROFIT),
            PositionGetDouble(POSITION_SWAP),
            TimeToString((datetime)PositionGetInteger(POSITION_TIME))
         );
         if (i > 0) openPositions += ",";
         openPositions += pos;
      }
   }
   openPositions += "]";

   string json = StringFormat(
      "{\"type\":\"account_update\",\"payload\":{"
      "\"balance\":%g,\"equity\":%g,\"margin\":%g,\"freeMargin\":%g,"
      "\"openPositions\":%s,\"status\":\"ACTIVE\"}}",
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      AccountInfoDouble(ACCOUNT_MARGIN_FREE),
      openPositions
   );

   SocketSend(socket, json, StringLen(json));
}

//+------------------------------------------------------------------+
//| Check for incoming commands from bridge                          |
//+------------------------------------------------------------------+
void CheckForCommands() {
   uchar buffer[4096];
   string received = "";

   while (SocketIsConnected(socket) && SocketIsReadable(socket) > 0) {
      uint len = SocketRead(socket, buffer, 4096, 100);
      if (len > 0) {
         received += CharArrayToString(buffer, 0, len);
      }
   }

   if (received == "") return;

   string lines[];
   int count = StringSplit(received, '\n', lines);
   for (int i = 0; i < count; i++) {
      string line = StringTrim(lines[i]);
      if (line == "") continue;
      ProcessCommand(line);
   }
}

//+------------------------------------------------------------------+
//| Process a command from the bridge                               |
//+------------------------------------------------------------------+
void ProcessCommand(string json) {
   string commandId = ReadJsonValue(json, "commandId");
   string type = ReadJsonValue(json, "type");
   string payload = ReadJsonValue(json, "payload");

   if (commandId == "" || type == "") return;

   if (type == "place_order") {
      ProcessPlaceOrder(commandId, payload);
   } else if (type == "close_order") {
      ProcessCloseOrder(commandId, payload);
   } else if (type == "modify_order") {
      ProcessModifyOrder(commandId, payload);
   } else if (type == "get_account_info") {
      ProcessGetAccountInfo(commandId);
   } else if (type == "get_open_positions") {
      ProcessGetOpenPositions(commandId);
   }
}

//+------------------------------------------------------------------+
//| Process a place order command                                   |
//+------------------------------------------------------------------+
void ProcessPlaceOrder(string commandId, string payload) {
   string symbol = ReadJsonValue(payload, "symbol");
   string action = ReadJsonValue(payload, "action");
   double lot = StringToDouble(ReadJsonValue(payload, "lot"));
   double sl = StringToDouble(ReadJsonValue(payload, "stopLoss"));
   double tp = StringToDouble(ReadJsonValue(payload, "takeProfit"));

   MqlTradeRequest request = {};
   MqlTradeResult result = {};

   request.action = TRADE_ACTION_DEAL;
   request.symbol = symbol;
   request.volume = lot;
   request.type = (action == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   request.price = (action == "BUY") ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID);
   request.deviation = 10;

   if (sl > 0) request.sl = sl;
   if (tp > 0) request.tp = tp;

   request.magic = 1001;
   request.comment = "TradBot EA";

   bool success = OrderSend(request, result);
   string response;

   if (success && result.retcode == TRADE_RETCODE_DONE) {
      response = StringFormat(
         "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{\"ticket\":%d,\"price\":%g}}",
         commandId, result.order, request.price
      );
   } else {
      response = StringFormat(
         "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{\"error\":\"Place failed\",\"code\":%d}}",
         commandId, result.retcode
      );
   }

   SocketSend(socket, response, StringLen(response));
}

//+------------------------------------------------------------------+
//| Process a close order command                                   |
//+------------------------------------------------------------------+
void ProcessCloseOrder(string commandId, string payload) {
   long ticket = StringToInteger(ReadJsonValue(payload, "ticket"));

   if (PositionSelectByTicket(ticket)) {
      trade.PositionClose(ticket, 10);
      string response = StringFormat(
         "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{\"success\":true,\"profit\":%g}}",
         commandId, PositionGetDouble(POSITION_PROFIT)
      );
      SocketSend(socket, response, StringLen(response));
   } else {
      string response = StringFormat(
         "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{\"error\":\"Position not found\"}}",
         commandId
      );
      SocketSend(socket, response, StringLen(response));
   }
}

//+------------------------------------------------------------------+
//| Process a modify order command                                  |
//+------------------------------------------------------------------+
void ProcessModifyOrder(string commandId, string payload) {
   long ticket = StringToInteger(ReadJsonValue(payload, "ticket"));
   double sl = StringToDouble(ReadJsonValue(payload, "stopLoss"));
   double tp = StringToDouble(ReadJsonValue(payload, "takeProfit"));

   if (PositionSelectByTicket(ticket)) {
      double currentSl = PositionGetDouble(POSITION_SL);
      double currentTp = PositionGetDouble(POSITION_TP);
      double newSl = (sl > 0) ? sl : currentSl;
      double newTp = (tp > 0) ? tp : currentTp;

      trade.PositionModify(ticket, newSl, newTp);

      string response = StringFormat(
         "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{\"success\":true}}",
         commandId
      );
      SocketSend(socket, response, StringLen(response));
   } else {
      string response = StringFormat(
         "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{\"error\":\"Position not found\"}}",
         commandId
      );
      SocketSend(socket, response, StringLen(response));
   }
}

//+------------------------------------------------------------------+
//| Process get account info command                                |
//+------------------------------------------------------------------+
void ProcessGetAccountInfo(string commandId) {
   string response = StringFormat(
      "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":{"
      "\"balance\":%g,\"equity\":%g,\"margin\":%g,\"freeMargin\":%g,\"status\":\"ACTIVE\"}}",
      commandId,
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      AccountInfoDouble(ACCOUNT_MARGIN_FREE)
   );
   SocketSend(socket, response, StringLen(response));
}

//+------------------------------------------------------------------+
//| Process get open positions command                              |
//+------------------------------------------------------------------+
void ProcessGetOpenPositions(string commandId) {
   string positions = "[";
   int total = PositionsTotal();
   for (int i = 0; i < total; i++) {
      if (PositionSelectByTicket(PositionGetTicket(i))) {
         if (i > 0) positions += ",";
         positions += StringFormat(
            "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%g,"
            "\"openPrice\":%g,\"stopLoss\":%g,\"takeProfit\":%g,\"profit\":%g}",
            PositionGetInteger(POSITION_TICKET),
            PositionGetString(POSITION_SYMBOL),
            (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL"),
            PositionGetDouble(POSITION_VOLUME),
            PositionGetDouble(POSITION_PRICE_OPEN),
            PositionGetDouble(POSITION_SL),
            PositionGetDouble(POSITION_TP),
            PositionGetDouble(POSITION_PROFIT)
         );
      }
   }
   positions += "]";

   string response = StringFormat(
      "{\"type\":\"response\",\"commandId\":\"%s\",\"payload\":%s}",
      commandId, positions
   );
   SocketSend(socket, response, StringLen(response));
}

//+------------------------------------------------------------------+
//| Simple JSON value reader                                        |
//+------------------------------------------------------------------+
string ReadJsonValue(string json, string key) {
   string searchKey = "\"" + key + "\":\"";
   int pos = StringFind(json, searchKey);
   if (pos >= 0) {
      int start = pos + StringLen(searchKey);
      int end = StringFind(json, "\"", start);
      if (end > start) {
         return StringSubstr(json, start, end - start);
      }
   }

   searchKey = "\"" + key + "\":";
   pos = StringFind(json, searchKey);
   if (pos >= 0) {
      int start = pos + StringLen(searchKey);
      string remaining = StringSubstr(json, start);
      StringTrimLeft(remaining);
      if (StringSubstr(remaining, 0, 1) == "{") {
         int depth = 0;
         for (int i = 0; i < StringLen(remaining); i++) {
            if (remaining[i] == '{') depth++;
            if (remaining[i] == '}') {
               depth--;
               if (depth == 0) {
                  return StringSubstr(remaining, 0, i + 1);
               }
            }
         }
      } else if (StringSubstr(remaining, 0, 1) == "[") {
         int depth = 0;
         for (int i = 0; i < StringLen(remaining); i++) {
            if (remaining[i] == '[') depth++;
            if (remaining[i] == ']') {
               depth--;
               if (depth == 0) {
                  return StringSubstr(remaining, 0, i + 1);
               }
            }
         }
      } else {
         int end = StringFind(remaining, ",");
         if (end < 0) end = StringFind(remaining, "}");
         if (end < 0) end = StringLen(remaining);
         return StringSubstr(remaining, 0, end);
      }
   }

   return "";
}
//+------------------------------------------------------------------+
