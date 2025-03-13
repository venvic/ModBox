'use client'
import { analytics, firebaseConfig } from '@/database';
import { getApps, initializeApp } from 'firebase/app';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react'
import Filialfinder from './filialfinder';
import PDFmodul from './pdfmodul';
import Kartenmodul from './kartenmodul';
import Formularmodul from './formularmodul';
import Offnungszeiten from './oeffnungszeitenmodul';
import { Analytics, logEvent } from 'firebase/analytics';
import Terminalmodul from './terminalmodul';


if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();


interface Product {
    id: string;
    slug: string;
}

interface Center {
    latitude: number;
    longitude: number;
}

interface Module {
    id: string;
    name: string;
    description: string;
    center: Center;
    type: string;
    privacy: string;
    settings: string;
    slug: string;
}

const SlugController = ({ slug, moduleId }: { slug: string, moduleId: string }) => {
    const [module, setModule] = useState<Module | null>(null);
    const [product, setProduct] = useState<Product>({ id: '', slug: '' });
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchProductAndModule = async () => {
            try {
                const productQuery = query(collection(db, 'product'), where('slug', '==', slug));
                const productSnapshot = await getDocs(productQuery);
                if (!productSnapshot.empty) {
                    const productDoc = productSnapshot.docs[0];
                    const productData = { id: productDoc.id, slug: productDoc.data().slug };
                    setProduct(productData);

                    const moduleRef = doc(db, `product/${productDoc.id}/modules/${moduleId}`);
                    const moduleDoc = await getDoc(moduleRef);
                    if (moduleDoc.exists()) {
                        const moduleData = { id: moduleDoc.id, ...moduleDoc.data() } as Module;
                        setModule(moduleData);
                    } else {
                        console.log('No such module!', moduleRef.path);
                    }

                    if (analytics) {
                        logEvent(analytics, "page_view", {
                            page_path: window.location.pathname,
                            module_id: moduleId,
                            product_id: productData.id,
                        });
                    }
                } else {
                    console.log('No product found with the given slug!');
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching product and module: ', error);
                setLoading(false);
            }
        };

        fetchProductAndModule();
    }, [slug, moduleId]);

    return (
        <div className='flex w-full h-full min-h-screen bg-white'>
            {loading ? (
                <div className="flex justify-center items-center h-full w-full">
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                    {module && module.type === 'Filialfinder' && <Filialfinder product={product} module={module} />}
                    {module && module.type === 'PDF-Modul' && <PDFmodul product={product} module={module} />}
                    {module && module.type === 'Kartenmodul' && <Kartenmodul product={product} module={module} />}
                    {module && module.type === 'Formular-Modul' && <Formularmodul product={product} module={module} />}
                    {module && module.type === 'Offnungszeiten' && <Offnungszeiten product={product} module={module} />}
                    {module && module.type === 'Terminal-Modul' && <Terminalmodul product={product} module={module} />}
                    {!module && <h1 className='text-white'></h1>}
                </>
            )}
        </div>
    )
}

export default SlugController;