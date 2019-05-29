var firebase = require('firebase');

const firebaseApp = firebase.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_URL,
});
const db = firebaseApp.firestore();

async function getAllDocumentsFromCloudByIds(collectionName, ids = []) {
  const refPromises = ids.map(id => db.doc(`${collectionName}/${id}`).get());
  const collectionDocs = await Promise.all(refPromises);
  return collectionDocs.map(d => ({
    ...d.data(),
    id: d.id,
  }));
}

async function getDocumentFromCloud(collectionName, itemId) {
  const cloudPresetDoc = await db
    .collection(collectionName)
    .doc(itemId)
    .get();

  if (!cloudPresetDoc.exists) {
    throw new Error(`Couldn't locate ${itemId} in ${collectionName}`);
  }
  return {
    id: cloudPresetDoc.id,
    ...cloudPresetDoc.data(),
  };
}

module.exports = {
  getAllDocumentsFromCloudByIds,
  getDocumentFromCloud,
};
