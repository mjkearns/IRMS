echo "Launching Containers"
docker start rabbitmq-poly-tg82-unit-test || docker run -d --name rabbitmq-poly-tg82-unit-test -p 25672:5672 -p 8888:15672 -p 15674:15674 -v ${PWD}/tests/rabbitmq/rabbitmq.config:/etc/rabbitmq/rabbitmq.config -v ${PWD}/tests/rabbitmq/enabled_plugins:/etc/rabbitmq/enabled_plugins rabbitmq:3-management

if [ ! "$?" = "0" ]; then
    echo "Could not launch unit test container, exiting..."
    exit 1
fi
echo -n "Waiting for Containers: "
until [ "`curl -s -X GET http://localhost:8888/api/index.html`" ]; do
    echo -n .
    sleep 0.2;
done;
echo " Ready"

echo "Launching Test Runner"
jest --watch

echo "Cleanup"
docker stop rabbitmq-poly-tg82-unit-test
docker wait rabbitmq-poly-tg82-unit-test

echo "Done"