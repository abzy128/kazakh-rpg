import { Sky } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Phase, Weather } from '#/game/engine/types'
import { CORRAL, FIRE, HORSE_POST, WIND, WORLD_HALF, YURTS, heightAt } from './layout'
import { Yurt } from './models'
import { sim } from './sim'

const SUN: Record<Phase, [number, number, number]> = {
  morning: [80, 25, 60],
  midday: [30, 90, 20],
  afternoon: [-60, 35, 40],
  evening: [-100, 3, 20],
}

/** 0 = clear autumn, 1 = full blizzard. Snow cover is separate: it stays after the storm. */
export function weatherTargets(weather: Weather, phase: Phase) {
  const storm = weather === 'storm' ? Math.max(0.35, sim.stormLevel) : weather === 'snowfall' ? 0.15 : weather === 'wind' ? 0.05 : 0
  const snowCover = weather === 'snowfall' || (weather === 'clear' && phase === 'evening') || phase === 'afternoon' ? 1 : weather === 'storm' ? sim.stormLevel * 0.6 : 0
  return { storm, snowCover }
}

export function Environment({ weather, phase }: { weather: Weather; phase: Phase }) {
  const { scene } = useThree()
  const light = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const fog = useMemo(() => new THREE.FogExp2('#c9c2b0', 0.004), [])
  const level = useRef(0)

  useFrame((_, dt) => {
    const { storm } = weatherTargets(weather, phase)
    level.current += (storm - level.current) * Math.min(1, dt * 0.8)
    const s = level.current
    const evening = phase === 'evening'
    const clearFog = new THREE.Color(evening ? '#2a2230' : '#cfc7b4')
    fog.color.copy(clearFog.lerp(new THREE.Color(evening ? '#1a1820' : '#9aa0a6'), s))
    fog.density = 0.0035 + s * 0.03
    scene.fog = fog
    scene.background = fog.color
    if (light.current) {
      light.current.intensity = (evening ? 0.25 : 2.2) * (1 - s * 0.75)
      // Follow the player so the shadow map covers what's on screen.
      light.current.position.set(sim.player.x + SUN[phase][0] * 0.5, 60, sim.player.z + SUN[phase][2] * 0.5)
      light.current.target.position.set(sim.player.x, 0, sim.player.z)
      light.current.target.updateMatrixWorld()
    }
    if (hemi.current) hemi.current.intensity = (evening ? 0.35 : 1.1) * (1 - s * 0.4)
  })

  return (
    <>
      <Sky sunPosition={SUN[phase]} turbidity={weather === 'storm' ? 20 : 6} rayleigh={phase === 'evening' ? 3 : 1.2} />
      <hemisphereLight ref={hemi} args={['#dfe8f0', '#7a6a4a', 1.1]} />
      <directionalLight
        ref={light}
        castShadow
        intensity={2.2}
        color={phase === 'evening' ? '#ffb070' : '#fff1d6'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={150}
      />
      <Terrain snowCover={weatherTargets(weather, phase).snowCover} />
      <Grass />
      <Snowfall />
      {YURTS.map((y, i) => (
        <group key={i} position={[y.x, heightAt(y.x, y.z), y.z]} rotation={[0, y.rot, 0]}>
          <Yurt felt={i === 0 ? '#efe8d8' : i % 2 ? '#e2d8c3' : '#d9cdb5'} />
        </group>
      ))}
      <Corral />
      <FirePit lit={phase === 'evening' || weather !== 'storm'} />
      <HitchingPost />
    </>
  )
}

function Terrain({ snowCover }: { snowCover: number }) {
  const bucket = Math.round(snowCover * 4) / 4
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2, 220, 220)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])

  // Recolor when snow cover changes: dry autumn grass → patchy fresh snow.
  useMemo(() => {
    const pos = geometry.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const dry = new THREE.Color('#b59a5a')
    const dark = new THREE.Color('#7d6a3c')
    const green = new THREE.Color('#8a8a4a')
    const snow = new THREE.Color('#eef2f5')
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = pos.getY(i)
      const n = Math.sin(x * 0.07) * Math.cos(z * 0.05) + Math.sin(x * 0.21 + z * 0.13) * 0.5
      c.copy(dry).lerp(dark, 0.5 + n * 0.3).lerp(green, Math.max(0, Math.sin(x * 0.013 + z * 0.017)) * 0.3)
      const patch = 0.55 + 0.45 * Math.sin(x * 0.11 + 1) * Math.cos(z * 0.09) + y * 0.03
      const s = Math.min(1, bucket * (0.75 + 0.5 * patch))
      c.lerp(snow, s)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }, [geometry, bucket])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  )
}

