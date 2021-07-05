const Point = require('../models/point')

describe('', () => {
  it('empty constructor', () => {
    const point = new Point()
    expect(point.x).toEqual(0)
    expect(point.y).toEqual(0)
    expect(point.z).toEqual(0)
  })
  it('individual parameter constructor', () => {
    const point = new Point(1, 2, 3)
    expect(point.x).toEqual(1)
    expect(point.y).toEqual(2)
    expect(point.z).toEqual(3)
  })
  it('object parameter constructor', () => {
    const point = new Point({ x: 4, y: 5, z: 6 })
    expect(point.x).toEqual(4)
    expect(point.y).toEqual(5)
    expect(point.z).toEqual(6)
  })
})
