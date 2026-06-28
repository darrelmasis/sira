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
  size = "lg",
}) {
  const numericValue = value === "" ? 0 : parseInt(value, 10) || 0;

  function setValue(next) {
    const intVal = Math.floor(next);
    const clamped = Math.min(max, Math.max(min, intVal));
    onChange(String(clamped));
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex-1 min-w-0">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          className="text-center tabular-nums"
          size={size === "lg" ? "md" : size}
          onChange={(event) => {
            const raw = event.target.value.replace(/[^0-9]/g, "");
            if (raw === "") {
              onChange("");
              return;
            }
            setValue(parseInt(raw, 10));
          }}
        />
      </div>
      <Button
        type="button"
        color="neutral"
        shape="square"
        size={size}
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
        size={size}
        aria-label="Aumentar"
        disabled={disabled || numericValue >= max}
        onClick={() => setValue(numericValue + step)}
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
