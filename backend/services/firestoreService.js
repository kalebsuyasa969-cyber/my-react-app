const { db } = require("../config/firebase");

async function getExercise(exerciseId) {
  const docRef = db.collection("exercises").doc(exerciseId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new Error("Exercise tidak ditemukan.");
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

async function updateExercise(exerciseId, data) {
  await db.collection("exercises").doc(exerciseId).update(data);
}

module.exports = {
  getExercise,
  updateExercise,
};