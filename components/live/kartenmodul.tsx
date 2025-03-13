'use client'
import React from 'react'
import { Map, Marker, MapType, ColorScheme, FeatureVisibility } from 'mapkit-react';
import { collection, getDocs, getFirestore, query } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/database';
import { Button } from '../ui/button';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

interface KartenModulProps {
    product: {
        id: string;
        slug: string;
    }
    module: {
        id: string;
        name: string;
        description: string;
        center: center;
        type: string;
        settings: string;
        slug: string;
    };
}

interface center {
    latitude: number;
    longitude: number;
}

interface mark {
    id: string;
    name: string;
    website: string;
    color: string;
    lat: string;
    lon: string;
}

const Kartenmodul: React.FC<KartenModulProps> = ({ product, module }) => {
    const [marks, setMarks] = React.useState<mark[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [selectedMark, setSelectedMark] = React.useState<mark | null>(null);
    const [visibleTitles, setVisibleTitles] = React.useState<{ [key: string]: boolean }>({});
    const [initialRegion, setInitialRegion] = React.useState<any>(null);
    const token = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_PROD_MAPKIT_TOKEN || '' : process.env.NEXT_PUBLIC_DEV_MAPKIT_TOKEN || '';

    React.useEffect(() => {
        const fetchFiles = async () => {
            setLoading(true);
            const marksQuery = query(collection(db, `product/${product.id}/modules/${module.id}/marks`));
            const querySnapshot = await getDocs(marksQuery);
            const marksList: mark[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as mark));
            console.log('Fetched marks:', marksList); 
            setMarks(marksList);

            const boundingBox = calculateBoundingBox(marksList);
            if (boundingBox) {
                setInitialRegion(boundingBox);
            } else {
                setInitialRegion({
                    centerLatitude: typeof module.center.latitude === 'number' ? module.center.latitude : 0,
                    centerLongitude: typeof module.center.longitude === 'number' ? module.center.longitude : 0,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1
                });
            }
            setLoading(false);
        };

        fetchFiles();
    }, [product.id, module.id]);

    if (!module.center || typeof module.center.latitude !== 'number' || typeof module.center.longitude !== 'number') {
        return <div className='text-red-500'>Error: Invalid center coordinates - {module.center?.latitude} * {module.center?.longitude}</div>;
    }

    const calculateBoundingBox = (marks: mark[]) => {
        if (marks.length === 0) return null;

        if (marks.length === 1) {
            const singleMark = marks[0];
            return {
                centerLatitude: parseFloat(singleMark.lat),
                centerLongitude: parseFloat(singleMark.lon),
                latitudeDelta: 0.1,
                longitudeDelta: 0.1
            };
        }

        let minLat = Number.MAX_VALUE, maxLat = -Number.MAX_VALUE;
        let minLon = Number.MAX_VALUE, maxLon = -Number.MAX_VALUE;

        marks.forEach(mark => {
            const lat = parseFloat(mark.lat);
            const lon = parseFloat(mark.lon);
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
        });

        return {
            centerLatitude: (minLat + maxLat) / 2,
            centerLongitude: (minLon + maxLon) / 2,
            latitudeDelta: (maxLat - minLat) * 1.2, // adding some padding
            longitudeDelta: (maxLon - minLon) * 1.2 // adding some padding
        };
    };

    const handleMarkerClick = (mark: mark) => {
        setSelectedMark(mark);
        setVisibleTitles(prev => {
            const newVisibleTitles = { ...prev };
            Object.keys(newVisibleTitles).forEach(key => {
                newVisibleTitles[key] = false;
            });
            newVisibleTitles[mark.id] = true;
            return newVisibleTitles;
        });
    };

    const handleDeselect = () => {
        setSelectedMark(null);
        setVisibleTitles({});
    };

    const handleRoutePlan = () => {
        if (selectedMark) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedMark.lat},${selectedMark.lon}`;
            window.open(url, '_blank');
        }
    };

    const handleWebsite = () => {
        if (selectedMark && selectedMark.website) {
            window.open(selectedMark.website, '_blank');
        }
    };

    if (loading || !initialRegion) {
        return <div>Loading...</div>;
    }

    return (
        <div className='w-full overflow-hidden p-4 h-fit flex flex-col text-black'>
            <div className='w-full bg-slate-100 rounded-md shadow px-4 py-3 text-black/80 font-medium text-sm'><h2>{module.description}</h2></div>

            <div className='relative h-[600px] mt-4 w-full rounded-md overflow-hidden'>
                <Map 
                    colorScheme={ColorScheme.Auto} 
                    mapType={MapType.Standard} 
                    token={token} 
                    initialRegion={initialRegion}
                    showsPointsOfInterest={true}
                    showsCompass={FeatureVisibility.Visible}
                    showsScale={FeatureVisibility.Hidden}
                    onClick={handleDeselect}
                >
                    {marks.filter(mark => typeof mark.lat === 'string' && typeof mark.lon === 'string').map(mark => (
                        <Marker
                            key={mark.id}
                            latitude={parseFloat(mark.lat)}
                            longitude={parseFloat(mark.lon)}
                            title={visibleTitles[mark.id] ? mark.name : ""}
                            subtitle={mark.website}
                            color={mark.color || '#0FA7AF'}
                            onSelect={() => handleMarkerClick(mark)}
                            data-marker-id={mark.id}
                        />
                    ))}
                </Map>
            </div>

            {selectedMark && (
                <div className='flex justify-end w-full mt-4 gap-2'>
                    <Button variant="secondary" onClick={handleWebsite}>Website</Button>
                    <Button onClick={handleRoutePlan}>Route planen</Button>
                </div>
            )}
        </div>
    )
}

export default Kartenmodul;