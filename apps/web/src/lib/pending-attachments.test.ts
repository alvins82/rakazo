import { describe, expect, it, vi } from "vitest";
import {
  filesFromClipboard,
  isFileDrag,
  revokePendingAttachmentPreviews,
} from "./pending-attachments.js";

function dragData(types: string[], itemKinds: string[] = []) {
  return {
    types,
    items: itemKinds.map((kind) => ({ kind })),
  } as unknown as DataTransfer;
}

describe("isFileDrag", () => {
  it("recognizes files advertised by the drag data", () => {
    expect(isFileDrag(dragData(["Files"]))).toBe(true);
  });

  it("recognizes file items when the Files type is not exposed", () => {
    expect(isFileDrag(dragData([], ["file"]))).toBe(true);
  });

  it("ignores text and other drags", () => {
    expect(isFileDrag(dragData(["text/plain"], ["string"]))).toBe(false);
    expect(isFileDrag(null)).toBe(false);
  });
});

describe("filesFromClipboard", () => {
  it("returns an empty list when clipboard has no file payload", () => {
    expect(filesFromClipboard(null)).toEqual([]);
    expect(
      filesFromClipboard({
        files: [] as unknown as FileList,
        items: [{ kind: "string", getAsFile: () => null }] as unknown as DataTransferItemList,
      }),
    ).toEqual([]);
  });

  it("prefers clipboard.files when present", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "shot.png", { type: "image/png" });
    const files = {
      length: 1,
      0: file,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;

    expect(filesFromClipboard({ files, items: null })).toEqual([file]);
  });

  it("reads file items and names unnamed screenshot pastes", () => {
    const unnamed = new File([new Uint8Array([9])], "", { type: "image/png" });
    const named = new File([new Uint8Array([8])], "notes.txt", { type: "text/plain" });
    const items = [
      { kind: "string", getAsFile: () => null },
      { kind: "file", getAsFile: () => unnamed },
      { kind: "file", getAsFile: () => named },
    ] as unknown as DataTransferItemList;

    const result = filesFromClipboard({ files: null, items });
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("paste-1.png");
    expect(result[0]?.type).toBe("image/png");
    expect(result[1]).toBe(named);
  });

  it("uses jpg for jpeg clipboard images without a name", () => {
    const unnamed = new File([new Uint8Array([1])], "   ", { type: "image/jpeg" });
    const items = [{ kind: "file", getAsFile: () => unnamed }] as unknown as DataTransferItemList;
    expect(filesFromClipboard({ items })[0]?.name).toBe("paste-1.jpg");
  });
});

describe("revokePendingAttachmentPreviews", () => {
  it("revokes each preview URL and skips entries without one", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    revokePendingAttachmentPreviews([{ previewUrl: "blob:a" }, {}, { previewUrl: "blob:b" }]);
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenCalledWith("blob:a");
    expect(revoke).toHaveBeenCalledWith("blob:b");
    revoke.mockRestore();
  });
});
