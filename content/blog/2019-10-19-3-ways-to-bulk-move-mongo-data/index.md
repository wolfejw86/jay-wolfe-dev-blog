---
title: "4 Ways to Move Your MongoDB Data in Bulk"
tags: ["mongodb"]
published: true
date: "2019-10-19"
---

Ever tried to migrate data from one database to another with MongoDB? How about bulk importing a lot of data to start building an app around? It can be a bit tricky no matter what kind of database you're using, however MongoDB has a lot of strategies you can use to handle this situation.

### Setup For Success (if you already know how to run 2 local mongods then skip to the next section)

I'm going to show you four different ways to move data around in MongoDB. To test out these strategies locally, you can either:

1.  Setup 2 separate MongoDB deployment projects in MongoDB Atlas (this method is probably a lot quicker if you're not familiar with running mongodb locally)

2.  Run 2 local mongodb instances locally. I won't go into the super detailed setup process as this isn't the goal of this article, but I will outline a few steps at a high level to accomplish 2 localhost mongodb deployments.

- start up 2 separate mongod processes locally in 2 separate terminals and separate them by ports.

  - I like to make the data directories really easy to find, so I usually do:

    - `mkdir -p ~/Desktop/mongo1/data/db` and `mkdir -p ~/Desktop/mongo2/data/db`

  - Now I can startup 2 mongod processes with those directories pretty quickly:

    - `mongod --port 27017 --dbpath ~/Desktop/mongo1/data/db`

    - `mongod --port 27018 --dbpath ~/Desktop/mongo2/data/db`

- refer to [this article](https://jaywolfe.dev/running-a-local-replica-set/) to run a replica set locally with docker-compose. To start a second replica set with docker-compose, just copy the repo folder for the first one into a separate location. Everywhere you see port 27017 in the first one, change it to a separate port in the second one (such as 27018). After doing this, you will have 2 connection strings `mongodb://localhost:27017/db` and `mongodb://localhost:27018/db`

### Using mongoexport and mongoimport

I'm starting with import and export because it's the fastest way to get some initial data into your dbs, which will facilitate the rest of this article.

### Using mongodump and mongorestore

### Making Queries and Outputting to Files with mongo shell

### Writing to Large Files with Stream Data in NodeJS
