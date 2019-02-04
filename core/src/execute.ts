import { MQTTDaemon } from "core/mqttdaemon";

let daemon = new MQTTDaemon("mqtt://localhost");
daemon.run();
