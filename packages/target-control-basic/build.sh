#!/bin/bash

DIR=$(dirname $0)

npm install
npx browserify -o $DIR/bundle.js $DIR/client.js $DIR/proto/commands_pb.js
