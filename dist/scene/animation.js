import * as THREE from "three";

// Absolute scene time in seconds. Calling update(t) twice, or seeking backwards,
// produces the same transforms; no prior frame or wall clock is consulted.
export function createSceneAnimator({
  trainCars, trainWheels, trackCurve, waterUniforms, riverUniforms,
  constructionSite, millingPeople, harbor, sailingRoute, aeroplane, flightRoute,
}) {
  const initialWheelRotations = trainWheels.map(wheel => wheel.rotation.x);
  function placeTrainCar(car, t) {
    const wrapped = ((t % 1) + 1) % 1;
    const point = trackCurve.getPointAt(wrapped);
    const tangent = trackCurve.getTangentAt(wrapped).normalize();
    car.position.copy(point);
    car.position.y += 0.28;
    car.rotation.set(-Math.asin(tangent.y), Math.atan2(tangent.x, tangent.z), 0, "YXZ");
  }


  function updateJourneys(time) {
    const flight = (time / 34) % 1;
    const heading = flightRoute.getTangentAt(flight).normalize();
    const nextHeading = flightRoute.getTangentAt((flight+0.007)%1).normalize();
    aeroplane.plane.position.copy(flightRoute.getPointAt(flight));
    const turn = heading.z*nextHeading.x-heading.x*nextHeading.z;
    aeroplane.plane.rotation.set(-Math.asin(heading.y),Math.atan2(heading.x,heading.z),THREE.MathUtils.clamp(-turn*5,-0.38,0.38),"YXZ");
    aeroplane.propeller.rotation.z=time*35;

    const cycle=time%104;
    const underway=cycle>=14 && cycle<90;
    const progress=THREE.MathUtils.clamp((cycle-14)/76,0,1);
    const eased=progress-Math.sin(progress*Math.PI*2)/(Math.PI*2);
    const boatT=underway?eased:0;
    const direction=sailingRoute.getTangentAt(boatT);
    harbor.boat.position.copy(sailingRoute.getPointAt(boatT));
    harbor.boat.position.y=-0.48+Math.sin(time*1.15)*0.045;
    harbor.boat.rotation.set(0,Math.atan2(direction.x,direction.z),Math.sin(time*0.78)*0.035);
  }


  return function update(time) {
    if (!Number.isFinite(time) || time < 0) throw new RangeError("Scene time must be finite and nonnegative");
    const trainPosition = (0.57 + time * 0.024) % 1;
    waterUniforms.time.value = time;
    riverUniforms.time.value = time;
    updateJourneys(time);
    trainCars.forEach((car, index) => placeTrainCar(car, trainPosition - index * 0.035));
    trainWheels.forEach((wheel, index) => { wheel.rotation.x = initialWheelRotations[index] - time * 4.7; });
    constructionSite.userData.crane.rotation.y = -0.4 + Math.sin(time * 0.28) * 0.22;
    millingPeople.forEach(({ person, center, radius, speed, phase, baseY }, index) => {
      const angle = phase + time * speed;
      person.position.set(center.x + Math.cos(angle) * radius, baseY, center.y + Math.sin(angle) * radius);
      person.rotation.y = -angle;
      const stride = Math.sin(time * 5.2 + index) * 0.38;
      person.children[2].rotation.x = stride;
      person.children[3].rotation.x = -stride;
      person.children[4].rotation.x = -stride * 0.75;
      person.children[5].rotation.x = stride * 0.75;
    });
  };
}
