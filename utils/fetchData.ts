import { firebaseConfig } from '@/database';
import { getApps, initializeApp } from 'firebase/app';
import { getDocs, collection, getFirestore, query, where } from 'firebase/firestore';
import { toast } from 'sonner';

if (!getApps().length) {
    initializeApp(firebaseConfig);
}
const db = getFirestore();

export const fetchProductModulesCount = async () => {
  const querySnapshot = await getDocs(collection(db, 'product'));
  const productModulesCount = await Promise.all(querySnapshot.docs.map(async (doc) => {
    const modulesCollection = collection(db, 'product', doc.id, 'modules');
    const modulesSnapshot = await getDocs(modulesCollection);
    return {
      name: doc.data().name,
      slug: doc.data().slug,
      modulesCount: modulesSnapshot.size,
    };
  }));

  return productModulesCount;
};

export const fetchProductPageViews = async () => {
  try {
    const response = await fetch('/api/getPageViews');
    const data = await response.json();
    if (data.error) {
      toast.error("Error fetching page views", { description: `${data.error}` });
      return [];
    }
    console.log('Page views data:', data);
    return data;
  } catch (error) {
    toast.error("Error fetching page views", { description: `${error}` });
    return [];
  }
};
