const groupGuidance = {
  Legs: "Keep your knees tracking in the same direction as your toes. Use a controlled range of motion.",
  Back: "Keep your chest lifted, pull with your elbows, and avoid shrugging your shoulders.",
  Chest: "Keep your shoulder blades gently back and down. Press smoothly without locking out hard.",
  Shoulders: "Keep your ribs down and move the weight with control. Stop if the shoulder feels painful.",
  Biceps: "Keep your elbows close to your body and avoid swinging the weight.",
  Triceps: "Keep your upper arms steady and fully control the return of the weight.",
  Core: "Brace your stomach as if preparing for a gentle punch. Move slowly and avoid pulling your neck.",
  Cardio: "Start at an easy pace, then increase intensity gradually. Record duration and optional distance.",
};

const specificGuidance = {
  "Leg Press": "Place your feet about shoulder width on the platform. Lower until comfortable, then press through your full foot.",
  "Lat Pull": "Pull the bar toward the top of your chest. Do not pull it behind your neck.",
  Treadmill: "Use a pace that lets you warm up safely. Hold the rails only when needed for balance.",
  "Exercise Bike": "Set the seat so your knee has a small bend at the bottom of each pedal stroke.",
  "Walking Warm-Up": "Walk at a pace that raises your temperature while still allowing an easy conversation.",
};

export function getExerciseGuidance(exercise) {
  return specificGuidance[exercise.name] || groupGuidance[exercise.muscleGroup];
}
