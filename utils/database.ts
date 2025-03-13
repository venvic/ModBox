import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firestore = getFirestore();
const storage = getStorage();

export const uploadFileToStorage = async (productId: string, moduleId: string, fileID: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `PDF/${productId}/${moduleId}/${fileID}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const uploadFileToDatabase = async (productId: string, moduleId: string, fileID: string, fileData: { link: string, name: string, size: number, sort: number }) => {
    const docRef = doc(firestore, `product/${productId}/modules/${moduleId}/files/${fileID}`);
    await setDoc(docRef, fileData);
};

export const deleteFileFromStorage = async (productId: string, moduleId: string, fileID: string) => {
    const storageRef = ref(storage, `PDF/${productId}/${moduleId}/${fileID}`);
    await deleteObject(storageRef);
};

export const getFilesFromDatabase = async (productId: string, moduleId: string) => {
    const filesCollection = collection(firestore, `product/${productId}/modules/${moduleId}/files`);
    const filesSnapshot = await getDocs(filesCollection);
    return filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
