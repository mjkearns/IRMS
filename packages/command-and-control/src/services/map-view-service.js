import * as L from 'leaflet-rotate-map'

export class MapViewService {
  defaultOptions = {
    'attributionControl' : false,
    'zoomControl' : true,
    'scrollWheelZoom' : true,
    'allowDragging' : true,
    'rotate' : true
  }

  CreateMapTileMap (element, options = this.defaultOptions) {
    this.map = new L.Map('map-view', options)
    let accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw' // from the tutorials - not ours
    let tileLayer = new L.TileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: accessToken
    })
    tileLayer.addTo(this.map);
  }

  CreateStaticImageMap (element, image, options = this.defaultOptions, dimensions = [800, 800]) {
    options.crs = L.CRS.Simple
    this.map = new L.Map(element, options)
    let bounds = [[0,0], dimensions];
    L.imageOverlay(image, bounds).addTo(this.map);
    this.map.fitBounds(bounds);
  }

  SetMapView(latitude, longitude, zoomLevel) {
    this.map.setView([latitude, longitude], zoomLevel)
  }

  SetMapRotation(angle) {
    this.map.setBearing(angle)
  }
}
