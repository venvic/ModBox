'use client'
import { JSONContent } from '@tiptap/core'
import { firebaseConfig } from "@/database";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import React from "react";
import { FaEnvelope, FaFax, FaGlobe, FaLocationDot, FaMapPin, FaPhone } from 'react-icons/fa6';
import { Map, Marker, MapType, ColorScheme, FeatureVisibility, Annotation } from 'mapkit-react';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();
const storage = getStorage();

interface KontaktmodulProps {
    product: {
        id: string;
        slug: string;
    }
    module: {
        id: string;
        name: string;
        description: string;
        type: string;
        logoUrl?: string;
        settings: string;
        slug: string;
    };
}

interface fieldProps {
    id: string;
    sort: number;
    type: string;
    value: string | JSONContent;
    address?: string;
    addressLocation?: { lat: number, lng: number };
    title?: string;
}

const PhoneField = (value: string, title?: string, color?: string) => {
    return (
        <div className='w-full h-fit flex bg-neutral-100 rounded p-2 shadow-sm' onClick={() => window.open(`tel:${value}`)}>
            <FaPhone style={{ color }} className='h-4 w-4 my-auto ml-2 mr-3' />
            <div className='text-neutral-900 text-xs font-medium'>
                {title ? <p>{title}</p> : <p>Telefonnummer</p>}
                <p className='text-sm font-normal'>{value}</p>
            </div>
        </div>
    );
};

const EmailField = (value: string, title?: string, color?: string) => {
    return (
        <div className='w-full h-fit flex bg-neutral-100 rounded p-2 shadow-sm' onClick={() => window.open(`mailto:${value}`)}>
            <FaEnvelope style={{ color }} className='h-4 w-4 my-auto ml-2 mr-3' />
            <div className='text-neutral-900 text-xs font-medium'>
                {title ? <p>{title}</p> : <p>E-Mail</p>}
                <p className='text-sm font-normal'>{value}</p>
            </div>
        </div>
    );
};

const FaxField = (value: string, title?: string, color?: string) => {
    return (
        <div className='w-full h-fit flex bg-neutral-100 rounded p-2 shadow-sm' onClick={() => window.open(`tel:${value}`)}>
            <FaFax style={{ color }} className='h-4 w-4 my-auto ml-2 mr-3' />
            <div className='text-neutral-900 text-xs font-medium'>
                {title ? <p>{title}</p> : <p>Fax</p>}
                <p className='text-sm font-normal'>{value}</p>
            </div>
        </div>
    );
};

const WebsiteField = (value: string, title?: string, color?: string) => {
    return (
        <div className='w-full h-fit flex bg-neutral-100 rounded p-2 shadow-sm' onClick={() => window.open(value, '_blank')}>
            <FaGlobe style={{ color }} className='h-4 w-4 my-auto ml-2 mr-3' />
            <div className='text-neutral-900 text-xs font-medium'>
                {title ? <p>{title}</p> : <p>Website</p>}
                <p className='text-sm font-normal'>{value}</p>
            </div>
        </div>
    );
};

