# Adaptor Interface for RabbitMQ

## Setup

Run, 'npm install' to obtain all the node module dependancies.

Requires a running RabbitMQ server. Suggest using docker for this.

## Example

See example.js for a simple usage example.

## Unit Tests

Requires docker to be installed.

The unit tests are handled by JEST, this is a development dependancy in package.json.

Tests can be run continously with:
```
npm test
```

This will automatically launch a RabbitMQ docker container, run the tests continually, then stop the container. (All handled by unit-test.sh).

If you want to run the tests manually (with the RabbitMQ docker already running), this can be done by issuing the following command:
```
./node_modules/.bin/jest
```
