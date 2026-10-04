import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fileService } from '@/services/fileService';
import { toMessage } from '@/api/queryFn';

export default function SubmissionFile({ fileUrl, fileName = 'Submission file' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const download = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await fileService.download(fileUrl, fileName);
    } catch (failure) {
      setError(toMessage(failure));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 break-all text-sm">
        <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
        {fileName}
      </p>
      {fileUrl ? (
        <Button
          variant="outline"
          onClick={download}
          disabled={pending}
          aria-busy={pending}
          className="min-h-11"
        >
          <Download aria-hidden="true" />
          {pending ? 'Downloading…' : 'Download file'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No file is available.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
