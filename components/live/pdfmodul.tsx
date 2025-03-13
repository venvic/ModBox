import { firebaseConfig } from "@/database";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";
import React from "react";
import { FaFile } from "react-icons/fa6";


if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

interface PDFmodulProps {
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

interface file {
    id: string;
    name: string;
    link: string;
    size: number;
    sort: number;
}

const PDFmodul: React.FC<PDFmodulProps> = ({ product, module }) => {
    const [files, setFiles] = React.useState<file[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        const fetchFiles = async () => {
            setLoading(true);
            const filesQuery = query(collection(db, `product/${product.id}/modules/${module.id}/files`));
            const querySnapshot = await getDocs(filesQuery);
            const filesList: file[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as file));
            filesList.sort((a, b) => a.sort - b.sort);
            setFiles(filesList);
            setLoading(false);
        };

        fetchFiles();
    }, [product.id, module.id]);

    return (
        <div className="text-black p-4 w-full">
            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                    <p className="text-black/70 text-sm font-medium">{module.description}</p>
                    <div className="mt-4 flex flex-col divide-y divide-black/15 w-full">
                        {files.map(file => (
                            <a key={file.id} href={file.link} target="_blank" className="py-2 flex items-center" rel="noopener noreferrer">
                                <FaFile className="inline-block mr-4" style={{ color: module.settings}} />
                                <div>
                                    <h2 className="text-sm">{file.name}</h2>
                                    <p className="text-xs text-black/60">({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default PDFmodul;