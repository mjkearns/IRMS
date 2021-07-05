const shot = require('../services/process-shot')
const Point = require('../models/point')

const pointExamples = {
  firingPoint: new Point(701770.3174384605, 6096810.844646253, 643.438),
  geoShot: new Point(701774.8186181592, 6096711.282618717, 639.0569999999999)
}

describe('', () => {
  it('calculate offset point', () => {
    const offsetShot = shot.calculateOffsetPoint(
      pointExamples.firingPoint,
      pointExamples.geoShot,
      1
    )
    expect(offsetShot.x).toEqual(701774.8637818306)
    expect(offsetShot.y).toEqual(6096710.283639116)
    expect(offsetShot.z).toEqual(639.0130421805444)
  })
})
