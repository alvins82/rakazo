import { useId } from "react";
import { Checkbox } from "./components/ui/checkbox.js";

export function ModelThinkingOptions({
  reasoning,
  onReasoningChange,
  supportsImages,
  onSupportsImagesChange,
  disabled,
  advancedLabel,
  thinkingLabel,
  imagesLabel,
}: {
  reasoning: boolean;
  onReasoningChange: (reasoning: boolean) => void;
  supportsImages?: boolean;
  onSupportsImagesChange?: (supportsImages: boolean) => void;
  disabled?: boolean;
  advancedLabel: string;
  thinkingLabel: string;
  imagesLabel?: string;
}) {
  const id = useId();
  const imagesId = useId();
  return (
    <details className="mt-4 text-sm text-muted-foreground">
      <summary className="cursor-pointer">{advancedLabel}</summary>
      <label htmlFor={id} className="mt-3 flex items-center gap-2">
        <Checkbox
          id={id}
          checked={reasoning}
          onCheckedChange={(checked) => onReasoningChange(checked === true)}
          disabled={disabled}
        />
        {thinkingLabel}
      </label>
      {onSupportsImagesChange ? (
        <label htmlFor={imagesId} className="mt-3 flex items-center gap-2">
          <Checkbox
            id={imagesId}
            checked={supportsImages === true}
            onCheckedChange={(checked) => onSupportsImagesChange(checked === true)}
            disabled={disabled}
          />
          {imagesLabel}
        </label>
      ) : null}
    </details>
  );
}
