'use client';

import { useState } from 'react';
import { Upload, CloudUpload, CheckCircle, AlertCircle } from 'lucide-react';

export default function LookerUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setStatus('idle');
        setMessage('');

        const formData = new FormData();
        formData.append('file', file);

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
            setMessage('Data updated from Looker!');

            // Trigger a refresh of the dashboard data
            // This is a bit hacky, but valid for this bridge
            window.location.reload();

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <label
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors
          ${isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
        `}
            >
                {isUploading ? (
                    <CloudUpload className="w-4 h-4 animate-bounce" />
                ) : (
                    <Upload className="w-4 h-4" />
                )}
                {isUploading ? 'Uploading...' : 'Import Looker CSV'}
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                />
            </label>

            {status === 'success' && (
                <span className="text-green-600 flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3 h-3" />
                </span>
            )}

            {status === 'error' && (
                <span className="text-red-500 flex items-center gap-1 text-xs" title={message}>
                    <AlertCircle className="w-3 h-3" />
                </span>
            )}
        </div>
    );
}
