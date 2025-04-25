import React, { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import getRandomId from '@/utils/getRandomId';
import { getGeocode } from '@/utils/geocode';

const db = getFirestore();

const normalizeCategoryName = (name?: string) => (name || '').replace(/^"|"$/g, '').trim();

export default function Importer({ productId, moduleId }: { productId: string; moduleId: string }) {
  const [step, setStep] = useState(1);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [uniqueCsvCategories, setUniqueCsvCategories] = useState<string[]>([]);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);

      const lines = content.split('\n').filter(Boolean);
      const headerLine = lines[0];
      const useSemicolon = headerLine.split(';').length > headerLine.split(',').length;
      const splitRE = useSemicolon
        ? /;(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)/
        : /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;

      const headerCols = headerLine
        .split(splitRE)
        .map(col => normalizeCategoryName(col).toLowerCase());
      const artIdx = headerCols.findIndex(c => c === 'filialart');
      if (artIdx < 0) {
        toast.error('Import abgebrochen: Spalte "Filialart" fehlt');
        return;
      }

      const csvCats = lines.slice(1).map(row => {
        const cols = row
          .split(splitRE)
          .map(f => normalizeCategoryName(f));  
        return cols[artIdx] || '';
      }).filter(Boolean);

      const uniqueCategories = Array.from(new Set(csvCats));
      setUniqueCsvCategories(uniqueCategories);

      await checkDatabase(uniqueCategories);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const checkDatabase = async (csvCategories: string[]) => {
    setIsLoading(true);
    try {
      const categoriesSnapshot = await getDocs(collection(db, `product/${productId}/modules/${moduleId}/categories`));
      const dbCategories = categoriesSnapshot.docs.map((doc) =>
        normalizeCategoryName(doc.data().name || '').toLowerCase()
      );
      setExistingCategories(dbCategories);

      const newCategories = csvCategories.filter((category) => !dbCategories.includes(category.toLowerCase()));
      setNewCategories(newCategories);
    } catch (error: any) {
      toast.error('Fehler beim Datencheck:', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const writeCategoriesAndObjectsToDatabase = async () => {
    setIsLoading(true);
    try {
      const categoriesCollection = collection(db, `product/${productId}/modules/${moduleId}/categories`);
      const categoriesSnapshot = await getDocs(categoriesCollection);

      const rows = (fileContent || '').split('\n').slice(1);

      const existingCategories = categoriesSnapshot.docs.map((doc) =>
        normalizeCategoryName(doc.data().name || '').toLowerCase()
      );
      const highestSort = categoriesSnapshot.docs.length > 0
        ? Math.max(...categoriesSnapshot.docs.map((doc) => doc.data().sort || 0))
        : 0;

      const uniqueNewCategories = newCategories
        .filter((name) => !existingCategories.includes(name.toLowerCase()))
        .map((name, index) => ({
          id: getRandomId(undefined, 5),
          name,
          sort: highestSort + index + 1,
        }));

      const batch = writeBatch(db);

      uniqueNewCategories.forEach((category) => {
        const categoryRef = doc(categoriesCollection, category.id);
        batch.set(categoryRef, category);
      });

      const [headerLine, ...dataLines] = (fileContent || '').split('\n');
      const useSemicolon = headerLine.split(';').length > headerLine.split(',').length;
      const splitRE = useSemicolon
        ? /;(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)/
        : /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;

      const headerCols = headerLine
        .split(splitRE)
        .map(col => normalizeCategoryName(col).toLowerCase());

      const nameIdx = headerCols.findIndex(c => c === 'filialname');
      const artIdx  = headerCols.findIndex(c => c === 'filialart');
      const descIdx = headerCols.findIndex(c => c === 'filialbeschreibung');
      const phoneIdxs   = headerCols.map((c,i) => c === 'telefon' ? i : -1).filter(i => i >= 0);
      const emailIdxs   = headerCols.map((c,i) => c === 'email' ? i : -1).filter(i => i >= 0);
      const addrIdxs    = headerCols.map((c,i) => (c === 'adresse' || c === 'standort') ? i : -1).filter(i => i >= 0);
      const websiteIdxs = headerCols.map((c,i) => c === 'website' ? i : -1).filter(i => i >= 0);

      if ([nameIdx, artIdx, descIdx].some(i => i < 0)) {
        toast.error('Import abgebrochen: Fehlende Pflicht‑Spalten Filialname/Filialart/Beschreibung');
        setIsLoading(false);
        return;
      }

      const objectsByCategory: { [key: string]: any[] } = {};
      for (const row of dataLines) {
        const cols = row.split(splitRE).map(f => normalizeCategoryName(f));
        const Filialname = cols[nameIdx];
        const Filialart  = cols[artIdx];
        const Filialbeschreibung = cols[descIdx];

        const normalizedCategoryName = normalizeCategoryName(Filialart);
        const category = uniqueNewCategories.find(
          cat => normalizeCategoryName(cat.name).toLowerCase() === normalizedCategoryName.toLowerCase()
        );
        if (!category) continue;
        if (!objectsByCategory[category.id]) objectsByCategory[category.id] = [];

        const fields: any[] = [];

        phoneIdxs.forEach(i => {
          const val = cols[i];
          if (val) fields.push({
            name: 'Telefonnummer',
            value: val,
            icon: 'FaPhone',
            link: false,
            gremium: false,
            list: false,
            address: false,
            coordinates: { latitude: 0, longitude: 0 }
          });
        });

        emailIdxs.forEach(i => {
          const val = cols[i];
          if (val) fields.push({
            name: 'E-Mail',
            value: val,
            icon: 'FaEnvelope',
            link: true,
            gremium: false,
            list: false,
            address: false,
            coordinates: { latitude: 0, longitude: 0 }
          });
        });

        for (const i of addrIdxs) {
          const val = cols[i];
          if (val) {
            const coords = await getGeocode(val);
            if (coords) {
              fields.push({
                name: 'Adresse',
                value: val,
                icon: 'FaLocationCrosshairs',
                address: true,
                link: false,
                gremium: false,
                list: false,
                coordinates: coords
              });
            }
          }
        }

        websiteIdxs.forEach(i => {
          const val = cols[i];
          if (val) fields.push({
            name: 'Webseite',
            value: val,
            icon: 'FaGlobe',
            link: true,
            gremium: false,
            list: false,
            address: false,
            coordinates: { latitude: 0, longitude: 0 }
          });
        });

        objectsByCategory[category.id].push({
          id: getRandomId(undefined, 5),
          name: Filialname || '',
          description: Filialbeschreibung || '',
          fields,
          sort: objectsByCategory[category.id].length + 1,
          imageInsight: false,
          imageUrl: '.',
          category: category.id,
        });
      }

      Object.entries(objectsByCategory).forEach(([categoryId, objects]) => {
        objects.forEach((object) => {
          const objectRef = doc(
            db,
            `product/${productId}/modules/${moduleId}/categories/${categoryId}/objects`,
            object.id
          );
          batch.set(objectRef, object);
        });
      });

      await batch.commit();

      toast.success('Kategorien und Objekte erfolgreich gespeichert', {
        description: `${uniqueNewCategories.length} Kategorien und ${rows.length} Objekte hinzugefügt.`,
      });
      setStep(1);
    } catch (error: any) {
      toast.error('Fehler beim Schreiben der Kategorien und Objekte:', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Importer (Beta)</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'CSV Hochladen'}
            {step === 2 && 'Datencheck'}
            {step === 3 && 'Datenbank austausch'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
          </div>
        )}

        {step === 2 && (
          <div>
            {isLoading ? (
              <div className="flex justify-center items-center">
                <Progress value={1 / 3} />
                <p className="ml-2">Daten werden überprüft...</p>
              </div>
            ) : (
              <div>
                <p>{existingCategories.length} Kategorien bereits vorhanden.</p>
                <p>{newCategories.length} neue Kategorien werden hinzugefügt.</p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => setStep(1)}>Zurück</Button>
                  <Button onClick={() => setStep(3)}>Weiter</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            {isLoading ? (
              <div className="flex justify-center items-center">
                <Progress value={2 / 3} />
                <p className="ml-2">Kategorien und Objekte werden gespeichert...</p>
              </div>
            ) : (
              <div>
                <p>{newCategories.length} neue Kategorien und {(fileContent ? fileContent.split('\n').length - 1 : 0)} Objekte werden in die Datenbank geschrieben.</p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => setStep(2)}>Zurück</Button>
                  <Button onClick={writeCategoriesAndObjectsToDatabase}>Speichern</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 && <Button variant="secondary" onClick={() => setFileContent(null)}>Leeren</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
