'use client'

import getRandomId from "@/utils/getRandomId";
import { useState, JSX } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { doc, getFirestore, writeBatch } from "firebase/firestore";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { DndContext } from "@dnd-kit/core";
import { FaGrip, FaTrash } from "react-icons/fa6";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { closestCenter } from "@dnd-kit/core";
import { CSS } from '@dnd-kit/utilities';

const db = getFirestore();

const SortableItem = ({ id, children }: { id: string, children: (listeners: any) => JSX.Element }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
  
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        {children(listeners)}
      </div>
    );
};

const CategoriesEditor = ({ categories, setCategories, moduleId, productId, onChangesSaved }: { moduleId: string, productId: string, categories: any[], setCategories: (categories: any[]) => void, onChangesSaved: () => void }) => {
    const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
  
    const handleNameChange = (index: number, newName: string) => {
      const updatedCategories = [...categories];
      updatedCategories[index].name = newName;
      setCategories(updatedCategories);
    };
  
    const handleRemoveCategory = (index: number, event: React.MouseEvent) => {
      event.stopPropagation();
      const categoryToRemove = categories[index];
      if (categoryToRemove.id) {
        setDeletedCategories([...deletedCategories, categoryToRemove.id]);
      }
      const updatedCategories = categories.filter((_, i) => i !== index);
      const sortedCategories = updatedCategories.map((category, i) => ({
        ...category,
        sort: i + 1,
      }));
      setCategories(sortedCategories);
    };
  
    const handleAddCategory = () => {
      const newCategory = { name: '', sort: categories.length + 1, id: getRandomId(undefined, 5) };
      setCategories([...categories, newCategory]);
    };
  
    // Deletes from Firestore occur in handleSaveChanges function
    const handleSaveChanges = async () => {
      const batch = writeBatch(db);
      categories.forEach((category) => {
        const categoryRef = doc(db, `product/${productId}/modules/${moduleId}/categories`, category.id);
        batch.set(categoryRef, category);
      });
      deletedCategories.forEach((categoryId) => {
        const categoryRef = doc(db, `product/${productId}/modules/${moduleId}/categories`, categoryId);
        batch.delete(categoryRef);
      });
      await batch.commit();
      setDeletedCategories([]);
      toast.success("Gespeichert", { description: `${new Date().toLocaleTimeString()}` });
      onChangesSaved();
      setIsSheetOpen(false);
    };
  
    const handleDragEndCategories = (event: any) => {
      const { active, over } = event;
      if (active.id !== over.id) {
        const oldIndex = categories.findIndex(category => category.id === active.id);
        const newIndex = categories.findIndex(category => category.id === over.id);
        const newCategories = arrayMove(categories, oldIndex, newIndex).map((category, index) => ({
          ...category,
          sort: index + 1,
        }));
        setCategories(newCategories);
      }
    };
  
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>Kategorien</Button>
        </SheetTrigger>
        <SheetContent className="min-w-[90dvw] md:min-w-[500px]">
          <SheetHeader>
            <SheetTitle className='text-white'>Kategorien bearbeiten</SheetTitle>
            <SheetDescription className='text-neutral-300'>Bearbeiten Sie die Kategorien</SheetDescription>
          </SheetHeader>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndCategories}>
            <SortableContext items={categories} strategy={verticalListSortingStrategy}>
              <div className='flex h-[calc(100%-100px)] flex-col gap-4 mt-10'>
                {categories.map((category, index) => (
                  <SortableItem key={category.id} id={category.id}>
                    {(listeners: any) => (
                      <div className='flex gap-2 items-center overflow-y-scroll'>
                        <span className='handle text-white' {...listeners}><FaGrip /></span>
                        <Input
                          value={category.name}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          placeholder='Kategorie Name'
                          className='text-white placeholder:text-neutral-200/50'
                        />
                        <Button
                          variant="destructive"
                          onClick={(e) => handleRemoveCategory(index, e)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    )}
                  </SortableItem>
                ))}
                <div className='flex flex-col mt-auto gap-3'>
                  <Button variant="outline" className='text-white' onClick={handleAddCategory}><span className='text-lg mr-1'>+</span> Neue Kategorie</Button>
                  <Button variant="secondary" onClick={handleSaveChanges}>Änderungen speichern</Button>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </SheetContent>
      </Sheet>
    );
  };

export default CategoriesEditor;