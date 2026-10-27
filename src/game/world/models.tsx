import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// Stylized procedural models. They stand in until rigged glTF assets are added (see docs/implementation-plan.md).

export interface PersonLook {
  robe: string
  hat: string
  hatShape: 'borik' | 'kimeshek' | 'tymak'
  beard: boolean
  height: number
}

/** A person in a long чапан. `gait` is a ref: 0 idle, ~1 walk, ~2 run. `talking` bobs the head. */
export function Person({
  look,
  gait,
  talking,
  seated,
}: {
  look: PersonLook
  gait?: React.RefObject<number>
  talking?: boolean
  seated?: boolean
}) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const phase = useRef(Math.random() * 10)

  useFrame((state, dt) => {
    const g = gait?.current ?? 0
    phase.current += dt * (4 + g * 3) * Math.min(1, g)
    const swing = seated ? 0 : Math.sin(phase.current) * 0.5 * Math.min(1, g)
    if (legL.current && legR.current) {
      legL.current.rotation.x = seated ? -1.4 : swing
      legR.current.rotation.x = seated ? -1.4 : -swing
    }
    if (armL.current && armR.current) {
      armL.current.rotation.x = -swing * 0.8
      armR.current.rotation.x = swing * 0.8
    }
    if (head.current) {
      const t = state.clock.elapsedTime
      head.current.rotation.x = talking ? Math.sin(t * 9) * 0.06 : Math.sin(t * 0.7) * 0.02
      head.current.rotation.y = talking ? Math.sin(t * 2.3) * 0.12 : 0
    }
  })

  const robe = look.robe
  const skin = '#c99a74'
  const boots = '#2a1d14'
  return (
    <group scale={look.height}>
      <group position={[0, seated ? -0.35 : 0, 0]}>
        {/* legs */}
        <group ref={legL} position={[-0.12, 0.75, 0]}>
          <mesh position={[0, -0.37, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.74, 6]} />
            <meshStandardMaterial color={boots} />
          </mesh>
        </group>
        <group ref={legR} position={[0.12, 0.75, 0]}>
          <mesh position={[0, -0.37, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.74, 6]} />
            <meshStandardMaterial color={boots} />
          </mesh>
        </group>
        {/* robe */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.36, 0.95, 8]} />
          <meshStandardMaterial color={robe} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.36, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.35, 8]} />
          <meshStandardMaterial color={robe} roughness={0.9} />
        </mesh>
        {/* belt */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.245, 0.245, 0.06, 8]} />
          <meshStandardMaterial color="#b8892d" metalness={0.3} />
        </mesh>
        {/* arms */}
        <group ref={armL} position={[-0.31, 1.48, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.08, 0.6, 6]} />
            <meshStandardMaterial color={robe} />
          </mesh>
          <mesh position={[0, -0.63, 0]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
        <group ref={armR} position={[0.31, 1.48, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.08, 0.6, 6]} />
            <meshStandardMaterial color={robe} />
          </mesh>
          <mesh position={[0, -0.63, 0]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
        {/* head */}
        <group ref={head} position={[0, 1.66, 0]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <sphereGeometry args={[0.15, 10, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          {look.beard && (
            <mesh position={[0, -0.01, 0.1]} scale={[1, 1.4, 0.7]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshStandardMaterial color="#d9d4cc" />
            </mesh>
          )}
          <Hat shape={look.hatShape} color={look.hat} />
        </group>
      </group>
    </group>
  )
}

function Hat({ shape, color }: { shape: PersonLook['hatShape']; color: string }) {
  if (shape === 'kimeshek') {
    // A married woman's white wrapped headdress.
    return (
      <group position={[0, 0.14, -0.01]}>
        <mesh>
          <sphereGeometry args={[0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.15, 0.17, 0.14, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, -0.14, -0.05]}>
          <cylinderGeometry args={[0.17, 0.2, 0.22, 10, 1, true]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }
  if (shape === 'tymak') {
    // Fur winter hat with ear flaps.
    return (
      <group position={[0, 0.2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.14, 0.18, 0.2, 10]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <torusGeometry args={[0.17, 0.05, 6, 12]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
        <mesh position={[-0.17, -0.14, 0]}>
          <boxGeometry args={[0.06, 0.18, 0.14]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
        <mesh position={[0.17, -0.14, 0]}>
          <boxGeometry args={[0.06, 0.18, 0.14]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      </group>
    )
  }
  // Бөрік: rounded cap with a fur band.
  return (
    <group position={[0, 0.2, 0]}>
      <mesh>
        <sphereGeometry args={[0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#7a1f2b" />
      </mesh>
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.155, 0.045, 6, 12]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  )
}

/** A low-poly horse. `gait` ref: 0 idle, 1 walk, 2+ gallop. */
export function Horse({ color = '#6b4423', gait, saddle }: { color?: string; gait?: React.RefObject<number>; saddle?: boolean }) {
  const legs = useRef<(THREE.Group | null)[]>([])
  const body = useRef<THREE.Group>(null)
  const neck = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const phase = useRef(Math.random() * 10)
  const mane = useMemo(() => new THREE.Color(color).multiplyScalar(0.35).getStyle(), [color])

  useFrame((state, dt) => {
    const g = gait?.current ?? 0
    const gallop = g > 1.5
    phase.current += dt * (gallop ? 11 : 6) * Math.min(1, g)
    const p = phase.current
    const amp = gallop ? 0.8 : 0.45 * Math.min(1, g)
    // Walk: diagonal pairs. Gallop: front and back pairs out of phase.
    const offsets = gallop ? [0, 0.3, Math.PI, Math.PI + 0.3] : [0, Math.PI, Math.PI, 0]
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(p + offsets[i]) * amp
    })
    if (body.current) body.current.position.y = gallop ? Math.abs(Math.sin(p)) * 0.12 : 0
    if (neck.current) {
      const t = state.clock.elapsedTime
      neck.current.rotation.x = g < 0.1 ? -0.15 + Math.sin(t * 0.5) * 0.05 : -0.35 + Math.sin(p * 2) * (gallop ? 0.1 : 0.04)
    }
    if (tail.current) tail.current.rotation.x = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1 + Math.min(1, g) * 0.4
  })

  const legPos: [number, number, number][] = [
    [-0.22, 1.0, 0.75],
    [0.22, 1.0, 0.75],
    [-0.22, 1.0, -0.75],
    [0.22, 1.0, -0.75],
  ]
  return (
    <group>
      <group ref={body}>
        {legPos.map((pos, i) => (
          <group key={i} position={pos} ref={(el) => void (legs.current[i] = el)}>
            <mesh position={[0, -0.5, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.055, 1.0, 6]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, -0.98, 0]}>
              <cylinderGeometry args={[0.07, 0.08, 0.08, 6]} />
              <meshStandardMaterial color="#1b1410" />
            </mesh>
          </group>
        ))}
        {/* barrel */}
        <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.36, 1.2, 4, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* neck and head */}
        <group ref={neck} position={[0, 1.45, 0.85]}>
          <mesh position={[0, 0.35, 0.18]} rotation={[0.6, 0, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.24, 0.85, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.72, 0.46]} rotation={[1.25, 0, 0]} castShadow>
            <boxGeometry args={[0.2, 0.55, 0.24]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.55, 0.02]} rotation={[0.6, 0, 0]}>
            <boxGeometry args={[0.05, 0.7, 0.18]} />
            <meshStandardMaterial color={mane} />
          </mesh>
          <mesh position={[-0.07, 0.92, 0.4]}>
            <coneGeometry args={[0.04, 0.14, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.07, 0.92, 0.4]}>
            <coneGeometry args={[0.04, 0.14, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        <group ref={tail} position={[0, 1.4, -0.95]}>
          <mesh position={[0, -0.35, -0.05]}>
            <coneGeometry args={[0.1, 0.8, 6]} />
            <meshStandardMaterial color={mane} />
          </mesh>
        </group>
        {saddle && (
          <group position={[0, 1.62, 0.05]}>
            <mesh>
              <boxGeometry args={[0.55, 0.12, 0.6]} />
              <meshStandardMaterial color="#7a1f2b" />
            </mesh>
            <mesh position={[0, 0.1, 0.25]}>
              <boxGeometry args={[0.3, 0.14, 0.08]} />
              <meshStandardMaterial color="#5a3b1a" />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <boxGeometry args={[0.75, 0.04, 0.8]} />
              <meshStandardMaterial color="#c49a3c" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}

/** A Kazakh киіз үй (yurt): lattice wall, domed roof of poles under felt, шаңырақ crown, carved door. */
export function Yurt({ felt = '#ece4d4' }: { felt?: string }) {
  const ornament = useMemo(() => ornamentTexture(), [])
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.25, 1.7, 24, 1, true]} />
        <meshStandardMaterial color={felt} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* ornamental band */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[3.22, 3.22, 0.28, 24, 1, true]} />
        <meshStandardMaterial map={ornament} roughness={1} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <cylinderGeometry args={[0.7, 3.25, 1.1, 24, 1, true]} />
        <meshStandardMaterial color={felt} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.07, 6, 24]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <sphereGeometry args={[0.66, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#cfc4ae" side={THREE.DoubleSide} />
      </mesh>
      {/* binding ropes */}
      {[0.55, 1.15].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[3.27, 3.27, 0.05, 24, 1, true]} />
          <meshStandardMaterial color="#6b4a2b" />
        </mesh>
      ))}
      {/* door, facing +z */}
      <group position={[0, 0, 3.2]}>
        <mesh position={[0, 0.75, 0.05]} castShadow>
          <boxGeometry args={[1.0, 1.5, 0.1]} />
          <meshStandardMaterial color="#b5542a" map={ornament} />
        </mesh>
        <mesh position={[0, 1.55, 0.06]}>
          <boxGeometry args={[1.2, 0.12, 0.14]} />
          <meshStandardMaterial color="#6b3d1c" />
        </mesh>
      </group>
    </group>
  )
}

let ornamentCache: THREE.Texture | null = null
/** A қошқар мүйіз (ram's horn) band drawn on a canvas; replace with a Muse Image texture later. */
function ornamentTexture() {
  if (ornamentCache) return ornamentCache
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#9b2c2c'
  g.fillRect(0, 0, 256, 64)
  g.strokeStyle = '#f2d27a'
  g.lineWidth = 5
  for (let i = 0; i < 4; i++) {
    const x = i * 64 + 32
    g.beginPath()
    g.moveTo(x, 54)
    g.lineTo(x, 34)
    g.bezierCurveTo(x, 10, x - 26, 10, x - 22, 30)
    g.moveTo(x, 34)
    g.bezierCurveTo(x, 10, x + 26, 10, x + 22, 30)
    g.stroke()
  }
  g.fillStyle = '#f2d27a'
  g.fillRect(0, 0, 256, 4)
  g.fillRect(0, 60, 256, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.repeat.set(6, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  ornamentCache = tex
  return tex
}

export function Fox({ gait }: { gait?: React.RefObject<number> }) {
  const legs = useRef<(THREE.Mesh | null)[]>([])
  const phase = useRef(0)
  useFrame((_, dt) => {
    const g = gait?.current ?? 0
    phase.current += dt * 14 * Math.min(1, g)
    legs.current.forEach((l, i) => l && (l.rotation.x = Math.sin(phase.current + (i % 2) * Math.PI) * 0.7 * Math.min(1, g)))
  })
  return (
    <group>
      <mesh position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.45, 4, 8]} />
        <meshStandardMaterial color="#c8642a" />
      </mesh>
      <mesh position={[0, 0.5, 0.36]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.12, 0.3, 6]} />
        <meshStandardMaterial color="#c8642a" />
      </mesh>
      <mesh position={[-0.06, 0.62, 0.3]}>
        <coneGeometry args={[0.04, 0.12, 4]} />
        <meshStandardMaterial color="#3a2010" />
      </mesh>
      <mesh position={[0.06, 0.62, 0.3]}>
        <coneGeometry args={[0.04, 0.12, 4]} />
        <meshStandardMaterial color="#3a2010" />
      </mesh>
      <mesh position={[0, 0.4, -0.5]} rotation={[-1.1, 0, 0]}>
        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
        <meshStandardMaterial color="#d97a3a" />
      </mesh>
      {[
        [-0.08, 0.15],
        [0.08, -0.15],
        [0.08, 0.15],
        [-0.08, -0.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.15, z]} ref={(el) => void (legs.current[i] = el)}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 4]} />
          <meshStandardMaterial color="#3a2010" />
        </mesh>
      ))}
    </group>
  )
}

