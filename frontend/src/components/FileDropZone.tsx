import { useCallback, useState } from "react";
import { Upload, FileImage, FileText, X, File, FileSpreadsheet, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelect: (file: File, base64: string) => void;
  isProcessing: boolean;
  acceptedTypes?: string;
}

const FileDropZone = ({ 
  onFileSelect, 
  isProcessing, 
  acceptedTypes = "image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,video/*" 
}: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const processFile = useCallback((file: File) => {
    // File size limit: 20MB
    if (file.size > 20 * 1024 * 1024) {
      alert("File size must be less than 20MB");
      return;
    }
    
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onFileSelect(file, base64);
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return FileImage;
    if (file.type.startsWith("video/")) return Video;
    if (file.type === "application/pdf") return FileText;
    if (file.type.includes("csv") || file.type.includes("spreadsheet") || file.type.includes("excel")) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {selectedFile ? (
        <div className="p-4 rounded-xl bg-secondary/50 border border-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            {(() => {
              const Icon = getFileIcon(selectedFile);
              return <Icon className="w-6 h-6 text-primary" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          {!isProcessing && (
            <button
              onClick={clearFile}
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-secondary/30"
          )}
        >
          <input
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "p-4 rounded-xl transition-colors",
              isDragging ? "bg-primary/20" : "bg-secondary"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div>
              <p className="text-lg font-medium text-foreground mb-1">
                {isDragging ? "Drop your file here" : "Drag & drop or click to upload"}
              </p>
              <p className="text-sm text-muted-foreground">
                Upload any file type for AI-powered fraud analysis
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50">
                <FileImage className="w-3 h-3" />
                <span>Images</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50">
                <FileText className="w-3 h-3" />
                <span>PDF</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50">
                <FileSpreadsheet className="w-3 h-3" />
                <span>CSV/Excel</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50">
                <File className="w-3 h-3" />
                <span>DOC/TXT</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50">
                <Video className="w-3 h-3" />
                <span>Video</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground/70">
              Max file size: 20MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
