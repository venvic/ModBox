import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/database';
import { initializeApp } from 'firebase/app';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';

const db = getFirestore(initializeApp(firebaseConfig));

const LinkmodulEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Core link config
    const [url, setUrl] = useState('');
    const [openInNewTab, setOpenInNewTab] = useState(true);
    const [download, setDownload] = useState(false);

    const moduleDocRef = doc(db, 'product', productId, 'modules', id);
    const linkDocRef = doc(db, 'product', productId, 'modules', id, 'linkdetails', 'link');

    const buildUrlWithUtm = (raw: string) => {
        try {
            const u = new URL(raw);
            return u.toString();
        } catch {
            // If it's not a valid absolute URL, just return as-is (user can fix)
            return raw;
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const linkSnap = await getDoc(linkDocRef);
            if (linkSnap.exists()) {
                const ldata = linkSnap.data() as any;
                if (typeof ldata?.url === 'string') setUrl(ldata.url);
                if (typeof ldata?.target === 'string') setOpenInNewTab(ldata.target === '_blank');
                if (typeof ldata?.download === 'boolean') setDownload(ldata.download);
            }
        } catch (e: any) {
            toast.error(e?.message || "Fehler beim Laden des Moduls")
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, productId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const finalUrl = buildUrlWithUtm(url.trim());
            const payload = {
                type: 'link',
                url: finalUrl,
                target: openInNewTab ? '_blank' : '_self',
                download,
                updatedAt: Date.now(),
            };
            await setDoc(linkDocRef, payload, { merge: true });
            onChangesSaved && onChangesSaved();
        } catch (e: any) {
            toast.error(e?.message || 'Fehler beim Speichern.')
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-4 max-w-3xl">

            {loading ? (
                <div>Laden…</div>
            ) : (
                <>
                    <div className="space-y-4">
                        <h2 className="m-0 text-lg font-semibold">Grundlagen</h2>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium">URL</span>
                            <Input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/page"
                                className=""
                            />
                        </label>

                        <div className="flex gap-4 items-center flex-wrap">
                            <label className="flex gap-2 items-center">
                                <Checkbox
                                    checked={openInNewTab}
                                    onCheckedChange={(v) => setOpenInNewTab(!!v)}
                                />
                                In neuem Tab öffnen
                            </label>
                            <label className="flex gap-2 items-center">
                                <Checkbox
                                    checked={download}
                                    onCheckedChange={(v) => setDownload(!!v)}
                                />
                                Herunterladen
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={handleSave} disabled={saving} variant="secondary">
                            {saving ? 'Speichern…' : 'Änderungen speichern'}
                        </Button>
                        <Button onClick={load} disabled={saving} variant="default">
                            Aus Datenbank neu laden
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

export default LinkmodulEditor;