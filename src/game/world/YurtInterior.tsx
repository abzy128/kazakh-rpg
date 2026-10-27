import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { NPCS } from '#/content/aul-18c/npcs'
import { useGame } from '#/game/state/store'
import { Person } from './models'

// Inside the family yurt. The door is at +z; the төр (place of honor) is opposite it at -z.

export const SEATS = {
  tor: { x: 0, z: -2.3, rot: 0 },
  door: { x: 1.4, z: 2.2, rot: Math.PI },
}

export function YurtInterior() {
  const { camera, scene } = useThree()
  const story = useGame((s) => s.story)
  const speaking = useGame((s) => (s.status === 'speaking' ? s.speaking?.npcId : null))
  const seat = story.quests.qonaq.flags.seat as keyof typeof SEATS | undefined
  const lattice = useMemo(() => latticeTexture(), [])

  useEffect(() => {
    scene.fog = null
    scene.background = new THREE.Color('#120d0a')
    camera.position.set(0.2, 2.35, 3.0)
    camera.lookAt(0, 0.2, -1.2)
  }, [camera, scene])

  useFrame((state) => {
    // A gentle sway, as if sitting.
    camera.position.y = 2.35 + Math.sin(state.clock.elapsedTime * 0.6) * 0.015
  })

  const guestSpot = seat ? SEATS[seat] : { x: 0.6, z: 2.4, rot: Math.PI }
  const roofPoles = useMemo(() => Array.from({ length: 28 }, (_, i) => (i / 28) * Math.PI * 2), [])

  return (
    <group>
      <ambientLight intensity={0.35} color="#ffd9a8" />
      {/* daylight falling through the шаңырақ */}
      <spotLight position={[0, 3.2, 0]} angle={0.5} penumbra={0.6} intensity={30} color="#fff2d8" castShadow />
      <pointLight position={[0, 0.6, 0]} intensity={4} color="#ff9a40" distance={6} />
      {/* floor and carpets */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.3, 32]} />
        <meshStandardMaterial color="#5a4030" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1.4]} receiveShadow>
        <planeGeometry args={[4.2, 2]} />
        <meshStandardMaterial color="#8a2a2a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -1.4]}>
        <ringGeometry args={[0.5, 0.75, 4]} />
        <meshStandardMaterial color="#e2b84a" />
      </mesh>
      {/* кереге lattice wall */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[3.25, 3.25, 1.7, 40, 1, true]} />
        <meshStandardMaterial map={lattice} side={THREE.BackSide} roughness={1} />
      </mesh>
      {/* уық roof poles and the шаңырақ */}
      {roofPoles.map((a) => {
        const x1 = Math.cos(a) * 3.2
        const z1 = Math.sin(a) * 3.2
        const x2 = Math.cos(a) * 0.7
        const z2 = Math.sin(a) * 0.7
        const mid = new THREE.Vector3((x1 + x2) / 2, 2.25, (z1 + z2) / 2)
        const dir = new THREE.Vector3(x2 - x1, 1.1, z2 - z1)
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
        return (
          <mesh key={a} position={mid} quaternion={q}>
            <cylinderGeometry args={[0.025, 0.025, dir.length(), 4]} />
            <meshStandardMaterial color="#b5542a" />
          </mesh>
        )
      })}
      <mesh position={[0, 2.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.08, 8, 32]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.7, 3.25, 1.1, 40, 1, true]} />
        <meshStandardMaterial color="#d8ccb4" side={THREE.BackSide} roughness={1} />
      </mesh>
      {/* hearth and қазан */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.35, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#222" metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* cushions: төр and by the door */}
      <Cushion x={SEATS.tor.x} z={SEATS.tor.z} color="#b8892d" highlight={!seat && story.quests.qonaq.step === 'inside'} />
      <Cushion x={SEATS.door.x} z={SEATS.door.z} color="#5a4a3a" highlight={!seat && story.quests.qonaq.step === 'inside'} />
      {/* chest and blankets at the back */}
      <mesh position={[0, 0.35, -3.0]}>
        <boxGeometry args={[1.6, 0.7, 0.4]} />
        <meshStandardMaterial color="#7a3a1a" />
      </mesh>
      <mesh position={[0, 0.85, -3.0]}>
        <boxGeometry args={[1.5, 0.3, 0.38]} />
        <meshStandardMaterial color="#c94a3a" />
      </mesh>
      {/* people */}
      <group position={[guestSpot.x, 0, guestSpot.z]} rotation={[0, guestSpot.rot, 0]}>
        <Person look={NPCS.guest.look} seated={!!seat} talking={speaking === 'guest'} />
      </group>
      <group position={[-1.7, 0, -1.6]} rotation={[0, 0.9, 0]}>
        <Person look={NPCS.ata.look} seated talking={speaking === 'ata'} />
      </group>
      <group position={[1.9, 0, -0.6]} rotation={[0, -1.6, 0]}>
        <Person look={NPCS.apa.look} seated={false} talking={speaking === 'apa'} />
      </group>
    </group>
  )
}

function Cushion({ x, z, color, highlight }: { x: number; z: number; color: string; highlight: boolean }) {
  return (
    <mesh position={[x, 0.08, z]}>
      <boxGeometry args={[0.9, 0.16, 0.7]} />
      <meshStandardMaterial color={color} emissive={highlight ? '#ffb040' : '#000'} emissiveIntensity={highlight ? 0.25 : 0} />
    </mesh>
  )
}

function latticeTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#e7dcc4'
  g.fillRect(0, 0, 256, 128)
  g.strokeStyle = '#b5542a'
  g.lineWidth = 5
  for (let i = -128; i < 384; i += 32) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i + 128, 128)
    g.moveTo(i + 128, 0)
    g.lineTo(i, 128)
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.repeat.set(10, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
