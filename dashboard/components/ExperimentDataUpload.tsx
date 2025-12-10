'use client';

import { useState } from 'react';
import { Upload, CloudUpload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';

interface Props {
    experimentId: string | number;
    initialSyncInfo?: { fileName: string; updatedAt: string } | null;
}

export default function ExperimentDataUpload({ experimentId, initialSyncInfo }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [syncInfo, setSyncInfo] = useState(initialSyncInfo);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setStatus('idle');
        setMessage('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('experimentId', experimentId.toString());

        try {
            const res = await fetch('/api/looker/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setStatus('success');
            setMessage(`Uploaded! (${file.name})`);

            // Wait a moment for the server to write the file completely before reloading
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <label
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg cursor-pointer transition-colors relative
                    ${isUploading
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}
                `}
                title="Import Looker Data (ZIP/CSV)"
            >
                {isUploading ? (
                    <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                ) : (
                    <FileUp className="w-3.5 h-3.5" />
                )}

                {isUploading ? 'Uploading...' : (status === 'success' ? 'Imported' : 'Import')}

                <input
                    type="file"
                    accept=".csv,.zip"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                />
            </label>

            {(syncInfo || status === 'error') && (
                <span className={`text-[10px] ${status === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                    {status === 'error' ? message : `Synced: ${new Date(syncInfo!.updatedAt).toLocaleDateString()} (${syncInfo?.fileName?.slice(0, 15)}...)`}
                </span>
            )}
        </div>
    );
}
