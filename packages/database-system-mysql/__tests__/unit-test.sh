echo "launching mysql container"
docker start mysql-unit-test || docker run --name mysql-unit-test -p 33061:3306 -e MYSQL_ROOT_PASSWORD=test -d mysql:latest --default-authentication-plugin=mysql_native_password 
sleep 2
echo "waiting for container"
until [ "$(mysqladmin -h 127.0.0.1 -P 33061 --protocol=tcp -u root -ptest status)" ]; do
  echo "checking"
  echo -n .
  sleep 0.2
done
echo "ready"
jest --watch --coverage
echo "cleanup"
docker stop mysql-unit-test