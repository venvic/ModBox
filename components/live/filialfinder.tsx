import React, { useEffect, useState } from 'react';
import { collection, getDocs, getFirestore, query } from 'firebase/firestore';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import * as Icons from 'react-icons/fa6';
import { Input } from '../ui/input';

interface FilialfinderProps {
    product: {
        id: string;
        slug: string;
    }
    module: {
        id: string;
        name: string;
        description: string;
        type: string;
        settings: string;
        slug: string;
    };
}

interface Category {
    id: string;
    name: string;
    sort: number;
}

interface Object {
    category: string;
    fields: any[];
    id: string;
    description: string;
    imageUrl: string;
    imageInsight: boolean;
    name: string;
    sort: number;
}

const Filialfinder: React.FC<FilialfinderProps> = ({ product, module }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [objects, setObjects] = useState<Object[]>([]);
    const [filteredObjects, setFilteredObjects] = useState<Object[]>([]);
    const [selectedObject, setSelectedObject] = useState<Object | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const db = getFirestore();

    // Helper to detect if a string contains HTML tags
    const hasHTML = (text: string) => /<\/?[a-z][\s\S]*>/i.test(text);

    useEffect(() => {
        if (module.type === 'Filialfinder') {
            const fetchCategoriesAndObjects = async () => {
                try {
                    setLoading(true);
                    // Fetch categories
                    const categoryQuery = query(collection(db, `product/${product.id}/modules/${module.id}/categories`));
                    const categorySnapshot = await getDocs(categoryQuery);
                    const fetchedCategories = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                    console.log('Fetched Categories:', fetchedCategories);
                    setCategories(fetchedCategories.sort((a, b) => a.sort - b.sort));

                    const allObjects: Object[] = [];
                    for (const category of fetchedCategories) {
                        console.log(`Fetching objects from path: product/${product.id}/modules/${module.id}/categories/${category.id}/objects`);
                        const objectQuery = query(collection(db, `product/${product.id}/modules/${module.id}/categories/${category.id}/objects`));
                        const objectSnapshot = await getDocs(objectQuery);
                        const fetchedObjects = objectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Object));
                        console.log(`Fetched Objects for Category ${category.id}:`, fetchedObjects);
                        allObjects.push(...fetchedObjects);
                    }
                    setObjects(allObjects.sort((a, b) => a.sort - b.sort));
                    setFilteredObjects(allObjects.sort((a, b) => a.sort - b.sort));
                    setLoading(false);
                } catch (error) {
                    console.error('Error fetching categories and objects: ', error);
                    setLoading(false);
                }
            };

            fetchCategoriesAndObjects();
        }
    }, [product.id, module.id]);

    useEffect(() => {
        const filtered = objects.filter(obj => obj.name.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredObjects(filtered);
    }, [searchTerm, objects]);

    const handleObjectClick = (object: Object) => {
        setSelectedObject(selectedObject === object ? null : object);
    };

    const getIconComponent = (iconName: string) => {
        const IconComponent = Icons[iconName as keyof typeof Icons];
        return IconComponent ? <IconComponent style={{ color: module.settings, height:"15px", width:"15px" }} /> : null;
    };

    const isPhoneNumber = (value: string) => /^\d+(\s\d+)*$/.test(value);
    const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const renderField = (field: any, moduleSettings: string) => {
        if (field.gremium) {
            return (
                <div className='flex gap-3 items-center'>
                    <div className='min-h-[4px] min-w-[4px] rounded-full' style={{ backgroundColor: moduleSettings }}/>
                    <a className='text-black/70 text-xs' style={{ color: moduleSettings }} href={field.value}>{field.name}</a>
                </div>
            );
        }

        if (field.link) {
            let href = field.value;
            if (isPhoneNumber(field.value)) {
                href = `tel:${field.value}`;
            } else if (isEmail(field.value)) {
                href = `mailto:${field.value}`;
            }
            return (
                <div className='flex gap-5 items-center max-w-[calc(90dvw-40px)]'>
                    <div>
                        {field.icon ? getIconComponent(field.icon) : <Icons.FaArrowUpRightFromSquare />}
                    </div>
                    <div>
                        <p className='text-black'>{field.name}</p>
                        <a className='text-black/70 break-all' href={href}>{field.value}</a>
                    </div>
                </div>
            );
        }

        if (field.list) {
            return (
                <div className='flex flex-col gap-1'>
                    <p className='text-black/70 font-semibold text-base'>{field.name}</p>
                    {field.value.split('#').filter((item: string) => item.trim() !== '').map((item: string, index: number) => (
                        <div key={index} className='flex items-center gap-[7px]'>
                            <div className='min-h-[3px] min-w-[3px] rounded-full' style={{ backgroundColor: moduleSettings }} />
                            <p className='text-black text-sm'>{item.trim()}</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (field.address) {
            return (
                <div className='flex gap-5 items-center max-w-[calc(90dvw-40px)]'>
                    <div>
                        <Icons.FaLocationDot style={{ color: module.settings, height:"15px", width:"15px" }} />
                    </div>
                    <div>
                        <p className='text-black'>{field.name}</p>
                        <a
                            className='text-black/70 break-all'
                            href={
                                /iPad|iPhone|iPod|Mac/.test(navigator.userAgent)
                                    ? `http://maps.apple.com/?daddr=${field.coordinates.latitude},${field.coordinates.longitude}&dirflg=d`
                                    : `https://www.google.com/maps/dir/?api=1&destination=${field.coordinates.latitude},${field.coordinates.longitude}`
                            }
                        >
                            {field.value}
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div className='flex gap-5 items-center max-w-[calc(90dvw-40px)]'>
                {field.icon && (<div>
                        {getIconComponent(field.icon)}
                </div>)}
                
                {field.icon && (<div>
                    <p className='text-black'>{field.name}</p>
                    <p className='text-black/70'>{field.value}</p>
                </div>)}
                
                {!field.icon && (<div>
                    <p className='text-black/70 font-semibold text-base'>{field.name}</p>
                    <p className='text-black text-sm'>{field.value}</p>
                </div>)}
            </div>
        );
    };

    return (
        <div className='h-full w-full text-black p-4'>
            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                    {categories.length === 0 && <p>Keine Kategorien verfügbar.</p>}
                    <div>
                        <Input
                            placeholder='Suche...'
                            className='border border-black/10 mb-5 text-black placeholder:text-black/60'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {categories.map(category => (
                        <div key={category.id} className='mb-5'>
                            <h2 className='font-medium flex items-center gap-4 text-center'><div className='flex-1 bg-black/10 h-[1px]'/><p className='max-w-[65vw]'>{category.name}</p><div className='flex-1 bg-black/10 h-[1px]'/></h2>
                            {filteredObjects.filter(obj => obj.category === category.id).length === 0 && <></>}
                            {filteredObjects.filter(obj => obj.category === category.id).map(obj => (
                                <div key={obj.id}>
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <div className='w-full my-2 shadow rounded-md bg-neutral-100 flex flex-col justify-between overflow-hidden items-center' onClick={() => handleObjectClick(obj)}>
                                                {obj.imageInsight && obj.imageUrl !== '.' && <img src={obj.imageUrl} alt={obj.name} className='w-full max-h-36 h-full object-cover' />}
                                                <div className='flex w-full justify-between items-center px-3 py-2'>
                                                    <p className='text-sm text-black/80'>{obj.name}</p>
                                                    <Icons.FaChevronRight className='h-3 w-3' style={{ color: module.settings }}/>
                                                </div>
                                            </div>
                                        </SheetTrigger>
                                        <SheetContent className='bg-neutral-100 text-black min-w-[90dvw] overflow-y-scroll flex flex-col items-start justify-start text-start'>
                                            <SheetHeader>
                                                <SheetTitle className='text-black text-start mb-8'>
                                                    {obj.name}
                                                    {obj.description !== '.' && (
                                                        hasHTML(obj.description)
                                                        ? <div
                                                            className='text-sm text-black/70 font-regular'
                                                            dangerouslySetInnerHTML={{ __html: obj.description }}
                                                          />
                                                        : <p className='text-sm text-black/70 font-regular'>{obj.description}</p>
                                                    )}
                                                    {obj.imageUrl !== '.' && <img src={obj.imageUrl} alt={obj.name} className='mt-2 max-h-[220px]' />}
                                                </SheetTitle>
                                                <SheetDescription className='text-start'>
                                                    {obj.fields.map((field, index) => (
                                                        <div key={index} className='py-2'>
                                                            {renderField(field, module.settings)}
                                                        </div>
                                                    ))}
                                                </SheetDescription>
                                            </SheetHeader>

                                            <SheetFooter className='flex w-full mt-auto'>
                                                <SheetClose className='bg-neutral-200 w-full py-2 rounded-lg'>Zurück</SheetClose>
                                            </SheetFooter>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            ))}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

export default Filialfinder;