class Point {
  constructor(x, y, z) {
    if (typeof x === 'object') {
      this.x = x.x
      this.y = x.y
      this.z = x.z
    } else {
      this.x = x === undefined ? 0 : x
      this.y = y === undefined ? 0 : y
      this.z = z === undefined ? 0 : z
    }
  }
}
module.exports = Point
