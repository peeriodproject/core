![PeeriodLogo](https://peeriodproject.github.io/dl/peeriod-img.png "Peeriod - Bleeding Edge File Sharing")

Peeriod is an open source project which strives for making privacy protected peer-to-peer file sharing available to the masses.
Peeriod’s aim is to construct Onion Routing on top of a DHT, while at the same time avoiding certificate authorities. Each node is equally (un)trustworthy and can act as a relay node for encrypted traffic. A flooding-based search takes advantage of the DHT’s structure and provides full-text search capabilities.

[Website](https://peeriodproject.github.io)

[View the conceptual paper (PDF)](https://peeriodproject.github.io/dl/Peeriod_Anonymous_decentralized_network.pdf)

[View the application design specification (PDF)](https://peeriodproject.github.io/dl/Peeriod_Anonymous_decentralized_network.pdf)

# Peeriod Core

__We are currently working on a larger wiki and an accompanying generated code documentation. For a detailed description of the implemented concepts, see the two linked PDFs above for now.__

This repository contains the core code + tests of the main application which runs in the background.  

Peeriod runs completely on [node.js](http://nodejs.org), currently powered by [node-webkit](https://github.com/rogerwang/node-webkit)

- Node-webkit is a custom build based on v0.8.6 from [this branch](https://github.com/gitchs/node-webkit/tree/nw0.8_skip_taskbar). Thus the actual node.js version is v0.10.22 (see application design specification PDF for current drawbacks). _Node-webkit's full functionality is actually not really needed, so we'll probably switch to a native integration in the future._
- Search is powered by [ElasticSearch](http://www.elasticsearch.org/)
- The application is only running on Mac OSX 10.7+ for now. Windows version will shortly follow (not properly tested yet).
- The core code is written in TypeScript. Detailed comments about a class's functionality can be found in the appropriate interfaces.