/** Instanced dry grass tufts that sway in the wind. */
function Grass() {
  const count = 9000
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#c9ad6a', roughness: 1 })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      m.userData.shader = shader
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sway = sin(uTime * 1.8 + wp.x * 0.3 + wp.z * 0.2) * 0.25 + 0.15;
        transformed.x += sway * max(0.0, position.y) * ${WIND.x.toFixed(2)};
        transformed.z += sway * max(0.0, position.y) * ${WIND.z.toFixed(2)};`,
      )
    }
    return m
  }, [])
  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.12, 0.7, 3, 1, true)
    g.translate(0, 0.35, 0)
    return g
  }, [])

  useLayoutEffect(() => {
    {
      if (!mesh.current) return
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const color = new THREE.Color()
      let placed = 0
      let seed = 1
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      while (placed < count) {
        const r = 12 + Math.sqrt(rand()) * 150
        const a = rand() * Math.PI * 2
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        if (Math.hypot(x - CORRAL.x, z - CORRAL.z) < CORRAL.r) continue
        const s = 0.6 + rand() * 0.9
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI)
        m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.05, z), q, new THREE.Vector3(s, s * (0.7 + rand() * 0.8), s))
        mesh.current.setMatrixAt(placed, m)
        mesh.current.setColorAt(placed, color.setHSL(0.11 + rand() * 0.03, 0.4, 0.45 + rand() * 0.15))
        placed++
      }
      mesh.current.instanceMatrix.needsUpdate = true
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    }
  }, [])

  useFrame((state) => {
    const shader = material.userData.shader
    if (shader) shader.uniforms.uTime.value = state.clock.elapsedTime
  })

  return <instancedMesh ref={mesh} args={[geometry, material, count]} receiveShadow />
}

/** Snow particles around the camera; density follows the storm. */
function Snowfall() {
  const count = 5000
  const points = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) p.set([(Math.random() - 0.5) * 80, Math.random() * 30, (Math.random() - 0.5) * 80], i * 3)
    return p
  }, [])
  const material = useRef<THREE.PointsMaterial>(null)

  useFrame((_, dt) => {
    const pts = points.current
    if (!pts || !material.current) return
    const scene = pts.parent
    const fogDensity = (scene as THREE.Scene | null)?.fog instanceof THREE.FogExp2 ? ((scene as THREE.Scene).fog as THREE.FogExp2).density : 0
    const intensity = Math.min(1, Math.max(0, (fogDensity - 0.006) / 0.02))
    material.current.opacity = intensity
    pts.visible = intensity > 0.02
    if (!pts.visible) return
    const arr = pts.geometry.attributes.position.array as Float32Array
    const wind = 4 + intensity * 14
    for (let i = 0; i < count; i++) {
      arr[i * 3] += WIND.x * wind * dt
      arr[i * 3 + 1] -= (2 + intensity * 3) * dt
      arr[i * 3 + 2] += WIND.z * wind * dt
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += 30
      if (arr[i * 3] > 40) arr[i * 3] -= 80
      if (arr[i * 3 + 2] > 40) arr[i * 3 + 2] -= 80
    }
    pts.geometry.attributes.position.needsUpdate = true
    pts.position.set(camera.position.x, camera.position.y - 12, camera.position.z)
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={material} color="#ffffff" size={0.18} transparent depthWrite={false} />
    </points>
  )
}

function Corral() {
  const posts = 28
  const gate = 3 // posts left out on the aul side
  return (
    <group position={[CORRAL.x, 0, CORRAL.z]}>
      {Array.from({ length: posts }).map((_, i) => {
        if (i < gate) return null
        const a = (i / posts) * Math.PI * 2 + Math.PI * 0.9
        const x = Math.cos(a) * CORRAL.r
        const z = Math.sin(a) * CORRAL.r
        const a2 = ((i + 1) / posts) * Math.PI * 2 + Math.PI * 0.9
        const nx = Math.cos(a2) * CORRAL.r
        const nz = Math.sin(a2) * CORRAL.r
        const y = heightAt(CORRAL.x + x, CORRAL.z + z)
        return (
          <group key={i}>
            <mesh position={[x, y + 0.7, z]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 1.4, 5]} />
              <meshStandardMaterial color="#6b4a2b" />
            </mesh>
            {i < posts - 1 && (
              <mesh position={[(x + nx) / 2, y + 1.1, (z + nz) / 2]} rotation={[0, -Math.atan2(nz - z, nx - x), 0]}>
                <boxGeometry args={[Math.hypot(nx - x, nz - z), 0.06, 0.06]} />
                <meshStandardMaterial color="#7a5a35" />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function FirePit({ lit }: { lit: boolean }) {
  const flame = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.PointLight>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (flame.current) flame.current.scale.set(1 + Math.sin(t * 13) * 0.1, 1 + Math.sin(t * 9) * 0.2, 1)
    if (glow.current) glow.current.intensity = lit ? 12 + Math.sin(t * 17) * 3 : 0
  })
  const y = heightAt(FIRE.x, FIRE.z)
  return (
    <group position={[FIRE.x, y, FIRE.z]}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 8) * Math.PI * 2) * 0.75, 0.1, Math.sin((i / 8) * Math.PI * 2) * 0.75]}>
          <dodecahedronGeometry args={[0.2]} />
          <meshStandardMaterial color="#5a5550" />
        </mesh>
      ))}
      {/* қазан on a tripod */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.38, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {lit && (
        <mesh ref={flame} position={[0, 0.2, 0]}>
          <coneGeometry args={[0.3, 0.6, 6]} />
          <meshBasicMaterial color="#ff8a2a" transparent opacity={0.85} />
        </mesh>
      )}
      <pointLight ref={glow} position={[0, 1, 0]} color="#ff9a40" distance={14} decay={1.6} />
    </group>
  )
}

function HitchingPost() {
  const y = heightAt(HORSE_POST.x, HORSE_POST.z)
  return (
    <group position={[HORSE_POST.x - 1.2, y, HORSE_POST.z]}>
      {[-1.5, 1.5].map((dz) => (
        <mesh key={dz} position={[0, 0.8, dz]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.6, 5]} />
          <meshStandardMaterial color="#6b4a2b" />
        </mesh>
      ))}
      <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 3, 4]} />
        <meshStandardMaterial color="#c9b080" />
      </mesh>
    </group>
  )
}
