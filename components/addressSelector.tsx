'use client'
import React, { useState } from 'react';
import { ColorScheme, FeatureVisibility, Map, MapType, Marker } from 'mapkit-react';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';

const token = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_PROD_MAPKIT_TOKEN || '' : process.env.NEXT_PUBLIC_DEV_MAPKIT_TOKEN || '';

const AddressSelector = ({ onAddressSelect }: { onAddressSelect: (address: string, coordinates: { latitude: number, longitude: number }) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  let searchTimeout: NodeJS.Timeout;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    clearTimeout(searchTimeout);
    if (e.target.value.length > 2) {
      searchTimeout = setTimeout(async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/autocomplete?input=${encodeURIComponent(e.target.value)}`);
          if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
          }
          const data = await response.json();
          setSuggestions(data.predictions);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        }
      }, 750);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${process.env.NEXT_PUBLIC_LOCATION_API_KEY}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      const location = data.results[0].geometry.location;
      setSelectedCoordinates({ latitude: location.lat, longitude: location.lng });
      onAddressSelect(description, { latitude: location.lat, longitude: location.lng });
      setSearchTerm(description);
      setSuggestions([]);
      setMapKey(prevKey => prevKey + 1);
    } catch (error) {
        toast.error('Failed to fetch coordinates:', {description: String(error)});
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapClick = (coordinates: any) => {
    const { latitude, longitude } = coordinates || {};
    if (latitude !== undefined && longitude !== undefined) {
      setSelectedCoordinates({ latitude, longitude });
      onAddressSelect(searchTerm, { latitude, longitude });
      console.log("Selected coordinates:", latitude, longitude);
      setMapKey(prevKey => prevKey + 1);
    } else {
      console.error("Event does not contain coordinates", event);
    }
  };

  return (
    <div className='relative'>
      <Input
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Adresse suchen"
        className='text-foreground placeholder:text-neutral-400/50'
      />
      {suggestions && suggestions.length > 0 && (
        <ul className='text-foreground z-50 absolute flex flex-col divide-y max-h-64 overflow-scroll bg-card-foreground w-full rounded-md mt-2 border'>
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onMouseUp={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
              className='cursor-pointer text-sm p-2 hover:bg-neutral-800/80'
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
      <div className='max-h-64 h-64 min-h-64 overflow-hidden mt-4'>
        {selectedCoordinates && !isLoading && (
            <div className='h-64 w-full rounded-md overflow-hidden'>
            <Map
                key={mapKey} // Force re-render by changing key
                token={token}
                initialRegion={{ centerLatitude: selectedCoordinates.latitude, centerLongitude: selectedCoordinates.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
                colorScheme={ColorScheme.Dark}
                mapType={MapType.Standard}
                showsPointsOfInterest={true}
                showsCompass={FeatureVisibility.Hidden}
                showsScale={FeatureVisibility.Hidden}
                showsMapTypeControl={false}
                showsZoomControl={false}
                onLongPress={(event) => {
                    const coordinates = event.toCoordinates();
                    handleMapClick({ latitude: coordinates.latitude, longitude: coordinates.longitude })
                }}
            >
                <Marker color='#0FA7AF' latitude={selectedCoordinates.latitude} longitude={selectedCoordinates.longitude} />
            </Map>
            </div>
        )}
        {<Skeleton className="h-full w-full" />}
      </div>
    </div>
  );
};

export default AddressSelector;
