#!/bin/bash

CURRENT_DIR=$(dirname $0)

if [ ! -d "${CURRENT_DIR}/cpp" ]; then
	mkdir -p "${CURRENT_DIR}/cpp"
fi

if [ ! -d "${CURRENT_DIR}/js" ]; then
	mkdir -p "${CURRENT_DIR}/js"
fi

./protoc --proto_path=./include/google --proto_path=./protos --js_out=./js --cpp_out=./cpp ./protos/*.proto