/** A golden eagle (бүркіт) with flapping wings. */
export function Eagle({ flapping = true, hooded = false }: { flapping?: boolean; hooded?: boolean }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  useFrame((state) => {
    const a = flapping ? Math.sin(state.clock.elapsedTime * 9) * 0.6 : 1.3
    if (left.current) left.current.rotation.z = a
    if (right.current) right.current.rotation.z = -a
  })
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.35, 4, 8]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[0, 0.1, 0.28]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color={hooded ? '#7a1f2b' : '#c9a24a'} />
      </mesh>
      <mesh position={[0, 0.08, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.035, 0.1, 4]} />
        <meshStandardMaterial color="#e0b030" />
      </mesh>
      <group ref={left} position={[-0.1, 0.05, 0]}>
        <mesh position={[-0.45, 0, 0]}>
          <boxGeometry args={[0.9, 0.03, 0.32]} />
          <meshStandardMaterial color="#4a2e14" />
        </mesh>
      </group>
      <group ref={right} position={[0.1, 0.05, 0]}>
        <mesh position={[0.45, 0, 0]}>
          <boxGeometry args={[0.9, 0.03, 0.32]} />
          <meshStandardMaterial color="#4a2e14" />
        </mesh>
      </group>
      <mesh position={[0, 0, -0.32]}>
        <boxGeometry args={[0.22, 0.03, 0.25]} />
        <meshStandardMaterial color="#3a2410" />
      </mesh>
    </group>
  )
}
