'use client'
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/database';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getFirestore, collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/database';
import { toast } from 'sonner';
import Statistics from '@/components/statisticsMonitor';
import getRandomId from '@/utils/getRandomId';
import { useCurrentTheme } from '@/components/theme-provider';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();


const fetchProductModulesCount = async () => {
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

const fetchProductPageViews = async () => {
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


const fetchUserRights = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const userDocRef = doc(db, 'global', 'users', currentUser.uid, 'info');
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return null;
    }

    const userData = userDocSnap.data();
    const { projects } = userData;

    if (projects === "all") {
      return "all";
    }

    return Array.isArray(projects) ? projects : [];
  } catch (error) {
    toast.error("Error fetching user rights", { description: `${error}` });
    return null;
  }
};


const AddProductDialog = ({ isOpen, onClose, onProductAdded }: { isOpen: boolean, onClose: () => void, onProductAdded: () => void }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
    setSlug(formattedSlug);
  };

  const handleSave = async () => {
    try {
      const id = getRandomId(slug.substring(0, 3).toUpperCase(), 14);
      await setDoc(doc(db, 'product', id), {
        name,
        slug,
        created: new Date(),
      });

      setName(''); setSlug('');
      onClose();
      onProductAdded();
    } catch (error) {
      toast.error("Error adding document", { description: `${error}` });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle className='text-foreground'>Gemeinde hinzufügen</DialogTitle>
        <DialogDescription className='text-foreground/70'>
          Bitte geben Sie die folgenden Informationen ein:
        </DialogDescription>
        <Input
          type='text'
          placeholder='Name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='w-full text-foreground placeholder:text-neutral-400'
        />
        <Input
          type='text'
          placeholder='Slug'
          value={slug}
          onChange={handleSlugChange}
          className='w-full text-foreground placeholder:text-neutral-400'
        />
        <DialogFooter className='mt-8'>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant='secondary' onClick={handleSave}>Hinzufügen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productModulesCount, setProductModulesCount] = useState<{ name: string; slug: string; modulesCount: number }[]>([]);
  const [productPageViews, setProductPageViews] = useState([]);
  const [grantedProducts, setGrantedProducts] = useState<string[] | "all">([]);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false);
  const router = useRouter();
  const theme = useCurrentTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setTimeout(() => {
          setUser(user);
          setLoading(false);
        }, 1100);
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 10 : 100));
      }, 110);

      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    const fetchData = async () => {
      const productsList = await fetchProducts();
      const modulesCount = await fetchProductModulesCount();
      const pageViews = await fetchProductPageViews();
      const grantedProducts = await fetchUserRights();

      if (grantedProducts === null) {
        return;
      }

      if (grantedProducts !== "all") {
        const filteredProducts = productsList.filter(product =>
          grantedProducts.includes(product.id)
        );
        setProducts(filteredProducts);
      } else {
        setProducts(productsList);
      }

      setGrantedProducts(grantedProducts);
      setProductModulesCount(modulesCount);
      setProductPageViews(pageViews);
      setIsProductsLoaded(true);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('addGemeinde') === 'true') {
      setIsDialogOpen(true);
    }
  }, []);

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'product'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, name: data.name, slug: data.slug };
    });
  };

  const handleProductAdded = async () => {
    const productsList = await fetchProducts();
    setProducts(productsList);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isProductsLoaded) {
    return (
      <div className='absolute h-screen w-screen flex items-center justify-center bg-background top-0 left-0'>
        <Progress value={progress} className='w-1/3' />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-screen flex justify-center ${theme === "brain-rot" && "bg-[url('/fun/tralalelo.png')] bg-cover bg-center "} ${theme === "modern" ? "bg-gradient-to-br from-blue-950/50 via-purple-900/25 to-blue-900/35" : "bg-background"}`}>
      <div className='max-w-[1900px] w-full p-4 md:p-12'>
        <div className='w-full flex gap-10'>
          <Input
            type='text'
            placeholder='Suche...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full text-foreground placeholder:text-foreground/60 bg-background/60 backdrop-blur-xl'
          />
          {grantedProducts === "all" && (
            <Button variant='secondary' onClick={() => setIsDialogOpen(true)}>Hinzufügen</Button>
          )}
        </div>
        {grantedProducts === "all" && (
          <AddProductDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onProductAdded={handleProductAdded} />
        )}
        {!isDialogOpen &&
        <>
          <div className='w-full border h-fit min-h-[560px] mt-10 relative overflow-y-scroll rounded-lg'>
            <table className='min-w-full bg-background/60 backdrop-blur-xl text-foreground'>
              <thead>
                <tr>
                  <th className='py-2 px-4 border-b text-left'>Name</th>
                  <th className='py-2 px-4 border-b text-left'>Slug</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} onClick={() => router.push(`/dashboard/${product.id}`)} className='cursor-pointer hover:bg-neutral-700/20'>
                    <td className='py-2 px-4 border-b'>{product.name}</td>
                    <td className='py-2 px-4 border-b'>{product.slug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {grantedProducts === "all" && <Statistics />}
        </>
        }
      </div>
    </div>
  );
}