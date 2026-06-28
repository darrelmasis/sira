import { Button, Input, cn } from "quickit-ui";
import { Minus, Plus } from "lucide-react";

export default function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  disabled = false,
  id,
  className,
}) {
  const numericValue = value === "" ? 0 : Number(value);

  function setValue(next) {
    const clamped = Math.min(max, Math.max(min, next));
    onChange(String(clamped));
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          className="text-center"
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") {
              onChange("");
              return;
            }
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) setValue(parsed);
          }}
        />
      </div>
      <Button
        type="button"
        color="neutral"
        shape="square"
        size="lg"
        aria-label="Disminuir"
        disabled={disabled || numericValue <= min}
        onClick={() => setValue(numericValue - step)}
      >
        <Minus aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        color="neutral"
        shape="square"
        size="lg"
        aria-label="Aumentar"
        disabled={disabled || numericValue >= max}
        onClick={() => setValue(numericValue + step)}
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
