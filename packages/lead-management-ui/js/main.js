import * as THREE from './threejs/three.module.js'
import { OrbitControls } from './threejs/OrbitControls.js'

var scene
var camera
var renderer
var terrainMesh
var controls

var rangeModel = {
  lanes: 12,
  laneWidth: 10,
  length: 600
}

document.getElementById('start').addEventListener('click', () => {
  generateTestValues()
})

document.addEventListener('DOMContentLoaded', (event) => {
  initScene()
  initCamera()
  initRenderer()
  initTerrain()
  initLanes()
  initControls()
  animate()
})

function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x121212)
}

function initCamera() {
  let fov = 75
  let aspect = window.innerWidth / window.innerHeight
  let near = 0.1
  let far = 1000
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  camera.position.z = 275
  camera.position.x = 275
  camera.position.y = 275
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
}

function initTerrain() {
  let texture = new THREE.TextureLoader().load('../terrain.png')
  let geometry = new THREE.PlaneGeometry(
    rangeModel.laneWidth * rangeModel.lanes,
    rangeModel.length,
    rangeModel.laneWidth * rangeModel.lanes,
    rangeModel.length
  )
  let material = new THREE.MeshBasicMaterial({
    side: THREE.SingleSide,
    map: texture
  })
  terrainMesh = new THREE.Mesh(geometry, material)
  terrainMesh.rotation.x = -Math.PI / 2
  scene.add(terrainMesh)

  console.log(geometry)
}

function initLanes() {
  let material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 2,
    transparent: true,
    opacity: 0.1
  })
  let offsetZ = -(rangeModel.length / 2)
  let offsetX = -((rangeModel.lanes * rangeModel.laneWidth) / 2)
  for (let i = 1; i < rangeModel.lanes; i++) {
    let points = []
    points.push(
      new THREE.Vector3(offsetX + i * rangeModel.laneWidth, 0.05, offsetZ)
    )
    points.push(
      new THREE.Vector3(offsetX + i * rangeModel.laneWidth, 0.05, -offsetZ)
    )
    let geometry = new THREE.BufferGeometry().setFromPoints(points)
    let line = new THREE.Line(geometry, material)
    scene.add(line)
  }
}

function initControls() {
  controls = new OrbitControls(camera, renderer.domElement)
  //controls.autoRotate = true
  controls.update()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function generateTestValues() {
  let valuesToCreate = 1000
  let group = new THREE.Group()
  for (let i = 0; i < valuesToCreate; i++) {
    let xIndex =
      Math.floor(Math.random() * (rangeModel.laneWidth * rangeModel.lanes)) + 1
    let yIndex = Math.floor(Math.random() * rangeModel.length) + 1
    yIndex = getRandomInt(80, rangeModel.length)
    let zHeight = getRandomFloat(0.1, 1)

    let color = 0xbb0000
    if (zHeight <= 0.25) {
      color = 0xbbbbbb
    } else if (zHeight > 0.25 && zHeight <= 0.5) {
      color = 0xbbbb00
    } else if (zHeight > 0.5 && zHeight <= 0.75) {
      color = 0xffa500
    }

    let geometry = new THREE.BoxGeometry(1, 1, zHeight)
    let material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })

    let valueMesh = new THREE.Mesh(geometry, material)
    valueMesh.position.x =
      xIndex - (rangeModel.laneWidth * rangeModel.lanes) / 2 - 0.5
    valueMesh.position.y = yIndex - rangeModel.length / 2 - 0.5
    valueMesh.position.z = zHeight / 2
    group.add(valueMesh)
  }
  group.rotation.x = -Math.PI / 2
  group.position.y = 0.1
  scene.add(group)
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min + 1) + min
}

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min)
}
