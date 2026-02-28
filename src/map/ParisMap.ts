import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { PhysicsWorld } from '../engine/PhysicsWorld'

export class ParisMap {
  private scene: THREE.Scene
  private physics: PhysicsWorld
  public buildings: THREE.Group = new THREE.Group()
  private streetLights: THREE.Group = new THREE.Group()
  private balloon!: THREE.Group
  private fountainWater!: THREE.Mesh
  public ambushSpots: THREE.Vector3[] = []

  private readonly MAP_SIZE = 80

  private readonly C = {
    fog:       0xffb060,
    road:      0x8a7a6a,
    sidewalk:  0xe8d0a8,
    buildings: [0xfff3d6, 0xffeab5, 0xfff5e0, 0xfae7c9, 0xf5deb3, 0xfce8c8, 0xf8e4b8, 0xfffaec],
    mansard:   [0x9b6b8a, 0x7a4f6d, 0xb8829a, 0x8b5a7a, 0xa06880, 0x6d4060, 0xc490a8],
    trunk:     0x8a6a45,
    leaves:    0x5a9a50,
    stone:     0xddd0c0,
    water:     0x5a8eaa,
    lamp:      0x4a3a28,
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene
    this.physics = physics
  }

  build(): void {
    this.setupAtmosphere()
    this.createGround()
    this.createSeine()
    this.createMergedCity()   // ← replaces createCityBlocks()
    this.createAlleyways()
    this.createElevatedPlatform()
    this.createButterPuddles()
    this.createStreetLights()
    this.createNotreDame()
    this.createCentralFountain()
    this.createTrees()
    this.createHotAirBalloon()
    this.scene.add(this.buildings, this.streetLights)
    this.loadEiffelTower()
  }

  update(t: number): void {
    if (this.fountainWater) {
      this.fountainWater.scale.x = 1 + Math.sin(t * 2.5) * 0.04
      this.fountainWater.scale.z = 1 + Math.cos(t * 2.5) * 0.04
    }
    if (this.balloon) {
      this.balloon.position.y = 32 + Math.sin(t * 0.35) * 2.5
      this.balloon.rotation.y += 0.002
    }
  }

