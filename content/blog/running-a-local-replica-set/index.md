---
title: "Run a MongoDB Replica Set Locally"
tags: ["mongodb"]
published: true
date: "2019-09-01"
---

Running A MongoDB Replica Set Locally and Why You Might Want To:

Why Do I Even Need to Do This?

- You’re like me and want to know how it works! (and more important play around with it locally)
- The application you’re building has a requirement to use change streams
- The application you’re building has a requirement to use transactions
- You want to learn how either of the above 2 features work without having to deploy a database to the cloud

The truth is, any of the above or something completely different are all fine reasons to want to learn something new. That's what this industry is all about and personally one of the reasons I enjoy it so much.

**The MongoDB Installation Way**

Windows - Mac - Linux - It used to be more of a separated installation, perhaps you’re used to using something like Chocolatey on Windows or Homebrew on a Mac. I would no longer recommend those installation methods and instead, opt to just install from the MongoDB Manual Documentation

Once it’s installed, make sure that it isn’t running in the background. If it’s already running, then you can’t start it as a replica set. If you want to double check you can run `mongo` and see if the mongo CLI utility auto connects. If it connects, you already have something running and need to shut it down by doing the following:

Connect to it with mongo cli:

`mongo --eval "db.getSiblingDB('admin').shutdownServer()"`

Now that we can start fresh, make sure your data directory is setup properly. I am on a mac and have it set to /data/db. You’ll need to do the same (or equivalent) on your machine.

Now we can start our replica set. It’s actually a really simple one liner:

`mongod --port 27017 --dbpath /data/db --replSet rs0 --bind_ip localhost`

![console1](../../../src/images/replica-set-local/console1.png)

That’s it! Now obviously you could do a lot more in terms of binding more nodes, etc. but if you’re reading this, you were probably just looking for an easy way to get started and here it is. You have to do just one more step to actually turn on your replica set. Connect to mongo CLI again and run:

`rs.initiate()`

There you have it. You should see some configuration output and you should see activity in your mongod terminal.

![console2](../../../src/images/replica-set-local/console2.png)

Now I can easily develop locally simulating the full feature set of a mongodb replica set.

If you're like me and don't want to keep a list of unnecessary long commands lying around, try aliasing it. You don't have to run `rs.initiate()` except for the very first time.

**The Docker Compose Way**

The docker way (especially locally) is a bit more convoluted, however can be really useful for building containerized apps that communicate over dynamic DNS. We’re going to need two files, one for our docker-compose.yml and one for our replica set setup script.

Here is our compose file:

```yml
version: "3"
services:
  mongo1:
    hostname: mongo1
    container_name: localmongo1
    image: mongo:4.0
    ports:
      - "27017:27017"
    expose:
      - 27017
    restart: always
    entrypoint: ["/usr/bin/mongod", "--bind_ip_all", "--replSet", "rs0"]

  mongo2:
    hostname: mongo2
    container_name: localmongo2
    image: mongo:4.0
    expose:
      - 27017
    restart: always
    entrypoint: ["/usr/bin/mongod", "--bind_ip_all", "--replSet", "rs0"]

  mongo3:
    hostname: mongo3
    container_name: localmongo3
    image: mongo:4.0
    expose:
      - 27017
    restart: always
    entrypoint: ["/usr/bin/mongod", "--bind_ip_all", "--replSet", "rs0"]

  mongosetup:
    image: mongo:4.0
    links:
      - mongo1:mongo1
      - mongo2:mongo2
      - mongo3:mongo3
    depends_on:
      - mongo1
      - mongo2
      - mongo3
    volumes:
      - ./scripts:/scripts
      - ./data/db:/data/db
    restart: "no"
    entrypoint: ["bash", "/scripts/mongo_setup.sh"]
```

We start three different mongod processes all linked together, and then create an additional 4th service in our compose file that essentially just runs a bash file with its entrypoint.

```bash
sleep 10

echo SETUP.sh time now: `date +"%T" `
mongo --host mongo1:27017 <<EOF
  var cfg = {
    "_id": "rs0",
    "version": 1,
    "members": [
      {
        "_id": 0,
        "host": "mongo1:27017",
        "priority": 2
      },
      {
        "_id": 1,
        "host": "mongo2:27017",
        "priority": 0
      },
      {
        "_id": 2,
        "host": "mongo3:27017",
        "priority": 0
      }
    ]
  };
  rs.initiate(cfg, { force: true });
  rs.reconfig(cfg, { force: true });
  db.getMongo().setReadPref('nearest');
EOF
```

