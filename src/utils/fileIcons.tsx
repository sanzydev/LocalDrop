import {
  File,
  FileText,
  FileArchive,
  FileCode,
  Image,
  Video,
  Music,
} from 'lucide-react';

export function getFileCategory(name: string, mimeType?: string): 'image' | 'video' | 'audio' | 'archive' | 'document' | 'code' | 'generic' {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mimeType?.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'flv'].includes(ext)) {
    return 'video';
  }
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus'].includes(ext)) {
    return 'audio';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md'].includes(ext)) {
    return 'document';
  }
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'rs', 'py', 'java', 'c', 'cpp', 'h', 'sh', 'sql'].includes(ext)) {
    return 'code';
  }

  return 'generic';
}

export function FileIcon({ name, mimeType, size = 20, className = '' }: { name: string; mimeType?: string; size?: number; className?: string }) {
  const category = getFileCategory(name, mimeType);

  switch (category) {
    case 'image':
      return <Image size={size} className={className} aria-label="Image file" />;
    case 'video':
      return <Video size={size} className={className} aria-label="Video file" />;
    case 'audio':
      return <Music size={size} className={className} aria-label="Audio file" />;
    case 'archive':
      return <FileArchive size={size} className={className} aria-label="Archive file" />;
    case 'document':
      return <FileText size={size} className={className} aria-label="Document file" />;
    case 'code':
      return <FileCode size={size} className={className} aria-label="Code file" />;
    default:
      return <File size={size} className={className} aria-label="File" />;
  }
}