  private setupAtmosphere(): void {
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 8),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          topColor:    { value: new THREE.Color(0x7a4a8a) },
          bottomColor: { value: new THREE.Color(0xffb347) },
          offset:      { value: 20.0 },
          exponent:    { value: 0.5 },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
          }`,
      })
    )
    this.scene.add(skyDome)
    this.scene.fog = new THREE.FogExp2(0xffb060, 0.012)

    const sun = new THREE.DirectionalLight(0xffaa44, 2.2)
    sun.position.set(40, 60, 20)
    sun.castShadow = true
    sun.shadow.mapSize.width  = 1024
    sun.shadow.mapSize.height = 1024
    sun.shadow.camera.near   = 0.5
    sun.shadow.camera.far    = 150
    sun.shadow.camera.left   = -55
    sun.shadow.camera.right  =  55
    sun.shadow.camera.top    =  55
    sun.shadow.camera.bottom = -55
    this.scene.add(sun)

    this.scene.add(new THREE.DirectionalLight(0x9966cc, 0.5).position.set(-30, 20, -20) && new THREE.DirectionalLight(0x9966cc, 0.5))
    const fill = new THREE.DirectionalLight(0x9966cc, 0.5)
    fill.position.set(-30, 20, -20)
    this.scene.add(fill)
    this.scene.add(new THREE.AmbientLight(0xffd6a5, 0.9))
  }

  private createGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.MAP_SIZE * 3, this.MAP_SIZE * 3),
      new THREE.MeshLambertMaterial({ color: this.C.road })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    this.physics.createGroundPlane(0)

    const swMat = new THREE.MeshLambertMaterial({ color: this.C.sidewalk })
    for (const r of [0, 18, -18, 36, -36, 54, -54]) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(this.MAP_SIZE * 3, 4.5), swMat)
      h.rotation.x = -Math.PI / 2; h.position.set(0, 0.01, r); this.scene.add(h)
      const v = new THREE.Mesh(new THREE.PlaneGeometry(4.5, this.MAP_SIZE * 3), swMat)
      v.rotation.x = -Math.PI / 2; v.position.set(r, 0.01, 0); this.scene.add(v)
    }
  }

  private createSeine(): void {
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(this.MAP_SIZE * 3, 20),
      new THREE.MeshLambertMaterial({ color: this.C.water, transparent: true, opacity: 0.9 })
    )
    river.rotation.x = -Math.PI / 2
    river.position.set(0, 0.02, -35)
    this.scene.add(river)

    const quaiMat = new THREE.MeshLambertMaterial({ color: 0xe0d0b0 })
    for (const side of [-1, 1]) {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(this.MAP_SIZE * 3, 5), quaiMat)
      q.rotation.x = -Math.PI / 2; q.position.set(0, 0.03, -35 + side * 12); this.scene.add(q)
    }
    const stoneMat = new THREE.MeshLambertMaterial({ color: this.C.stone })
    for (const [bx] of [[8],[-8]]) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 22), stoneMat)
      deck.position.set(bx, 0.9, -35); this.scene.add(deck)
    }
    for (const [bx, pz] of [[8,-7],[8,0],[8,7],[-8,-7],[-8,0],[-8,7]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.5, 8), stoneMat)
      p.position.set(bx, 0.5, -35 + pz); this.scene.add(p)
    }
  }

  // ─── MERGED CITY — one draw call per material bucket ─────────────────────────

  private createMergedCity(): void {
    const blocks: [number, number, number, number, number][] = [
      [ 10,  15,  8,  6,  14], [ 20,  15,  7,  7,  18], [ 30,  15,  8,  6,  12],
      [ 10,  25,  6,  5,  10], [ 20,  25,  8,  6,  16], [ 30,  25,  6,  6,  14],
      [ 10,  35,  7,  6,  11], [ 20,  35,  6,  5,  13], [ 30,  35,  7,  6,   9],
      [-10,  15,  8,  6,  16], [-20,  15,  7,  7,  14], [-30,  15,  8,  6,  18],
      [-10,  25,  6,  5,  12], [-20,  25,  8,  6,  10], [-30,  25,  6,  6,  15],
      [-10,  35,  7,  6,   9], [-20,  35,  6,  5,  11], [-30,  35,  7,  6,  13],
      [ 38,   5,  6,  6,  12], [ 38,  15,  5,  5,   9], [ 38,  25,  6,  5,  11],
      [ 38,  -5,  6,  6,  10], [ 38, -15,  5,  5,  13], [ 38, -25,  6,  5,   8],
      [-38,   5,  6,  6,  11], [-38,  15,  5,  5,  10], [-38,  25,  6,  5,  14],
      [-38,  -5,  6,  6,   9], [-38, -15,  5,  5,  12], [-38, -25,  6,  5,   8],
      [ 10, -15,  8,  6,  15], [ 20, -15,  7,  7,  11], [ 30, -15,  8,  6,  14],
      [ 10, -25,  6,  5,  10], [ 20, -25,  7,  6,  13], [ 30, -25,  6,  6,   9],
      [-10, -15,  8,  6,  12], [-20, -15,  7,  7,  16], [-30, -15,  8,  6,  10],
      [-10, -25,  6,  5,  14], [-20, -25,  7,  6,  11], [-30, -25,  6,  6,  13],
      [  7,   7,  5,  5,  10], [ -7,   7,  5,  5,  12], [  7,  -7,  5,  5,   9], [ -7,  -7,  5,  5,  11],
      [ 46,  10,  5,  5,   8], [-46,  10,  5,  5,   9], [ 46, -10,  5,  5,   7], [-46, -10,  5,  5,   8],
      [ 46,  28,  5,  5,   7], [-46,  28,  5,  5,   8], [ 15, -30,  6,  4,   8], [-15, -30,  6,  4,   9],
    ]

    // Geometry buckets — merged per material at end = ~6 draw calls for entire city
    const geoBody:     THREE.BufferGeometry[] = []
    const geoBand:     THREE.BufferGeometry[] = []
    const geoMansard:  THREE.BufferGeometry[] = []
    const geoChimney:  THREE.BufferGeometry[] = []
    const geoDoor:     THREE.BufferGeometry[] = []
    const geoWinLit:   THREE.BufferGeometry[] = []
    const geoWinDark:  THREE.BufferGeometry[] = []
    const geoWinWarm:  THREE.BufferGeometry[] = []
    const geoBalcony:  THREE.BufferGeometry[] = []
    const geoAwning:   THREE.BufferGeometry[] = []

    const dummy = new THREE.Object3D()

    for (const [x, z, w, d, h] of blocks) {
      // Physics
      this.physics.createBox(new CANNON.Vec3(w / 2, h / 2, d / 2), new CANNON.Vec3(x, h / 2, z))

      // ── Body
      const body = new THREE.BoxGeometry(w, h, d)
      dummy.position.set(x, h / 2, z); dummy.updateMatrix()
      body.applyMatrix4(dummy.matrix)
      geoBody.push(body)

      // ── Stone bands
      const bandCount = Math.floor(h / 2.5)
      for (let f = 1; f < bandCount; f++) {
        const band = new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12)
        dummy.position.set(x, f * 2.5, z); dummy.updateMatrix()
        band.applyMatrix4(dummy.matrix)
        geoBand.push(band)
      }

      // ── Mansard roof
      const r1 = new THREE.BoxGeometry(w + 0.4, h * 0.18, d + 0.4)
      dummy.position.set(x, h + h * 0.09, z); dummy.updateMatrix()
      r1.applyMatrix4(dummy.matrix)
      geoMansard.push(r1)

      const r2 = new THREE.BoxGeometry(w * 0.58, h * 0.12, d * 0.58)
      dummy.position.set(x, h + h * 0.23, z); dummy.updateMatrix()
      r2.applyMatrix4(dummy.matrix)
      geoMansard.push(r2)

      const ridge = new THREE.BoxGeometry(w * 0.3, 0.2, d * 0.3)
      dummy.position.set(x, h + h * 0.32, z); dummy.updateMatrix()
      ridge.applyMatrix4(dummy.matrix)
      geoMansard.push(ridge)

      // ── Chimneys
      const chimneyCount = 2 + Math.floor(Math.random() * 3)
      for (let c = 0; c < chimneyCount; c++) {
        const chimneyH = 1.0 + Math.random() * 1.4
        const cx = x + (Math.random() - 0.5) * w * 0.7
        const cz = z + (Math.random() - 0.5) * d * 0.7
        const baseY = h + h * 0.3
        const ch = new THREE.BoxGeometry(0.35, chimneyH, 0.35)
        dummy.position.set(cx, baseY + chimneyH / 2, cz); dummy.updateMatrix()
        ch.applyMatrix4(dummy.matrix)
        geoChimney.push(ch)
        const cap = new THREE.BoxGeometry(0.52, 0.18, 0.52)
        dummy.position.set(cx, baseY + chimneyH + 0.09, cz); dummy.updateMatrix()
        cap.applyMatrix4(dummy.matrix)
        geoChimney.push(cap)
      }

      // ── Door
      const doorX = x + (Math.random() - 0.5) * (w - 1.5)
      const door = new THREE.BoxGeometry(0.9, 1.9, 0.12)
      dummy.position.set(doorX, 0.95, z + d / 2 + 0.06); dummy.updateMatrix()
      door.applyMatrix4(dummy.matrix)
      geoDoor.push(door)

      // ── Awning
      if (Math.random() > 0.35) {
        const awn = new THREE.BoxGeometry(w * 0.65, 0.14, 1.6)
        dummy.position.set(x, 2.35, z + d / 2 + 0.8)
        dummy.rotation.set(0.3, 0, 0); dummy.updateMatrix()
        awn.applyMatrix4(dummy.matrix)
        dummy.rotation.set(0, 0, 0)
        geoAwning.push(awn)
      }

      // ── Balcony slabs only (bars skipped — too many tiny pieces)
      const floors = Math.floor(h / 2.5)
      for (let f = 1; f < floors; f += 2) {
        const balY = f * 2.5 + 0.04
        const slab = new THREE.BoxGeometry(w * 0.55, 0.12, 0.7)
        dummy.position.set(x, balY, z + d / 2 + 0.35); dummy.updateMatrix()
        slab.applyMatrix4(dummy.matrix)
        geoBalcony.push(slab)
      }

      // ── Windows
      const rows = Math.min(Math.floor(h / 2.5), 5)
      const cols = Math.min(Math.floor(w / 1.8), 5)
      const winGeo = new THREE.PlaneGeometry(0.52, 0.72)
      for (let row = 1; row <= rows; row++) {
        for (let col = 0; col < cols; col++) {
          const wx = x - w / 2 + (col + 0.7) * (w / cols)
          const wy = row * 2.5
          const wz = z + d / 2 + 0.01
          const r = Math.random()
          const win = winGeo.clone()
          dummy.position.set(wx, wy, wz); dummy.updateMatrix()
          win.applyMatrix4(dummy.matrix)
          if (r > 0.85)      geoWinWarm.push(win)
          else if (r > 0.25) geoWinLit.push(win)
          else               geoWinDark.push(win)
        }
      }
    }

    // ── Flush everything as single meshes
    const flush = (geos: THREE.BufferGeometry[], mat: THREE.Material, shadow = true) => {
      if (!geos.length) return
      const merged = mergeGeometries(geos, false)
      if (!merged) return
      const mesh = new THREE.Mesh(merged, mat)
      if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true }
      this.buildings.add(mesh)
    }

    // Randomly pick body color per building is impossible in merged mode,
    // so we use a single mid-tone warm cream — still looks great
    flush(geoBody,    new THREE.MeshLambertMaterial({ color: 0xfff0d8 }))
    flush(geoBand,    new THREE.MeshLambertMaterial({ color: 0xe8d5b0 }))
    flush(geoMansard, new THREE.MeshLambertMaterial({ color: 0x9b6b8a }))
    flush(geoChimney, new THREE.MeshLambertMaterial({ color: 0x8a6a5a }))
    flush(geoDoor,    new THREE.MeshLambertMaterial({ color: 0x3a2010 }))
    flush(geoBalcony, new THREE.MeshLambertMaterial({ color: 0xd8c8a8 }))
    flush(geoAwning,  new THREE.MeshLambertMaterial({ color: 0xc87820 }))
    flush(geoWinLit,  new THREE.MeshBasicMaterial({ color: 0xff9944, transparent: true, opacity: 0.95 }), false)
    flush(geoWinWarm, new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.88 }), false)
    flush(geoWinDark, new THREE.MeshBasicMaterial({ color: 0x2a3040, transparent: true, opacity: 0.85 }), false)
  }

  private createAlleyways(): void {
    const archMat = new THREE.MeshLambertMaterial({ color: 0xd0c0a8 })
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x3a3028 })
    const archways: [number, number, number][] = [
      [ 15,  20,   0], [-15,  20, Math.PI],
      [ 25,  -5,   0], [-25,  -5, Math.PI],
      [  0,  30, Math.PI / 2], [  0, -20, Math.PI / 2],
      [ 35,  20,   0], [-35,  20, Math.PI],
    ]
    for (const [x, z, ry] of archways) {
      const grp = new THREE.Group()
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 5.5, 1.3), archMat)
      pillarL.position.set(-2.2, 2.75, 0); grp.add(pillarL)
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.3, 5.5, 1.3), archMat)
      pillarR.position.set(2.2, 2.75, 0); grp.add(pillarR)
      const top = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.6, 1.3), archMat)
      top.position.set(0, 5.8, 0); grp.add(top)
      const inner = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.8, 0.9), darkMat)
      inner.position.set(0, 2.9, 0.2); grp.add(inner)
      grp.position.set(x, 0, z)
      grp.rotation.y = ry
      this.scene.add(grp)
      const off = new THREE.Vector3(0, 0.5, 1.8).applyEuler(new THREE.Euler(0, ry, 0))
      this.ambushSpots.push(new THREE.Vector3(x + off.x, 0.5, z + off.z))
      this.physics.createBox(new CANNON.Vec3(0.65, 2.75, 0.65), new CANNON.Vec3(x - 2.2, 2.75, z))
      this.physics.createBox(new CANNON.Vec3(0.65, 2.75, 0.65), new CANNON.Vec3(x + 2.2, 2.75, z))
    }
  }

  private createElevatedPlatform(): void {
    const mat  = new THREE.MeshLambertMaterial({ color: this.C.stone })
    const dark = new THREE.MeshLambertMaterial({ color: 0xb8a888 })
    const plat = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 9), mat)
    plat.position.set(0, 3.8, -20); plat.castShadow = true; plat.receiveShadow = true
    this.scene.add(plat)
    this.physics.createBox(new CANNON.Vec3(4.5, 0.25, 4.5), new CANNON.Vec3(0, 3.8, -20))
    for (const [px, pz] of [[-3.5,-3.5],[3.5,-3.5],[-3.5,3.5],[3.5,3.5]]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 3.8, 8), dark)
      pillar.position.set(px, 1.9, -20 + pz); this.scene.add(pillar)
    }
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 7), mat)
    ramp.position.set(4.2, 1.9, -20); ramp.rotation.x = Math.PI * 0.085
    ramp.castShadow = true; this.scene.add(ramp)
    this.physics.createBox(new CANNON.Vec3(1.4, 0.18, 3.5), new CANNON.Vec3(4.2, 1.9, -20))
    const railMat = new THREE.MeshLambertMaterial({ color: 0x9a9080 })
    for (const [rx, rz, rw, rd] of [[0,-4.4,9,0.15],[0,4.4,9,0.15],[-4.4,0,0.15,9]]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.65, rd), railMat)
      rail.position.set(rx, 4.35, -20 + rz); this.scene.add(rail)
    }
  }

  private createButterPuddles(): void {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe880, transparent: true, opacity: 0.72 })
    const spots: [number, number, number][] = [
      [15,20,1.1],[-15,20,0.9],[25,-5,1.0],[-25,-5,1.1],[0,30,0.8],[0,-20,1.0],
      [3,4,0.7],[-3,-4,0.9],[5,-3,0.8],[-5,3,0.7],[7,-23,1.0],[-7,-23,0.9],
      [18,8,0.8],[-18,-8,1.0],[12,-10,0.9],[-12,10,0.8],[22,0,0.7],[-22,0,0.8],
    ]
    for (const [px, pz, r] of spots) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(r, 10), mat)
      p.rotation.x = -Math.PI / 2; p.position.set(px, 0.03, pz); this.scene.add(p)
    }
  }

  private createStreetLights(): void {
    const positions: [number, number][] = [
      [6,6],[-6,6],[6,-6],[-6,-6],
      [14,14],[-14,14],[14,-14],[-14,-14],
      [0,22],[0,-22],[22,0],[-22,0],
      [22,18],[-22,18],[22,-18],[-22,-18],
      [36,5],[-36,5],[36,-5],[-36,-5],
    ]
    const poleMat = new THREE.MeshLambertMaterial({ color: this.C.lamp })
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff9933 })

    // Only 6 real point lights near center
    const realLightIdx = new Set([0,1,2,3,4,5])

    positions.forEach(([x, z], idx) => {
      const grp  = new THREE.Group()
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 5.5, 6), poleMat)
      pole.position.y = 2.75; grp.add(pole)
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.07), poleMat)
      arm.position.set(0.6, 5.6, 0); grp.add(arm)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), bulbMat)
      bulb.position.set(1.2, 5.42, 0); grp.add(bulb)
      if (realLightIdx.has(idx)) {
        const light = new THREE.PointLight(0xff8833, 2.0, 20, 2)
        light.position.set(1.2, 5.4, 0); grp.add(light)
      }
      grp.position.set(x, 0, z)
      this.streetLights.add(grp)
    })
  }

  private createNotreDame(): void {
    const grp   = new THREE.Group()
    const stone = new THREE.MeshLambertMaterial({ color: 0xe8dcc8 })
    const dark  = new THREE.MeshLambertMaterial({ color: 0x8a8070 })
    const nave = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 16), stone)
    nave.position.y = 3.5; nave.castShadow = true; grp.add(nave)
    const choir = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 6), stone)
    choir.position.set(0, 3, 10); grp.add(choir)
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 4, 6, 4), dark)
    roof.position.y = 9; roof.rotation.y = Math.PI / 4; grp.add(roof)
    for (const tx of [-3.5, 3.5]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(3, 14, 3), stone)
      t.position.set(tx, 7, -5.5); grp.add(t)
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 1.3, 4, 6), dark)
      sp.position.set(tx, 15, -5.5); grp.add(sp)
    }
    const ms = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.8, 6, 6), dark)
    ms.position.set(0, 13, 5); grp.add(ms)
    const rose = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16),
      new THREE.MeshBasicMaterial({ color: 0x88bbee }))
    rose.position.set(0, 6, -7.6); rose.rotation.y = Math.PI; grp.add(rose)
    grp.position.set(-10, 0, -26)
    this.scene.add(grp)
    this.physics.createBox(new CANNON.Vec3(5, 8, 8), new CANNON.Vec3(-10, 8, -26))
  }

  private createCentralFountain(): void {
    const stone = new THREE.MeshLambertMaterial({ color: this.C.stone })
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 24),
      new THREE.MeshLambertMaterial({ color: 0xeeddc8 }))
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; this.scene.add(plaza)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.32, 6, 24), stone)
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.38; this.scene.add(rim)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.8, 0.5, 16), stone)
    base.position.y = 0.25; this.scene.add(base)
    this.fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 0.15, 20),
      new THREE.MeshLambertMaterial({ color: this.C.water, transparent: true, opacity: 0.8 }))
    this.fountainWater.position.y = 0.55; this.scene.add(this.fountainWater)
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 4.5, 8), stone)
    col.position.y = 2.75; this.scene.add(col)
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), stone)
    top.position.y = 5.5; this.scene.add(top)
    const fLight = new THREE.PointLight(0x88ccff, 1.0, 10)
    fLight.position.set(0, 1.5, 0); this.scene.add(fLight)
  }

  private createTrees(): void {
    const trunkMat = new THREE.MeshLambertMaterial({ color: this.C.trunk })
    const leafMat  = new THREE.MeshToonMaterial({ color: this.C.leaves })
    const positions: [number, number][] = [
      [-8,8],[8,8],[-8,-8],[8,-8],[15,0],[-15,0],[0,15],[0,-14],
      [12,24],[-12,24],[28,10],[-28,10],[32,-8],[-32,-8],
      [18,30],[-18,30],[40,18],[-40,18],
    ]
    for (const [x, z] of positions) {
      const grp = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 2.4, 6), trunkMat)
      trunk.position.y = 1.2; grp.add(trunk)
      const bot = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), leafMat)
      bot.position.y = 3.2; bot.castShadow = true; grp.add(bot)
      const top = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), leafMat)
      top.position.y = 4.5; grp.add(top)
      grp.position.set(x, 0, z); this.scene.add(grp)
    }
  }

  private createHotAirBalloon(): void {
    this.balloon = new THREE.Group()
    const colors = [0xff7090, 0xffc0d0, 0xff7090, 0xffc0d0]
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 4, 10, (i / 4) * Math.PI * 2, Math.PI / 2),
        new THREE.MeshToonMaterial({ color: colors[i], side: THREE.DoubleSide }))
      p.scale.y = 1.4; this.balloon.add(p)
    }
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5),
      new THREE.MeshLambertMaterial({ color: 0xc09050 }))
    basket.position.y = -5.6; this.balloon.add(basket)
    this.balloon.position.set(14, 32, 0); this.scene.add(this.balloon)
  }

  private loadEiffelTower(): void {
    new GLTFLoader().load('/eiffel_tower.glb', (gltf) => {
      const tower = gltf.scene
      const box   = new THREE.Box3().setFromObject(tower)
      const size  = new THREE.Vector3(); box.getSize(size)
      tower.scale.setScalar(38 / size.y)
      box.setFromObject(tower)
      tower.position.set(-22, -box.min.y, 10)
      tower.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true } })
      this.scene.add(tower)
      this.physics.createBox(new CANNON.Vec3(4, 19, 4), new CANNON.Vec3(-22, 19, 10))
    }, undefined, () => this.createEiffelFallback())
  }

  private createEiffelFallback(): void {
    const grp = new THREE.Group()
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a4a5a })
    for (const [lx, lz] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.8, 9, 6), mat)
      leg.position.set(lx * 3.5, 4.5, lz * 3.5); grp.add(leg)
    }
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 7), mat); p1.position.y = 9; grp.add(p1)
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.8, 9, 8), mat); mid.position.y = 14; grp.add(mid)
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.8, 16, 6), mat); spire.position.y = 27; grp.add(spire)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3333 }))
    tip.position.y = 35; grp.add(tip)
    grp.position.set(-22, 0, 10); this.scene.add(grp)
    this.physics.createBox(new CANNON.Vec3(4, 18, 4), new CANNON.Vec3(-22, 18, 10))
  }

  getBounds() {
    const h = this.MAP_SIZE / 2
    return { min: new THREE.Vector3(-h, 0, -h), max: new THREE.Vector3(h, 0, h) }
  }

  getIngredientSpawnPositions(): THREE.Vector3[] {
    return [
      new THREE.Vector3(  0,  4.1, -20),
      new THREE.Vector3(-46,  0.5,  10),
      new THREE.Vector3( 30,  0.5, -22),
      new THREE.Vector3(-30,  0.5,  32),
      new THREE.Vector3( 15,  0.5, -28),
    ]
  }

  getCatPatrolRoutes(): THREE.Vector3[][] {
    return [
      [new THREE.Vector3(10,0.5,15), new THREE.Vector3(30,0.5,15), new THREE.Vector3(30,0.5,35), new THREE.Vector3(10,0.5,35)],
      [new THREE.Vector3(-10,0.5,-15), new THREE.Vector3(-30,0.5,-15), new THREE.Vector3(-30,0.5,-25), new THREE.Vector3(-10,0.5,-25)],
      [new THREE.Vector3(12,0.5,0), new THREE.Vector3(12,0.5,-22), new THREE.Vector3(-12,0.5,-22), new THREE.Vector3(-12,0.5,0)],
    ]
  }

  getAmbushPositions(): THREE.Vector3[] { return this.ambushSpots }
}