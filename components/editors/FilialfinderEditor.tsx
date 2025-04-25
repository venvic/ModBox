'use client'

import React, { useState, useEffect } from 'react';
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { Input } from '../ui/input';
import { toast } from 'sonner';
import CategoriesEditor from './filialfinder/categories';
import ObjectsEditor from './filialfinder/objects';
import Importer from './filialfinder/importer';

const db = getFirestore();

const FilialfinderEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
      const fetchCategories = async () => {
          try {
            const categoriesSnapshot = await getDocs(collection(db, `product/${productId}/modules/${id}/categories`));
            const categoriesList = categoriesSnapshot.docs.map(doc => ({ id: doc.id, sort: 0, ...doc.data() }));
            categoriesList.sort((a, b) => a.sort - b.sort); 
            setCategories(categoriesList);
          } catch (error) {
            console.error("Error fetching categories: ", error);
            toast.error("Fehler", { description: "Kategorien konnten nicht geladen werden" });
          }
        };
      fetchCategories();
  }, [id, productId]);

  const filteredObjects = (objects: any[]) => {
    return objects.filter(obj => obj.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className='flex flex-col w-full h-full relative'>
      <div className='w-full flex gap-4'>
        <Input 
          placeholder='Suche...' 
          className='text-foreground placeholder:text-neutral-100/50'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className='h-[calc(100dvh-50px)] max-h-[802px] overflow-y-scroll md:h-full w-full mt-4'>
        <Importer moduleId={id} productId={productId} />
        <CategoriesEditor moduleId={id} productId={productId} categories={categories} setCategories={setCategories} onChangesSaved={onChangesSaved} />
        <ObjectsEditor moduleId={id} productId={productId} categories={categories} onChangesSaved={onChangesSaved} filteredObjects={filteredObjects} />
      </div>
    </div>
  );
};

export default FilialfinderEditor;