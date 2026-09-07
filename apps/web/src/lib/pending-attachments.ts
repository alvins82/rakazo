export type PendingAttachmentPreview = {
  previewUrl?: string;
};

export function isFileDrag(dataTransfer: Pick<DataTransfer, "types" | "items"> | null): boolean {
  if (!dataTransfer) return false;
  return (
    Array.from(dataTransfer.types).includes("Files") ||
    Array.from(dataTransfer.items).some((item) => item.kind === "file")
  );
}

type ClipboardFileSource = {
  files?: FileList | null;
  items?: DataTransferItemList | ArrayLike<DataTransferItem> | null;
};

function extensionForMimeType(mimeType: string): string {
  const subtype = mimeType.split("/")[1]?.split("+")[0]?.toLowerCase();
  if (!subtype) return "bin";
  if (subtype === "jpeg") return "jpg";
  return subtype;
}

function nameForClipboardFile(file: File, index: number): string {
  if (file.name.trim()) return file.name;
  return `paste-${index + 1}.${extensionForMimeType(file.type)}`;
}

function withClipboardFileName(file: File, index: number): File {
  const name = nameForClipboardFile(file, index);
  if (name === file.name) return file;
  return new File([file], name, { type: file.type, lastModified: file.lastModified });
}

/** Collect clipboard file items for the composer attachment path. */
export function filesFromClipboard(clipboardData: ClipboardFileSource | null): File[] {
  if (!clipboardData) return [];

  const fromFiles = clipboardData.files ? Array.from(clipboardData.files) : [];
  if (fromFiles.length) {
    return fromFiles.map((file, index) => withClipboardFileName(file, index));
  }

  const items = clipboardData.items ? Array.from(clipboardData.items) : [];
  const files: File[] = [];
  for (const item of items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) files.push(withClipboardFileName(file, files.length));
  }
  return files;
}

export function revokePendingAttachmentPreviews(
  attachments: readonly PendingAttachmentPreview[],
): void {
  for (const attachment of attachments) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  }
}
