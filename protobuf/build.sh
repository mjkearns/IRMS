#!/bin/bash

CURRENT_DIR=$(dirname $0)

if [ ! -d "${CURRENT_DIR}/cpp" ]; then
	mkdir -p "${CURRENT_DIR}/cpp"
fi

if [ ! -d "${CURRENT_DIR}/js" ]; then
	mkdir -p "${CURRENT_DIR}/js"
fi

${CURRENT_DIR}/protoc --proto_path=${CURRENT_DIR}/include/google --proto_path=${CURRENT_DIR}/protos --js_out=import_style=commonjs,binary:${CURRENT_DIR}/js --cpp_out=${CURRENT_DIR}/cpp ${CURRENT_DIR}/protos/*.proto
