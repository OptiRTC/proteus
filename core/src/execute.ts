import { MQTTDaemon } from "mqttdaemon";

let daemon = new MQTTDaemon("localhost");
daemon.run();
