import { bindable } from 'aurelia-framework'
import { MapViewService } from 'services/map-view-service'

export class MapView {
  @bindable latitude
  @bindable longitude
  @bindable zoomLevel
  @bindable allowPan = true
  @bindable allowZoom = true
  @bindable allowRotate = true

  static inject = [ MapViewService ]
  constructor (MapViewService) {
    this.mapViewService = MapViewService
  }

  bind () {
    this.defaultOptions = {
      'attributionControl' : false,
      'zoomControl' : this.allowZoom,
      'scrollWheelZoom' : this.allowZoom,
      'allowDragging' : this.allowPan,
      'rotate' : this.allowRotate
    }
  }

  attached () {
    let options = Object.assign({}, this.defaultOptions)

    this.mapViewService.CreateStaticImageMap('map-view', 'demo-map.png', options)
    this.mapViewService.SetMapView(this.latitude, this.longitude, this.zoomLevel);
  }
}
