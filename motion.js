import { Euler, Quaternion, Vector3 } from 'three';

const radius = .05;
const halfWidth = .009;
const halfTrack = .119;
const hipHeight = .248;
const rad = Math.PI / 180;
const xAxis = new Vector3(1, 0, 0);
const zAxis = new Vector3(0, 0, 1);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const smooth = (p) => p ** 3 * (10 - 15 * p + 6 * p ** 2);

export function makeArc(start, x, z) {
  const dx = x - start.x, dz = z - start.z;
  const chord = Math.hypot(dx, dz);
  if (chord < .004) return null;
  const forward = dx * Math.sin(start.yaw) + dz * Math.cos(start.yaw);
  const side = dx * Math.cos(start.yaw) - dz * Math.sin(start.yaw);
  const direction = forward < 0 ? -1 : 1;
  const turn = 2 * Math.atan2(direction * side, Math.abs(forward));
  const length = Math.abs(turn) < 1e-8 ? chord : chord * turn / (2 * Math.sin(turn / 2));
  const curvature = turn / length;
  const duration = Math.max(1.4, length / .28, Math.abs(turn) / .86);

  function at(fraction) {
    const yawChange = turn * fraction, halfAngle = yawChange / 2;
    const sinc = Math.abs(halfAngle) < 1e-8 ? 1 : Math.sin(halfAngle) / halfAngle;
    const distance = direction * length * fraction;
    return {
      x: start.x + distance * sinc * Math.sin(start.yaw + halfAngle),
      z: start.z + distance * sinc * Math.cos(start.yaw + halfAngle),
      yaw: start.yaw + yawChange,
      left: start.left + (distance + halfTrack * yawChange) / radius,
      right: start.right + (distance - halfTrack * yawChange) / radius,
    };
  }

  return {
    at, duration, direction,
    sample(time) {
      const p = clamp(time / duration, 0, 1);
      const travel = smooth(p);
      const speed = (length / duration) * 30 * p ** 2 * (1 - p) ** 2;
      const acceleration = (length / duration ** 2) * 60 * p * (1 - p) * (1 - 2 * p);
      const engagement = Math.sin(Math.PI * p) ** 2;
      const bank = -clamp(direction * curvature * speed ** 2 * .48, -.115, .115);
      return {
        ...at(travel),
        bodyPitch: clamp(direction * acceleration * .22, -.13, .13),
        bank,
        crouch: .011 * engagement,
        stance: engagement,
      };
    },
  };
}

export function makeRig(model, ground) {
  const legs = ['L', 'R'].map((side, index) => {
    const roll = model.getObjectByName(side + '_Hip_roll');
    const hip = model.getObjectByName(side + '_Hip_pitch');
    const knee = model.getObjectByName(side + '_Knee_pitch');
    const wheel = model.getObjectByName(side + '_Wheel_spin');
    return {roll, hip, knee, wheel, side: index === 0 ? -1 : 1};
  });
  const neutralHeight = hipHeight - ground;
  const body = new Quaternion(), orientation = new Euler();
  const wheelCenter = new Vector3(), axle = new Vector3();

  function solveLeg(leg, swing, bodyY, targetZ, clearance) {
    const {roll, hip, knee, wheel} = leg;
    const rollAngle = roll.rotation.z;
    axle.copy(xAxis).applyAxisAngle(zAxis, rollAngle).applyQuaternion(body);
    const support = radius * Math.sqrt(1 - axle.y ** 2) + halfWidth * Math.abs(axle.y);
    const base = roll.position;
    const upper = knee.position, lower = wheel.position;
    function evaluate(hipAngle, kneeAngle) {
      wheelCenter.copy(lower).applyAxisAngle(xAxis, kneeAngle).add(upper)
        .applyAxisAngle(xAxis, hipAngle).add(hip.position)
        .applyAxisAngle(zAxis, rollAngle).add(base);
      wheelCenter.y -= hipHeight;
      wheelCenter.applyQuaternion(body);
      return [wheelCenter.y + bodyY - support - clearance, wheelCenter.z - targetZ];
    }

    const step = .0001;
    let a = swing, b = -.34;
    for (let i = 0; i < 11; i++) {
      const [y, z] = evaluate(a, b);
      if (Math.hypot(y, z) < .00006) break;
      const [ya, za] = evaluate(a + step, b);
      const [yb, zb] = evaluate(a, b + step);
      const A = (ya - y) / step, B = (yb - y) / step;
      const C = (za - z) / step, D = (zb - z) / step;
      const det = A * D - B * C;
      if (Math.abs(det) < 1e-8) break;
      a = clamp(a + clamp((-D * y + B * z) / det, -.24, .24), -47 * rad, 47 * rad);
      b = clamp(b + clamp((C * y - A * z) / det, -.24, .24), -51 * rad, .10);
    }
    hip.rotation.x = a;
    knee.rotation.x = b;
    return evaluate(a, b)[0];
  }

  return (posture, p) => {
    const {crouch = 0, bank = 0, bodyPitch = 0, stance = 0} = p;
    body.setFromEuler(orientation.set(bodyPitch, 0, bank, 'ZXY'));
    posture.quaternion.copy(body);
    const shift = Math.min(.018, Math.abs(bank) * .052);
    const height = neutralHeight - crouch - shift;
    posture.position.set(-.15 * bank, height, 0);

    let error = 0;
    for (const leg of legs) {
      const {side, roll, hip, knee, wheel} = leg;
      roll.rotation.z = side * .075 * stance - .64 * bank;
      if (stance < .000001) {
        hip.rotation.x = knee.rotation.x = 0;
      } else {
        // The wheel centers stay almost aligned while the torso banks into the curve.
        const targetZ = .005 + side * (-bank) * .068;
        const supportError = solveLeg(leg, -bodyPitch + .22, height, targetZ, 0);
        error = Math.max(error, Math.abs(supportError));
      }
      wheel.rotation.x = side < 0 ? p.left : p.right;
    }
    return {kneeLeft: legs[0].knee.rotation.x, kneeRight: legs[1].knee.rotation.x, bank, error};
  };
}

