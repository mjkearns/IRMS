xhost +
# Users home is mounted as home
# --rm will remove the container as soon as it ends

docker run --rm --name="qgis-desktop-2.10" \
    -i -t \
    -v ${HOME}:/home/${USER} \
    -v /tmp/.X11-unix:/tmp/.X11-unix \
    -e DISPLAY=unix$DISPLAY \
    kartoza/qgis-desktop:latest 
xhost -