The bash file is relatively straightforward mongo syntax, which you can read about at [MongoDB's documentation page](https://docs.mongodb.com/manual/reference/replica-configuration/). It is basically initiating the replica set with each member node that we are running in the docker-compose file.

Once the bash file runs, the replica set is initiated and after a few moments the replica set is ready. It’s important to note that this takes some time, and the application will either need to handle the database not being ready right away or not even start up until the database is ready. The best way I’ve found to do this is to run the replica set separately from the app you’re developing, in which case you may be better off just using the installation method above.

I wrapped all the compose setup and info into a repo so you can skip straight to the code. I also wrote a small node file that creates events and listens to a change stream (to prove that the replica set is running locally).

If you want to skip straight to the repo, you can clone it here - https://github.com/wolfejw86/local-replica-set and just run `docker-compose up` and it should just work. Otherwise take a look below as I dive into the code for a bit of a deeper explanation.

```js
const crypto = require("crypto")
const assert = require("assert")
const MongoClient = require("mongodb").MongoClient

const url = "mongodb://localhost:27017"
const dbName = "myproject"
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

async function main() {
  await client.connect()
  console.log("db connected")

  const db = client.db(dbName)

  const collection = db.collection("changetest")
  const changeStream = collection.watch([], { fullDocument: "updateLookup" })

  const data = [
    { event: crypto.randomBytes(5).toString("hex") },
    { event: crypto.randomBytes(5).toString("hex") },
    { event: crypto.randomBytes(5).toString("hex") },
    { event: crypto.randomBytes(5).toString("hex") },
    { event: crypto.randomBytes(5).toString("hex") },
  ]

  let i = -1
  const interval = setInterval(async () => {
    await collection.insertOne(data[++i])

    if (i === data.length - 1) {
      clearInterval(interval)
    }
  }, 1000)

  async function getNext() {
    const next = await changeStream.next()

    console.log("change stream fired", next.fullDocument.event)
    assert.equal(data[i].event, next.fullDocument.event)

    if (i > 3) {
      return
    }

    if (next) {
      return await getNext()
    }
  }

  await getNext()

  console.log("exercise complete, disconnecting")
  await client.close()
}

main()
```

Let's walk through this example really quickly. In this first section:

```js
const crypto = require("crypto")
const assert = require("assert")
const MongoClient = require("mongodb").MongoClient

const url = "mongodb://localhost:27017"
const dbName = "myproject"
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
```

I am simply requiring my dependencies. A lot of folks will use `mongoose` even for small examples like this. I like to step away from it every once in a while so that I remember that it's really a fancy wrapper around the native `mongodb` driver. When I remember this, I can always easily address inconsistencies with what I'm trying to do in mongo vs what the mongoose documentation is telling me. That being, said, this is simply setting up for a basic connection. Yes the uri is hardcoded, no you shouldn't do this in production ;) We just want to see something work that will _only_ work in a replica set and not on your simple single node localhost mongo!

```js
async function main() {
  await client.connect()
  console.log("connected to db")
```

Alright on to the main event! First off, now that the newest version of the mongodb driver for nodejs supports promises, we can just await the connection action to the db. Why am I using this `async function main` you ask? Because we have no top level await support in javascript. It would be nice but honestly, who cares?! Just put a single async function to initiate your "business" and get started. Just don't forget to call it to start your app!

```js
const db = client.db(dbName)

const collection = db.collection("changetest")
const changeStream = collection.watch([], { fullDocument: "updateLookup" })

const data = [
  { event: crypto.randomBytes(5).toString("hex") },
  { event: crypto.randomBytes(5).toString("hex") },
  { event: crypto.randomBytes(5).toString("hex") },
  { event: crypto.randomBytes(5).toString("hex") },
  { event: crypto.randomBytes(5).toString("hex") },
]
```

Now we have the next step in the setup process. Let's remember what we're here to do for a second.

- create a collection so that we can insert some fake data
- setup a change stream to watch the collection so we can see how they work
- insert some fake data and watch the change stream in action

The data array is literally just an object with a single property (randomly generated hex string) so that we can see each unique value going into the database.

Alright now get ready for some first class hackery:

```js
let i = -1
const interval = setInterval(async () => {
  await collection.insertOne(data[++i])

  if (i === data.length - 1) {
    clearInterval(interval)
  }
}, 1000)
```

Here I'm just setting up a basic interval to insert some fake data. On each pass of the interval (once per second) it will insert the current item in data into the array. There's a couple of ways to do this, but I don't find a way to use intervals too often so it's fun to play with them every once in a while. Once the incrementor `i` gets to the last item in the array, the interval just short circuits itself so that the program will stop.
