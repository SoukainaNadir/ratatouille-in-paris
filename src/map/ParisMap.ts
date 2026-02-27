import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PhysicsWorld } from '../engine/PhysicsWorld'

interface BuildingConfig {
  x: number
  z: number
  w: number
  d: number
  h: number
  color: number
}


export class ParisMap {
  private scene: THREE.Scene
  private physics: PhysicsWorld
  public buildings: THREE.Group = new THREE.Group()
  private streetLights: THREE.Group = new THREE.Group()

  private readonly COLORS = {
    ground: 0x8a7a6a,
    road: 0x555555,
    sidewalk: 0xc8b89a,
    buildings: [0xd4c4a8, 0xc8b99a, 0xe0d0b8, 0xb8a890, 0xdfd0bb, 0xcabc9e],
    windows: 0x88aacc,
    roofs: [0x7a6878, 0x8a7a88, 0x6a5a68],
    greenery: 0x5a8a4a,
    fountain: 0x4488aa
  }

  private readonly MAP_SIZE = 80
  private readonly ROAD_WIDTH = 5

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene
    this.physics = physics
  }

  build(): void {
    this.createGround()
    this.createStreetGrid()
    this.createBuildings()
    this.createSidewalkDetails()
    this.createStreetLights()
    this.createCentralPlace()
    this.createTrees()

    this.scene.add(this.buildings, this.streetLights)
  }

  private createGround(): void {
    const geo = new THREE.PlaneGeometry(this.MAP_SIZE * 2, this.MAP_SIZE * 2)
    const mat = new THREE.MeshLambertMaterial({ color: this.COLORS.road })
    const ground = new THREE.Mesh(geo, mat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.physics.createGroundPlane(0)
  }

  private createStreetGrid(): void {
    const roadMat = new THREE.MeshLambertMaterial({ color: this.COLORS.road })
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: this.COLORS.sidewalk })

    const numRoads = 5
    const spacing = 20

    for (let i = -numRoads; i <= numRoads; i++) {
      const hRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.MAP_SIZE * 2, this.ROAD_WIDTH),
        roadMat
      )
      hRoad.rotation.x = -Math.PI / 2
      hRoad.position.set(0, 0.01, i * spacing)
      hRoad.receiveShadow = true
      this.scene.add(hRoad)

      const vRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(this.ROAD_WIDTH, this.MAP_SIZE * 2),
        roadMat
      )
      vRoad.rotation.x = -Math.PI / 2
      vRoad.position.set(i * spacing, 0.01, 0)
      vRoad.receiveShadow = true
      this.scene.add(vRoad)

      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(
          new THREE.PlaneGeometry(this.MAP_SIZE * 2, 2),
          sidewalkMat
        )
        sw.rotation.x = -Math.PI / 2
        sw.position.set(0, 0.02, i * spacing + side * 3.2)
        this.scene.add(sw)
      }
    }

    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    for (let i = -numRoads; i <= numRoads; i++) {
      for (let j = -10; j <= 10; j++) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(2.5, 0.15),
          dashMat
        )
        dash.rotation.x = -Math.PI / 2
        dash.position.set(j * 5, 0.015, i * spacing)
        this.scene.add(dash)

        const dashV = new THREE.Mesh(
          new THREE.PlaneGeometry(0.15, 2.5),
          dashMat
        )
        dashV.rotation.x = -Math.PI / 2
        dashV.position.set(i * spacing, 0.015, j * 5)
        this.scene.add(dashV)
      }
    }
  }

  private createBuildings(): void {
    const blocks = this.generateCityBlocks()

    for (const block of blocks) {
      this.buildBuilding(block)
    }
  }

  private generateCityBlocks(): BuildingConfig[] {
    const configs: BuildingConfig[] = []
    const spacing = 20

    for (let bx = -4; bx <= 4; bx++) {
      for (let bz = -4; bz <= 4; bz++) {
        const baseX = bx * spacing
        const baseZ = bz * spacing

        const numBuildings = 2 + Math.floor(Math.random() * 3)

        for (let b = 0; b < numBuildings; b++) {
          const angle = (b / numBuildings) * Math.PI * 2
          const radius = 5 + Math.random() * 3
          const x = baseX + Math.cos(angle) * radius
          const z = baseZ + Math.sin(angle) * radius
          const w = 4 + Math.random() * 5
          const d = 4 + Math.random() * 5
          const h = 4 + Math.random() * 10 

          const colorIdx = Math.floor(Math.random() * this.COLORS.buildings.length)

          configs.push({ x, z, w, d, h, color: this.COLORS.buildings[colorIdx] })
        }
      }
    }

    return configs
  }

  private buildBuilding(config: BuildingConfig): void {
    const { x, z, w, d, h, color } = config

    const group = new THREE.Group()

    const bodyGeo = new THREE.BoxGeometry(w, h, d)
    const bodyMat = new THREE.MeshLambertMaterial({ color })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, h / 2, 0)
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const roofColorIdx = Math.floor(Math.random() * this.COLORS.roofs.length)
    const roofGeo = new THREE.BoxGeometry(w, h * 0.2, d)
    const roofMat = new THREE.MeshLambertMaterial({ color: this.COLORS.roofs[roofColorIdx] })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, h + h * 0.1, 0)
    group.add(roof)

    this.addWindows(group, w, h, d)

    this.addGroundFloor(group, w, d)

    group.position.set(x, 0, z)
    this.buildings.add(group)

    const halfExtents = new CANNON.Vec3(w / 2, h / 2 + 1, d / 2)
    this.physics.createBox(
      halfExtents,
      new CANNON.Vec3(x, h / 2, z)
    )
  }

  private addWindows(group: THREE.Group, w: number, h: number, d: number): void {
    const winMat = new THREE.MeshBasicMaterial({
      color: this.COLORS.windows,
      transparent: true,
      opacity: 0.8
    })
    const winDark = new THREE.MeshBasicMaterial({
      color: 0x223344,
      transparent: true,
      opacity: 0.9
    })

    const rows = Math.floor(h / 2.2)
    const colsX = Math.floor(w / 1.8)
    const colsZ = Math.floor(d / 1.8)

    const winGeo = new THREE.PlaneGeometry(0.7, 0.9)

    for (let row = 1; row <= rows; row++) {
      for (let col = 0; col < colsX; col++) {
        const wx = -w / 2 + (col + 0.8) * (w / colsX)
        const wy = row * 2
        const isLit = Math.random() > 0.4

        const win = new THREE.Mesh(winGeo, isLit ? winMat : winDark)
        win.position.set(wx, wy, d / 2 + 0.01)
        group.add(win)

        const winBack = new THREE.Mesh(winGeo, isLit ? winMat : winDark)
        winBack.position.set(wx, wy, -d / 2 - 0.01)
        winBack.rotation.y = Math.PI
        group.add(winBack)
      }
    }
  }

  private addGroundFloor(group: THREE.Group, w: number, d: number): void {
    const doorGeo = new THREE.BoxGeometry(0.8, 1.8, 0.1)
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3a2010 })
    const door = new THREE.Mesh(doorGeo, doorMat)
    door.position.set(0, 0.9, d / 2 + 0.05)
    group.add(door)

    const frameGeo = new THREE.BoxGeometry(1, 2, 0.08)
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x8a7a60 })
    const frame = new THREE.Mesh(frameGeo, frameMat)
    frame.position.set(0, 1, d / 2 + 0.08)
    group.add(frame)

    if (Math.random() > 0.5) {
      const awningGeo = new THREE.BoxGeometry(w * 0.6, 0.1, 1.2)
      const awningColors = [0xcc4444, 0x4444cc, 0x44aa44, 0xcc8844]
      const awningMat = new THREE.MeshLambertMaterial({
        color: awningColors[Math.floor(Math.random() * awningColors.length)]
      })
      const awning = new THREE.Mesh(awningGeo, awningMat)
      awning.position.set(0, 2.2, d / 2 + 0.6)
      awning.rotation.x = 0.3
      group.add(awning)
    }
  }

  private createCentralPlace(): void {
    const plazaGeo = new THREE.CircleGeometry(8, 32)
    const plazaMat = new THREE.MeshLambertMaterial({ color: this.COLORS.sidewalk })
    const plaza = new THREE.Mesh(plazaGeo, plazaMat)
    plaza.rotation.x = -Math.PI / 2
    plaza.position.y = 0.02
    this.scene.add(plaza)

    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 3, 0.5, 16),
      new THREE.MeshLambertMaterial({ color: 0x999980 })
    )
    fountainBase.position.y = 0.25
    this.scene.add(fountainBase)

    const waterGeo = new THREE.CylinderGeometry(2, 2, 0.2, 16)
    const waterMat = new THREE.MeshLambertMaterial({
      color: this.COLORS.fountain,
      transparent: true,
      opacity: 0.8
    })
    const water = new THREE.Mesh(waterGeo, waterMat)
    water.position.y = 0.6
    this.scene.add(water)

    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 2.5, 8),
      new THREE.MeshLambertMaterial({ color: 0x888870 })
    )
    column.position.y = 1.5
    this.scene.add(column)

    const topDec = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
    )
    topDec.position.y = 3
    this.scene.add(topDec)
  }

  private createTrees(): void {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a })
    const leafMat = new THREE.MeshToonMaterial({ color: this.COLORS.greenery })

    const treePositions = [
      [-6, 6], [6, 6], [-6, -6], [6, -6],
      [10, 0], [-10, 0], [0, 10], [0, -10],
      [18, 5], [-18, 5], [18, -5], [-18, -5],
      [5, 18], [-5, 18], [5, -18], [-5, -18],
    ]

    for (const [x, z] of treePositions) {
      const tree = new THREE.Group()

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6),
        trunkMat
      )
      trunk.position.y = 0.75
      tree.add(trunk)

      const leaves = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1 + Math.random() * 0.5, 0),
        leafMat
      )
      leaves.position.y = 2.2
      leaves.castShadow = true
      tree.add(leaves)

      tree.position.set(x, 0, z)
      this.scene.add(tree)
    }
  }

  private createSidewalkDetails(): void {
    const tablePositions = [
      [8, 5], [-8, -5], [12, 8], [-12, 8]
    ]
    const tableMat = new THREE.MeshLambertMaterial({ color: 0x8a6030 })
    const chairMat = new THREE.MeshLambertMaterial({ color: 0x6a4828 })

    for (const [x, z] of tablePositions) {
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.05, 8),
        tableMat
      )
      table.position.set(x, 0.8, z)
      this.scene.add(table)

      const tableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6),
        tableMat
      )
      tableLeg.position.set(x, 0.4, z)
      this.scene.add(tableLeg)

      for (let c = 0; c < 2; c++) {
        const angle = c * Math.PI
        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.05, 0.4),
          chairMat
        )
        chair.position.set(
          x + Math.cos(angle) * 0.8,
          0.6,
          z + Math.sin(angle) * 0.8
        )
        this.scene.add(chair)
      }
    }

    const baguetteMat = new THREE.MeshToonMaterial({ color: 0xc8a050 })
    for (let b = 0; b < 8; b++) {
      const baguette = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.08, 1.5, 4, 8),
        baguetteMat
      )
      const angle = (b / 8) * Math.PI * 2
      const r = 6 + Math.random() * 10
      baguette.position.set(
        Math.cos(angle) * r,
        0.08,
        Math.sin(angle) * r
      )
      baguette.rotation.z = Math.PI / 2
      baguette.rotation.y = Math.random() * Math.PI
      this.scene.add(baguette)
    }

    const butterMat = new THREE.MeshBasicMaterial({
      color: 0xffee88,
      transparent: true,
      opacity: 0.7
    })
    const butterPositions = [
      [3, 3], [-4, 7], [8, -3], [-9, -6], [5, -9]
    ]
    for (const [bx, bz] of butterPositions) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(1 + Math.random() * 0.5, 16),
        butterMat
      )
      puddle.rotation.x = -Math.PI / 2
      puddle.position.set(bx, 0.03, bz)
      this.scene.add(puddle)
    }
  }

  private createStreetLights(): void {
    const polePositions = [
      [4, 4], [-4, 4], [4, -4], [-4, -4],
      [4, -20], [-4, -20], [4, 20], [-4, 20],
      [20, 4], [-20, 4], [20, -4], [-20, -4],
    ]

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 })
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 })

    for (const [x, z] of polePositions) {
      const group = new THREE.Group()

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 4, 6),
        poleMat
      )
      pole.position.y = 2

      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.06, 0.06),
        poleMat
      )
      arm.position.set(0.4, 4.1, 0)

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        bulbMat
      )
      bulb.position.set(0.8, 4, 0)

      const light = new THREE.PointLight(0xfffbe0, 0.8, 12, 2)
      light.position.set(0.8, 4, 0)

      group.add(pole, arm, bulb, light)
      group.position.set(x, 0, z)
      this.streetLights.add(group)
    }
  }

  getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    const half = this.MAP_SIZE / 2
    return {
      min: new THREE.Vector3(-half, 0, -half),
      max: new THREE.Vector3(half, 0, half)
    }
  }

  getIngredientSpawnPositions(): THREE.Vector3[] {
    return [
      new THREE.Vector3(15, 0, 8),
      new THREE.Vector3(-12, 0, 15),
      new THREE.Vector3(8, 0, -18),
      new THREE.Vector3(-20, 0, -10),
      new THREE.Vector3(25, 0, -5)
    ]
  }

  getCatPatrolRoutes(): THREE.Vector3[][] {
    return [
      [
        new THREE.Vector3(5, 0.5, 5),
        new THREE.Vector3(15, 0.5, 5),
        new THREE.Vector3(15, 0.5, 15),
        new THREE.Vector3(5, 0.5, 15)
      ],
      [
        new THREE.Vector3(-5, 0.5, -5),
        new THREE.Vector3(-15, 0.5, -5),
        new THREE.Vector3(-15, 0.5, -15),
        new THREE.Vector3(-5, 0.5, -15)
      ],
      [
        new THREE.Vector3(20, 0.5, 0),
        new THREE.Vector3(20, 0.5, -15),
        new THREE.Vector3(10, 0.5, -15),
        new THREE.Vector3(10, 0.5, 0)
      ]
    ]
  }
}