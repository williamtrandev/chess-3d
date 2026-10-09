'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  SphereGeometry,
  TextureLoader,
  TorusGeometry,
  Vector3,
  type Group,
  type Material,
  type Mesh,
} from 'three';
import { BUILD_WIDTH, type Avatar } from '@/lib/avatar';
import type { OwnAvatarMode } from '@/lib/camera-views';
import { seededRandom } from '@/lib/scenery';
import { segmentRotation, solveTwoBone } from '@/lib/rig';

export type Activity = 'idle' | 'thinking' | 'won' | 'lost';

export interface Reach {
  target: Vector3;
  key: number;
}

interface CharacterProps {
  avatar: Avatar;
  activity: Activity;
  /** World point the character looks at. */
  focus: Vector3;
  /** World point to reach towards; a new `key` replays the gesture. */
  reach: Reach | null;
  /** How to draw the character when it stands between the camera and the board. */
  occlusion: OwnAvatarMode;
  wood: string;
}

// Body layout at chibi scale, in the character's local space: origin on the chair seat,
// facing -Z (towards the board). The parent group scales it up.
const HIP_Y = 0.3;
const SHOULDER_Y = 1.5;
const HEAD_Y = 2.3;
const HEAD_R = 0.5;
const UPPER_ARM = 0.62;
const FOREARM = 0.66;
const GESTURE_TIME = 1.1;

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

function Segment({
  from,
  to,
  radius,
  material,
}: {
  from: Vector3;
  to: Vector3;
  radius: number;
  material: Material;
}) {
  const geometry = useMemo(
    () => new CapsuleGeometry(radius, from.distanceTo(to), 6, 12),
    [from, to, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={from.clone().add(to).multiplyScalar(0.5)}
      quaternion={segmentRotation(from, to)}
      castShadow
    />
  );
}

function Chair({ wood }: { wood: string }) {
  return (
    <group>
      <mesh position={[0, -0.08, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.16, 1.4]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {[
        [-0.6, -0.55],
        [0.6, -0.55],
        [-0.6, 0.65],
        [0.6, 0.65],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x ?? 0, -0.95, z ?? 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.06, 1.6, 8]} />
          <meshStandardMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.65, 0.7]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 1.45, 8]} />
          <meshStandardMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 1.05, 0.72]} castShadow>
        <boxGeometry args={[1.35, 0.5, 0.1]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
    </group>
  );
}

const useMaterials = (avatar: Avatar) =>
  useMemo(() => {
    const robot = avatar.kind === 'robot';
    const make = (color: string, roughness: number, extra: Partial<MeshStandardMaterial> = {}) =>
      Object.assign(
        new MeshStandardMaterial({
          color,
          roughness: robot ? 0.35 : roughness,
          metalness: robot ? 0.55 : 0,
        }),
        extra,
      );
    const blush = make('#ff8a8a', 0.9);
    blush.transparent = true;
    blush.opacity = 0.45;
    blush.userData.baseOpacity = 0.45;
    return {
      skin: make(avatar.skin, 0.7),
      hair: make(avatar.hair, 0.55),
      top: make(avatar.top, 0.9),
      bottom: make(avatar.bottom, 0.9),
      shoes: make(avatar.shoes, 0.5),
      dark: make('#1b1b1f', 0.3),
      white: make('#ffffff', 0.3),
      blush,
      glow: new MeshStandardMaterial({
        color: '#0b1220',
        emissive: avatar.hair,
        emissiveIntensity: 2.4,
      }),
    };
  }, [avatar]);

function Hair({ avatar, material }: { avatar: Avatar; material: Material }) {
  const parts = useMemo(() => {
    const style = avatar.hairStyle;
    if (avatar.kind === 'robot' || style === 'bald') return [];
    const scale = style === 'buzz' ? 1.02 : 1.07;
    const list: {
      geometry: SphereGeometry | CapsuleGeometry;
      position?: [number, number, number];
      scale?: [number, number, number];
    }[] = [
      {
        geometry: new SphereGeometry(
          HEAD_R * scale,
          32,
          16,
          0,
          Math.PI * 2,
          0,
          style === 'buzz' ? 1.0 : 1.08,
        ),
      },
    ];
    const back = { short: 1.8, long: 2.4, bun: 1.75, curly: 1.9, buzz: 1.7 }[style];
    list.push({
      geometry: new SphereGeometry(
        HEAD_R * (scale - 0.01),
        32,
        16,
        Math.PI / 2 - 1.55,
        3.1,
        0.3,
        back,
      ),
    });
    if (style === 'long') {
      list.push({
        geometry: new CapsuleGeometry(0.4, 0.7, 6, 16),
        position: [0, -0.72, 0.22],
        scale: [1.15, 1, 0.5],
      });
    }
    if (style === 'bun')
      list.push({ geometry: new SphereGeometry(0.21, 20, 14), position: [0, 0.52, 0.28] });
    if (style === 'curly') {
      const random = seededRandom(17);
      for (let i = 0; i < 26; i++) {
        const theta = random() * 1.7;
        const phi = random() * Math.PI * 2;
        if (theta > 0.9 && Math.sin(phi) < -0.2) continue; // keep the face clear
        const r = HEAD_R * 1.04;
        list.push({
          geometry: new SphereGeometry(0.15 + random() * 0.05, 12, 10),
          position: [
            -r * Math.cos(phi) * Math.sin(theta),
            r * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
          ],
        });
      }
    }
    return list;
  }, [avatar.hairStyle, avatar.kind]);
  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts]);

  return (
    <group>
      {parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geometry}
          material={material}
          position={part.position ?? [0, 0, 0]}
          scale={part.scale ?? [1, 1, 1]}
          castShadow
        />
      ))}
    </group>
  );
}

