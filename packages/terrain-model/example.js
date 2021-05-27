const fs = require('fs')

const TerrainGrid = require('./process-terrain')

// the model can contain a 'settings' property to control:
//  laneWidth - the range lane widths
//  zeroElevation - if the elevation model should be zeroed based the minimum elevation
//  extrapolateWidth - extend the terrain model width (duplicates edge points)

// basic model structure is:
//  {
//    "settings": { ... optional, as above ... },
//    "<distance>": {
//      "label": <any suitable text - used as reference>,
//      "distance": <distance in metres>,
//      "elevations": [<elevation of each lane at distance>]
//    },
//    "<distance>": { ... },
//    "<distance>": {
//      "label": <any suitable text>,
//      "distance": <distance in metres>,
//      "reference": <label of elevations to use as reference>,
//      "adjustment": <metre value to change reference elevations by>
//    }
//  }

const model = require('./majura-mtr-terrain.json')

function manual() {
  const terrain = new TerrainGrid()

  const ok = terrain.validateModel(model)
  if (!ok) {
    console.error('Invalid model')
    return
  }

  // find all referenced entries and populate them with any evlevation adjustments
  const expandedModel = terrain.processReferences(model)

  // summary of the bounds of the model
  const bounds = terrain.determineBounds(expandedModel)

  // offset all elevations to create a zero baseline
  const normalisedModel = terrain.zeroElevations(expandedModel)

  // fill in all the blanks in the model to give 1x1 cell coverage
  const interpolatedModel = terrain.interpolate(normalisedModel, bounds)

  // expand the width by extrapolating the edge cells by 30 units
  const extrapolatedModel = terrain.extrapolateWidth(interpolatedModel, 30)

  // generate an svg of the results for visualisation purposes only
  const svg = terrain.generateSvg(extrapolatedModel)
  fs.writeFileSync('example-manual.svg', svg)
}

function auto() {
  // let the class do all the steps
  const terrain = new TerrainGrid(model)

  // generate an svg of the results for visualisation purposes only
  const svg = terrain.generateSvg(terrain.model)
  fs.writeFileSync('example-auto.svg', svg)
}

manual()
auto()
