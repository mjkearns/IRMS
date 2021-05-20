const TerrainGrid = require('./process-terrain')

let examples = {
  modelOne: {
    settings: {
      laneWidth: 5
    },
    '0': {
      label: 'item0m',
      distance: 0,
      elevations: [10, 20]
    }
  },
  modelTwo: {
    settings: {
      laneWidth: 5
    },
    '0': {
      label: 'item0m',
      distance: 0,
      elevations: [10, 20]
    },
    '10': {
      label: 'item10m',
      distance: 10,
      elevations: [20, 30]
    }
  },
  modelReference: {
    settings: {
      laneWidth: 5
    },
    '0': {
      label: 'item0m',
      distance: 0,
      reference: 'item10m'
    },
    '10': {
      label: 'item10m',
      distance: 10,
      elevations: [20, 30]
    }
  },
  modelReferenceAdjustment: {
    settings: {
      laneWidth: 5
    },
    '0': {
      label: 'item0m',
      distance: 0,
      reference: 'item10m',
      adjustment: -10
    },
    '10': {
      label: 'item10m',
      distance: 10,
      elevations: [20, 30]
    }
  }
}


describe('', () => {
  it('empty constructor', () => {
    let grid = new TerrainGrid()
    expect(grid).toBeDefined()
  })

  it('validation fail', () => {
    let grid = new TerrainGrid()
    expect(grid.validateModel({})).toBe(false)
    expect(grid.validateModel(1234)).toBe(false)
    expect(grid.validateModel('hello')).toBe(false)
    expect(grid.validateModel({
      item: {
        distance: 0
        // missing elevations
      }
    })).toBe(false)
    expect(grid.validateModel({
      item: {
        distance: 0,
        reference: 'item2'
      }
      // missing item2 reference
    })).toBe(false)
  })

  it('validation pass', () => {
    let grid = new TerrainGrid()
    expect(grid.validateModel(examples.modelOne)).toBe(true)
    expect(grid.validateModel(examples.modelTwo)).toBe(true)
    expect(grid.validateModel(examples.modelReference)).toBe(true)
  })

  it('populate references', () => {
    let grid = new TerrainGrid()
    let model = grid.processReferences(examples.modelReference)
    expect(model).toEqual({
      'settings': { laneWidth: 5 },
      '0': { distance: 0, elevations: [ 20, 30 ] },
      '10': { distance: 10, elevations: [ 20, 30 ] }
    })
    model = grid.processReferences(examples.modelReferenceAdjustment)
    expect(model).toEqual({
      'settings': { laneWidth: 5 },
      '0': { distance: 0, elevations: [ 10, 20 ] },
      '10': { distance: 10, elevations: [ 20, 30 ] }
    })
  })

  it('bounds', () => {
    let grid = new TerrainGrid()
    let bounds = grid.determineBounds(examples.modelTwo)
    expect(bounds.elevation).toEqual({ min: 10, max: 30 })
    expect(bounds.distance).toEqual({ min: 0, max: 10 })
    expect(bounds.lanes).toBe(2)
    expect(bounds.laneWidth).toBe(5)
  })

  it('adjust elevations', () => {
    let grid = new TerrainGrid()
    let model = grid.adjustElevations(examples.modelTwo)
    expect(model).toEqual({
      0: { label: 'item0m', distance: 0, elevations: [ 10, 20 ] },
      10: { label: 'item10m', distance: 10, elevations: [ 20, 30 ] }
    })
    
    model = grid.adjustElevations(examples.modelTwo, -10)
    expect(model).toEqual({
      0: { label: 'item0m', distance: 0, elevations: [ 0, 10 ] },
      10: { label: 'item10m', distance: 10, elevations: [ 10, 20 ] }
    })
  })

  it('zero elevations', () => {
    let grid = new TerrainGrid()
    let model = grid.adjustElevations(examples.modelTwo, 100)
    model = grid.zeroElevations(model)
    expect(model).toEqual({
      0: { label: 'item0m', distance: 0, elevations: [ 0, 10 ] },
      10: { label: 'item10m', distance: 10, elevations: [ 10, 20 ] }
    })
  })

  it('interpolate length', () => {
    let grid = new TerrainGrid()
    let bounds = grid.determineBounds(examples.modelTwo)
    let model = grid.interpolateLength(examples.modelTwo, bounds)
    expect(model['0']).toEqual({ label: 'item0m', distance: 0, elevations: [10, 20] })
    expect(model['2']).toEqual({ label: 'interpolated-2', distance: 2, elevations: [12, 22] })
    expect(model['8']).toEqual({ label: 'interpolated-8', distance: 8, elevations: [18, 28] })
    expect(model['10']).toEqual({ label: 'item10m', distance: 10, elevations: [20, 30] })
  })

  it('interpolate width', () => {
    let grid = new TerrainGrid()
    let bounds = grid.determineBounds(examples.modelTwo)
    let model = grid.interpolateWidth(examples.modelTwo, bounds)
    expect(model['0']).toEqual({ label: 'item0m', distance: 0, elevations: [10, 12.5, 15, 17.5, 20] })
    expect(model['10']).toEqual({ label: 'item10m', distance: 10, elevations: [20, 22.5, 25, 27.5, 30] })
  })

  it('extrapolate width', () => {
    let grid = new TerrainGrid()
    let model = grid.extrapolateWidth(examples.modelTwo, 1)
    expect(model['0']).toEqual({ label: 'item0m', distance: 0, elevations: [10, 10, 20, 20] })
    expect(model['10']).toEqual({ label: 'item10m', distance: 10, elevations: [20, 20, 30, 30] })
  })

  it('build array', () => {
    let grid = new TerrainGrid(examples.modelTwo)
    let array = grid.buildArray(grid.model)
    expect(array.length).toBe(11)
    expect(array).toEqual([
      [ 0, 2.5, 5, 7.5, 10 ],
      [ 1, 3.5, 6, 8.5, 11 ],
      [ 2, 4.5, 7, 9.5, 12 ],
      [ 3, 5.5, 8, 10.5, 13 ],
      [ 4, 6.5, 9, 11.5, 14 ],
      [ 5, 7.5, 10, 12.5, 15 ],
      [ 6, 8.5, 11, 13.5, 16 ],
      [ 7, 9.5, 12, 14.5, 17 ],
      [ 8, 10.5, 13, 15.5, 18 ],
      [ 9, 11.5, 14, 16.5, 19 ],
      [ 10, 12.5, 15, 17.5, 20 ]
    ])
  })

  it('build string', () => {
    let grid = new TerrainGrid(examples.modelTwo)
    let string = grid.buildString(grid.model)
    expect(string).toEqual(
      "0.00 2.50 5.00 7.50 10.00\n1.00 3.50 6.00 8.50 11.00\n2.00 4.50 7.00 9.50 12.00\n3.00 5.50 8.00 10.50 13.00\n4.00 6.50 9.00 11.50 14.00\n5.00 7.50 10.00 12.50 15.00\n6.00 8.50 11.00 13.50 16.00\n7.00 9.50 12.00 14.50 17.00\n8.00 10.50 13.00 15.50 18.00\n9.00 11.50 14.00 16.50 19.00\n10.00 12.50 15.00 17.50 20.00\n"
    )
  })
})