const AddressField = (value: string, addressLocation?: { lat: number, lng: number }, title?: string, color?: string) => {
    return (
        <div className='w-full h-fit flex bg-neutral-100 rounded p-2 shadow-sm' onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${addressLocation?.lat},${addressLocation?.lng}`)}>
            <FaLocationDot style={{ color }} className='h-4 w-4 my-auto ml-2 mr-3' />
            <div className='text-neutral-900 text-xs font-medium'>
                {title ? <p>{title}</p> : <p>Adresse</p>}
                <p className='text-sm font-normal'>{value}</p>
            </div>
        </div>
    );
};

const renderJSONContent = (content: JSONContent) => {
    if (!content || !content.content) return null;

    return content.content.map((node, index) => {
        if (node.type === 'text') {
            let text = <span key={index}>{node.text}</span>;

            if (node.marks) {
                node.marks.forEach((mark) => {
                    if (mark.type === 'bold') {
                        text = <strong key={index}>{text}</strong>;
                    }
                    if (mark.type === 'italic') {
                        text = <em key={index}>{text}</em>;
                    }
                    if (mark.type === 'underline') {
                        text = <u key={index}>{text}</u>;
                    }
                });
            }

            return text;
        }

        if (node.type === 'paragraph') {
            if (!node.content || node.content.length === 0) {
                return <p key={index}><br /></p>;
            }
            return (
                <p key={index}>
                    {renderJSONContent(node)}
                </p>
            );
        }

        if (node.type === 'image') {
            return (
                <img
                    key={index}
                    src={node.attrs?.src}
                    alt={node.attrs?.alt || 'Image'}
                    className="my-2 max-w-full h-auto"
                />
            );
        }

        if (node.type === 'hardBreak') {
            return <br key={index} />;
        }

        return null;
    });
};

const TextField = (value: JSONContent, title?: string) => {
    return (
        <div className='w-full h-fit flex flex-col'>
            <div className='text-neutral-900'>
                {title && <p className='w-full border-b font-medium border-neutral-300 pb-2 mb-2'>{title}</p>}
                <div className='text-sm font-normal'>
                    {renderJSONContent(value)}
                </div>
            </div>
        </div>
    );
};

const Kontaktmodul: React.FC<KontaktmodulProps> = ({ product, module }) => {
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
    const [fields, setFields] = React.useState<fieldProps[]>([]);
    const [initialRegion, setInitialRegion] = React.useState<any>(null);
    const [selectedLocation, setSelectedLocation] = React.useState<{ lat: number; lng: number } | null>(null);

    const token = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_PROD_MAPKIT_TOKEN || ''
        : process.env.NEXT_PUBLIC_DEV_MAPKIT_TOKEN || '';

    React.useEffect(() => {
        const fetchData = async () => {
            const fieldsQuery = query(collection(db, `product/${product.id}/modules/${module.id}/fields`));
            const fieldsSnapshot = await getDocs(fieldsQuery);
            const fieldsList: fieldProps[] = fieldsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as fieldProps));

            fieldsList.sort((a, b) => a.sort - b.sort);
            setFields(fieldsList);

            const moduleDoc = doc(db, `product/${product.id}/modules`, module.id);
            const moduleSnapshot = await getDoc(moduleDoc);
            const moduleData = moduleSnapshot.exists() ? moduleSnapshot.data() : null;

            if (moduleData?.logoUrl) {
                const logoRef = ref(storage, moduleData.logoUrl);
                const logoDownloadUrl = await getDownloadURL(logoRef);
                setLogoUrl(logoDownloadUrl);
            }

            // Check for addressLocation in fields and set initialRegion
            const addressField = fieldsList.find(field => field.type === 'Ort' && field.addressLocation);
            if (addressField?.addressLocation) {
                const { lat, lng } = addressField.addressLocation;
                setInitialRegion({
                    centerLatitude: lat,
                    centerLongitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                });
                setSelectedLocation({ lat, lng });
            }

            console.log({
                module: moduleData,
                fields: fieldsList
            });
        };

        fetchData();
    }, [product.id, module.id]);

    const handleGetRoute = () => {
        if (selectedLocation) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`;
            window.open(url, '_blank');
        }
    };

    const renderField = (field: fieldProps) => {
        switch (field.type) {
            case 'Telefon':
                return PhoneField(field.value as string, field.title, module.settings);
            case 'Email':
                return EmailField(field.value as string, field.title, module.settings);
            case 'Fax':
                return FaxField(field.value as string, field.title, module.settings);
            case 'Website':
                return WebsiteField(field.value as string, field.title, module.settings);
            case 'Ort':
                return AddressField(field.value as string, field.addressLocation, field.title, module.settings);
            case 'Text':
                return TextField(field.value as JSONContent, field.title);
            default:
                return (
                    <div className='w-full h-fit flex bg-neutral-100 rounded p-2'>
                        <p>Unsupported field type: {field.type}</p>
                    </div>
                );
        }
    };

    return (
        <div className='min-h-screen w-screen p-4 bg-white'>
            <div className='flex w-full items-center gap-4 bg-neutral-100 h-fit p-4 rounded-md shadow-sm'>
                {logoUrl ? 
                    <div className='h-14 w-14 bg-neutral-200 rounded'>
                        <img src={logoUrl} alt={module.name} />
                    </div>
                :
                <></>}
                    <div className='text-neutral-800 h-full flex flex-col justif-center'>
                        <h1>{module.name}</h1>
                        <p className='text-sm text-neutral-700'>{module.description}</p>
                    </div>
            </div>

            {initialRegion && (
                <div className='mt-4 h-[440px] w-full rounded-md overflow-hidden' style={{ padding: '0 2px' }}>
                    <Map
                        colorScheme={ColorScheme.Auto}
                        mapType={MapType.Standard}
                        token={token}
                        initialRegion={initialRegion}
                        showsPointsOfInterest={true}
                        showsCompass={FeatureVisibility.Hidden}
                        showsScale={FeatureVisibility.Hidden}
                        showsZoomControl={false}
                        showsMapTypeControl={false}
                    >
                        {selectedLocation && (
                            <Marker
                                latitude={selectedLocation.lat}
                                longitude={selectedLocation.lng}
                                color={module.settings || '#0FA7AF'}
                            />
                        )}
                    </Map>
                </div>
            )}

            <div className='mt-4'>
                {fields.map(field => (
                    <div key={field.id} className='py-2'>
                        {renderField(field)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Kontaktmodul;