function Face({
  avatar,
  materials,
}: {
  avatar: Avatar;
  materials: ReturnType<typeof useMaterials>;
}) {
  const texture = useMemo(() => {
    if (!avatar.useFace || !avatar.face) return null;
    const t = new TextureLoader().load(avatar.face);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [avatar.face, avatar.useFace]);
  const decal = useMemo(
    () =>
      texture
        ? new MeshStandardMaterial({
            map: texture,
            transparent: true,
            roughness: 0.8,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          })
        : null,
    [texture],
  );
  useEffect(
    () => () => {
      texture?.dispose();
      decal?.dispose();
    },
    [texture, decal],
  );
  const geometries = useMemo(
    () => ({
      decal: new SphereGeometry(
        HEAD_R * 1.012,
        32,
        24,
        (3 * Math.PI) / 2 - 0.95,
        1.9,
        Math.PI / 2 - 0.85,
        1.6,
      ),
      eye: new SphereGeometry(0.065, 12, 10),
      shine: new SphereGeometry(0.022, 8, 6),
      smile: new TorusGeometry(0.1, 0.022, 8, 16, Math.PI),
      blush: new CircleGeometry(0.07, 16),
      brow: new BoxGeometry(0.14, 0.03, 0.03),
    }),
    [],
  );

  if (avatar.kind === 'robot') {
    return (
      <group>
        <RoundedBox
          args={[0.82, 0.3, 0.12]}
          radius={0.06}
          position={[0, 0.05, -0.43]}
          material={materials.glow}
        />
        <mesh position={[0, 0.62, 0]} material={materials.dark}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        </mesh>
        <mesh position={[0, 0.8, 0]} material={materials.glow}>
          <sphereGeometry args={[0.08, 12, 10]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.52, 0, 0]}
            rotation-z={Math.PI / 2}
            material={materials.dark}
          >
            <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          </mesh>
        ))}
      </group>
    );
  }

  if (decal) {
    return <mesh geometry={geometries.decal} material={decal} />;
  }

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            geometry={geometries.eye}
            material={materials.dark}
            position={[side * 0.17, 0.05, -0.45]}
          />
          <mesh
            geometry={geometries.shine}
            material={materials.white}
            position={[side * 0.17 + 0.02, 0.08, -0.51]}
          />
          <mesh
            geometry={geometries.brow}
            material={materials.hair}
            position={[side * 0.17, 0.2, -0.46]}
            rotation-z={side * -0.12}
          />
          <mesh
            geometry={geometries.blush}
            material={materials.blush}
            position={[side * 0.29, -0.09, -0.41]}
            rotation-y={Math.PI + side * -0.5}
          />
        </group>
      ))}
      <mesh
        geometry={geometries.smile}
        material={materials.dark}
        position={[0, -0.13, -0.47]}
        rotation-z={Math.PI}
      />
    </group>
  );
}

/**
 * A stylized character sitting on a chair at the table, breathing, following the game
 * with its eyes, reaching when it moves, and celebrating or sulking at the end.
 */
