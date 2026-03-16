import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import type { SessionDetail } from '../../types';

interface Props {
  onSuccess: (session: SessionDetail) => void;
}

export function PdfUpload({ onSuccess }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('请上传 PDF 文件');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.importPdf(file);
      onSuccess(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <div
        className={`pdf-upload ${dragging ? 'pdf-upload--drag' : ''} ${loading ? 'pdf-upload--loading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!loading) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !loading && e.currentTarget.click()}
        aria-label="上传 NinjaTrader PDF 文件"
      >
        <div className="pdf-upload__icon">{loading ? '⏳' : '📄'}</div>
        <div className="pdf-upload__text">
          {loading ? '解析中...' : (
            <>
              <strong>拖拽 PDF 到此处</strong>
              <span>或点击选择文件 · NinjaTrader Daily Statement</span>
            </>
          )}
        </div>
      </div>
      {error && <p className="pdf-upload__error">{error}</p>}
    </div>
  );
}
