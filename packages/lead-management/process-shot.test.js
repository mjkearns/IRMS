const shot = require('./process-shot')

const pointExamples = {
  firingPoint: {
    x: 701770.3174384605,
    y: 6096810.844646253,
    z: 643.438
  },
  geoShot: {
    x: 701774.8186181592,
    y: 6096711.282618717,
    z: 639.0569999999999
  }
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
