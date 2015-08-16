Ping Data
=========

Ping Data was created when I was having internet connectivity issues and wanted
some way to determine when my connection had dropped out or pings were taking
an excessive amount of time.

Installation
------------

First, you need to install [Node.js](nodejs), then follow these steps:

```
$ git clone https://github.com/clempaul/ping-data.git
$ cd ping-data
$ npm install
$ npm -g install forever
$ mkdir data
```

Configuration
-------------

You should edit `config/default.json` to have settings appropriate to your machine
and location.

Startup
-------

There are two components to run:

 - `pinger` sends pings as specified in your config file
 - `web` starts the web interface for viewing the results

These should both be run under [`forever`](forever), which handles restarting
the processes if the stop (which `pinger` does when it needs to rotate the log
file) whilst also running as a daemon.

```
$ forever start forever.json
```

To verify that these are running, you can check the process list:

```
$ forever list
```

By default, the web interface runs on port 3000 (although this is configurable).
To view your data, visit `http://localhost:3000/`.

[nodejs]: https://nodejs.org/
[forever]: https://github.com/foreverjs/forever/
