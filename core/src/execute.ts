import { MQTTDaemon } from "core:mqttdaemon";

let daemon = new MQTTDaemon("localhost");
daemon.run();
