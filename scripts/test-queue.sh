echo "Launching Containers"
docker start rabbitmq-test || docker run -d --name rabbitmq-test -p 5672:5672 rabbitmq

echo -n "Waiting for Containers: "
until [ "`curl -s -X GET http://localhost:5672/api`" ]; do
    echo -n .
    sleep 0.2;
done;
echo " Ready"