export function Character({ avatar, activity, focus, reach, occlusion, wood }: CharacterProps) {
  const materials = useMaterials(avatar);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const bodyMeshes = useRef<Group>(null);
  const head = useRef<Group>(null);
  const arms = {
    left: { upper: useRef<Mesh>(null), fore: useRef<Mesh>(null), hand: useRef<Mesh>(null) },
    right: { upper: useRef<Mesh>(null), fore: useRef<Mesh>(null), hand: useRef<Mesh>(null) },
  };
  const gesture = useRef({ key: -1, time: GESTURE_TIME, target: new Vector3() });
  const hands = useRef({ left: v(-0.42, 1.27, -1.2), right: v(0.42, 1.27, -1.2) });
  const opacity = useRef(1);

  const width = BUILD_WIDTH[avatar.build];
  const legs = useMemo(
    () =>
      [-1, 1].map((side) => ({
        hip: v(side * 0.22 * width, HIP_Y, 0),
        knee: v(side * 0.25, HIP_Y, -0.85),
        ankle: v(side * 0.25, -1.45, -0.95),
        toe: v(side * 0.25, -1.5, -1.3),
        heel: v(side * 0.25, -1.5, -0.95),
      })),
    [width],
  );
  const armGeometry = useMemo(
    () => ({
      upper: new CapsuleGeometry(0.14, UPPER_ARM, 6, 12),
      fore: new CapsuleGeometry(0.12, FOREARM, 6, 12),
      hand: new SphereGeometry(0.15, 14, 12),
    }),
    [],
  );
  useEffect(() => () => Object.values(armGeometry).forEach((g) => g.dispose()), [armGeometry]);
  const allMaterials = useMemo(() => Object.values(materials), [materials]);

  useFrame(({ clock, camera }, delta) => {
    const group = root.current;
    const upper = body.current;
    if (!group || !upper) return;
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-delta * 7);

    // Fade out when standing between the camera and the board.
    const seat = group.getWorldPosition(new Vector3());
    const seatAngle = Math.atan2(seat.x, seat.z);
    const cameraAngle = Math.atan2(camera.position.x, camera.position.z);
    const diff = Math.abs(
      Math.atan2(Math.sin(cameraAngle - seatAngle), Math.cos(cameraAngle - seatAngle)),
    );
    const horizontal = Math.hypot(camera.position.x, camera.position.z);
    const blocking = diff < 0.75 && horizontal > seat.length() * 0.6;
    const wanted = occlusion === 'show' || !blocking ? 1 : occlusion === 'fade' ? 0.2 : 0;
    const previous = opacity.current;
    opacity.current += (wanted - opacity.current) * (1 - Math.exp(-delta * 6));
    if (Math.abs(previous - opacity.current) > 0.001 || (wanted === 1 && previous !== 1)) {
      if (Math.abs(1 - opacity.current) < 0.005) opacity.current = 1;
      for (const material of allMaterials) {
        const base = (material.userData.baseOpacity as number | undefined) ?? 1;
        const transparent = opacity.current < 1 || base < 1;
        // three.js compiles opaque materials with alpha forced to 1, so switching
        // transparency needs a shader rebuild.
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = base * opacity.current;
        material.depthWrite = opacity.current > 0.6;
      }
    }
    group.visible = opacity.current > 0.02;

    // Gesture towards a moved piece.
    if (reach && reach.key !== gesture.current.key) {
      gesture.current = {
        key: reach.key,
        time: 0,
        target: group.worldToLocal(reach.target.clone()),
      };
    }
    gesture.current.time = Math.min(GESTURE_TIME, gesture.current.time + delta);
    const g = Math.sin((gesture.current.time / GESTURE_TIME) * Math.PI);

    // Body: breathing, lean and bounce.
    const lean = { idle: 0.06, thinking: 0.14, won: -0.06, lost: 0.24 }[activity] + g * 0.22;
    upper.rotation.x += (-lean - upper.rotation.x) * k;
    const bounce = activity === 'won' ? Math.abs(Math.sin(t * 6)) * 0.1 : 0;
    upper.position.y = HIP_Y + bounce;
    bodyMeshes.current?.scale.set(1, 1 + Math.sin(t * 1.7) * 0.015, 1);

    // Head follows the focus point.
    const neck = head.current;
    if (neck) {
      const local = upper.worldToLocal(focus.clone()).sub(neck.position);
      let yaw = Math.atan2(-local.x, -local.z);
      let pitch = Math.atan2(local.y, Math.hypot(local.x, local.z));
      yaw = Math.max(-0.8, Math.min(0.8, yaw)) + Math.sin(t * 0.5) * 0.04;
      pitch = Math.max(-0.55, Math.min(0.35, pitch));
      if (activity === 'lost') pitch = -0.5;
      if (activity === 'won') pitch = 0.3;
      const tilt = activity === 'thinking' ? 0.14 : 0;
      neck.rotation.y += (yaw - neck.rotation.y) * k;
      neck.rotation.x += (pitch - neck.rotation.x) * k;
      neck.rotation.z += (tilt - neck.rotation.z) * k;
    }

    // Hands: rest on the table, chin when thinking, up when winning, reach when moving.
    const rest = (side: number) =>
      v(side * 0.42, 1.27 + Math.max(0, Math.sin(t * 2.3 + side)) * 0.03, -1.2);
    const targets = {
      left: rest(-1),
      right: activity === 'thinking' ? v(0.1, 1.95, -0.48) : rest(1),
    };
    if (activity === 'won') {
      targets.left = v(-0.85 + Math.sin(t * 8) * 0.15, 2.95, -0.2);
      targets.right = v(0.85 - Math.sin(t * 8) * 0.15, 2.95, -0.2);
    } else if (activity === 'lost') {
      targets.left = v(-0.3, 1.25, -1.0);
      targets.right = v(0.3, 1.25, -1.0);
    }
    if (g > 0.001) {
      const side = gesture.current.target.x >= 0 ? 'right' : 'left';
      targets[side] = targets[side].clone().lerp(gesture.current.target, g);
    }
    hands.current.left.lerp(targets.left, k);
    hands.current.right.lerp(targets.right, k);

    for (const [side, sign] of [
      ['left', -1],
      ['right', 1],
    ] as const) {
      const shoulder = v(sign * 0.62 * width, SHOULDER_Y - HIP_Y, -0.02);
      const target = upper.worldToLocal(group.localToWorld(hands.current[side].clone()));
      const { elbow, hand } = solveTwoBone(
        shoulder,
        target,
        UPPER_ARM,
        FOREARM,
        v(sign, -0.8, 0.6),
      );
      const parts = arms[side];
      parts.upper.current?.position.copy(shoulder).add(elbow).multiplyScalar(0.5);
      parts.upper.current?.quaternion.copy(segmentRotation(shoulder, elbow));
      parts.fore.current?.position.copy(elbow).add(hand).multiplyScalar(0.5);
      parts.fore.current?.quaternion.copy(segmentRotation(elbow, hand));
      parts.hand.current?.position.copy(hand);
    }
  });

  const robot = avatar.kind === 'robot';

  return (
    <group ref={root}>
      <Chair wood={wood} />
      {legs.map((leg, i) => (
        <group key={i}>
          <Segment from={leg.hip} to={leg.knee} radius={0.19 * width} material={materials.bottom} />
          <Segment from={leg.knee} to={leg.ankle} radius={0.16} material={materials.bottom} />
          <Segment from={leg.heel} to={leg.toe} radius={0.14} material={materials.shoes} />
        </group>
      ))}
      <mesh
        position={[0, HIP_Y, 0.02]}
        rotation-z={Math.PI / 2}
        scale={[1, width, 1]}
        material={materials.bottom}
        castShadow
      >
        <capsuleGeometry args={[0.3, 0.5, 6, 12]} />
      </mesh>

      <group ref={body} position={[0, HIP_Y, 0]}>
        <group ref={bodyMeshes}>
          {robot ? (
            <RoundedBox
              args={[1.25 * width, 1.4, 0.8]}
              radius={0.22}
              position={[0, 0.72, 0]}
              material={materials.top}
              castShadow
            />
          ) : (
            <mesh
              position={[0, 0.68, 0]}
              scale={[width, 1, 0.78]}
              material={materials.top}
              castShadow
            >
              <capsuleGeometry args={[0.45, 0.62, 8, 20]} />
            </mesh>
          )}
          {robot && (
            <mesh position={[0, 0.85, -0.41]} material={materials.glow}>
              <circleGeometry args={[0.13, 20]} />
            </mesh>
          )}
          <mesh position={[0, 1.55, 0]} material={materials.skin}>
            <cylinderGeometry args={[0.14, 0.16, 0.3, 12]} />
          </mesh>
        </group>

        <group ref={head} position={[0, HEAD_Y - HIP_Y, -0.02]} rotation-order="YXZ">
          {robot ? (
            <RoundedBox
              args={[1.0, 0.86, 0.9]}
              radius={0.16}
              material={materials.skin}
              castShadow
            />
          ) : (
            <mesh material={materials.skin} castShadow>
              <sphereGeometry args={[HEAD_R, 32, 24]} />
            </mesh>
          )}
          <Face avatar={avatar} materials={materials} />
          <Hair avatar={avatar} material={materials.hair} />
        </group>

        {(['left', 'right'] as const).map((side) => (
          <group key={side}>
            <mesh
              ref={arms[side].upper}
              geometry={armGeometry.upper}
              material={materials.top}
              castShadow
            />
            <mesh
              ref={arms[side].fore}
              geometry={armGeometry.fore}
              material={robot ? materials.top : materials.skin}
              castShadow
            />
            <mesh
              ref={arms[side].hand}
              geometry={armGeometry.hand}
              material={materials.skin}
              castShadow
            />
          </group>
        ))}
      </group>
    </group>
  );
}
