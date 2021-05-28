echo "Launching Containers"
docker start rabbitmq-stomp-unit-test || docker run -d --name rabbitmq-stomp-unit-test -p 25672:5672 -p 8888:15672 -p 15674:15674 -v ${PWD}/tests/rabbitmq.config:/etc/rabbitmq/rabbitmq.config rabbitmq:3-management

echo -n "Waiting for Containers: "
until [ "`curl -s -X GET http://localhost:25672/api`" ]; do
    echo -n .
    sleep 0.2;
done;
echo " Ready"

echo "Launching Test Runner"
jest --watch

echo "Cleanup"
docker stop rabbitmq-stomp-unit-test
docker wait rabbitmq-stomp-unit-test

echo "Done"