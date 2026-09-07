import { useId } from "react";
import { Checkbox } from "./components/ui/checkbox.js";
import { Input } from "./components/ui/input.js";

export function ModelThinkingOptions({
  reasoning,
  onReasoningChange,
  supportsImages,
  onSupportsImagesChange,
  maxImagesPerPrompt,
  onMaxImagesPerPromptChange,
  disabled,
  advancedLabel,
  thinkingLabel,
  imagesLabel,
  maxImagesLabel,
}: {
  reasoning: boolean;
  onReasoningChange: (reasoning: boolean) => void;
  supportsImages?: boolean;
  onSupportsImagesChange?: (supportsImages: boolean) => void;
  maxImagesPerPrompt?: string;
  onMaxImagesPerPromptChange?: (maxImagesPerPrompt: string) => void;
  disabled?: boolean;
  advancedLabel: string;
  thinkingLabel: string;
  imagesLabel?: string;
  maxImagesLabel?: string;
}) {
  const id = useId();
  const imagesId = useId();
  const maxImagesId = useId();
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
      {supportsImages && onMaxImagesPerPromptChange ? (
        <label htmlFor={maxImagesId} className="mt-3 flex items-center gap-2">
          <span className="min-w-0 flex-1">{maxImagesLabel}</span>
          <Input
            id={maxImagesId}
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            step={1}
            value={maxImagesPerPrompt ?? ""}
            onChange={(event) => onMaxImagesPerPromptChange(event.target.value)}
            disabled={disabled}
            aria-label={maxImagesLabel}
            className="h-8 w-20 text-center text-foreground"
          />
        </label>
      ) : null}
    </details>
  );
}
