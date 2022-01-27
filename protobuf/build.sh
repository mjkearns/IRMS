#!/bin/bash

./protoc --proto_path=./include/google --proto_path=./protos --js_out=./js --cpp_out=./cpp ./protos/*.proto