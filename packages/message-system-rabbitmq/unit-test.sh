echo "Launching Containers"
docker start rabbitmq-unit-test || docker run -d --name rabbitmq-unit-test -p 25672:5672 rabbitmq

echo -n "Waiting for Containers: "
until [ "$(curl -s -X GET http://localhost:25672/api)" ]; do
  echo -n .
  sleep 0.2
done
echo " Ready"

echo "Launching Test Runner"
jest --watch --coverage

echo "Cleanup"
docker stop rabbitmq-unit-test
docker wait rabbitmq-unit-test

echo "Done"
