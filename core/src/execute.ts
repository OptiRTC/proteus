import { MQTTDaemon } from "core/mqttdaemon";
import { get } from "config";

let daemon = new MQTTDaemon(get("Core.MessageServer"));
daemon.run();
